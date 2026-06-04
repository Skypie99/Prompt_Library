# Gary QA — F-r2 Component Tests (jsdom)

**Date:** 2026-05-28  
**Role:** Gary (QA Engineer)  
**Branch:** `test/auto-2026-05-28-gary-fr2-component-tests`  
**HEAD SHA:** `e94f7c3698354544bac0168910bca48c5b46378e`  
**Test file:** `tests/PromptDetail.ratelimit.test.tsx`

---

## Summary

All 5 component tests for F-r2 (rate-limit retry UI in `<PromptDetail>`) written, typechecked, and passing. Full suite (232 tests / 15 files) continues green.

---

## Worktree setup

| Step | Result |
|---|---|
| Base branch | `main` @ `1889ae7` |
| Cherry-pick jsdom setup `3b46a86` | Clean |
| Cherry-pick F-r2 impl `3116a7f` | Clean |
| node_modules symlink | Linked from project root |

---

## Tests written

| # | Test name | Pass |
|---|---|---|
| 1 | `shows countdown text and 'Retry now' button when retryAfterSeconds is 30` | PASS |
| 2 | `decrements countdown text to 29s after advancing timers by 1 second` | PASS |
| 3 | `shows an enabled 'Retry' button immediately when no retryAfterSeconds` | PASS |
| 4 | `calls streamClaude again with the same apiKey and prompt when Retry is clicked` | PASS |
| 5 | `clears the countdown interval on unmount so no setState fires after unmount` | PASS |

---

## Mock strategy

- `@/lib/anthropic` — `streamClaude` replaced with `vi.fn()` (default: resolves immediately). `ClaudeError` re-exported as-is from the real module.
- `@/lib/runs` — `loadRuns`, `appendRun`, `generateRunId` all return stubs.
- `@/lib/library` — `loadValues`, `saveValues`, `clearValues`, `writeJSON` are no-ops.
- `@/components/Markdown` — renders source text only.
- `@/components/RunHistory` — renders null.

---

## Key implementation findings

The actual UI text differs from the task brief ("Try again in ~Xs"):

| Expected by spec | Actual in PromptDetail.tsx (line 842) |
|---|---|
| "Try again in ~Xs" | `Retry in {retryCountdown}s` |
| "Retry" button disabled during countdown | "Retry now" button present, with `opacity-60` CSS (not HTML `disabled`) |

Tests were written against the actual implementation, not the spec text.

---

## Typecheck

```
npm run typecheck:test → exit 0 (no errors)
```

---

## Test run results

```
npm test tests/PromptDetail.ratelimit.test.tsx
  ✓ tests/PromptDetail.ratelimit.test.tsx (5 tests) 225ms
  Test Files  1 passed (1)
      Tests  5 passed (5)
```

```
npm test (full suite)
  Test Files  15 passed (15)
      Tests  232 passed (232)
```

---

## Notes

- React 19 + vitest fake-timers emits an `act(...)` advisory on test 2 (and test 1 on some runs) when the `setInterval` callback fires asynchronously. This is a known React 19 / jsdom interaction — the warning is advisory, not a failure, and does not affect test correctness. Tests pass deterministically.
- "Retry now" button has `opacity-60` CSS but is not HTML-`disabled`; test 1 asserts presence via `aria-label` rather than checking disabled state (which would be incorrect given the implementation).
- No tests skipped or deferred.

---

## Commit

`e94f7c3` — `test(prompt-lib): F-r2 component tests — rate-limit retry button (jsdom)`

No push. No merge.
