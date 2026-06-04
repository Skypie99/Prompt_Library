# Quinn — Per-Run Token Usage Display Spec

**Date:** 2026-05-29  **Status:** READY_FOR_SHAMUS

---

## What token usage display is

Every time a user runs a prompt, they are spending tokens billed against their
Anthropic API key — but today the app gives them zero visibility into how many
tokens a run consumed. A power user running the same prompt repeatedly with
different variable values has no way to compare cost, no way to notice a
ballooning response, and no sense of how close they are to their API budget.
Token usage display surfaces the input and output token counts from the API
response directly in the prompt panel and in run history — light, non-intrusive,
but there for anyone who wants it.

---

## Current state

- `streamClaude()` in `src/lib/anthropic.ts` reads only `content_block_delta`
  events from the SSE stream. It ignores `message_delta` events (which carry
  `usage.output_tokens`) and `message_start` events (which carry
  `usage.input_tokens`).
- `StoredRun` in `src/lib/runs.ts` has no `tokensUsed` field.
- `PromptDetail.tsx` shows a pre-run character/token estimate but nothing
  post-run about actual API usage.
- `RunHistory.tsx` shows `ranAt`, `model`, `status`, and the response — no
  token counts.
- The app has no token-budget tracking. This spec adds display only.

---

## Sub-features

### F-usage-a — Capture usage data from the API stream (S effort)

**User story:** As a developer building on top of this app, I want `streamClaude`
to return the input and output token counts from Anthropic's API, so that any
caller can surface them to the user.

**Acceptance criteria:**
- [ ] `StreamClaudeParams` gains an optional `onUsage?: (usage: TokenUsage) => void`
      callback, where `TokenUsage` is a new exported interface:
      `{ inputTokens: number; outputTokens: number }`.
- [ ] `streamClaude` calls `onUsage` once per run (when the `message_delta`
      event carrying `usage.output_tokens` arrives). It also reads
      `input_tokens` from the `message_start` event's `message.usage` field
      (emitted at the start of the stream by the Anthropic API).
- [ ] If neither event appears (e.g. the stream is aborted before `message_stop`),
      `onUsage` is NOT called — callers must treat absence as "usage unknown."
- [ ] If `onUsage` is not provided, the new event-parsing code is a no-op —
      no behavior change for existing callers.
- [ ] `npx tsc --noEmit` passes.
- [ ] At least one unit test in `src/lib/__tests__/anthropic.test.ts` covers the
      `onUsage` callback: (a) called with correct counts when the events arrive,
      (b) not called when the stream is aborted before `message_delta`.

**Files to touch:**
- `src/lib/anthropic.ts` — add `TokenUsage` interface; add `onUsage` param to
  `StreamClaudeParams`; update `handleEvent` (or the stream loop) to parse
  `message_start` (for `input_tokens`) and `message_delta` (for `output_tokens`)
  and invoke the callback.

**Blocked on:** nothing. The Anthropic Messages streaming API has always emitted
these events; the existing `handleEvent` function simply ignores them today.

---

### F-usage-b — Store token counts with each run (S effort)

**User story:** As a user, I want past runs in my history to show how many tokens
they used, so I can compare cost across runs and variable values.

**Acceptance criteria:**
- [ ] `StoredRun` gains an optional field: `tokensUsed?: { input: number; output: number }`.
      Optional so that old history entries (which have no usage data) remain
      valid without migration.
- [ ] `PromptDetail.tsx` passes an `onUsage` callback into `streamClaude`; when
      called, it stores the counts in a local `pendingUsage` ref (not state —
      no re-render needed mid-stream) and writes them into the `StoredRun` when
      `appendRun` is called at run completion.
- [ ] `appendRun` in `src/lib/runs.ts` does NOT need to change — the caller
      (PromptDetail) assembles the full `StoredRun` object and passes it in.
      The `tokensUsed` field is simply included in that object.
- [ ] Aborted or errored runs that received no `onUsage` callback will have
      `tokensUsed` absent. This is correct — we don't want to show "0 tokens"
      for an abort.
- [ ] The `StoredRun` type change is backward-compatible with all callers:
      `isStoredRun()` validation in `runs.ts` and `transfer.ts` must accept
      entries with or without `tokensUsed`.
- [ ] `npx tsc --noEmit` passes.
- [ ] No new tests required beyond the anthropic.test.ts coverage added in
      F-usage-a; the integration is thin (a ref + one field in the object literal).

**Files to touch:**
- `src/lib/runs.ts` — add `tokensUsed?: { input: number; output: number }` to
  `StoredRun`; update `isStoredRun()` to accept the optional field.
