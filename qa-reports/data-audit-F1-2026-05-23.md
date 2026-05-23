# Data audit — F1 (Run history) post-implementation

_By Dana. Cycle `cycle/auto-2026-05-23`, end of Loop 1._

## What landed

- New `localStorage` keyspace: `promptlib:runs:<promptId>` → `StoredRun[]` (newest-first, cap 10).
- Per-entry char cap: `MAX_RESPONSE_CHARS_PERSISTED = 32_000`. Trimming is applied at `appendRun` write time — never at read time — so a stored entry's length matches what's on disk.
- Read path validates each entry shape (`isStoredRun`) and silently drops corrupt entries instead of throwing.
- Write path routes through `library.writeJSON`, sharing the banner with other write failures.
- Cleanup: `purgePromptStorage(id)` already wipes the runs prefix, so `HomeClient.deletePrompt(id)` cascades correctly. Verified by reading the `PER_PROMPT_PREFIXES` constant — `promptlib:runs:` is present.

## Verified storage invariants

| # | Invariant | Where it's enforced |
|---|---|---|
| 1 | Newest first, cap 10 | `appendRun` (`[trimmed, ...existing].slice(0, RUNS_PER_PROMPT_CAP)`) |
| 2 | Single response capped at 32KB | `appendRun` (slice before `[trimmed, ...]`) |
| 3 | apiKey never persisted | `StoredRun` shape (no apiKey field), `handleRun` (entry build site) |
| 4 | Stack traces never persisted | `errorMessage` only ever gets `ClaudeError.message` strings we author |
| 5 | Cascades on prompt delete | `purgePromptStorage(id)` via `PER_PROMPT_PREFIXES` |
| 6 | SSR-safe | `loadRuns`, `clearRuns` window-guard; `saveRuns` via `writeJSON` (window-guard inside) |
| 7 | Corrupt entry doesn't crash UI | `loadRuns` filters by `isStoredRun` |

## No further migration files this loop

No need for a schema bump — `runs:<id>` is a net-new keyspace, not an alteration of an existing one. The existing `SCHEMA_VERSION = 1` (set by the prior data-harden commit) already covers "post-v1 worlds may have these keys; old worlds won't."

## Follow-ups Dana would do later (parked, not blocking)

1. **Quota observability** — today we have a banner on write failure but no proactive view of "how big is your promptlib storage right now?" A Settings panel readout of `Object.entries(localStorage).filter(k => k.startsWith("promptlib:")).reduce(...)` would help heavy users.
2. **Run-history export** — once F5 (export/import library) lands, include `runs` in the export shape; this is a one-line addition there.
3. **Per-run cost / tokens** — needs the Anthropic API to return usage info; the streaming SDK gives it in the `message_delta` event. Out of scope for this cycle.

## Status

**No changes required. Loop 1 storage discipline is sound; nothing to apply, nothing to roll back.**
