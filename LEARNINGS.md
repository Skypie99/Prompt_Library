# LEARNINGS — Prompt Library

_Started by Will on 2026-05-23 during the fastloop session. New entries on top; never edit older entries — append corrections as a new dated note._

---

## 2026-05-23 — Night cycle 4 (post-build clean)

Cycle = 3 builds + 1 clean. Features: F-night-10 (auto-link bare URLs
in Markdown), F-night-11 (category color stripe on cards), F-night-12
(category count badges on CategoryChips).

### What the clean pass caught

- **F-night-12 test catch-up.** The `getCategoriesWithCounts` test block
  didn't land in the feature commit (one Edit succeeded, the next was
  rejected because the prior import-bump had shifted the file). Clean
  pass appended the missing 5 cases.

### Patterns reinforced

- **Always grep -c after a multi-edit to verify both halves landed.**
  Especially when two edits touch the same file: the first changes the
  state the second was matching against. Cheap to verify.
- **Pair pattern: getX → getXWithCounts.** F-eve-2 set the precedent
  for tags; F-night-12 follows it for categories. The "with counts"
  variant becomes the canonical primitive, and the legacy `getX`
  delegates. Easy to extend (favorites with counts? recent with run
  counts?) when we want.
- **Per-category color stripe.** Deterministic hash → fixed palette is
  a familiar trick; the 3px stripe is enough signal for scanning
  without competing with content. Aria-hidden because the visible
  category chip already names it.

### Clean pass result

1 fix (test catch-up). Otherwise green.

---

## 2026-05-23 — Night cycle 3 (post-build clean)

Cycle = 3 builds + 1 clean. Features: F-night-7 (`s` keyboard shortcut
to favorite the open prompt), F-night-8 (live word/char count in
PromptForm body), F-night-9 (live preview pane in PromptForm).

### Patterns reinforced

- **Inline a 6-line util rather than cross domains for it.** F-night-7
  needed an `isTypingTarget` check inside PromptDetail; the existing
  copy in HomeClient is also 6 lines. Pulling into a shared utility
  module would have crossed three components for two lines. Logged
  the dup explicitly in a comment so future-me knows it was a choice.
- **"(s)" in the visible tooltip label** is how to teach a keyboard
  shortcut to a sighted user without adding a separate help affordance.
  Same trick as the existing "⌘K" badge in the search button.
- **Reuse the same primitive for visual consistency.** F-night-9's
  body preview reuses `parseBody` from `variables.ts` — the same
  parser PromptDetail uses for its preview pane — so the dashed
  coral chip for an unfilled `{{token}}` looks identical across the
  author-side preview and the runner-side preview. One language.
- **Memo the parse, not the render.** F-night-9 memoizes `parseBody`
  on the body string; the render of the resulting segments is cheap
  and runs on every re-render. The right boundary for memo is the
  expensive bit (regex walk), not every JSX leaf.

### Clean pass

No fixes needed.

---

## 2026-05-23 — Night cycle 2 (post-build clean)

Cycle = 3 builds + 1 clean. Features: F-night-4 (history status filter),
F-night-5 (auto-grow variable textareas), F-night-6 (suggested tags
in PromptForm).

### Patterns reinforced

- **Filter BEFORE decoration.** F-night-4's status filter applies before
  the relative-time formatter runs. The 30s tick re-rendering the panel
  doesn't waste cycles formatting entries the user filtered out.
- **Reset transient state on prompt switch.** The new `statusFilter`
  joins `openRunId`, `confirmingClear`, `copiedRunId` in the
  `useEffect([promptId])` reset. Easy to forget; pinning the pattern.
- **AutoGrowTextarea pattern.** RAF + `height: auto` + `scrollHeight`
  with a max cap is ~30 lines and handles 95% of cases. Manual user
  resize still works because the native handle's last drag wins until
  the next keystroke. Acceptable tradeoff vs ResizeObserver complexity.
- **Suggested-from-context pattern.** F-night-6 surfaces existing
  library tags as one-click chips. Frequency order from the existing
  `tagsWithCounts` means the most-used tags suggest first, encouraging
  consistency without enforcing it.

