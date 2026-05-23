# Storage proposal — F5 Export / Import library

_Prepared by Dana. Cycle `cycle/auto-2026-05-23-pm`, Loop 1._

## What this changes (storage-side)

**Reads** every existing keyspace already in use:

| Key / prefix | What's read |
|---|---|
| `promptlib:userPrompts` | All custom prompts |
| `promptlib:favorites` | Favorite ids |
| `promptlib:recent` | Recent ids |
| `promptlib:runs:<id>` | Per-prompt run history (cap 10) |
| `promptlib:values:<id>` | Per-prompt saved variable draft |

**Writes** in import mode, again to the same existing keyspaces. No new keys introduced.

**Never touched**:
- `promptlib:apiKey` (privacy — would be in a file users might share)
- `promptlib:model`, `promptlib:maxTokens` (personal preferences, not library content)
- `promptlib:schemaVersion` (managed by `runStorageMigrations`; not user-facing)
- `promptlib:onboarded` (a UI gate, not library content)

## File envelope

```ts
interface ExportV1 {
  version: 1;
  exportedAt: string;
  userPrompts: Prompt[];
  favorites: string[];
  recent: string[];
  runs: Record<string, StoredRun[]>;
  values: Record<string, Record<string, string>>;
}
```

`version` is the single forward-compat point. A bump (v2) would add a `migrateFromV1ToV2()` step in the import path; today we only handle v1.

## New helpers needed in `library.ts`

```ts
// Enumerate per-prompt sub-keys so the export can collect runs/values
// for every prompt currently in localStorage — including prompts the
// user added then later removed from the visible list but whose ghost
// entries (if any) remain. In practice this returns ids that match the
// current userPrompts; the enumeration is the defensive belt.
export function listStoredPromptIdsByPrefix(prefix: string): string[];

// Wipe ALL user data (userPrompts + every per-prompt sub-key) without
// touching settings. Used by Replace mode.
export function wipeAllUserData(): void;
```

Both small (~20 lines each), tested via the same in-memory stub pattern already established.

## Import strategy

### Merge (default)
1. Validate the file shape. Reject if missing `version` or wrong types.
2. For each prompt in `userPrompts`: if id NOT already present locally, add it. Track which ids were imported.
3. For each id in `favorites`: union with existing favorites (no dups, order: existing first then imported).
4. For each id in `recent`: prepend imported ids to existing, dedupe, truncate to `RECENT_CAP`.
5. For each id in `runs` (only ids that were either already local OR just imported): replace per-id runs with imported. (Merging runs would create a confusing duplicate timeline; full-replace per id is cleaner.)
6. Same for `values`: per-id replace for imported-or-existing ids.
7. Storage write failures surface via the existing top-of-page banner.

### Replace (requires inline confirm)
1. Validate the file shape.
2. `wipeAllUserData()` — removes `userPrompts` AND every `promptlib:runs:*` and `promptlib:values:*` key.
3. Write imported `userPrompts`, `favorites`, `recent`.
4. Write each imported `runs` and `values` entry.

## Validation rules

- Top-level shape must include `version`, `exportedAt`, `userPrompts`, `favorites`, `recent`, `runs`, `values`. Missing keys → reject.
- `version` must be a number. If `> 1`, "this file is newer than this app — please update."
- `userPrompts` must be an array; each entry validated via the existing `isValidPrompt`. Invalid entries dropped silently (logged via a counter for the preview).
- `favorites` / `recent` must be `string[]`; non-strings dropped.
- `runs` / `values` must be plain objects with string keys mapped to the right shape; corrupt entries per-id dropped.

The preview shown to the user reflects the *valid* counts after filtering, so they know what they're actually importing.

## Rollback

This feature only reads/writes existing keyspaces, no new schema, no migrations.

- **Roll back the code** — `git revert <commit>` removes the Settings UI and the `transfer.ts` module; no data ever needs to be migrated.
- **Roll back a bad import** — there isn't an auto-undo (the import IS a write). If the user is worried, they should **export first**, then import. (Worth a one-liner hint in the import preview: _"Tip: export your current library first if you'll want to come back to it."_)
- **Manually nuke imported data** — same browser-console snippet as the morning's proposal:
  ```js
  Object.keys(localStorage)
    .filter(k => k.startsWith("promptlib:") && k !== "promptlib:apiKey" && k !== "promptlib:model" && k !== "promptlib:maxTokens")
    .forEach(k => localStorage.removeItem(k));
  ```

## Quota / size guardrails

- Export is read-only on the client; no quota concern.
- Import in Replace mode: the imported volume is the user's old library — same magnitude as what was already on disk (it WAS on disk somewhere). No new quota exposure.
- Import in Merge mode: each per-id write goes through `writeJSON`, which surfaces quota errors to the banner. A quota miss mid-import doesn't corrupt the rest; the user sees the banner and can free space.

## Privacy

- The export file contains the user's prompts (which may include sensitive bodies they've written), favorites/recent (which prompts they use), runs (every Claude response they've seen), and values (the data they've fed into prompts).
- The file does NOT contain the API key.
- The download is local-only — it never goes anywhere unless the user shares it.
- Worth a one-liner privacy note above the Export button: _"This file contains your prompts and run history. Keep it as private as you'd keep your notes."_

## Status

**Proposed — implementation by Shamus this loop, no Sky approval required to land in the branch (reversible, browser-local read/write).**
