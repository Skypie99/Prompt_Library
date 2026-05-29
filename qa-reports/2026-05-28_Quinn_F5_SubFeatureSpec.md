# Quinn — F5 Sub-Feature Decomposition Spec

**Date:** 2026-05-28  
**Mode:** AUDIT-ONLY (spec only)  
**Project:** Prompt Library Tool  
**Source:** FEATURES.md → F5, F5-export-import.md, proposal-export-import-2026-05-23-pm.md

---

## Why split

F5 is M-L scope (~500 lines, touches Settings UI + new `transfer.ts` module + storage reads/writes). A single cycle implementation risks scope creep (Replace mode confirmation design, version migration edge cases, partial validation nuance). Splitting into three S-M sub-features lets us ship Export first as a standalone backup utility, validate the JSON schema in users' hands, then build Import merge as the safe default, and defer Replace mode (destructive) to a later cycle with more design review.

---

## F5a — Export-only (S)

**User**  
I want a one-click backup of my custom prompts, favorites, and run history so I can restore them if I lose my local data or move to a new computer.

**Story**  
As a user, I can click an **Export library** button in Settings. It downloads a JSON file named `prompt-library-<YYYY-MM-DD>.json` containing my custom prompts, favorites, recent-prompt list, full per-prompt run history, and saved variable values. I can keep this file as a backup or email it to myself.

**Why**  
Export is pure read-only and carries zero risk — it doesn't modify state, doesn't require import validation, and can ship immediately to users as a safety net. It also validates the file shape end-to-end (if export is broken, import will catch it). Users get a recovery tool right away without waiting for the (more complex) import logic.

**Acceptance criteria**

| # | Behaviour |
|---|---|
| 1 | A button labeled **Export library** appears in Settings, below the "API key" row. |
| 2 | Clicking **Export library** downloads a file named `prompt-library-<YYYY-MM-DD>.json` to the user's Downloads folder. |
| 3 | The file contains valid JSON (readable in a text editor). |
| 4 | The file has the structure: `{ version: 1, exportedAt: <ISO-string>, userPrompts: [...], favorites: [...], recent: [...], runs: {...}, values: {...} }`. |
| 5 | `userPrompts` includes every custom prompt (not seed prompts). Each prompt has `id`, `title`, `body`, `variables`, `tags`, `color` (all existing fields). |
| 6 | `favorites`, `recent` are string arrays of prompt ids. |
| 7 | `runs` is a keyed object: `{ "<promptId>": [{ id, ranAt, model, values, sentPrompt, response, status, ... }, ...], ... }` with up to 10 runs per prompt (per existing `RUNS_PER_PROMPT_CAP`). |
| 8 | `values` is a keyed object: `{ "<promptId>": { "<varName>": "<draft-value>", ... }, ... }`. |
| 9 | The file NEVER includes `apiKey`, `model`, `maxTokens`, `schemaVersion`. |
| 10 | Seed prompts NEVER appear in `userPrompts` (only custom prompts). |
| 11 | Export works on both desktop (Chrome, Firefox, Safari) and mobile (Expo web). |
| 12 | Rapid clicks don't create multiple downloads; a loading state or disabled button prevents double-click. |
| 13 | `npx tsc --noEmit` passes with no new type errors. |

**Edge cases**

- **No custom prompts:** Export still succeeds; `userPrompts` is `[]`, and the file is valid.
- **Quota exceeded during read:** If localStorage fails mid-export (unlikely, but e.g., private-mode storage suddenly unavailable), catch the error and show a friendly "Could not read your library" alert. Do not partially download.
- **Filename collision:** If a user exports twice on the same calendar day, the browser's download logic appends `(1)`, `(2)`, etc. No action needed — this is the browser's job.

**A11y**

- The **Export library** button is keyboard-reachable (tab order in Settings).
- Button text is clear ("Export library" vs. "Download" — "Export" signals this is the library, not just any file).
- No custom focus management needed — rely on the existing button's focus ring.

**Confidence**

**High.** Export is a read-only operation on existing storage primitives (`library.ts` + `runs.ts`). No UI validation, no state machine. Implementation is straightforward:
1. New helper in `library.ts`: `collectExportData()` that reads `userPrompts`, `favorites`, `recent`, enumerate `promptlib:runs:*` and `promptlib:values:*` keys.
2. New `transferOut()` function in a new `src/lib/transfer.ts` that packages the data as `ExportV1`.
3. DOM trigger in `SettingsModal`: onClick handler that calls `transferOut()`, then creates a Blob and triggers a download via `URL.createObjectURL()` + `<a href>` click.
4. No external dependencies needed; no new storage keys; no migration.

**Depends on**

- Nothing new. Reads from existing storage keys defined in `library.ts`.
- Needs a small helper in `library.ts`: list per-prompt ids by prefix (e.g., `listPromptIdsByPrefix("promptlib:runs:")`) so export can enumerate runs/values without hardcoding id knowledge.

