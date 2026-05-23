# LEARNINGS — Prompt Library

_Started by Will on 2026-05-23 during the fastloop session. New entries on top; never edit older entries — append corrections as a new dated note._

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
