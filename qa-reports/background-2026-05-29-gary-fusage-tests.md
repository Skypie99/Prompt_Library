# Gary — F-usage Test Coverage Background Cycle
**Date:** 2026-05-29  
**Branch:** feat/f-usage-token-display-2026-05-29  
**Task:** Write tests for F-usage token display + investigate test count discrepancy  
**Status:** DONE

---

## Test Count Investigation

| Branch | Test Count | Notes |
|--------|-----------|-------|
| `main` | 324 | Confirmed by running `npm run test` on main |
| `feat/f-usage-token-display-2026-05-29` (pre-Gary) | 327 | Shamus's 3 new tests in `anthropic.test.ts` |
| `feat/f-usage-token-display-2026-05-29` (post-Gary) | 347 | +20 tests from this cycle |

**Mystery resolved:** YES. Shamus's claim of "315 + 12 = 327" was inconsistent because:
- Main had **324** tests (not 315).
- Shamus added **3** tests (not 12) to `anthropic.test.ts`.
- 324 + 3 = 327 — the math checks out with the correct pre-existing count.

The 315 figure Shamus cited likely came from a different branch (e.g., `feat/f3acd-run-ux-2026-05-29` or `a11y/header-focus-teal-2026-05-29`) that didn't have all of Gary's previous test additions merged in. The discrepancy is a branch-base confusion, not a dropped test — no tests are missing.

---

## Tests Added (+20 total)

### F-usage-a additions — `src/lib/__tests__/anthropic.test.ts` (+2)

Shamus already wrote 3 tests covering normal completion, incomplete stream, and missing onUsage param. Gary added the two cases that were genuinely absent:

| Test | What it verifies |
|------|-----------------|
| `does NOT call onUsage when an AbortError is thrown` | fetch throws AbortError (user hits Stop) — onUsage must not fire |
| `does NOT call onUsage when an error SSE event arrives` | A `type: "error"` SSE event causes ClaudeError to throw before message_delta — onUsage must not fire |

### F-usage-b additions — `src/lib/__tests__/runs-extra.test.ts` (+5)

| Test | What it verifies |
|------|-----------------|
| `saves and reloads tokensUsed when present` | Round-trip through appendRun + loadRuns preserves the field |
| `does not set tokensUsed on old-format runs` | Pre-F-usage stored JSON (no `tokensUsed` key) loads without error, field remains absent |
| `drops a run whose tokensUsed has non-number fields` | Corrupt `tokensUsed` (string instead of number) — `isStoredRun()` rejects the entry |
| `preserves tokensUsed through appendRun and reloads correctly` | Mixed list: one run with, one without — both stored/loaded correctly |
| `saves large token counts without truncation` | 12,500 / 98,000 token counts survive storage intact |

### F-usage-b transfer round-trip — `src/lib/__tests__/transfer-extra.test.ts` (+3)

| Test | What it verifies |
|------|-----------------|
| `preserves tokensUsed when present in an imported run` | Export → JSON → parseImport → tokensUsed field survives |
| `accepts a run without tokensUsed (old-format backward compat)` | Pre-F-usage exported runs import cleanly, no error, field absent |
| `drops a run whose tokensUsed has wrong-typed fields` | `isValidStoredRunShape()` rejects corrupt tokensUsed; valid runs in the same list survive |

### F-usage-c display — `tests/RunHistory.fusage.test.tsx` (+5)

| Test | What it verifies |
|------|-----------------|
| `shows token count line for a run with tokensUsed` | Expanded RunHistory shows `"{input} in · {output} out"` |
| `does NOT show token count when tokensUsed is absent` | Old-format runs produce no ` in · ` text anywhere |
| `formats large counts with comma separators` | 1,234 and 9,876 displayed with commas (toLocaleString) |
| `sets aria-label with 'input tokens' / 'output tokens' wording` | Unabbreviated form in aria-label for screen readers |
| `shows counts only for runs that have tokensUsed` | Mixed list: exactly 1 token count line present |

### F-usage-c display — `tests/PromptDetail.fusage.test.tsx` (+5)

| Test | What it verifies |
|------|-----------------|
| `shows token count line after run completes with onUsage data` | aria-label + display text render after streamClaude calls onUsage |
| `does NOT show token count while streaming` | `running=true` suppresses the count line (and response panel guard) |
| `does NOT show token count when run errors` | ClaudeError path — no usage, no count line |
| `formats large counts with comma separators` | 1,234 / 9,876 with commas in both aria-label and display |
| `replaces previous token counts with new run's counts` | Second run overwrites first run's token counts |

---

## Key Implementation Notes

**showResponsePanel guard:** The token count line only renders inside `{showResponsePanel && ...}` where `showResponsePanel = running || response.length > 0 || error !== null`. Component tests that check token display must also call `onText()` in their mocks to make `response.length > 0`, otherwise the entire response panel (including the token line) is hidden.

**Shamus's 3 existing tests:** The test named "does NOT call onUsage when the stream is aborted before message_delta" actually tests the case where the stream completes normally but never sends `message_delta` — not a real AbortError. Gary added the two missing cases (real AbortError from fetch abort, and error SSE event).

---

## Checks

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS — 0 errors |
| `npm run test` | PASS — 347 tests (327 pre-existing + 20 new) |

Pre-existing `act()` warnings in `PromptDetail.ratelimit.test.tsx` are unchanged and unrelated to this work.

---

## ESCALATIONS / DECISIONS FOR SKY

None. All F-usage acceptance criteria now have test coverage. No new source code changes — tests only.

---

## NEXT

- **Alex:** A11y gate on the token count display — verify aria-label wording on token count regions meets WCAG 2.1; check tab order in RunHistory.
- **Rory:** This branch (feat/f-usage-token-display-2026-05-29) is ready for merge review once Alex's a11y gate passes.