---

## F5b — Import (merge mode only) (M)

**User**  
I want to restore my prompts from a backup file I saved earlier, adding them to my current library without overwriting anything. If the file is corrupted, I want a friendly error, not a crash.

**Story**  
As a user, I can click an **Import library** button in Settings. It opens a file picker; I select a JSON file I previously exported. A preview card appears showing "This file has X custom prompts, Y favorites, Z run entries from <date>". Below the preview is a **Merge** button (green, primary). Clicking **Merge** imports the prompts I don't already have, adds their favorites and run history, and shows a brief success banner. If the file is invalid, a friendly error message appears instead.

**Why**  
Merge is the safe default: it never overwrites existing data, making it suitable for users who want to accumulate prompts from multiple backups or devices. It ships before Replace mode (which requires design review for the destructive confirmation pattern). Once Merge is in users' hands and the import validation is proven, Replace mode can land later in a focused cycle.

**Acceptance criteria**

| # | Behaviour |
|---|---|
| 1 | An **Import library** button appears in Settings, next to or below **Export library**. |
| 2 | Clicking **Import library** opens a file picker (native `<input type="file" accept=".json">`). |
| 3 | Selecting a valid export JSON shows a preview card with: prompt count, favorites count, run entries count, and a human-readable export date. |
| 4 | The preview also shows counts for invalid/corrupt entries (e.g., "X runs dropped due to parse error") if any. |
| 5 | A **Merge** button on the preview card is keyboard-reachable and labeled clearly. |
| 6 | Clicking **Merge** imports user prompts whose `id` is not already in `promptlib:userPrompts`. Duplicates are silently skipped. |
| 7 | For each imported prompt, the import also adds its entries to `favorites` (deduplicated, existing first), `runs`, and `values`. |
| 8 | `recent` list is merged: imported recent ids are prepended to the existing list, deduplicated, and truncated to `RECENT_CAP` (10). |
| 9 | Merge succeeds even if some imports fail (e.g., quota error mid-import): the banner shows a partial-success message, and the user can free space and retry. |
| 10 | If the file is missing `version` or `exportedAt` or has wrong top-level shape, a friendly error appears: "This file doesn't look like a Prompt Library export. Make sure you're opening a file created by the Export button." |
| 11 | If `version > 1`, a friendly warning appears: "This file is from a newer version of Prompt Library. Please update the app to import it." |
| 12 | A malformed run or value within a valid prompt (e.g., bad JSON in a nested run) drops only that entry; the prompt itself imports. |
| 13 | After a successful merge, a top-of-page banner shows "Imported X prompts, Y runs, Z variable values." (or similar). The banner auto-dismisses in ~5 sec or on user action. |
| 14 | Pressing **Esc** while the preview is open dismisses it without importing. |
| 15 | Importing the same file you just exported is a no-op: the preview shows the counts, clicking **Merge** returns immediately (all prompts already exist). |
| 16 | `npx tsc --noEmit` passes with no new type errors. |

**Edge cases**

- **Empty export file:** File with `userPrompts: []` is valid; merge succeeds with zero prompts imported. Preview shows "This file has 0 prompts…".
- **Very large file (>1MB):** File picker loads it, validation runs (slow but works). No artificial size cap; let browser quota be the guardrail.
- **File from a much older schema version (v0 or v-1):** Reject with "This file is from an older version…" if we ever bump beyond v1. For now, only v1 is supported.
- **Accidental non-JSON file:** File picker accepts any file, but validation rejects non-JSON with the "doesn't look like" error. User sees the error immediately.
- **Duplicate run ids within the imported file:** For a single imported prompt, if two runs have the same `id`, keep the first; drop the second (log a warning). This prevents data duplication.
- **Storage quota hit during import:** Write failures surface via the existing top-of-page banner (`onStorageWriteFailure` in `library.ts`). Merge pauses, user frees space, can retry by importing the same file again.

**A11y**

- File picker is a standard `<input type="file">`, fully accessible (screen readers announce it as a file upload field).
- Preview card is a div with role `region` (optional, helpful for screen reader users so the card content is announced).
- Buttons in the preview (Merge, Esc / close) are labeled and keyboard-reachable.
- Success/error messages are sent to the existing banner system (same as other app errors), which is a live region or announced to screen readers.
- No custom dialog needed; the preview card can be closed via Esc or clicking outside it.

**Confidence**

**Medium-high.** Merge logic is straightforward (set union + dedup per list type), and validation is defensive. Risk areas:
- **File parsing:** users might drag the wrong file or intentionally tweak JSON; validation must be robust but forgiving (drop corrupt entries, not the whole import).
- **Storage write failures:** quota hits mid-import are real. Tested via the existing `writeJSON` error surface.
- **Duplicate dedup:** make sure `id` matching is case-sensitive and exact; avoid subtle off-by-one in the dupe check.