- `src/lib/transfer.ts` — update `isValidStoredRunShape()` to accept the
  optional `tokensUsed` field without dropping the entry.
- `src/components/PromptDetail.tsx` — add `pendingUsage` ref; wire `onUsage`
  into the `streamClaude` call; include `tokensUsed` when constructing the
  `StoredRun` passed to `appendRun`.

**Blocked on:** F-usage-a (the `onUsage` callback on `streamClaude` must exist
before PromptDetail can wire it up).

---

### F-usage-c — Display token counts in the run panel and history (S effort)

**User story:** As a user who just ran a prompt, I want to see how many input
and output tokens the run used — right in the panel after the response appears
and in the run history list.

**Acceptance criteria:**
- [ ] After a run completes (status bar changes from streaming to "Response"),
      a token count line appears in the response panel header:
      `Tokens: 312 in · 1,204 out` (formatted with `toLocaleString()` for
      thousands separators). It is a single low-contrast line — not a banner.
- [ ] The token line only appears when `tokensUsed` is present on the current
      run state. It does not appear during streaming (counts aren't final yet),
      on errored runs (where `tokensUsed` is absent), or on aborted runs.
- [ ] In `RunHistory`, each history entry that has `tokensUsed` shows a small
      supplementary line: `312 in · 1,204 out` beneath the model/date line.
      Entries without `tokensUsed` (old runs) show nothing — no empty space.
- [ ] A simple `formatTokens(n: number): string` helper (local to the component
      or a small lib helper) handles the number formatting. It uses
      `n.toLocaleString("en")` with a fallback of `String(n)` for environments
      without `Intl`.
- [ ] The display is accessible: the counts region has an `aria-label` like
      `"Token usage: 312 input tokens, 1204 output tokens"` so screen reader
      users get the unabbreviated form.
- [ ] `npx tsc --noEmit` passes.
- [ ] No new tests required for the display (pure render from existing data).

**Files to touch:**
- `src/components/PromptDetail.tsx` — add token count line to the response panel
  header (in the `showResponsePanel && !running` section); wire from the current
  run's `tokensUsed`.
- `src/components/RunHistory.tsx` — add `tokensUsed` display in each run entry
  (beneath the existing model/date line).

**Blocked on:** F-usage-b (the `tokensUsed` field must exist on `StoredRun`
before the display components can reference it).

---

## Open questions for Sky

1. **Total cost estimate:** Should the token line also show an estimated cost
   in USD? (e.g. "~$0.004"). This requires hard-coding per-model price tables
   that will go stale as Anthropic changes pricing — propose displaying raw
   counts only, not cost, to avoid misleading users. Sky should confirm.

2. **Display in the Run History list vs. detail view only:** The spec shows
   counts in both the list and the panel (F-usage-c). If the Run History list
   feels too dense with an extra line per entry, Sky may prefer counts only
   in the response panel header, not the history list. Propose showing in both
   (history list is compact and the extra line is small), but Sky should call it.

---

## Out of scope

- **Cost estimate in USD** — price tables go stale; raw tokens is the durable,
  always-accurate signal. If Sky wants cost later, it's a one-line addition with
  a per-model table in `settings.ts`.
- **Token budget / quota tracking across prompts** — would require aggregating
  across all stored runs. Could be a dashboard widget later (F-future-6).
- **Streaming token progress indicator** — showing a live "X tokens so far"
  during streaming is possible but adds complexity; the final count post-run is
  sufficient for v1.
- **Input token count from the character/token estimate** — the pre-run
  estimate already exists in PromptDetail. This spec does not change that
  estimate; it adds the actual post-run count from the API.
- **Usage for errored or aborted runs** — incomplete runs produce unreliable
  partial counts; omitting `tokensUsed` on these runs is the correct behavior.
- **Any changes to `maxTokens` settings** — out of scope.

---

## Sequencing recommendation

| Order | Sub-feature | Effort | Why |
|-------|------------|--------|-----|
| 1 | **F-usage-a** — Capture in stream | S | Foundation; no UI change; easy to test in isolation |
| 2 | **F-usage-b** — Store in run | S | Wires the callback into PromptDetail + extends StoredRun |
| 3 | **F-usage-c** — Display in panel + history | S | Pure UI on top of stored data |

All three are small and can ship in a single Shamus cycle. Total estimated
change: ~120 lines across `anthropic.ts`, `runs.ts`, `transfer.ts`,
`PromptDetail.tsx`, and `RunHistory.tsx`. No new files needed.

---

**Report generated by Quinn (Product Manager)**
**For:** Shamus (Engineer), Morgan (PM + decision gating)
