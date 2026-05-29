# QA Report — ESLint v9 + Prettier Setup
**Date:** 2026-05-28
**Author:** Gary (QA Engineer)
**Branch:** `qa/eslint-prettier-2026-05-28`
**Head SHA:** `b059db0`
**Base SHA (main):** `1889ae7`

---

## Summary

Wired ESLint v9 flat config + Prettier into the Prompt Library Tool. All 214 tests pass, typecheck is green. 9 non-auto-fixable lint errors remain and are documented below for Sky triage.

---

## Dependencies Installed

| Package | Version |
|---|---|
| `eslint` | 9.39.4 |
| `prettier` | 3.8.3 |
| `eslint-config-next` | 15.5.18 |
| `@eslint/eslintrc` | 3.3.5 |
| `eslint-plugin-prettier` | 5.5.6 |
| `eslint-config-prettier` | 9.1.2 |

All installed as `devDependencies`. ESLint v9 confirmed (not v10 which removed the config API).

---

## Config Files Added

| File | Purpose |
|---|---|
| `eslint.config.mjs` | ESLint v9 flat config — extends `next/core-web-vitals` + `next/typescript` via `FlatCompat`, layers prettier on top, adds `no-console:warn`, `exhaustive-deps:warn`, `no-unused-vars` with `_` prefix exception |
| `.prettierrc.json` | Updated to `trailingComma:"all"`, added `arrowParens:"always"` (was `trailingComma:"es5"`, no arrowParens) |
| `.prettierignore` | Excludes `node_modules`, `.next`, `out`, `*.tsbuildinfo`, all `*.md`, `qa-reports/`, `specs/` — prevents Prettier from reformatting documentation |

---

## npm Scripts Added

| Script | Command |
|---|---|
| `lint` | `eslint .` |
| `lint:fix` | `eslint . --fix` |
| `format` | `prettier --write .` |
| `format:check` | `prettier --check .` |

---

## Pre-existing Lint Issues Found (before auto-fix)

**Total before fix:** 113 problems (10 errors, 103 warnings)
**Total after auto-fix:** 9 problems (9 errors, 0 warnings)

### Auto-fixable (all fixed — 103 warnings)
All were Prettier formatting inconsistencies (trailing commas, line wrapping, spacing). Affected 33 source files including components, lib modules, and test files.

### Non-auto-fixable errors (9 — left for Sky triage)

| # | File | Rule | Details |
|---|---|---|---|
| 1 | `src/components/PromptDetail.tsx:337` | `react-hooks/rules-of-hooks` | `useCallback` called conditionally — React Hook called after an early return. **Potential real bug.** |
| 2–3 | `src/components/icons.tsx:31,33` | `@typescript-eslint/ban-ts-comment` | `@ts-expect-error` without description |
| 4–5 | `src/lib/__tests__/density.test.ts:39,41` | `@typescript-eslint/ban-ts-comment` | `@ts-expect-error` without description |
| 6–7 | `src/lib/__tests__/library.test.ts:44,46` | `@typescript-eslint/ban-ts-comment` | `@ts-expect-error` without description |
| 8–9 | `src/lib/__tests__/sort.test.ts:32,34` | `@typescript-eslint/ban-ts-comment` | `@ts-expect-error` without description |
| 10–11 | `src/lib/__tests__/values.test.ts:33,35` | `@typescript-eslint/ban-ts-comment` | `@ts-expect-error` without description |

**Note:** The `react-hooks/rules-of-hooks` error in `PromptDetail.tsx` is the most actionable — a conditional hook call is a genuine React violation that can cause runtime bugs. The `ban-ts-comment` errors are style-only: each `@ts-expect-error` just needs a trailing comment describing why (e.g. `// @ts-expect-error — intentional bad input for test`).

---

## Source Files Auto-fixed

33 files had Prettier formatting applied via `lint:fix`:

- `src/app/layout.tsx`
- `src/components/AutoGrowTextarea.tsx`
- `src/components/CommandPalette.tsx`
- `src/components/DensityToggle.tsx`
- `src/components/EmptyHint.tsx`
- `src/components/Header.tsx`
- `src/components/HomeClient.tsx`
- `src/components/PromptDetail.tsx`
- `src/components/PromptForm.tsx`
- `src/components/RunHistory.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/ShortcutsModal.tsx`
- `src/components/icons.tsx`
- `src/data/prompts.json`
- `src/lib/__tests__/library.test.ts`
- `src/lib/__tests__/prompts.test.ts`
- `src/lib/__tests__/runs.test.ts`
- `src/lib/__tests__/search.test.ts`
- `src/lib/__tests__/settings.test.ts`
- `src/lib/__tests__/sort.test.ts`
- `src/lib/__tests__/transfer.test.ts`
- `src/lib/__tests__/values.test.ts`
- `src/lib/__tests__/variables.test.ts`
- `src/lib/library.ts`
- `src/lib/markdown.ts`
- `src/lib/prompts.ts`
- `src/lib/runs.ts`
- `src/lib/sort.ts`
- `src/lib/transfer.ts`
- `src/lib/variables.ts`
- `tailwind.config.ts`
- `tsconfig.json`
- `package.json`

---

## Typecheck + Test Results

| Check | Result |
|---|---|
| `npm run typecheck` | PASS — 0 errors |
| `npm test` | PASS — 214/214 tests, 12 test files |

No pre-existing test failures were introduced or changed (the 0 failures noted in the run are consistent with baseline — the 2 pre-existing failures previously fixed by commit `7a93136` remain fixed).

---

## Notes for Sky

1. **PromptDetail.tsx conditional hook (priority fix):** `useCallback` at line 337 is called after an early return. This violates React's rules and can cause subtle render bugs. Worth fixing before merging.

2. **`@ts-expect-error` comments:** All 8 occurrences are in test files and `icons.tsx`. Easy fix — just add a short description after each directive (e.g. `// @ts-expect-error — testing invalid input`). Can be batched as a follow-up commit.

3. **`.prettierignore` covers docs:** Prettier was reformatting all `.md` files and qa-reports. Added `*.md`, `qa-reports/`, and `specs/` to `.prettierignore` so only source code gets formatted.

4. **No push / no merge performed** — branch is local only per protocol.

---

## DECISIONS FOR SKY

- **Merge this branch?** All 214 tests pass, typecheck clean. 9 errors remain — recommend fixing the `rules-of-hooks` error in `PromptDetail.tsx` before merging, or downgrading that rule to `warn` if the current conditional pattern is intentional.
- **`@ts-expect-error` descriptions:** Can fix inline or leave for a future cleanup commit. Not a runtime risk.