### Clean pass

No fixes needed. Same green signal as night-1: in-loop reviews caught
the real issues at build time.

---

## 2026-05-23 — Night cycle 1 (post-build clean)

Cycle = 3 builds + 1 clean. Features: F-night-1 (variable count badge),
F-night-2 (Clear filters header button), F-night-3 (Markdown code block
copy buttons).

### What the clean pass found

Nothing actionable. The in-loop reviews caught the relevant a11y +
clarity issues at feature time. Signals worth noting:

- `countBodyVariables` reused the existing `TOKEN_SOURCE` regex from
  `variables.ts` — kept the dedup rule in one place.
- The new Clear-filters button mirrors the existing empty-state Clear
  button, so users see the same affordance whether they've narrowed
  to a non-empty subset OR to zero.
- The `CodeBlock` subcomponent uses `group/code` (Tailwind named group)
  so its hover state doesn't conflict with any parent `group`. Worth
  reaching for when adding nested hover-revealed UI.

### Pattern reinforced

- **"No fix needed" is a real outcome.** Documented here instead of
  silently skipped, so future-me reading the LEARNINGS sees the
  clean loop ran and validated, not that it was skipped.

---

## 2026-05-23 — Clean loop (post-eve sweep)

### What the in-loop Alex+Gary pattern caught (cycle/auto-2026-05-23-eve)

Every one of the four eve loops surfaced something a deferred end-sweep would have missed. Worth pinning:

- **F-eve-1 sort dropdown** — Alex found the wrapping `<label>` was double-naming with the select's own `aria-label`. One redundant span, but real noise for screen readers.
- **F-eve-2 tag counts** — at 10px on cream, `text-ink-soft` was ~3.5:1 (under AA). One color-token bump and it's ~6.7:1. Easy to miss in a perf/test end-sweep where contrast isn't the focus. Alex also found two missing focus-visible rings on "+N more" / "Show fewer" that had been carried for several iterations.
- **F-eve-3 Resume pill** — `truncate` on a flex child without `min-w-0 flex-1` is one of the most common silent-overflow bugs. Long titles would have shipped without the clip.
- **F-eve-4 Run again** — biggest catch: the button was *inside* the History panel (bottom of the right column); a click would kick off a stream the user couldn't see without scrolling up. Adding `responsePanelRef` + `scrollIntoView` on the run-again handler turned the feature from "technically works" to "obvious." Pure UX, but it's the kind of thing only somebody asking "what does this look like one second after the click?" notices.

### What this loop tightened

- **HomeClient `tags` → `tagsWithCounts`** — the F-eve-2 memo's shape changed from `string[]` to `{tag, count}[]` but the variable name stayed `tags`. Every call site now reads unambiguously.

### Patterns confirmed (or reconfirmed)

- **In-loop Alex + Gary is worth it for any feature with UI.** Each loop's review took maybe 5% of total feature time and caught a real defect every time. Deferring to one end-sweep would have batched these into a long fix queue and several would have shipped.
- **Real fixes only, not ceremony.** When Peter scanned and found nothing this loop, that was logged as a green signal in the briefing, not as a hidden skipped step. "Nothing to change" is a real outcome.
- **The `runWithValues(values)` refactor in PromptDetail** (F-eve-4) was a textbook React stale-closure escape: extract the side-effecting function to take an explicit parameter, then have the button binding pass current state. The wrapper `handleRun = () => runWithValues(values)` keeps the existing call sites untouched and avoids the `setValues + handleRun` race. Will reach for this pattern again.

---

## 2026-05-23 — Clean loop (post-fastloop sweep)

### What got tightened

