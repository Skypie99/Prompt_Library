# F5 — Export / Import library

_Quinn (PM) + Dani (Design)._

## Problem

Everything in the app lives in this browser. Clear your data, switch laptops, or share with someone — and your custom prompts, favorites, run history, and saved variable values are gone. There's currently no backup story.

## Goal

A one-click backup file the user can download, and a one-click restore that can either merge or replace. No backend; the file IS the backup.

## File shape

```ts
interface ExportV1 {
  version: 1;
  exportedAt: string;             // ISO timestamp
  userPrompts: Prompt[];          // never includes seeds
  favorites: string[];            // prompt ids
  recent: string[];               // prompt ids, most-recent-first
  runs: Record<string, StoredRun[]>;          // promptId → runs (cap 10 each)
  values: Record<string, Record<string, string>>; // promptId → saved variable draft
}
```

**Never exported**: `apiKey`, `model`, `maxTokens`, `schemaVersion`. The API key is a security footgun in a file users might share; model/maxTokens are personal preferences and not part of the library.

## Import modes

1. **Merge** (default, lowest-risk)
   - Add user prompts whose id you don't already have. Skip duplicates.
   - For each imported prompt: also add its `favorites` entry (if not already in favorites), its `runs` (full replace per id only when the prompt itself was imported), and its `values` (same).
   - `recent` is treated as additive: imported recent ids are merged into the front, then truncated to `RECENT_CAP`.
2. **Replace**
   - Wipe ALL existing user prompts AND every per-prompt storage entry (`runs:*`, `values:*`).
   - Replace `favorites`, `recent` with the imported lists.
   - Settings (apiKey, theme) untouched.
   - Inline confirm (red destructive button, same pattern as delete-prompt).

## Where it lives

In the existing `SettingsModal`, beneath the API key / model / max-tokens section. Two rows:
- **Backup**: download button (`Export library` → `prompt-library-<YYYY-MM-DD>.json`).
- **Restore**: file picker (`Import library` → opens system file picker for `.json`). On file selection, validates and shows a preview, then offers Merge / Replace.

Visual: same row pattern as the existing settings rows. Coral primary buttons for Export, secondary for Import. Preview is a small card with counts + file timestamp.

## Acceptance

| # | Behaviour |
|---|---|
| 1 | Export downloads a `.json` file with the right keys; opening in a text editor shows readable, indented JSON. |
| 2 | `apiKey`, `model`, `maxTokens` never appear in the export. Seed prompts never appear. |
| 3 | Merge of the same file you just exported is a no-op (everything already there). |
| 4 | Replace wipes user prompts AND `runs:*` / `values:*` for those prompts. |
| 5 | Malformed file → friendly error ("This file doesn't look like a Prompt Library export."), no crash. |
| 6 | Future version → friendly "This file is newer than this app — please update." |
| 7 | Partial corruption (one bad run inside an otherwise valid file) drops only the bad entry; the rest imports. |
| 8 | Storage write failures during import surface to the existing top-of-page banner. |
| 9 | Typecheck green. |
| 10 | Keyboard: file picker is reachable; preview card has focused buttons; Esc dismisses preview. |

## Out of scope

- Cloud sync.
- Selective export ("just these 3 prompts").
- Diff preview ("here's what would change").
- Multiple file formats (CSV, MD).

## Size

**M-L** — Estimated ~500 lines: a new `src/lib/transfer.ts` (export + import core, ~200 lines), updates to `SettingsModal.tsx` (~150 lines), small additions to `library.ts` for enumeration helpers (~50 lines), spec + Dana proposal.

## Dependencies

- Reads from: `loadUserPrompts`, `loadFavorites`, `loadRecent`, `loadRuns`, `loadValues`.
- Writes through: `saveUserPrompts`, `saveFavorites`, `saveRecent`, `saveRuns`, `saveValues`, `purgePromptStorage`. All existing.
- Needs a new `listUserPromptIds()` helper in `library.ts` to enumerate per-prompt keys for export — Shamus adds.

## Design tokens (Dani, brief)

- Section header: same `text-xs font-medium uppercase tracking-wider text-ink-soft` as other settings sections.
- Buttons: primary coral on Export and final Import confirm; secondary border style on file picker.
- Preview card: `bg-cream/50 dark:bg-night/40` with `border border-border`, p-4, rounded-md.
- Status messages (validate-success, validate-error): inline below the preview, no toast.
- Replace warning: inline coral-50 strip with confirm (matches `confirmingDelete` pattern in PromptDetail).
