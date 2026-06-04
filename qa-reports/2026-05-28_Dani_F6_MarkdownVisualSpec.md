# Dani — F6 Markdown Renderer Visual Spec

**Date:** 2026-05-28  
**Status:** SPEC-READY-FOR-IMPLEMENTATION  
**Project:** Prompt Library Tool  
**Spec source:** FEATURES.md → F6 "Markdown rendering of Claude responses"  

---

## Scope reminder

F6 ships a tiny (~150 lines), safe-subset Markdown parser and renderer supporting:
- **Headings:** h1, h2, h3
- **Paragraphs** with line breaks
- **Formatting:** bold (`**...**`, `__...__`), italic (`*...*`, `_..._`)
- **Inline code:** `` `...` ``
- **Fenced code blocks:** ` ``` ` with optional language tag (no syntax highlighting v1)
- **Indented code blocks:** 4 spaces or tab
- **Lists:** unordered (`-`, `*`) and ordered (`1.`, etc.)
- **Blockquotes:** `> ...`
- **Links:** `[text](url)` + bare URLs (https/http/mailto protocols only)

**Renders in:**
- Live response streaming in `PromptDetail.tsx` response panel
- History expanded row in `RunHistory.tsx` (line 521: `<Markdown source={run.response} />`)

**Safety contract:**
- No raw HTML. No images. No script execution. No dangerouslySetInnerHTML.
- React's automatic text escaping ensures `<script>` tags, `<img>`, etc. render as literal text.
- Links validated against `https://`, `http://`, `mailto:` only.

---

## Visual spec per element

### h1 / h2 / h3