Implementation is ~150 lines in `transfer.ts` for `mergeImport()`, ~50 lines in `SettingsModal` for the preview card and button hook.

**Depends on**

- **F5a** (Export format is the input format; Import reads the `ExportV1` shape that Export writes).
- New helpers in `library.ts`: `listPromptIdsByPrefix()`, `mergeImport()` core logic.

---

## F5c — Import replace mode + version migration (M)

**User**  
I want to completely replace my current library with a backup from an older device, and I want the app to handle future export files gracefully even if the library evolves.

**Story**  
As a user, after selecting a valid export file in the import flow, I see not just a **Merge** button but also a **Replace** button (red, destructive). Clicking **Replace** shows an inline confirmation prompt with the message "This will delete all your current prompts. Are you sure?" Below the message are two buttons: "Cancel" (secondary) and "Yes, replace" (red, destructive). Confirming immediately replaces my entire library with the imported one. If the export file is from a future version (e.g., v2), the import preview warns me and suggests updating the app first, but I can still choose to merge or replace (at my own risk).

**Why**  
Replace mode is destructive and requires careful design (inline confirmation, not a quick button). It's valuable for users who are migrating from an old device entirely, but it's lower-risk to ship it after Merge is proven. Deferring also lets us design the confirmation UX with Dani and test it more thoroughly. Version migration (handling future `version: 2` or higher) belongs here because it shares the file-reading pipeline; v1-only is handled in F5b.

**Acceptance criteria**

| # | Behaviour |
|---|---|
| 1 | After the preview card is shown (in F5b flow), a second **Replace** button appears below **Merge**, styled as red/destructive. |
| 2 | Clicking **Replace** reveals an inline confirmation section: message "This will delete all your current prompts. Are you sure?" with "Cancel" and "Yes, replace" buttons. |
| 3 | "Cancel" hides the confirmation section; the user can still click **Merge** if they change their mind. |
| 4 | "Yes, replace" wipes ALL user prompts (`promptlib:userPrompts` is cleared) AND every per-prompt storage key (all `promptlib:runs:*` and `promptlib:values:*` keys). Settings (apiKey, model, maxTokens, theme) are untouched. |
| 5 | After wipe, the imported `userPrompts`, `favorites`, `recent`, `runs`, and `values` are written to storage. |
| 6 | A top-of-page banner confirms "Replaced your library with X prompts." |
| 7 | If a file has `version: 2` (or higher), the preview card shows a warning: "This file is from a newer version of Prompt Library (v2). Please update the app first." Merge and Replace buttons are disabled or a notice says "Update the app to import." |
| 8 | Selecting a v2 file and updating the app in a later cycle allows Import (without code changes, once the app supports v2). |
| 9 | If a write failure occurs during Replace, the partial wipe has already committed; the failure is surfaced via the banner. User can recover by re-importing a backup (or using the browser console to manually clear the remaining corrupted entries). |
| 10 | `npx tsc --noEmit` passes with no new type errors. |

**Edge cases**

- **User clicks Replace, then navigates away mid-confirmation:** Preview card is unmounted; nothing is imported. No state pollution.
- **Replace fails partway through:** Wipe succeeds, but one of the import writes fails. User sees a partial-success banner and can retry by importing the same file again. (The wipe is idempotent; re-importing the same file is safe.)
- **File is valid v1 but one of the per-prompt runs is corrupt:** The corrupt run is dropped, others import. Replace still clears the old library and imports the valid entries.
- **Future app adds a v2 import handler:** New code detects `version: 2`, calls a new `migrateFromV1ToV2()` helper, then proceeds with the merged/replaced writes. The file shape in this spec is forward-compatible because `version` is the single versioning point.
- **User exports from v2, updates their app to v2, then tries to re-export from the old v1 app on another device:** The v1 app will reject v2 on import with the "newer version" message. This is the correct behavior.

**A11y**

- The Replace button is labeled clearly ("Replace" vs. generic "Yes") and is visually distinct (red/destructive color).
- The confirmation section uses semantic HTML (not a custom dialog if possible; a `<div role="region">` or `<fieldset>` with legend is fine).
- Buttons are keyboard-reachable; Esc can cancel the confirmation (standard close pattern).
- The warning message for future versions is in the preview card and announced to screen readers (same live region as counts).

**Confidence**

**Medium.** Replace logic is simple (wipe + write), but the UX requires design review:
- Inline confirmation vs. a modal dialog — Dani's call.
- Wording of the destructive warning — should match existing patterns in the app (e.g., delete-prompt confirmation in PromptDetail).
- Visual placement and spacing relative to the Merge button.

Implementation is ~100 lines: new `replaceImport()` function in `transfer.ts`, inline confirmation UI in `SettingsModal`, and a new helper `wipeAllUserData()` in `library.ts`.

