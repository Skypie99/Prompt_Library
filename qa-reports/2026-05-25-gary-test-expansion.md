# Gary QA Report — Test Coverage Expansion
**Date:** 2026-05-25  
**Branch:** `test/auto-2026-05-25-gary-coverage`  
**Role:** Gary (QA Engineer)

---

## Test Counts

| Metric | Value |
|--------|-------|
| Tests before | 214 (12 files) |
| Tests after | 290 (15 files) |
| New tests added | 76 |
| New test files | 3 |
| Test run result | **290/290 PASS** |

---

## What Was Tested and Why

### 1. `library-storage.test.ts` — 45 new tests

The original `library.test.ts` covered only the pure helpers (slugify, generateId, mergePrompts, formatBytes, getStorageUsage). The entire localStorage-backed layer had zero test coverage. These are the highest-risk functions: data loss from a bug here is silent and permanent.

**Covered:**
- `isIsoDate` — accepts valid ISO variants (Z, offset, no-TZ), rejects dates, empty strings, non-strings
- `normalizeIsoDate` — passes valid ISO through, coerces parseable strings and numbers, falls back to "now" for garbage inputs
- `writeJSON` — returns `{ok:true}` on success, `{ok:false, reason:'unavailable'}` on SSR, triggers the failure handler callback on QuotaExceededError with `reason:'quota'`
- `loadUserPrompts / saveUserPrompts` — round-trip, corrupt-entry dropping, createdAt normalization on load, non-array input defence
- `loadFavorites / saveFavorites` — round-trip, non-string entry filtering
- `loadRecent / saveRecent` — round-trip, non-string entry filtering
- `loadOnboarded / saveOnboarded` — false default, true after save, non-boolean value rejection
- `purgePromptStorage` — wipes runs: and values: sub-keys for the given id only; spares other prompt ids and top-level list keys; SSR-safe
- `wipeAllUserData` — clears userPrompts/favorites/recent and all per-prompt sub-keys; spares apiKey/model/maxTokens/schemaVersion/onboarded; SSR-safe
- `runStorageMigrations` — stamps schemaVersion on first run, idempotent on repeat calls, upgrades v0 schema, SSR-safe

### 2. `runs-extra.test.ts` — 14 new tests

`runs.test.ts` covered load/save/append/remove/clear and formatRelativeTime extensively but missed two functions added later.

**Covered:**
- `setRunLabel (F-n2-11)` — sets label, trims whitespace, clears to undefined on empty/whitespace input, doesn't affect other runs in the list, is a no-op when runId not found, persists to storage
- `loadAllLastRunIsos (F-n2-13)` — empty map when nothing stored, returns newest-first ranAt for each prompt, multiple prompt ids, ignores non-runs keys, skips empty arrays, skips corrupt JSON without throwing, SSR-safe

### 3. `transfer-extra.test.ts` — 17 new tests

`transfer.test.ts` covered the main happy paths and major error variants. These tests target the utility function and the edge cases in the validation pipeline that had no coverage.

**Covered:**
- `defaultExportFilename` — correct format (prompt-library-YYYY-MM-DD.json), zero-pads months/days, no-arg default uses today's date
- `parseImport` edge cases — missing 'values' key, missing 'runs' key, empty-string run id dropped, values entry that is an array (not a record) dropped, individual non-string values within a valid values record dropped with droppedCount increment, null/missing exportedAt falls back in preview but data gets a real ISO, version === EXPORT_VERSION accepted, primitive and null top-level rejected
- `PER_PROMPT_PREFIXES_PUBLIC` — non-empty array of strings, contains `promptlib:runs:` and `promptlib:values:`, all prefixes start with `promptlib:` (regression guard against a new feature key being silently omitted from exports — the main silent-data-loss risk in this module)

---

## Gaps Still Remaining

- **`anthropic.ts`** — the Claude API client. Not tested because it requires real network calls; would need vi.mock() of the SDK. Acceptable gap for a local-only tool.
- **`setStorageWriteFailureHandler` in production flow** — the unknown-error branch (`reason: 'unknown'`) is not exercised; would need a non-QuotaExceededError throw from setItem.
- **Component-level tests** — all React components are untested (intentionally excluded from this task as too brittle for infrastructure work).
- **`loadSort / saveSort`** — already fully covered in `sort.test.ts`.
- **`density.ts`** — covered in `density.test.ts`.
- **`categoryColor.ts`** — covered in `categoryColor.test.ts`.

---

## Test Run Result

```
Test Files  15 passed (15)
     Tests  290 passed (290)
  Start at  12:13:25
  Duration  1.13s
```

All 290 tests green. No source files modified.

---

## Branch and Commit

- Branch: `test/auto-2026-05-25-gary-coverage`
- Commit: `test: expand coverage — library storage, runs setRunLabel/lastRunIsos, transfer edge cases`
- **Do NOT merge to main — Sky merges.**
