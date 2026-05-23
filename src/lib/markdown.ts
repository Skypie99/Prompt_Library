// F6 — Tiny safe-subset Markdown parser.
//
// Produces a structured AST that the Markdown React component renders into
// plain elements. The contract:
//
//   - INPUT is always a string. OUTPUT is always plain values (strings, arrays,
//     small typed nodes). We never produce HTML strings, and the renderer
//     never uses `dangerouslySetInnerHTML`. React's natural text-escaping
//     means everything in the response is treated as text by default; there
//     is no HTML-injection surface.
//
//   - Links are validated against an allowlist of safe protocols. A failed
//     validation drops the href and renders the link's text as plain text.
//
//   - Unsupported markdown (raw HTML, images, tables, blockquotes, footnotes,
//     math) just renders as its literal source text. Better to show a backtick
//     than to silently drop a user-visible character.
//
//   - Partial / streaming input is fine. Unfinished tokens render as their
//     literal source up to that point; the closer arriving in a later chunk
//     produces the rendered version on the next pass.

// ---- AST node types --------------------------------------------------------

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "code"; value: string }
  // href is guaranteed to start with https:/http:/mailto: after validation;
  // if the URL was invalid, the parser emits a `text` node instead.
  | { type: "link"; href: string; children: InlineNode[] };

export type BlockNode =
  | { type: "heading"; level: 1 | 2 | 3; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "code-block"; value: string; lang?: string }
  | { type: "list"; ordered: boolean; items: InlineNode[][] };

// ---- protocol allowlist ----------------------------------------------------

const SAFE_PROTOCOL_RE = /^(https?:|mailto:)/i;

export function isSafeUrl(href: string): boolean {
  return SAFE_PROTOCOL_RE.test(href.trim());
}

// F-night-10 — bare-URL auto-link regex. Matches a leading http:// or
// https:// followed by any URL-y characters, EXCEPT trailing sentence
// punctuation (. , ; : ! ? ) > '" ]) which stays as literal text so
// "see https://example.com." doesn't link the period. Conservative on
// purpose: better to under-link than to swallow visible punctuation.
const BARE_URL_RE = /^https?:\/\/[^\s<>"`']+?(?=[.,;:!?)\]>'"]*(?:\s|$))/;

// ---- inline parser ---------------------------------------------------------