- **F-fast-1 token estimate** — `Math.max(1, Math.ceil(finalText.length / 4))` was inlined twice per render (visible text + aria-label). Hoisted to a single `tokenEstimate` const so the value can't drift between the two and `Math.ceil` only runs once per keystroke. aria-label now also uses `toLocaleString()` so screen-reader number formatting matches the visible text.
- **F-fast-3 storage card** — was a `<div>` with a span-as-header. Promoted to `<section aria-labelledby>` with the heading carrying a real `id`, so the inner `<ul>` of bucket rows is announced as part of a labeled region instead of a context-free list. Visual unchanged.
- **Tests co-located** — the single `fastloop.test.ts` was useful for one session but breaks the one-test-file-per-pure-logic-module pattern. Moved: `loadAllRunCounts` → `runs.test.ts`, `getStorageUsage`/`formatBytes` → `library.test.ts`, density → new `density.test.ts`. `fastloop.test.ts` deleted. Net case count unchanged.

### Things checked but found clean (no commit needed)

- **Peter (perf)** — every fastloop callback is wrapped in `useCallback` with stable deps; new state is plain `useState` with no derived shape worth memoizing; conditional density classes in PromptCard are cheap string concat. Nothing to memoize.
- **DensityToggle, Copy template link, EmptyHint** — all have focus-visible rings on the established `coral-400` pattern; all have explicit aria-labels.
- **Storage usage bucket order** — Prompts → Run history → Values → Favorites+Recent → Settings → App state. Readable user-facing sequence; no change.

### Patterns this loop confirmed

- **Co-locate tests with their module the day they ship.** It's free during the loop and adds friction later. The single combined file felt fine for one session and looked wrong by the next morning.
- **`aria-labelledby` over `aria-label` when a visible heading exists.** A real `<h3 id>` + `<section aria-labelledby>` ties the visible label to the screen-reader announcement, so you can change the heading in one place and the AT announcement follows.
- **A clean loop with no commit per role is a valid signal.** Peter found nothing to change here; that's documented as a green flag, not skipped.

---

## 2026-05-23 — Fastloop session (F-fast-1..5)

### Patterns that worked

1. **Per-prompt sub-keys + a public prefix list.** The AM-cycle `data-harden` commit established `PER_PROMPT_PREFIXES` in `library.ts`; every fastloop feature that needed to enumerate per-prompt state (F-fast-2 run counts, F-fast-3 storage breakdown) leaned on this once-walked pattern. One `for (let i = 0; i < localStorage.length; i++)` per feature, never N JSON.parses for N prompts.

2. **`writeJSON` returning a structured outcome** (also from the AM data-harden) saved us from re-inventing error-surfacing in every new write path. F-fast-3 is read-only so it didn't use it, but F-fast-5 (density preference) inherited the same pattern wordlessly.

3. **Optional, defaulted props for grid props (`density?: Density`).** Lets PromptGrid and PromptCard ship F-fast-5 without any caller having to be updated all at once — old callers pass nothing, get the comfortable layout, no change. The new HomeClient passes `density`, and that single change flips the whole grid.

4. **Aria-labels that spell out the action.** Every fastloop button has an aria-label that says what'll happen on the next click (e.g. "Switch to compact view" on the density toggle, "Copy the prompt template with unfilled variables" on the new copy button). Reads naturally even without seeing the icon.

5. **Small "~" prefix on estimates.** F-fast-1 (chars/tokens) and F-fast-3 (storage bytes) both use a leading `~` and a "approximate" frame in the aria-label. Honest about precision, prevents nobody from misreading.

### Gotchas

1. **React 19 JSX namespace.** Typing `icon: (props: SVGProps<...>) => JSX.Element` fails with `Cannot find namespace 'JSX'` under React 19's preferred type setup. Use `ComponentType<SVGProps<...>>` instead. (Hit this in `EmptyHint.tsx` during the PM cycle; remembered it for `DensityToggle.tsx` this fastloop.)

2. **`useRef` for copy-confirm timers per button.** F-fast-4 added a second copy action; the temptation was to reuse `copyTimer`. Independent `templateCopyTimer` ref keeps the two confirm flashes from fighting. Cleared in the unmount cleanup alongside the original. Tiny detail; would have been a real bug otherwise.

3. **`runCounts` map identity matters.** When deleting a prompt, mutating the existing Map in-place would not trigger PromptGrid re-renders (same reference). Always returning a NEW Map (`new Map(prev); next.delete(id);`) is the pattern.

