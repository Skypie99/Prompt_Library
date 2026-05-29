# Gary — F3 Tests + @ts-expect-error Cleanup

**Date:** 2026-05-29
**Mode:** BACKGROUND
**Status:** DONE

---

## PART 1 — F3a/c/d Test Coverage

**Branch:** `feat/f3acd-run-ux-2026-05-29`
**Commit:** `5fef419`

### Tests written

New file: `tests/PromptDetail.f3acd.test.tsx` — 11 tests total.

**F3a — Overloaded retry button (3 tests)**
- Renders a Retry button when `error.kind === "overloaded"` ✓
- Clicking Retry calls streamClaude again with same apiKey/prompt/model ✓
- Rate-limit error with countdown shows countdown text, not plain Retry (regression guard) ✓

**F3c — Unfilled variable soft warning (5 tests)**
- All variables filled → Run proceeds without warning ✓
- One variable empty → clicking Run shows `role="alert"` warning with correct text ✓
- Clicking "Run anyway" dismisses warning and calls streamClaude ✓
- Clicking "Fill it" dismisses warning without calling streamClaude ✓
- ⌘↵ keyboard shortcut bypasses the unfilled variable warning ✓

**F3d — Response panel expand/collapse toggle (3 tests)**
- Expand toggle is NOT visible before any response ✓
- Expand toggle appears after successful response received ✓
- Clicking Expand → Collapse button; clicking Collapse → Expand button ✓

### Bug found and fixed

**Implementation bug:** Shamus's comment on `handleRun()` said "The ⌘↵ shortcut bypasses this (power-user path via handleModalKeyDown)" but `handleModalKeyDown` called `handleRun()` which includes the F3c gate — so ⌘↵ did NOT actually bypass the warning.

**Fix:** `handleModalKeyDown` now calls `runWithValues(values)` directly, skipping the warning gate. One-line change to `src/components/PromptDetail.tsx`.

### Test results

```
All 11 new F3 tests: PASS
Full suite (335 tests, 20 files): PASS
Typecheck: CLEAN
```

---

## PART 2 — @ts-expect-error Description Cleanup

**Branch:** `ci/eslint-setup-2026-05-29`
**Commit:** `f60fe22`

### Problem

ESLint rule `@typescript-eslint/ban-ts-comment` requires a 3-char+ description after `@ts-expect-error`. 18 errors across 7 test files — all in `uninstallFakeStorage()` teardown helpers that `delete globalThis.window` and `delete globalThis.localStorage`.

### Files fixed

- `src/lib/__tests__/density.test.ts` — 2 descriptions added
- `src/lib/__tests__/integration-run-pipeline.test.ts` — 2 added
- `src/lib/__tests__/library-storage.test.ts` — 2 added
- `src/lib/__tests__/library.test.ts` — 2 added
- `src/lib/__tests__/runs-extra.test.ts` — 2 added
- `src/lib/__tests__/sort.test.ts` — 2 added
- `src/lib/__tests__/values.test.ts` — 2 added

**Total:** 14 descriptions added. All explain: "globalThis.window/localStorage is not typed as optional but delete is safe in jsdom test teardown."

### Lint results after fix

```
ban-ts-comment errors: 0 (was 18)
Remaining lint issues (pre-existing, not introduced here):
  - 4 errors: React setState-in-effect / impure-during-render (pre-existing)
  - 19 warnings: prettier trailing-comma + 2 unused-var (deferred)
```

```
npm run lint → 23 problems (4 errors, 19 warnings) — all pre-existing
npm run typecheck → CLEAN
npm run test → 324 tests, 19 files — PASS
```

---

## DECISIONS FOR SKY

None. Both tasks completed cleanly.

**Pre-existing lint errors (4):** Three `setState synchronously within an effect` and one `impure function during render` — these are pre-existing and not in scope for this cycle. Flag for Shamus if/when the ESLint branch gets merged.

---

**Report by Gary (BACKGROUND cycle)**
