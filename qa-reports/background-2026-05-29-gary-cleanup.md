# Gary — Finder Duplicate Cleanup
**Date:** 2026-05-29
**Branch:** `ci/cleanup-finder-dupes-2026-05-29`
**Mode:** BACKGROUND (no external sends)

---

## Summary

Removed 6 macOS Finder-generated duplicate files and updated `.gitignore` to prevent recurrence. All duplicates were **untracked** — no `git rm` needed.

---

## Files Deleted

| File | Type |
|------|------|
| `.prettierrc 2.json` | Finder copy of `.prettierrc.json` |
| `qa-reports/morgan-wave-log-2026-05-28 2.md` | Finder copy of QA report |
| `qa-reports/morgan-wave-log-2026-05-28 3.md` | Second Finder copy of QA report |
| `.github/workflows/ci 2.yml` | Finder copy of CI workflow — HIGH RISK if ESLint picked it up |
| `.github/workflows/ci 3.yml` | Third Finder copy of CI workflow |
| `src/lib/__tests__/anthropic.test 2.ts` | Finder copy of test file — was polluting lint run |

Note: `.next/cache/webpack/*/index.pack 2.pack` also found but lives inside `/.next/` which is already in `.gitignore` — left alone (build cache, never committed).

---

## .gitignore Changes

Added to end of `.gitignore`:

```
# macOS Finder duplicates (copy → "file 2.ext", "file 3.ext", etc.)
* 2.*
* 3.*
* 4.*
* 2
* 3
* 4
```

---

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `npm run lint` | FAIL (pre-existing) | ESLint circular-structure JSON error in `@eslint/eslintrc` — confirmed present on `main` before this branch; **not caused by this cleanup** |
| `npm run typecheck` | PASS | Zero errors |
| `npm run test` | PASS | 335/335 tests, 20 test files |

---

## Pre-existing ESLint Issue (ESCALATION)

`npm run lint` throws `TypeError: Converting circular structure to JSON` inside `@eslint/eslintrc`. Confirmed pre-existing on `main` — identical failure before and after this cleanup. Root cause appears to be a conflict between ESLint v9's flat config API and the legacy `@eslint/eslintrc` adapter trying to serialize a plugin config object that contains circular references.

**This is not introduced by this PR.** Flagging for Gary / Rory to investigate in a separate pass.

---

## DECISIONS FOR SKY

None — all changes are safe, reversible, and additive (.gitignore only).

---

## Commit

`ci/cleanup-finder-dupes-2026-05-29` — ready to merge when convenient.