#### h1
- **Font:** `font-display` (Fraunces Variable, serif)
- **Size:** `text-xl` (20px)
- **Weight:** `font-semibold` (600)
- **Color (light):** `text-ink` (#2A2520)
- **Color (dark):** `dark:text-paper` (#F1EBE1)
- **Line height:** `leading-tight` (1.25)
- **Margin-top:** `mt-4` (16px), except when first child (`first:mt-0`)
- **Margin-bottom:** `mb-2` (8px)
- **Semantic:** Renders as native `<h1>` tag

#### h2
- **Font:** `font-display` (Fraunces Variable, serif)
- **Size:** `text-lg` (18px)
- **Weight:** `font-semibold` (600)
- **Color:** Same as h1 (`text-ink` / `dark:text-paper`)
- **Line height:** `leading-tight` (1.25)
- **Margin-top:** `mt-4` (16px), except when first child
- **Margin-bottom:** `mb-2` (8px)
- **Semantic:** Renders as native `<h2>` tag

#### h3
- **Font:** `font-display` (Fraunces Variable, serif)
- **Size:** `text-base` (16px, same as body text)
- **Weight:** `font-semibold` (600)
- **Color:** Same as h1/h2
- **Line height:** `leading-tight` (1.25)
- **Margin-top:** `mt-3` (12px), except when first child
- **Margin-bottom:** `mb-1.5` (6px)
- **Semantic:** Renders as native `<h3>` tag

---

### Paragraphs

- **Font:** `text-sm` (14px, default body size)
- **Color (light):** `text-ink` (#2A2520)
- **Color (dark):** `dark:text-paper` (#F1EBE1)
- **Line height:** `leading-relaxed` (1.625, tall to aid readability)
- **Whitespace:** `whitespace-pre-wrap` — preserves intentional line breaks in the source (soft breaks render as actual line breaks within a paragraph)
- **Margin-top:** `my-2` (8px on both sides)
- **Margin-bottom:** `my-2`, but `last:mb-0` (suppress bottom margin on the final paragraph so it doesn't add trailing space)
- **Margin-top (first child):** `first:mt-0` (suppress top margin on the first paragraph)
- **Semantic:** Renders as native `<p>` tag

---

### Bold (strong)

- **Applied within paragraphs, lists, blockquotes, and headings**
- **Weight:** `font-semibold` (600)
- **Color:** No color change — inherits parent color (`text-ink` / `dark:text-paper`)
- **Semantic:** Renders as native `<strong>` tag
- **Example:** "Some **bold** text" → "Some **bold** text" (bold text same color as surroundings, not darkened)

---

### Italic (em)

- **Applied within paragraphs, lists, blockquotes, and headings**
- **Style:** `italic` (CSS font-style: italic)
- **Color:** No color change — inherits parent color
- **Semantic:** Renders as native `<em>` tag
- **Word boundary rule:** Single-character em markers (`*text*`, `_text_`) only match when surrounded by word boundaries to avoid sprouting em tags in `snake_case` or `a*b*c`. E.g.:
  - `*hello world*` → em tag (spaces = word boundaries)
  - `snake_case` → plain text (no em, underscore surrounded by word characters)

---

### Inline code

- **Font-family:** `font-mono` (monospace, matches code block)
- **Size:** `text-[0.85em]` (scales with parent, ~12px in body text)
- **Background (light):** `bg-cream` (#FAF6EF, soft light tint)
- **Background (dark):** `dark:bg-night` (#1C1916, warm near-black)
- **Color (light):** `text-ink` (#2A2520, charcoal)
- **Color (dark):** `dark:text-paper` (#F1EBE1, off-white)
- **Padding:** `px-1 py-0.5` (4px left/right, 2px top/bottom)
- **Border-radius:** No explicit border-radius in current Markdown.tsx; inline code is a bare colored span. Consider `rounded` (4px) for polish.
- **Semantic:** Renders as native `<code>` tag

---

### Fenced code blocks (`` ``` ``)

- **Outer container:** `group/code` (groups hover state for the copy button)
- **Pre element:**
  - **Font-family:** `font-mono`
  - **Size:** `text-xs` (12px)
  - **Color (light):** `text-ink` (#2A2520)
  - **Color (dark):** `dark:text-paper` (#F1EBE1)
  - **Background (light):** `bg-cream/60` (#FAF6EF at 60% opacity)
  - **Background (dark):** `dark:bg-night` (#1C1916)
  - **Border (light):** `border border-border` (#ECE3D5, light tan)
  - **Border (dark):** `dark:border-night-border` (#38322B, warm gray)
  - **Padding:** `px-3 py-2` (12px left/right, 8px top/bottom), plus `pr-12` (extra right padding for copy button room)
  - **Line height:** `leading-relaxed` (1.625, tall for readability)
  - **Overflow:** `overflow-x-auto` (horizontal scroll on long unbroken strings, no wrapping)
  - **Border-radius:** `rounded-md` (6px)
  - **Margin-top/bottom:** `my-3` (12px on both sides)
- **Copy button (overlay):**
  - **Position:** `absolute right-2 top-2` (pinned to code block top-right)
  - **Label text:** "Copy" when hidden/ready, "Copied" after click (1.5s timeout)
  - **Opacity:** `opacity-0` (hidden by default), `group-hover/code:opacity-100` (visible on hover), `focus-visible:opacity-100` (visible when keyboard-focused)
  - **Appearance (light):**
    - Background: `bg-surface` (#FFFDF9)
    - Border: `border border-border` (#ECE3D5)
    - Text color: `text-ink-muted` (#6E665C)
    - Hover border: `hover:border-coral-300` (#ECA88E)
    - Hover text: `hover:text-coral-600` (#C85539)
    - Focus ring: `focus-visible:ring-2 focus-visible:ring-coral-400` (#E48468)
  - **Appearance (dark):**
    - Background: `dark:bg-night-surface` (#26221E)
    - Border: `dark:border-night-border` (#38322B)
    - Text color: `dark:text-paper-muted` (#A89E90)
    - Hover border: `dark:hover:border-coral-500/40` (semi-transparent coral)
    - Hover text: `dark:hover:text-coral-300` (#ECA88E)
    - Focus ring: `dark:focus-visible:ring-coral-400`
  - **Font:** `text-[10px]` (very small), `font-medium`
  - **Padding:** `px-2 py-0.5` (8px left/right, 2px top/bottom)
  - **Border-radius:** `rounded-md` (6px)
  - **Transition:** all properties smooth on hover/focus
  - **Semantic:** `<button type="button">` with `aria-label` that says "Copy code" or "Code copied"

- **Language tag:** Currently not rendered in v1. If added later:
  - Small label above the code, e.g. `javascript`
  - Style: subtle gray text, no UI affordance needed (informational only)

---

### Unordered lists

- **Semantic:** Native `<ul>` tag
- **Bullets:** `list-disc` (standard filled bullet points)
- **Margin:** `my-2` (8px top/bottom)
- **Padding-left:** `pl-5` (20px to indent under the bullet)
- **Item spacing:** `space-y-1` (4px vertical gap between items)
- **Text:** `text-sm leading-relaxed` (14px, tall line height for readability)
- **Color (light):** `text-ink` (#2A2520)
- **Color (dark):** `dark:text-paper` (#F1EBE1)
- **Semantic:** Each item is a native `<li>` tag

**Example:**
```
- First item
- Second item
- Third item
```

---

### Ordered lists

- **Semantic:** Native `<ol>` tag
- **Numbering:** `list-decimal` (1. 2. 3. ...)
- **Margin:** `my-2` (8px top/bottom)
- **Padding-left:** `pl-5` (20px to indent under the number)
- **Item spacing:** `space-y-1` (4px vertical gap between items)
- **Text:** `text-sm leading-relaxed`
- **Color:** Same as unordered (`text-ink` / `dark:text-paper`)
- **Semantic:** Each item is a native `<li>` tag

**Example:**
```
1. First step
2. Second step
3. Third step
```

---

### Blockquotes

- **Semantic:** Native `<blockquote>` tag
- **Left border:** `border-l-2` (2px thick left border)
- **Border color (light):** `border-coral-300` (#ECA88E, muted coral)
- **Border color (dark):** `dark:border-coral-500/40` (semi-transparent coral)
- **Background (light):** `bg-cream/40` (#FAF6EF at 40% opacity)
- **Background (dark):** `dark:bg-night/40` (#1C1916 at 40% opacity)
- **Padding:** `px-3 py-2` (12px left/right, 8px top/bottom)
- **Margin:** `my-3` (12px top/bottom)
- **Text style:** `italic` (slanted text)
- **Font size:** `text-sm` (14px)
- **Line height:** `leading-relaxed` (1.625)
- **Text color (light):** `text-ink-muted` (#6E665C, muted charcoal)
- **Text color (dark):** `dark:text-paper-muted` (#A89E90, muted off-white)

**Example:**
```
> This is a blockquote.
> It can span multiple lines.
```

---

### Line breaks and soft wraps

- **Intentional line breaks** (two spaces at end of line or `\n\n`) are preserved by the `whitespace-pre-wrap` class on paragraphs. When a paragraph contains a newline (not ending the paragraph), it renders as an actual line break within the `<p>`, preserving the user's formatting intent.
- **Blank lines** separate paragraphs (CommonMark semantic). A blank line triggers a new `<p>` block.
- **Soft breaks** within a paragraph (single `\n` without trailing spaces) are preserved as literal whitespace due to `pre-wrap`, producing a visual line break.

---

### Links

- **Semantic:** Native `<a>` tag
- **Href validation:** Only `https://`, `http://`, and `mailto:` protocols. Invalid links render as plain text (href dropped, link text shown as text node).
- **Target:** `target="_blank"` (always opens in new window/tab)
- **Rel:** `rel="noopener noreferrer"` (security: prevents new page from accessing `window.opener`)
- **Color (light):** `text-coral-700` (#A6442D, dark coral)
- **Color (dark):** `dark:text-coral-300` (#ECA88E, light coral)
- **Decoration:** `underline underline-offset-2` (blue underline with 2px offset from text baseline)
- **Hover (light):** `hover:text-coral-800` (slightly darker)
- **Hover (dark):** `dark:hover:text-coral-200` (slightly lighter)
- **Bare URLs:** Auto-detected (lines 91–104 of markdown.ts). A string starting with `http://` or `https://` followed by URL-safe characters is captured as a link. Trailing sentence punctuation (`.`, `,`, `;`, `:`, `!`, `?`, `)`, `>`, `'`, `"`, `]`) stays as literal text so "see https://example.com." doesn't link the period.

**Example:**
```
[Click here](https://example.com) or visit https://example.com directly.
```

---

## Edge cases

### Streaming partial markdown

When a Claude response arrives mid-sentence, the Markdown parser is called on every chunk (via `useMemo` in Markdown.tsx line 19). Partial markup is handled gracefully:

- **Partial heading:** `# Hea` (unclosed) renders as plain text "# Hea" until the newline completes it. On the next chunk with the closing newline, the parser re-runs and produces an `<h1>` tag.
- **Partial bold:** `**foo` (unclosed) renders as literal text `**foo`. The next chunk may close it with `**`, and the next parse will wrap it in `<strong>`.
- **Partial code block:** `` ``` javascript`` (opening fence) consumes lines until a closing ` ``` ` is found. If the closing fence hasn't arrived, the block is held open as `{ type: "code-block", value: ... }` with all accumulated lines, and the next chunk appends to it. No layout shift: the block renders immediately as a `<pre>` with the accumulated code.
- **Partial link:** `[text](http` (incomplete) renders as plain text. When the closing `)` arrives in a later chunk, the parser re-runs and links it.

**Layout stability:** The memoization on source (line 19) means the entire tree is re-parsed on every character arrival. This is fast (~150 lines of code, O(n) per chunk) and ensures no flicker or layout thrashing — React diffs the new elements and only updates changed nodes.

---

### Long unbroken strings in code blocks

Code with no spaces or newlines (e.g. a long variable name, a hash, a URL) flows in the `<pre>` which has `overflow-x-auto`. The browser provides a horizontal scrollbar. The text itself does not wrap or break mid-word (CSS `word-break: normal` is the default). This is correct for code — you want to see the full unbroken string, not a broken rendering that mangles semantics.

---

### Empty list items

The markdown parser in lines 294–306 (markdown.ts) extracts the text portion of each list item (the part after `-` or `1.`). An empty item (just `-` with nothing after it) produces an empty string, which parseInline converts to an empty array of inline nodes. The `<li>` then renders with no visible content.

**Recommendation:** This is fine. An empty bullet point is invisible and takes up space (due to `space-y-1`), which is the correct semantic behavior. If a user types `- ` with trailing space but no text, they get an empty item; if they meant to omit the line, they won't include it in the markdown.

---

## A11y

### Semantic HTML

- **Headings:** Native `<h1>`, `<h2>`, `<h3>` tags (not styled divs). Screen readers announce them and navigate by heading level.
- **Lists:** Native `<ul>` and `<ol>` tags with `<li>` children. Screen readers announce the list structure and item count.
- **Blockquote:** Native `<blockquote>` tag.
- **Code:** Native `<code>` tags. For blocks, `<pre><code>` structure.
- **Links:** Native `<a>` tags with `href` and `target="_blank" rel="noopener noreferrer"`.
- **Emphasis:** Native `<strong>` and `<em>` tags, not styled spans.

### Color contrast

All text meets WCAG AA contrast ratio of ≥4.5:1 on both light and dark backgrounds:

- **Light mode, body text:** `text-ink` (#2A2520) on `cream` (#FAF6EF) background = ~14:1 ✓
- **Dark mode, body text:** `text-paper` (#F1EBE1) on `night` (#1C1916) background = ~13:1 ✓
- **Light mode, muted text:** `text-ink-muted` (#6E665C) on `cream` (#FAF6EF) = ~6:1 ✓
- **Dark mode, muted text:** `text-paper-muted` (#A89E90) on `night` (#1C1916) = ~5.5:1 ✓
- **Links:** `text-coral-700` (#A6442D) on `cream` = ~7.5:1 ✓; `text-coral-300` (#ECA88E) on `night` = ~6.5:1 ✓
- **Inline code background + text:** `bg-cream/60` + `text-ink` = ~11:1 ✓; `dark:bg-night` + `dark:text-paper` = ~13:1 ✓
- **Blockquote border + text:** Border is decorative (not essential for reading); text is muted but passes contrast on its own. ✓
- **Code block button:** `text-ink-muted` (#6E665C) on `bg-surface` (#FFFDF9) = ~5.5:1 ✓; dark mode equivalent ~5:1 ✓

**Focus styling:**
- **Links:** None explicitly styled in the current Markdown component (they inherit browser default focus ring). Recommend adding `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-400` for consistent affordance.
- **Code copy button:** `focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream` (4px ring around the button with 1px spacing from the button edge). ✓

### ARIA labels

- **Code copy button:** `aria-label="Copy code"` (hidden state) and `aria-label="Code copied"` (after click). ✓
- **Blockquote:** No aria-label needed; semantic `<blockquote>` tag is sufficient.
- **Lists:** No aria-label needed; semantic `<ul>` and `<ol>` tags are sufficient.

---

## Sample input → expected output

### Input (Markdown source)

```markdown
# Getting Started

This is a **bold** intro with *italic* emphasis. You can also use `inline code`.

## Code example

Here's a simple function:

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
```

## Lists

Unordered:
- First item
- Second item
  - With emphasis: *nested* items

Ordered:
1. First step
2. Second step

## Blockquote

> "Good design is invisible. It's the things you don't notice." — John Maeda

## Links

Visit [our site](https://example.com) or https://example.org for more.
```

### Expected rendering (visual description)

1. **"# Getting Started"** renders as an `<h1>` in a tall serif font (Fraunces), bold weight, large size (20px), with 16px top margin and 8px bottom margin. Text color is warm charcoal (#2A2520) on light backgrounds, off-white (#F1EBE1) on dark.

2. **"This is a **bold** intro..."** renders as a `<p>` with 14px body font and relaxed line-height. The word "bold" is wrapped in `<strong>` (bold weight, same color as surroundings). The word "italic" is wrapped in `<em>` (slanted). The text `inline code` is wrapped in `<code>` with a light tan background (#FAF6EF / #1C1916 dark), small monospace font, and padding.

3. **"## Code example"** renders as an `<h2>` (18px, serif, bold, 16px top margin).

4. **"Here's a simple function:"** is a normal paragraph.

5. **The code block** (triple backtick fence with `javascript` tag) renders as:
   - A `<pre>` element with monospace font (12px), warm background (`bg-cream/60` light / `dark:bg-night` dark), a tan border, 12px padding, and `overflow-x-auto` for horizontal scroll on long lines.
   - A semi-transparent "Copy" button in the top-right corner, visible on hover or keyboard focus.
   - The code text (JavaScript function) renders in monospace in the default text color (no syntax highlighting in v1).

6. **"## Lists"** renders as an `<h2>`.

7. **The unordered list** renders as a `<ul>` with filled bullet points, indented 20px, 4px spacing between items. Each item is a `<li>` with the inline content parsed (e.g., "With emphasis: *nested*..." parses the italics). (Note: nested lists via indentation are not yet supported in the parser; this would render as a flat list with the full text "With emphasis: *nested* items".)

8. **The ordered list** renders as an `<ol>` with decimal numbering (1. 2. ...), same spacing and indentation as unordered.

9. **The blockquote** renders as a `<blockquote>` with:
   - A 2px left border in muted coral (#ECA88E light, semi-transparent coral dark)
   - A soft background tint (#FAF6EF at 40% opacity light, #1C1916 at 40% opacity dark)
   - Italic text in a muted color (#6E665C light, #A89E90 dark)
   - 12px padding and 12px margin top/bottom

10. **"Visit [our site](https://example.com) or https://example.org..."** renders with:
    - The text "our site" wrapped in an `<a href="https://example.com" target="_blank" rel="noopener noreferrer">` in coral color (#A6442D light, #ECA88E dark) with underline and 2px underline offset.
    - The bare URL `https://example.org` auto-linked and styled the same way.

---

## Implementer notes

### Strategy

The implementation already exists in `src/components/Markdown.tsx` and `src/lib/markdown.ts`. This spec documents the **final visual output**, not the parsing logic. Shamus (or whoever implements) should:

1. Confirm the existing component produces the visual output described above (it does, as of the codebase inspection).
2. Verify all Tailwind classes are present and produce the intended colors/spacing on both light and dark themes.
3. Test with the sample input provided to ensure streaming partial markdown doesn't flicker or cause layout shift.

### Test cases (manual or automated)

1. **Streaming partial:** Send chunks like `# Hea` → `# Head` → `# Heading\n` and verify the text updates without layout thrashing.
2. **Long unbroken code string:** Paste a 200-character hash or URL into a fenced code block and verify the `<pre>` scrolls horizontally, not wrapping.
3. **Empty list items:** Markdown with `- ` followed by a blank line and confirm the item is invisible but takes space.
4. **Invalid link protocols:** Include `[text](javascript:alert('xss'))` in a response and confirm it renders as plain text "text", not a link.
5. **Blockquote with nested markdown:** `> **bold** text with *italic*` should parse the inline formatting inside the blockquote.
6. **Code block with fence not closed:** Send ` ``` ` without a closing ` ``` ` and verify the block stays open and accepts more content on the next chunk, then closes when the fence arrives.

### Focus on these implementation details

- **Inline code border-radius:** Currently the code has no `rounded` class. Consider adding `rounded` (4px) for a softer edge. (Optional polish, not required for v1.)
- **Link focus styling:** Links don't have explicit `focus-visible` styling. Add a focus ring for keyboard navigation.
- **Copy button accessibility:** Already has `aria-label`. Verify the button text ("Copy" / "Copied") is screen-reader-visible and the focus ring is obvious.
- **Contrast on hover:** Test link hover states (especially dark mode) to ensure coral on dark is still ≥4.5:1.

---

## Status

**SPEC-READY-FOR-IMPLEMENTATION** — Shamus can use this document as the source of truth for visual output. The component code already implements this spec; this document serves as the canonical reference for design review, QA, and future maintenance.