### Patterns I'd repeat next session

- **Stacking onto the previous day's branches** rather than branching from `main` — every fastloop feature got to use the storage discipline, Markdown renderer, and import flow from AM/PM without re-creating them. Sky can still merge any subset.
- **Per-feature commit subject prefixed with the F-fast-N tag** — easy to `git log --oneline` and see exactly which feature each commit belongs to.
- **One typecheck per role transition + one production build at the end** — kept the per-feature loop fast without skipping the safety net.

### Patterns to revise

- **Tests added in a single combined `fastloop.test.ts` file** — convenient for one session but it'll get cluttered fast. Next time, co-locate one test file per new pure-logic module (the AM/PM pattern). Already noted in the file's docstring so a refactor is easy.
- **Density toggle could one day live alongside future density-related preferences** (e.g. row-vs-grid for the prompt list). A `src/lib/preferences.ts` consolidation might make sense after a few more feature flags accumulate, but not yet (rule of three).

## 2026-05-23 — Night2 cycles (2 fast + 1 clean × 10)

Fast cycles for surface polish. Each entry below = one cycle's worth.

### Cycle 1
- F-n2-1: native `title` attribute beats a custom popover for "show me the body on hover" — keyboard-focus accessible, no bundle weight, OS-native look.
- F-n2-2: pure derived stats footer using the runCounts map already gathered for F-fast-2. Aria-label spells the categories so the dot separator doesn't get read as "twelve dot three".

### Cycle 2
- F-n2-3: a "?" icon button in the Header is the discoverable companion to the existing keyboard binding. Both paths reach the same modal; sighted users find the button, keyboard users press the key.
- F-n2-4: × clear buttons should be `tabIndex={-1}` so they don't bloat the keyboard tab order — focused users can Cmd-A + Delete or Esc + reset just as easily.

### Cycle 3
- F-n2-5/6: meta-key prefix avoids the "do we hijack a digit keystroke?" tension. Cmd+1..9 in the palette opens the Nth result; bare digits still type into the search input.
- F-n2-6: when there's no query, "recent first" beats "alphabetical" — the user just opened the palette to get back to something.

### Cycle 4
- F-n2-7: blockquote was a one-block-type addition — define the regex, gather consecutive matching lines, emit a single node, exclude from the paragraph gobbler. Tiny.
- F-n2-8: `setSelectionRange` inside a RAF after a controlled-textarea state change is the dance for "insert text and place the caret inside it". The RAF gives React time to commit before the DOM read.

### Cycle 5
- F-n2-9: storing "system" as the ABSENCE of the localStorage key (instead of the literal string "system") meant zero changes to the no-flash script in layout.tsx — the script's existing fall-through to matchMedia already handled "missing key". The toggle stays the source of truth via removeItem.
- F-n2-10: reuse the existing `wipeAllUserData` from F5 (Replace import). One scope definition for "what's user data," used by both Import-Replace and Reset.

### Cycle 6
- F-n2-11: optional fields (`label?`) on stored shapes are forward-compatible — old runs without the field load fine, new ones get the value. No migration. Inline edit with autoFocus + onBlur/Enter commit is the canonical "edit in place" pattern.
- F-n2-12: per-prompt history export uses the same Blob + object URL + setTimeout-revoke trick as the library-wide export. Tiny scope (~20 lines), big "share this with someone" value.

### Cycle 7
- F-n2-13: parallel-walk pattern. `loadAllLastRunIsos` is a structural copy of `loadAllRunCounts` (same prefix walk, different per-key extraction). Once you have two of these, a generic `walkPromptlibKeys(prefix, extract)` is worth it. Not yet — still rule of three.
- F-n2-14: "show only when different" is the right filter for offered actions. Don't offer a no-op fill, and don't show absent-history affordances.

### Cycle 8
- F-n2-15: indented code blocks share the same `code-block` AST node as fenced ones, so the existing F-night-3 copy button works for both with zero extra code. Reuse > re-invent.
- F-n2-16: a one-line privacy note in the footer ("All data stays in this browser") answers the question users never ask out loud. Free trust.
