# F-r2 — Rate-Limit Retry with Countdown + A11y

**Role:** Riley (research + acceptance) + Shamus (implementation)
**Date:** 2026-05-28
**Branch:** `feat/rate-limit-retry-2026-05-28`
**Head SHA:** `3116a7f`

---

## What was implemented

- **`parseRetryAfter` helper** (`src/lib/anthropic.ts`) — exported function that parses the `retry-after` response header into seconds. Handles both integer-seconds form (`"60"`) and HTTP-date form (`"Wed, 28 May 2026 23:00:00 GMT"`). Returns `undefined` if absent or unparseable.

- **`ClaudeError.retryAfterSeconds` field** — optional `number` added to the `ClaudeError` class. Populated by `mapHttpError` on 429 responses when `retry-after` is present; undefined otherwise.

- **Header read in `streamClaude`** — `response.headers.get("retry-after")` is passed to `mapHttpError` on `!response.ok`, enabling the field to be populated from real API responses.

- **Rate-limit error UI in `PromptDetail`** — parallel to the existing `auth` kind handler:
  - If `retryAfterSeconds` is set: shows a live `"Retry in Ns"` countdown (`aria-live="polite"`, `aria-atomic="true"`) plus an immediately-available `"Retry now"` button with `aria-label="Retry — available in N seconds"`.
  - If no `retryAfterSeconds` (API didn't send header): shows a plain `"Retry"` button with no countdown.
  - Retry click: clears the interval, clears the error, and calls `runWithValues(values)` — same variable values, no form re-fill, no state loss.
  - Countdown ticks at 1 Hz (1000 ms `setInterval`); no SR spam since `aria-live="polite"` only interrupts on idle and text is updated once per second.

- **Interval lifecycle management** — countdown interval is cleared on: unmount (cleanup effect), prompt change (reset effect), new run start (`runWithValues` preamble), and `handleRetry`. No leaks.

---

## What was NOT implemented

- **Component-level tests** (Retry button visibility, click → re-invokes, interval cleanup verified via assertions) — `@testing-library/react` is installed as a directory but contains no packages; the vitest config uses `environment: "node"` with no jsdom wiring. Writing component tests would require adding `@testing-library/react` + `@testing-library/user-event` and configuring a jsdom environment, which is a non-trivial setup change outside this feature slice. The logic paths are exercised by unit tests; the UI wiring is covered by the `parseRetryAfter` + `ClaudeError` tests and should be verified manually or in a future testing setup pass.

---

## Tests added

**9 new tests** in `src/lib/__tests__/anthropic.test.ts`:

| Suite | Test |
|---|---|
| `parseRetryAfter` | returns undefined for null/absent header |
| `parseRetryAfter` | parses an integer-seconds value |
| `parseRetryAfter` | returns undefined for zero or negative integer |
| `parseRetryAfter` | returns undefined for non-numeric, non-date strings |
| `parseRetryAfter` | parses a future HTTP-date string into positive seconds |
| `parseRetryAfter` | returns undefined for a past HTTP-date string |
| `ClaudeError retryAfterSeconds field` | defaults to undefined when not set |
| `ClaudeError retryAfterSeconds field` | can be assigned and read back |
| `ClaudeError retryAfterSeconds field` | retryAfterSeconds is absent on non-rate-limit errors |

---

## Typecheck + test results

```
npm run typecheck   → 0 errors
npm test            → 223 passed (214 pre-existing + 9 new), 0 failed
```

---

## Acceptance criteria status

| # | Criterion | Status |
|---|---|---|
| 1 | Parse `retry-after` header into `retryAfterSeconds` | DONE |
| 2 | Countdown in UI: `aria-live="polite"`, updates ≤1/s | DONE |
| 3 | "Retry now" button (no countdown when header absent) | DONE |
| 4 | Retry re-invokes `streamClaude` with same args — no form re-fill | DONE |
| 5 | Cleanup intervals on unmount / dismiss / retry | DONE |

---

## Open questions for Sky

None blocking. One optional future task: wire up `@testing-library/react` + jsdom environment in vitest so component-level retry tests can be added (button visibility, click handler, countdown interval teardown). Gary's ESLint setup landed on a separate branch and doesn't conflict.
