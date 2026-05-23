# F2 — Variable values persistence

_Spec by Quinn + Dani (compressed; no visual changes — behavior only)._

## Problem

Type into a prompt's variables → close the modal → reopen → values are gone. Even just clicking a different prompt and coming back wipes the form. For repeat use ("let me tweak one var and re-run") this is constant retyping.

## Goal

Persist the in-flight variable values per prompt so reopening the modal lands you back where you were.

## Scope

- `localStorage` key `promptlib:values:<promptId>` → `Record<string, string>`.
- Save on every change (no debounce — values are tiny, write-on-change matches the rest of the app's "save eagerly" pattern, and the writeJSON banner already handles quota failures).
- Load on modal open (hydrates the `values` state in `PromptDetail`).
- The existing "Clear" button wipes the values AND the storage entry.
- Deleting the prompt clears the values entry — already free via `purgePromptStorage(id)` in `library.ts`.

## Acceptance

| # | Behaviour |
|---|---|
| 1 | Type values, close modal, reopen the same prompt → values are still there. |
| 2 | Hit Clear in the variables area → values disappear from UI AND `promptlib:values:<id>` is removed. |
| 3 | Switch to a different prompt, then back → each prompt's values are isolated by id. |
| 4 | Delete a prompt → its values entry is gone from localStorage. |
| 5 | Restore inputs from history (F1) → those values land in the form AND are persisted (next reopen sees them). |
| 6 | Running a prompt does NOT clear the values (the user often re-runs with the same inputs). |
| 7 | Aborting / erroring a run does NOT clear the values. |
| 8 | `npx tsc --noEmit` green. |

## Design notes (Dani, brief)

- **No visible UI changes.** Same input/textarea elements, same Clear button, same focus behaviour.
- **No "saved" indicator.** Persistence is invisible by design — the user just notices nothing was lost.
- **No conflict with F1 "Restore inputs"** — restoring calls the same `setValues` path that now also persists, so a restore is immediately saved too. That's correct: the restored values become the new in-flight values.

## Size

**S** — ~80 lines total: 3 small helpers in `library.ts`, one new effect + one save site in `PromptDetail.tsx`.

## Dependencies

- Storage proposal already landed in Loop 1 (`PER_PROMPT_PREFIXES` includes `promptlib:values:`); cascade-on-delete is already wired.

## Out of scope

- Per-prompt-AND-per-variable-set "named drafts" (e.g. save several variable presets per prompt). That's a much bigger feature; park for later.
- Cross-device sync (we're localStorage-only).
- Auto-clearing values after some idle time. The user controls this via the Clear button or by deleting the prompt.
