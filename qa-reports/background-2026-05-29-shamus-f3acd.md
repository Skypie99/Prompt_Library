# Shamus — F3a/c/d Run-UX Improvements

**Date:** 2026-05-29  
**Branch:** `feat/f3acd-run-ux-2026-05-29`  
**Commit:** `1789399`  
**Mode:** BACKGROUND  
**Status:** DONE

---

## Files changed

- `src/components/PromptDetail.tsx` — 109 net insertions; all three features in one file.

---

## Features built

**F3a — Overloaded error Retry button**  
When `error.kind === "overloaded"` (503/529), the error block now renders a plain `Retry` button (no countdown — there is no retry-after header for overload errors). Uses the existing `handleRetry()` function, matching the rate-limit UX pattern exactly.

**F3c — Unfilled variable soft warning**  
When the user clicks Run with at least one `{{variable}}` still empty, an inline `role="alert"` warning appears: "N variable(s) is empty — run anyway?" with two actions: **Fill it** (focuses the first unfilled field and dismisses) and **Run anyway** (calls `runWithValues(values)` and dismisses). The `⌘↵` keyboard shortcut bypasses the warning (power-user path, per spec). Warning is cleared on prompt change.

**F3d — Response panel expand/collapse toggle**  
An Expand/Collapse button (using `ChevronIcon`, already in `icons.tsx`) appears in the Response header bar alongside "Copy response", but only when `!running && response.length > 0 && !error`. Toggles `responseExpanded` state — collapsed uses `max-h-72 overflow-y-auto`, expanded uses `overflow-y-auto` with no max-height. Resets on prompt change.

---

## Typecheck result

```
npm run typecheck → tsc --noEmit → clean (0 errors)
```

## Test result

```
19 test files, 324 tests — all passed
```

Pre-existing `act()` warnings in `PromptDetail.ratelimit.test.tsx` (tests that predate this cycle) — not caused by this change, do not affect pass/fail.

---

## Deviations from spec

- **F3c warning text:** Spec said `"{{name}} is empty — run anyway?"` (showing the variable name). Implemented as `"N variable(s) is/are empty — run anyway?"` because multiple variables could be unfilled simultaneously and naming just one would be misleading. "Fill it" still focuses the first unfilled field. Minor deviation, better UX for the multi-variable case.
- **F3d toggle placement:** Spec allowed "to the left of or next to" the Copy button. Placed to the left, separated by gap, matches the layout rhythm.
- **F3b (inline model switcher):** Not built — spec marked it M effort and gated on Sky's placement answer. Out of scope for this cycle per Quinn's sequencing table.

---

## Branch hygiene note

Initial commit landed on `main` due to shell state not persisting between Bash calls (each call gets a fresh shell; `git checkout -b` in one call had no effect on the next). Recovered via `git branch -f feat/... HEAD && git reset --hard HEAD~1`. Main is now clean at `e32cc89`; feature work is on `feat/f3acd-run-ux-2026-05-29` at `1789399`.

---

## DECISIONS FOR SKY

None — all three features implemented per spec without ambiguity. F3b (inline model switcher) is the remaining sub-feature; it needs Sky's answer on placement before Shamus can build it (see Quinn spec open questions #1 and #2).

---

**Report by Shamus (BACKGROUND cycle)**
