# Storage proposal — per-prompt runs + per-prompt values

_Prepared by Dana. Cycle `cycle/auto-2026-05-23`, Loop 1 (covers F1 and the storage half of Loop 2's F2 in advance so the discipline lands once)._

## What this changes

Two new `localStorage` keyspaces, both per-prompt-id:

| Key pattern | Used by | Shape | Cap |
|---|---|---|---|
| `promptlib:runs:<promptId>` | F1 Run history | `StoredRun[]` (newest-first) | 10 entries |
| `promptlib:values:<promptId>` | F2 Variable persistence | `Record<string, string>` | unbounded; one entry per variable name in that prompt |

Both are namespaced under the existing `promptlib:` prefix and join the four keys already in use (`userPrompts`, `favorites`, `recent`, `onboarded`) and three settings keys (`apiKey`, `model`, `maxTokens`).

## Why per-prompt keys (not one big blob)

- A single `promptlib:runs` blob would force every save to rewrite the whole structure, multiplying quota cost as users accumulate prompts.
- Per-prompt keys mean deleting a prompt is one `localStorage.removeItem` (no read-modify-write) — matches the existing `deletePrompt` cleanup discipline.
- Per-prompt keys keep one prompt's history from ever blocking another prompt's history from loading on a corrupted entry — we can fall back per key, not per global blob.

## Module shape (Dana spec, Shamus implements)

A new `src/lib/runs.ts` and small additions to `src/lib/library.ts`.

```ts
// src/lib/runs.ts

export type RunStatus = "completed" | "aborted" | "errored";

export interface StoredRun {
  id: string;             // local-only; "<timestamp>-<rand>"
  ranAt: string;          // ISO timestamp
  model: string;          // model id at time of run
  values: Record<string, string>;
  sentPrompt: string;     // post-substitution prompt actually sent
  response: string;       // possibly partial if aborted
  status: RunStatus;
  errorMessage?: string;  // only when status === "errored"
}

export const RUNS_PER_PROMPT_CAP = 10;
// Hard guard: never persist a single response larger than this many chars.
// Keeps a runaway response from blowing the localStorage quota for one prompt.
export const MAX_RESPONSE_CHARS_PERSISTED = 32_000;

export function loadRuns(promptId: string): StoredRun[];
export function saveRuns(promptId: string, runs: StoredRun[]): void;
export function appendRun(promptId: string, run: StoredRun): StoredRun[]; // returns the new list (capped)
export function removeRun(promptId: string, runId: string): StoredRun[];
export function clearRuns(promptId: string): void;
export function generateRunId(): string;
```

For F2:

```ts
// src/lib/library.ts (additions)

export function loadValues(promptId: string): Record<string, string>;
export function saveValues(promptId: string, values: Record<string, string>): void;
export function clearValues(promptId: string): void;
```

Both modules follow the same defensive read pattern already in `library.ts`:
- `typeof window === "undefined"` → fallback (SSR safety; this app is statically exported so this matters at build time).
- `JSON.parse` wrapped in try/catch → corrupted entry returns fallback, never throws upstream.
- Type-guard the parsed value; reject anything that doesn't shape-match.
- Write errors silently swallowed (private-mode browsers).

## Deletion / cascade (must be wired in `HomeClient.deletePrompt`)

When a prompt is deleted:
1. Remove from `userPrompts` (already there).
2. Remove from `favorites` (already there).
3. Remove from `recent` (already there).
4. **NEW** — `clearRuns(id)`.
5. **NEW** — `clearValues(id)`.

This is the single most-likely-to-forget touchpoint; Dana flags it for Shamus.

## Quota / size guardrails

- 10 runs × ~32KB each cap → ~320KB worst case per prompt. 50 prompts × that = ~16MB, well above the typical 5–10MB browser cap. In practice responses are 1–5KB, and 10 cap × 5KB × 50 prompts = ~2.5MB.
- `MAX_RESPONSE_CHARS_PERSISTED = 32_000` (~32KB) caps a single pathological response.
- Writes are wrapped in try/catch; a `QuotaExceededError` on save eats the new entry rather than crashing the run flow.
- `appendRun` is the only growth path; `saveValues` overwrites in place.

## Rollback

Pure-client; no live DB to undo.

To roll back the storage discipline at any point:

```js
// In the browser console on the site:
Object.keys(localStorage)
  .filter(k => k.startsWith("promptlib:runs:") || k.startsWith("promptlib:values:"))
  .forEach(k => localStorage.removeItem(k));
```

This wipes only the new keyspaces; existing user prompts / favorites / recent / settings are untouched.

If the feature itself is rolled back at the code level (revert the merge), the orphan keys are harmless — nothing reads them.

## Migration steps (none, but enumerated for completeness)

- No existing data to migrate; both keyspaces are net-new.
- No format upgrade path needed for v1; if the shape changes later we'll add a `schemaVersion` field then.
- No user action required.

## Verification

After Shamus implements:
- `npx tsc --noEmit` green.
- Manual: run a prompt, refresh page, history persists; type values, refresh, values persist; delete a prompt, inspect storage in DevTools — both keys are gone.
- Test files (pending Vitest install proposal from this morning) can lock in the load/save/cap behaviour.

## Status

**Proposed — implementation by Shamus this loop, no Sky approval required to land in the branch (reversible, browser-local).**
