# F1 — Run history per prompt

_Spec by Quinn (PM). Cycle `cycle/auto-2026-05-23`, Loop 1._

## Problem

Today, every time you run a prompt the response streams in, you read it, you close the modal, and it's gone. If you wanted to compare two takes ("which model wrote a better one?") or copy a past response, your only option is to re-run with the same inputs, retyping them by hand. Even worse: if you ran something that took 30 seconds of streaming and accidentally hit Escape, it's just gone.

## Goal

Keep the last 10 successful (or interrupted, or errored) runs per prompt, available right inside the prompt's detail modal — so the most common "let me see my last result" question is one click, not a re-run.

## User story

> As someone who uses the same prompt several times in a row to iterate on output, I want to see and revisit my recent runs without retyping inputs or losing previous responses.

## Scope (in)

1. **Per-prompt history list** of up to 10 entries, newest first, stored in `localStorage` under `promptlib:runs:<promptId>`.
2. **Each entry captures**:
   - `id` — local uuid-ish (`Date.now()` + random suffix is fine; never exposed)
   - `ranAt` — ISO timestamp
   - `model` — model id used for the run
   - `values` — the filled-in variable values (`Record<string, string>`)
   - `prompt` — the substituted prompt text (so users can copy exactly what was sent, even if they later edit the prompt body)
   - `response` — what came back (possibly partial if aborted)
   - `status` — `"completed"` | `"aborted"` | `"errored"`
   - `errorMessage` — only when `status === "errored"`; the user-facing message, not a stack trace
3. **History panel inside `PromptDetail`**, collapsed by default, appearing below the response panel. Renders nothing if the history is empty.
4. **Per-entry row** shows: relative time ("2 min ago"), model label, status icon, first 80 chars of response, action buttons.
5. **Per-entry actions**:
   - **View** — expand the row inline to see full inputs and response.
   - **Restore inputs** — copy the entry's `values` into the live form (does NOT auto-run).
   - **Copy response** — copies the response text. Same toast pattern as the existing copy buttons.
   - **Delete** — remove just that entry from history. No confirm (it's reversible by re-running).
6. **Clear all history** button at the panel header with inline confirm (mirrors the existing "Delete this prompt?" pattern).
7. **Write-on-finalize**: only persist when the run terminates (completed / aborted / errored). Streaming partials are not written every chunk.
8. **Cleanup**: deleting a prompt also clears `promptlib:runs:<promptId>`.

## Scope (out — deferred to later cycles)

- Global cross-prompt history view.
- Run-history export/import (part of F5 — full library export).
- Cost / token usage display per run (no telemetry collected today; out of scope for v1).
- Renaming or editing past responses.
- Search inside history.

## Acceptance criteria

| # | Behaviour |
|---|---|
| 1 | Running a prompt to completion writes a new entry; running again puts the new run at the top, oldest pushed off after 10. |
| 2 | Hitting **Stop** mid-stream saves an `aborted` entry with whatever streamed. |
| 3 | A 401 (or any `ClaudeError`) saves an `errored` entry with the user-facing message; the stack trace never reaches storage. |
| 4 | A network drop or unmount mid-stream does NOT corrupt storage — the only writes are at termination. |
| 5 | History panel is hidden entirely when there are zero entries. |
| 6 | "Restore inputs" populates the form without triggering a run. |
| 7 | "Delete" removes one entry; "Clear all" removes the whole `promptlib:runs:<promptId>` key. |
| 8 | Deleting the prompt in `HomeClient.deletePrompt` removes its history key. |
| 9 | Reopening the detail modal renders the same history (persistence works). |
| 10 | Type check (`npx tsc --noEmit`) stays green at every handoff. |
| 11 | Screen-reader experience is sensible: panel is a labelled region, entries are `<li>`s, action buttons have accessible names. |
| 12 | Visual treatment matches the existing warm/cream/coral language — Dani's design spec is the source of truth. |

## Size

**M** — ~400 lines across one new module (`src/lib/runs.ts`), one new component (`src/components/RunHistory.tsx`), and edits to `PromptDetail.tsx` + `HomeClient.tsx`.

## Dependencies

- None blocking. Storage keyspace coordinates with F2 (variable persistence) via Dana's combined proposal in this loop.

## Risks / open questions

- **Storage quota** — 10 runs × ~5KB response × N prompts could approach ~5MB on a heavy user. Mitigation: hard cap of 10 entries, plus we already swallow `localStorage` write errors silently in `library.ts`. Acceptable for v1.
- **Privacy** — The full prompt and response live in `localStorage`. That's the same privacy posture as the existing custom prompts and the API key, so no new exposure. Worth a note in the panel header so it's not a surprise.

## Done means

The user runs a prompt, gets a response, runs it again, opens the history panel, sees both entries with timestamps + statuses, clicks "Restore inputs" on the older one, the form repopulates, and the type check is green.