**Depends on**

- **F5a + F5b** (preview card, file picker, validation all reused).
- New helper in `library.ts`: `wipeAllUserData()` (removes `userPrompts` and all `promptlib:runs:*` and `promptlib:values:*` keys; settings untouched).
- Design review with Dani for confirmation UX.

---

## Sequencing recommendation

### Sprint 1: **F5a — Export-only (S)**
- **Rationale:** Pure read-only, zero risk. Ships immediately as a backup utility.
- **Unblocks:** Users can safely export their library. Validates the `ExportV1` schema end-to-end.
- **Effort:** ~80 lines of code (new `src/lib/transfer.ts` + button in SettingsModal).
- **By:** Shamus (Tuesday / Wed of cycle).

### Sprint 2: **F5b — Import merge mode (M)**
- **Rationale:** Safe default (never overwrites). Proves import validation and file-picker logic.
- **Unblocks:** Users can restore prompts from backups. Ships as the primary import flavor.
- **Effort:** ~150 lines (transfer.ts + validation + preview card).
- **By:** Shamus (following sprint, after F5a is reviewed + merged).
- **Depends on:** F5a landed in main.

### Sprint 3+: **F5c — Replace mode + version migration (M)**
- **Rationale:** Destructive feature; ships after Merge is live and proven. Allows time for Dani to design the confirmation UX.
- **Unblocks:** Users who want to fully migrate from another device. Positions the app for future schema versions.
- **Effort:** ~100 lines (replace logic + confirmation UI).
- **By:** Shamus + Dani (design review).
- **Depends on:** F5b landed and is stable in production.

**Rationale for sequencing:** Ship the safest, lowest-complexity feature first to get feedback on the JSON schema from real users. Merge mode is the next safest (union, never deletes). Replace is last because it's destructive and the UI (confirmation pattern) needs collaborative design. If the project timeline is tight, F5c can slide to a later cycle without breaking F5a or F5b.

---

## Risks

1. **File size / performance:** If a user exports a library with 50+ prompts and 1000+ run entries, the Blob creation and download might stutter on older devices. **Mitigation:** Test with a mock large export; if needed, stream the JSON write via a Web Worker (out of scope for v1).

2. **LocalStorage quota during Replace:** If a user's library is already 50% of quota and imports a second large library in Replace mode, the wipe + import might hit quota mid-import. **Mitigation:** The `writeJSON` error surface exists; user sees the banner and can free space. Replace is idempotent (user can retry after cleaning up).

3. **Version migration complexity:** If version bumps to 2 introduce schema changes, the migration helper in `transfer.ts` could become complex. **Mitigation:** For now, F5c only handles v1 → v2 detection (reject v2 with a message). When v2 ships, add a `migrateV1ToV2()` helper and test it thoroughly before merging.

4. **Accidental data loss via Replace:** User might click Replace thinking it's Merge. **Mitigation:** Inline confirmation with red button + clear message "This will delete all your current prompts" should reduce accidents. Worth a warning banner or tooltip on the Replace button in the design spec.

5. **Cross-browser compatibility:** File picker and download might behave differently on Safari, Firefox, Chrome. **Mitigation:** Test F5a on all major browsers early; adjust if needed.

---

## Open questions for Sky

1. **Version migration strategy:** When the app evolves and introduces a new export format (e.g., v2), what's the policy? Keep v1 forever and auto-migrate on import? Bump to v2 and reject old exports? (Proposal: auto-migrate v1 to v2 in F5c's migration helper.)

2. **Replace confirmation UX:** Inline confirmation (as spec'd above) vs. a modal dialog vs. a separate flow? Dani's input needed before F5c implementation starts.

3. **Selective export / import (future):** Out of scope for v1, but worth calling out: should the app eventually let users export only tagged prompts, or import only certain entries from a file? (Likely F-future-n.)

4. **Test fixtures:** Should F5a/F5b ship with JSON fixtures (sample exports) for testing the import parser? Or rely on manual test files created by exporting?

---

## Summary of changes per sub-feature

| Feature | New code | Modified files | New storage keys | Risk |
|---------|----------|-----------------|------------------|------|
| **F5a** | `transfer.ts` (export logic), button in `SettingsModal` | `library.ts` (add `listPromptIdsByPrefix` helper) | None | Low |
| **F5b** | `transfer.ts` (validation + merge logic), preview card in `SettingsModal` | `library.ts` (utilities) | None | Low-Medium |
| **F5c** | `transfer.ts` (replace logic), confirmation UI in `SettingsModal` | `library.ts` (add `wipeAllUserData` helper) | None | Medium |

---

**Report generated by Quinn (Product Manager)**  
**For:** Shamus (Engineer), Dani (Designer), Morgan (PM + decision gating)
