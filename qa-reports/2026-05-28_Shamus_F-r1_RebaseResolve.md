# Shamus — F-r1 Rebase Resolve

**Date:** 2026-05-28
**Branch:** fix/a11y-api-nudge-2026-05-26
**Prior HEAD:** 940d203 (pre-rebase)
**New HEAD:** 6437a17
**Base (main):** 7e92998 (324 tests)

---

## Summary

Fresh rebase of `fix/a11y-api-nudge-2026-05-26` onto `main` @ 7e92998. Prior attempt killed by session drop. Completed cleanly.

---

## Semantic changes preserved

- **`src/components/ApiKeyNudge.tsx`** — new file (no conflict; applied cleanly)
- **`src/components/HomeClient.tsx`** — `ApiKeyNudge` import, `showApiKeyNudge` state, nudge mount logic in `useEffect`, `dismissApiKeyNudge` callback, `updateSettings` suppression on key-save, nudge render
- **`src/components/SettingsModal.tsx`** — `modalRef` + `triggerRef`, focus-trap `useEffect` (Tab/Shift+Tab), focus-restore `useEffect`, `role="dialog"` + `aria-modal` + `aria-labelledby`, `id="settings-modal-title"`, close button ring color upgrade, "Show/Hide" button contrast fix
- **`src/components/OnboardingHint.tsx`** — `type="button"`, enlarged hit target `h-7 w-7 → h-11 w-11`, `focus-visible` ring
- **`src/lib/settings.ts`** — `MIN_MAX_TOKENS = 256`, `MAX_MAX_TOKENS = 8192`, `clampMaxTokens()`, applied at load-time
- **`src/lib/__tests__/settings.test.ts`** — 3 new tests for clamp behavior; "known gap" comment removed

---

## Conflicts resolved (5 files)

| File | Strategy | Reason |
|---|---|---|
| `tsconfig.json` | `--theirs` | Formatting-only, branch predates changes |
| `.prettierrc.json` | `--theirs` | Both-added, branch adds same content as main |
| `src/components/RunHistory.tsx` | `--theirs` | Trailing-comma formatting only |
| `src/lib/__tests__/runs.test.ts` | `--theirs` | Trailing-comma formatting only |
| `src/components/PromptDetail.tsx` | Manual | `e7335d4` tried to add `handleRestoreInputs` which was already present at line 211 from the feat commit; removed duplicate conflict block, kept HEAD |

---

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | PASS — clean (no output) |
| `npm test -- --run` | PASS — 324/324 tests (322 main baseline + 2 F-r1 tests) |
| `npm run lint` | SKIPPED — ESLint not in package.json devDeps (pre-existing gap on main; lock file has the pkg but package.json does not). Not a regression introduced by this branch. |

---

## Lint gap note

`npm run lint` invokes `eslint .` but `eslint` is not installed in `node_modules` on the current main tree (package.json lacks the devDependency entry, despite the qa/eslint-prettier-2026-05-28 lock file update). This is a pre-existing infrastructure issue on main. The F-r1 branch makes no changes to ESLint configuration. The lint gate cannot be validated locally — same as all other branches in this wave.

---

## Status

**GREEN** — typecheck pass, 324/324 tests pass, no regressions. Lint skipped (pre-existing infra gap identical to all wave merges). Ready for Rory/Morgan to merge.

---

## New HEAD

`6437a1724fe97c7dd74197613f5a1d789e10499d`
