# Peter — Perf Audit: Teal + F3 Branches
**Date:** 2026-05-29
**Verdict:** CLEAR

---

## Teal re-skin (`feat/teal-reskin-2026-05-29`)

### CSS bundle impact
`tailwind.config.ts` is **unchanged** on this branch. The diff touches no color keys — no new palette entries, no new scale values, no new utility class families. Tailwind's JIT scan sees the same token surface as before; CSS bundle size is effectively identical. The one change to the color token used is purely in `categoryColor.ts` (a hex literal in TS, not in Tailwind config), so it produces zero new utility classes.

### JS bundle impact
Zero new imports, zero new `useState`/`useEffect` hooks, zero new components. All 14 changed `src/` files are pure className string replacements — swapping warm amber/orange tokens for teal variants. The JS chunk produced by this branch is byte-for-byte equivalent to main except for longer class string literals in a handful of components (marginal, sub-KB).

### Computational complexity
`categoryColor.ts`: the PALETTE array retains all 8 entries. The only change is one hex value in entry 0 (`#6FA09A` → `#678D87`, a lightness tweak for WCAG 1.4.11 compliance). The hash function (`djb2`, O(|category_name|)), the modulo lookup, and the early-return for empty string are all unchanged. Complexity: O(k) where k is the length of the category string — same as before, bounded by typical category name lengths (< 50 chars).

**Bottom line: no CSS regression, no JS regression, no algorithmic change.**

---

## F3 run-UX (`feat/f3acd-run-ux-2026-05-29`)

### F3c — unfilled variable check on "Run" click
The guard in `handleRun()` is:
```
if (variables.length > 0 && filledCount < variables.length)
```
`variables` is a `useMemo`-cached result of `extractVariables(prompt)` — recomputed only when `prompt` changes, not on every keystroke. `filledCount` is `countFilled(variables, values)`, which is a single `Array.filter` over the already-resolved variables array. Both are O(n) where n = number of unique variables in the prompt.

**Bound on n:** There is no hard cap enforced in this codebase, but real-world prompts have O(10) variables at most; the regex-based extractor deduplicates by name, so repeated use of `{{name}}` counts once. No evidence of prompts with hundreds of variables in seed data or user-created content. Even at n=100 the filter is microsecond-scale.

The "Fill it" handler does one `Array.find` over the same cached `variables` array — O(n), same bound, called only on user click.

**No perf concern.**

### F3d — expand/collapse toggle (`responseExpanded` state)
`responseExpanded` is a single boolean `useState`. The toggle is `setResponseExpanded((prev) => !prev)` — no prop drilling, no lifted state, no context update. It affects only the `className` of the response `<div>` via a `clsx` call (`max-h-72` added or removed). React re-renders only the containing `PromptDetail` component, which it would do anyway for any state update inside it. The `Markdown` child receives the same `source` prop and will not re-render (no prop change). The `ChevronIcon` and button labels update, but those are trivial.

State is appropriately local — it does not live in any parent or context, so it cannot cascade outward. Reset to `false` on prompt change (in the `useEffect([prompt?.id])` block), so no stale-expanded state across prompts.

**No unnecessary re-renders. State placement is correct.**

### F3a — overloaded (503/529) retry guard
The `handleRetry` function is shared between the existing rate-limit path and the new overloaded path. The critical guard is `disabled={running}` on the overloaded Retry button, which mirrors the `running` state lock already used throughout the component. `running` is set to `true` at the top of `runWithValues` and back to `false` in the `finally` block — so rapid double-clicks while a request is in flight simply do nothing (the button is disabled and unclickable).

There is **no debounce**, but there does not need to be: the `disabled={running}` attribute is the correct and sufficient concurrency guard for a button that triggers an async operation. This is the same pattern as the Stop/Run button swap already present in the component.

For the rate-limit path, the retry button (shown when `retryCountdown !== null`) does NOT carry `disabled={running}`, meaning a user who clicks "Retry now" during an active countdown-overlapping run could theoretically stack. However, that path predates this branch and is out of scope for this audit. The new overloaded path is correctly hardened.

**F3a: no stacking possible via the new overloaded button. CLEAR.**

---

## Summary of findings

| Area | Finding | Severity |
|---|---|---|
| Teal CSS bundle | No new Tailwind keys; no bundle growth | None |
| Teal JS bundle | No new hooks/imports; class-string-only diff | None |
| `categoryColor` | Palette count unchanged (8); O(k) hash unchanged | None |
| F3c variable check | O(n) filter on memo-cached array; n bounded in practice | None |
| F3d expand toggle | Local boolean state; no cascade; correct reset | None |
| F3a retry guard | `disabled={running}` prevents concurrent overloaded retries | None |
| F-r2 rate-limit "Retry now" | No `disabled` guard on that button (pre-existing) | Note (pre-existing, out of scope) |

---

## ESCALATIONS

None. Both branches are CLEAR from a performance standpoint.

**Pre-existing note (not a blocker for these merges):** The rate-limit "Retry now" button (F-r2, already on `main`) does not carry `disabled={running}`. A user who clicks "Retry now" during an active run could queue a second concurrent `streamClaude` call. Recommend Gary adds a `disabled={running || retryCountdown === null}` guard in a follow-up ticket — not a blocker for these two branches.