// Walk a single line / segment, emitting inline nodes. Tracks position so
// open-without-close pairs (e.g. a streaming partial `**foo`) emit literal
// text rather than an unterminated wrapper.
//
// The grammar is intentionally tiny: we walk character by character and try
// each rule in priority order at every position. The cost is O(n) per pass,
// linear in input length.
export function parseInline(input: string): InlineNode[] {
  const out: InlineNode[] = [];
  let buf = "";

  const flush = () => {
    if (buf.length === 0) return;
    out.push({ type: "text", value: buf });
    buf = "";
  };

  let i = 0;
  while (i < input.length) {
    const ch = input[i];

    // ---- inline code: `...` ----
    if (ch === "`") {
      const close = input.indexOf("`", i + 1);
      if (close > i) {
        flush();
        out.push({ type: "code", value: input.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
      // unterminated — fall through, treat as literal
    }

    // ---- bare URL auto-link (F-night-10) ----
    // When we hit "h" check whether the next chars form an http(s):// URL.
    // Captures only the URL itself; surrounding punctuation (trailing . , ; :
    // ! ?) stays as literal text so "see foo.com." doesn't link the period.
    if (ch === "h") {
      const match = BARE_URL_RE.exec(input.slice(i));
      // Re-anchor: the regex starts with /^/ so ensure match.index === 0.
      if (match && match.index === 0 && isSafeUrl(match[0])) {
        flush();
        out.push({ type: "link", href: match[0], children: [{ type: "text", value: match[0] }] });
        i += match[0].length;
        continue;
      }
    }

    // ---- link: [text](url) ----
    if (ch === "[") {
      const textClose = findMatching(input, i, "[", "]");
      if (textClose !== -1 && input[textClose + 1] === "(") {
        const urlClose = input.indexOf(")", textClose + 2);
        if (urlClose !== -1) {
          const text = input.slice(i + 1, textClose);
          const href = input.slice(textClose + 2, urlClose).trim();
          flush();
          if (isSafeUrl(href)) {
            out.push({ type: "link", href, children: parseInline(text) });
          } else {
            // Drop the href — render the visible text only, as plain text.
            out.push({ type: "text", value: text });
          }
          i = urlClose + 1;
          continue;
        }
      }
    }

    // ---- strong: **...** or __...__ ----
    if ((ch === "*" || ch === "_") && input[i + 1] === ch) {
      const marker = ch + ch;
      const close = input.indexOf(marker, i + 2);
      if (close > i + 1) {
        flush();
        out.push({ type: "strong", children: parseInline(input.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }

    // ---- em: *...* or _..._  ----
    // Only honor the marker when it sits at a word boundary, so `snake_case`
    // and `a*b*c` don't sprout em tags. Approximation: the char BEFORE the
    // marker and AFTER the closing marker must NOT be a word character.
    if (ch === "*" || ch === "_") {
      const prev = input[i - 1];
      const prevIsBoundary = !prev || /\W/.test(prev);
      if (prevIsBoundary) {
        const close = findClosingEm(input, i, ch);
        if (close !== -1) {
          flush();
          out.push({ type: "em", children: parseInline(input.slice(i + 1, close)) });
          i = close + 1;
          continue;
        }
      }
    }

    buf += ch;
    i++;
  }

  flush();
  return out;
}

// Find the index of `close` after the matching opener `open`, accounting for
// the simple non-nested case. Returns -1 if no close exists.
function findMatching(input: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < input.length; i++) {
    if (input[i] === open) depth++;
    else if (input[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// Find the matching em closer for the marker at `start`, requiring word-boundary
// on the trailing side too.
function findClosingEm(input: string, start: number, marker: string): number {
  for (let j = start + 1; j < input.length; j++) {
    if (input[j] === marker) {
      const next = input[j + 1];
      // Reject a double-marker (that's strong, not em).
      if (next === marker) {
        j++;
        continue;
      }
      const nextIsBoundary = !next || /\W/.test(next);
      if (nextIsBoundary) return j;
    }
  }
  return -1;
}

// ---- block parser ----------------------------------------------------------

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const FENCE_RE = /^```([\w-]*)\s*$/;
const UL_RE = /^\s*[-*]\s+(.*)$/;
const OL_RE = /^\s*\d+\.\s+(.*)$/;

/**
 * Parse a markdown document into a flat list of block nodes. Robust to
 * partial input: an unclosed fenced block becomes a code-block of whatever
 * has streamed in so far; on the next call (with more text appended) the
 * closer will be in the same block.
 */
export function parseMarkdown(input: string): BlockNode[] {
  const lines = input.split("\n");
  const blocks: BlockNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ---- fenced code block ----
    const fenceOpen = line.match(FENCE_RE);
    if (fenceOpen) {
      const lang = fenceOpen[1] || undefined;
      let j = i + 1;
      const codeLines: string[] = [];
      while (j < lines.length && !FENCE_RE.test(lines[j])) {
        codeLines.push(lines[j]);
        j++;
      }
      blocks.push({
        type: "code-block",
        value: codeLines.join("\n"),
        lang,
      });
      // Skip past the closer if we found one; otherwise consume to EOF.
      i = j < lines.length ? j + 1 : j;
      continue;
    }

    // ---- heading ----
    const heading = line.match(HEADING_RE);
    if (heading) {
      const level = Math.min(3, heading[1].length) as 1 | 2 | 3;
      blocks.push({
        type: "heading",
        level,
        children: parseInline(heading[2]),
      });
      i++;
      continue;
    }

    // ---- lists (homogeneous run of ul or ol) ----
    if (UL_RE.test(line) || OL_RE.test(line)) {
      const ordered = OL_RE.test(line);
      const re = ordered ? OL_RE : UL_RE;
      const items: InlineNode[][] = [];
      while (i < lines.length && re.test(lines[i])) {
        const m = lines[i].match(re);
        items.push(parseInline(m ? m[1] : ""));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // ---- blank line ----
    if (line.trim() === "") {
      i++;
      continue;
    }

    // ---- paragraph: gather consecutive non-empty, non-block lines ----
    const paraLines: string[] = [line];
    let j = i + 1;
    while (
      j < lines.length &&
      lines[j].trim() !== "" &&
      !HEADING_RE.test(lines[j]) &&
      !FENCE_RE.test(lines[j]) &&
      !UL_RE.test(lines[j]) &&
      !OL_RE.test(lines[j])
    ) {
      paraLines.push(lines[j]);
      j++;
    }
    blocks.push({
      type: "paragraph",
      children: parseInline(paraLines.join("\n")),
    });
    i = j;
  }

  return blocks;
}
