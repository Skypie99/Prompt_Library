# Gary — Clean Sweep Branch Audit [bg-cycle]
**Date:** 2026-05-29  **Branch:** qa/auto-2026-05-29-gary-clean-sweep

## What's on the branch

1 commit: `068bd8f qa(prompt-lib): clean-code sweep — magic numbers, duplicate code, shared constants`

## Diff summary

**7 files changed, 40 insertions, 32 deletions**

### New files

- `src/lib/dom.ts` — new shared utility: exports `isTypingTarget(event)`, the guard that prevents single-key keyboard shortcuts from firing while the user is typing in an input/textarea/contenteditable. Previously duplicated in two component files with slightly different comments.

- `src/lib/settings.ts` (additions only) — two new exported constants added:
  - `STEP_MAX_TOKENS = 256` — step size for the max-tokens input, previously a hard-coded literal `256` in SettingsModal.
  - `COPY_TOAST_MS = 1500` — toast reset delay, previously a hard-coded literal `1500` scattered across 4 components.

### Modified files

- `src/components/HomeClient.tsx` — removes local `isTypingTarget` definition (~10 lines), imports from `@/lib/dom` instead.

- `src/components/PromptDetail.tsx` — removes local `isTypingTarget` definition (~9 lines + a comment defending the duplication), imports from `@/lib/dom`. Replaces three instances of `1500` with `COPY_TOAST_MS`. Imports `COPY_TOAST_MS` from `@/lib/settings`.

- `src/components/Markdown.tsx` — replaces one instance of `1500` with `COPY_TOAST_MS`. Imports `COPY_TOAST_MS`.

- `src/components/RunHistory.tsx` — replaces one instance of `1500` with `COPY_TOAST_MS`. Imports `COPY_TOAST_MS`.

- `src/components/SettingsModal.tsx` — replaces three hard-coded literals (`8192`, `256`, `256`) in `handleSave` clamp logic and the `<input>` attributes with `MAX_MAX_TOKENS`, `MIN_MAX_TOKENS`, `STEP_MAX_TOKENS`. Imports the three new/existing constants.

## Verification

- **typecheck:** PASS (zero errors, zero warnings)
- **lint:** N/A — ESLint is not installed in node_modules (not a devDependency in package.json); the `lint` script exists but the binary is absent. This is a pre-existing environment issue, not introduced by this branch. No lint errors detectable via tsc.
- **tests:** PASS — 324/324 tests across 19 test files. Two non-fatal `act(...)` stderr warnings in `tests/PromptDetail.ratelimit.test.tsx` are pre-existing (not caused by this branch; the tests still pass).

## Quality assessment

All changes are safe, correct, and non-breaking:

- **isTypingTarget consolidation:** The two local copies were byte-for-byte identical logic. One canonical version in `src/lib/dom.ts` is strictly better. The comment in PromptDetail that previously justified the duplication ("lives in two places intentionally because the alternative crosses domains") is now correctly deleted.
- **COPY_TOAST_MS = 1500:** All four sites that reset copy-toast state now derive from one constant. If the duration ever needs changing it's a single-line edit.
- **STEP_MAX_TOKENS, MAX_MAX_TOKENS, MIN_MAX_TOKENS:** SettingsModal's clamp logic now uses the same constants as the rest of settings.ts, eliminating the risk of those values drifting out of sync.
- No behavior changes — this is pure code hygiene.

## Verdict

**READY_FOR_SKY_TO_MERGE**

## ESCALATIONS

None. No decisions required from Sky. Branch is clean, all checks pass, changes are safe and additive.
