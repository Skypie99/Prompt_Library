# Steve — Security Review: F-usage Token Display
**Date:** 2026-05-29
**Branch:** feat/f-usage-token-display-2026-05-29
**Reviewer:** Steve (Safety Engineer)
**Verdict:** CLEAR

---

## SSE parsing (`src/lib/anthropic.ts`)

**Finding: CLEAR.**

Token values from `message_start` and `message_delta` events are gated behind an explicit `typeof ... === "number"` check before being written to the `UsageAccumulator`:

```ts
const inputTokens = payload.message?.usage?.input_tokens;
if (typeof inputTokens === "number") {
  usage.inputTokens = inputTokens;
}
```

- If `input_tokens` is `undefined`, `NaN`, a string, or any non-number, the guard fails and the accumulator field stays `null`. `onUsage` is only called when both fields are non-null numbers — so a malformed or partial SSE response simply results in `onUsage` never firing, not an exception or a wrong value being surfaced.
- NaN is technically `typeof "number"` — but NaN from a real Anthropic SSE payload is not a realistic threat vector. Even if NaN slipped through, `formatTokens(NaN)` falls back to `String(NaN) = "NaN"` which renders as inert text, not an injection vector or a crash.
- The outer JSON.parse is already wrapped in a try/catch that returns early on any parse failure (carry-over from the pre-existing code). A malformed SSE event that causes a parse error is silently discarded — no error details leak to the caller.
- The `ClaudeError` thrown from an `error`-type SSE event (`payload.error?.message ?? "Claude returned an error."`) uses optional chaining and a safe fallback string, so a missing or non-string `error.message` field in the payload cannot cause a throw-with-undefined-message or a crash.

No exception can leak SSE internals to the user. No concern here.

---

## StoredRun extension (`src/lib/runs.ts`)

**Finding: CLEAR.**

The new `tokensUsed?: { input: number; output: number }` field is validated in `isStoredRun()` before a value is allowed into the in-memory run list:

```ts
if (r.tokensUsed !== undefined) {
  if (
    typeof r.tokensUsed !== "object" ||
    r.tokensUsed === null ||
    typeof r.tokensUsed.input !== "number" ||
    typeof r.tokensUsed.output !== "number"
  ) return false;
}
```

A stored value with `tokensUsed: { input: "'; DROP TABLE--" }` fails the `typeof ... !== "number"` check, causing `isStoredRun()` to return false. The corrupt entry is dropped by `loadRuns`'s `.filter(isStoredRun)` — it never reaches display code. Gary's test suite explicitly covers this case ("drops a run whose tokensUsed has non-number fields").

Self-XSS scope note: This is a local-storage-only app. The only attack surface is a user poisoning their own storage or importing a crafted JSON file. The runtime validation handles both — corrupt values are rejected before they reach any rendering path. No escalation required.

---

## Display rendering (`src/components/PromptDetail.tsx`, `src/components/RunHistory.tsx`)

**Finding: CLEAR.**

Token values are rendered via React's standard JSX interpolation (`{formatTokens(...)} in · {formatTokens(...)} out`), which escapes by default. There is no `dangerouslySetInnerHTML` anywhere in the changed code.

`formatTokens(n: number)` takes a typed `number` argument. By the time a value reaches `formatTokens`, it has already passed through:
1. The `typeof inputTokens === "number"` guard in the SSE parser, or
2. The `isStoredRun()` / `isValidStoredRunShape()` shape validator on load.

So a non-numeric value reaching the DOM is structurally prevented — TypeScript enforces number at the call sites, and the runtime validators enforce it before storage → state. The `try/catch` fallback inside `formatTokens` (`return String(n)`) is a belt-and-suspenders hedge for pathological JS environments where `toLocaleString` throws; `String(n)` on a number is always safe text.

`aria-label` values are template literals interpolated from the same `formatTokens()` output — no user-controlled string is concatenated in.

No concern here.

---

## Transfer import/export (`src/lib/transfer.ts`)

**Finding: CLEAR.**

`isValidStoredRunShape()` received the same `tokensUsed` validation block as `isStoredRun()` in `runs.ts` — the two are in sync. A crafted import file with a string `input` or a nested object for `tokensUsed` causes the run to be rejected by the validator and increments `droppedCount` in the parse result. Gary's transfer test suite covers the three cases: present + valid, absent (backward compat), and present + invalid types.

The field type for `tokensUsed` in the `StoredRun` interface is `{ input: number; output: number }` — no string path, no arbitrary object. TypeScript provides compile-time enforcement; the validators provide runtime enforcement. No injection vector exists.

---

## ESCALATIONS

None. All four areas are clear. The implementation is conservative: type guards before storage writes, runtime validators on read, React JSX interpolation (not innerHTML) for display, and no new error paths that could leak internal details.

**Branch status: Ready for merge from a security standpoint.** Pending Alex's a11y gate per Gary's handoff.
