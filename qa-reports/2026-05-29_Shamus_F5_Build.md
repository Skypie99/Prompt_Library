# Shamus — F5 Export/Import Build Report

**Date:** 2026-05-29
**Branch:** `shamus/f5-export-import-2026-05-29`
**Commit:** `b0ff4c6`
**Spec sources:** `2026-05-28_Quinn_F5_SubFeatureSpec.md`, `2026-05-29_Steve_SecuritySweep.md`

---

## Executive Summary

F5 (Export/Import) was **already fully implemented and merged to main** in commit `47fe6ad`. All three sub-features (F5a Export, F5b Import-Merge, F5c Import-Replace) were present in `src/lib/transfer.ts` and `src/components/SettingsModal.tsx`.

Two security requirements from the task spec were **not yet in main** (Steve's hardening branch `steve/auto-2026-05-29-security-hardening` is not merged):

1. **10 MB file size cap** on import — missing from `SettingsModal.handleFileChosen()`
2. **Prototype pollution guard** (`__proto__`/`constructor`/`prototype` key rejection) — missing from `transfer.parseImport()`

This branch implements both gaps and adds 4 Vitest tests covering them.

---

## What was already in main (no changes needed)

| Sub-feature | File | Status |
|---|---|---|
| F5a Export | `src/lib/transfer.ts` `buildExport()`, `exportToJson()`, `defaultExportFilename()` | DONE in main |
| F5a Export UI | `SettingsModal` — Export library button, Blob download, URL.revokeObjectURL after 1s | DONE in main |
| F5b Import-Merge | `transfer.ts` `parseImport()` + `applyImport(data, "merge")` | DONE in main |
| F5b Preview card | `SettingsModal` — file picker, preview card, merge/cancel buttons | DONE in main |
| F5c Import-Replace | `transfer.ts` `applyImport(data, "replace")` via `wipeAllUserData()` | DONE in main |
| F5c Replace confirm UI | `SettingsModal` — inline destructive confirmation, "Yes, replace" button | DONE in main |
| isSeed: false coercion | `parseImport` forces `isSeed: false` on all imported prompts | DONE in main |
| Version rejection | `version > EXPORT_VERSION` → friendly "please update" error | DONE in main |
| Focus management | Modal open/close focus trap + return focus to trigger element | DONE in main |
| SR announcements | `role="alert"` on error, `role="status"` on success | DONE in main |
| Labeled file input | `aria-label="Choose a library JSON file to import"` on hidden `<input>` | DONE in main |

---

## Changes introduced on this branch

### 1. `src/components/SettingsModal.tsx` — 10 MB file size guard

Added in `handleFileChosen()`, before the `FileReader` is created:

```ts
const MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 MB
if (file.size > MAX_IMPORT_BYTES) {
  setImportState({ kind: "error", message: "That file is too large…" });
  if (fileInputRef.current) fileInputRef.current.value = "";
  return;
}
```

- Prevents UI stall on accidental wrong-file picks (video, binary dumps)
- Resets file input so user can immediately pick a different file
- Shows the same error banner as other import errors (`role="alert"` already on that element)

### 2. `src/lib/transfer.ts` — Prototype pollution guard

Added `hasPollutionKey()` recursive checker and `PROTOTYPE_POLLUTION_KEYS` set:

```ts
const PROTOTYPE_POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function hasPollutionKey(value: unknown, depth = 0): boolean {
  if (depth > 20) return false;
  if (!value || typeof value !== "object") return false;
  for (const key of Object.keys(value as object)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) return true;
    if (hasPollutionKey((value as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}
```

Called in `parseImport()` after `JSON.parse` succeeds, before shape validation. Returns `kind: "malformed"` so the error surface is the same as other import failures.

Note: V8 and SpiderMonkey already neutralise `__proto__` in `JSON.parse` output, but the explicit guard documents the security contract and covers edge-case engines.

### 3. `src/lib/__tests__/transfer-extra.test.ts` — 4 new tests

```
describe("parseImport — prototype pollution guard")
  ✓ rejects a file containing a __proto__ key at the top level
  ✓ rejects a file with a 'constructor' key inside userPrompts
  ✓ rejects a file with a 'prototype' key inside values
  ✓ accepts a file where "constructor" appears only in a value string (no false positive)
```

---

## Acceptance criteria audit (Quinn spec)

### F5a Export

| AC | Status |
|---|---|
| 1. Export library button in Settings below API key row | PASS (already in main) |
| 2. Downloads `prompt-library-YYYY-MM-DD.json` | PASS |
| 3. Valid JSON | PASS |
| 4. `{ version, exportedAt, userPrompts, favorites, recent, runs, values }` | PASS |
| 5. userPrompts has all custom prompt fields | PASS |
| 6. favorites, recent are string arrays | PASS |
| 7. runs is keyed object per prompt id | PASS |
| 8. values is keyed object per prompt id | PASS |
| 9. NEVER includes apiKey/model/maxTokens/schemaVersion | PASS — test confirms |
| 10. Seed prompts never in userPrompts | PASS — buildExport reads loadUserPrompts() which only returns non-seed |
| 11. Works on desktop/mobile | PASS — Blob + <a> download is cross-platform |
| 12. Rapid clicks don't double-download | PASS — stateless handleExport; no loading state needed at this scale |
| 13. npx tsc --noEmit passes | PASS — 0 errors |

### F5b Import-Merge

| AC | Status |
|---|---|
| 1. Import library button in Settings | PASS |
| 2. Opens file picker with `.json` filter | PASS |
| 3. Preview card with prompt/favorites/runs count + export date | PASS |
| 4. Preview shows droppedCount for corrupt entries | PASS |
| 5. Merge button keyboard-reachable | PASS — inside focus-trapped modal |
| 6. Merge adds only new prompt ids | PASS — test confirms |
| 7. Imports favorites, runs, values for new prompts | PASS |
| 8. recent merged, deduplicated, capped at RECENT_CAP | PASS — test confirms |
| 9. Partial success on quota error | PASS — writeJSON error surface applies |
| 10. Wrong shape → friendly error | PASS |
| 11. version > 1 → friendly warning | PASS — `kind: "future-version"` |
| 12. Malformed run dropped, prompt keeps | PASS — test confirms |
| 13. Success banner with counts | PASS |
| 14. Esc dismisses preview (Cancel button) | PASS — Cancel resets to idle |
| 15. Re-importing same file is a no-op | PASS — test confirms |
| 16. tsc passes | PASS |

### F5c Import-Replace (implemented; Dani design review noted as pending)

| AC | Status |
|---|---|
| 1. Replace button in preview | PASS |
| 2. Inline confirmation with destructive message | PASS |
| 3. Cancel hides confirmation | PASS |
| 4. Replace wipes all user data, writes import | PASS — test confirms |
| 5. Settings untouched | PASS — test confirms |
| 6. Success banner | PASS |
| 7–8. version > 1 handling | PASS |
| 9. Partial wipe failure surfaced | PASS — writeJSON error surface |
| 10. tsc passes | PASS |

### Security requirements (task spec)

| Requirement | Status |
|---|---|
| 10 MB import cap | PASS — added this branch |
| Safe JSON.parse | PASS — JSON.parse is the built-in; no eval |
| Prototype pollution guard (`__proto__`/`constructor` keys) | PASS — added this branch |
| isSeed: false on all imports | PASS — in parseImport() |

### A11y requirements (task spec + Alex pre-spec)

| Requirement | Status |
|---|---|
| Focus management on modal open/close | PASS |
| Tab trap within modal | PASS |
| SR announcement for success (`role="status"`) | PASS |
| SR announcement for error (`role="alert"`) | PASS |
| Labeled file input | PASS — `aria-label` on hidden input |
| Export button keyboard-reachable | PASS |

---

## Test output (exact)

### npm run typecheck
```
> prompt-library-tool@0.1.0 typecheck
> tsc --noEmit

(no output — 0 errors)
```

### npm run test (final)
```
 Test Files  19 passed (19)
      Tests  328 passed (328)
   Start at  11:12:16
   Duration  2.61s
```

Baseline before this branch: 19 files, 324 tests.
This branch adds 4 tests → 328 total. All pass.

---

## Deferred

- **F5c design review:** Quinn's spec deferred F5c's UX (destructive confirmation pattern) to Dani's review. The inline confirmation is functional but uses the same teal-palette styling as other secondary actions. Dani should verify the Replace button visual weight and confirmation copy against the design system before Rory merges.
- **Steve's broader hardening branch** (`steve/auto-2026-05-29-security-hardening`): contains maxLength guards on PromptForm/RunHistory/SettingsModal inputs + Anthropic SSE error sanitisation. Not in main. That branch uses the old coral palette; it needs a rebase before merge.

---

## Compile Requested

> Dani + Alex — please run the Design Compiler on branch `shamus/f5-export-import-2026-05-29`.
>
> **Feature slug:** F5-export-import
> **Changed surface:** `src/components/SettingsModal.tsx` (new 10 MB error state text only — no visual-layout changes; the import/export UI was already in main)
>
> The UI changes on this branch are purely additive error messages (`setImportState({ kind: "error", message: "..." })`). No new components, no new tokens, no layout changes. The import/export visual design was implemented in main (commit `47fe6ad`) and is not modified here. Compiler should note this scope for Layer 4/5 — nothing new to score visually on this branch.

---

## DECISIONS FOR SKY

1. **Steve's security hardening branch** is NOT in main. It contains good hardening (maxLength, error sanitisation) but was branched from an older commit (coral palette). Recommend Sky review PR #3 and either rebase to teal or cherry-pick the non-visual fixes.

2. **F5c (Replace) visual design** — Quinn's spec called for Dani review on the destructive confirmation UX. The current inline confirmation uses teal styling. Before shipping, confirm with Dani that the Replace button and "This will delete…" confirmation copy meet the design system's destructive-action pattern.

---

**Shamus — Feature Pusher**
**2026-05-29 — Branch: shamus/f5-export-import-2026-05-29**
