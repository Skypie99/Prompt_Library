# F6 — Markdown rendering of Claude responses

_Quinn + Dani + Steve, compressed (Steve weighs in early because this renders model output and security IS the design)._

## Problem

Claude returns markdown — headings, lists, **bold**, `code`, fenced code blocks. Today the app shows it as a wall of text. The most common feedback after using the app for ten minutes is "why does Claude's answer look like a stack trace?"

## Goal

Render the response with the most common markdown elements while it streams, without introducing any XSS or HTML-injection surface.

## Scope (in)

Supported elements:
- **Headings** `#`, `##`, `###` → `<h1 class>`, `<h2 class>`, `<h3 class>` (no `<h4+>` to keep the type scale clean)
- **Paragraphs** — blank-line-separated runs of text
- **Bold** `**foo**` / `__foo__` → `<strong>`
- **Italic** `*foo*` / `_foo_` → `<em>` (but only when adjacent to non-word characters on both sides — avoids breaking `snake_case`)
- **Inline code** `` `foo` `` → `<code>`
- **Fenced code blocks** ```` ```lang\n…\n``` ```` → `<pre><code>` (lang ignored in v1; no syntax highlighting)
- **Unordered lists** `- foo` / `* foo`
- **Ordered lists** `1. foo`
- **Links** `[text](url)` where url starts with `https://`, `http://`, or `mailto:`. Anything else renders the link as plain text. `target="_blank" rel="noreferrer noopener"`.
- **Line breaks** — `  \n` (two spaces + newline) within a paragraph

## Scope (out — safety, simplicity)

- **Raw HTML in the response** — escaped as plain text. No exceptions.
- **Images** — out. `![alt](url)` renders as plain text (we don't want unsolicited network requests from arbitrary URLs).
- **Tables** — out for v1. (Most responses don't have them.)
- **Blockquotes** — out for v1.
- **Syntax highlighting** — out for v1 (would need a library).
- **Math / LaTeX** — out.
- **Footnotes** — out.

## Security posture (Steve)

This is the only place in the app where we render text from a remote source as anything other than `{string}`. The contract:

1. Use React's natural text-escaping — every leaf in the tree is a `{string}` child, never `dangerouslySetInnerHTML`. **There is no `dangerouslySetInnerHTML` call anywhere in this feature.**
2. The renderer takes a `string`, walks it once, emits a React tree of plain elements. No `eval`. No `Function`. No string-to-HTML.
3. Link `href` is validated with a strict allowlist of protocols (`https:` / `http:` / `mailto:`) inside the renderer. A failed validation renders the link's *text* as plain text and drops the href entirely.
4. Code blocks and inline code are rendered as `<pre>` / `<code>` with the raw string as a single text child — no parsing inside.
5. Streaming partials are safe because we re-render the whole response each chunk against the same renderer — no stateful HTML accumulation.

## Rendering inside streaming

- During streaming, the renderer is called with the partial response on every chunk. An unclosed `**` or unfinished fenced block renders as the literal text up to that point (graceful degradation). When the closing token arrives, the renderer naturally produces the formatted version on the next chunk.
- No flicker because the response container uses `whitespace-pre-wrap` for plain segments and the markdown surface is otherwise structural.

## Where it's used

1. **PromptDetail** response panel — replaces the current `whitespace-pre-wrap` `<div>` for the response body.
2. **RunHistory** expanded row — replaces the current `<pre>` for the saved response.

## Acceptance

| # | Behaviour |
|---|---|
| 1 | `# H1\n\nText` renders an `<h1>` and a paragraph. |
| 2 | `**bold**` renders `<strong>`; `*italic*` renders `<em>`; `*` alone or inside a word doesn't transform anything (`a*b*c` → literal). |
| 3 | `` `inline` `` renders `<code>`. |
| 4 | Fenced ``` ```lang … ``` ``` renders `<pre><code>` with raw text content. |
| 5 | `- foo\n- bar` renders an `<ul>` of two `<li>`s; `1. foo\n2. bar` an `<ol>`. |
| 6 | `[click](https://example.com)` renders an `<a>` with `target="_blank" rel="noreferrer noopener"`. |
| 7 | `[bad](javascript:alert(1))` renders the literal text `[bad](javascript:alert(1))` (or its text without a link — either is fine; protocol allowlist rejects javascript:). |
| 8 | `<script>alert(1)</script>` renders the literal text, never executes. |
| 9 | `<img src=...>` renders the literal text, no network request made. |
| 10 | Plain text response (no markdown chars) renders as a paragraph of the same text — idempotent. |
| 11 | Partial stream "# Head" renders an `<h1>` of just "Head"; subsequent chunks update naturally. |
| 12 | `npx tsc --noEmit` green. |

## Size

**M** — `src/lib/markdown.ts` (the parser + token stream, ~200 lines), `src/components/Markdown.tsx` (the React renderer, ~100 lines), wiring into PromptDetail + RunHistory (~30 lines).

## Dependencies

- None. No new npm packages.

## Out of scope (parked)

- Syntax highlighting (would need `shiki` or similar; weight ~250KB).
- Tables — F6.5 if Sky wants them later; pure presentational addition.
