# Test / CI sweep — end of cycle/auto-2026-05-23-pm

_By Gary. One pass after F5–F9 landed. **Runner still not installed** (the morning's Vitest proposal at `qa-reports/proposal-testing-2026-05-23.md` remains the unblock for all of today's tests)._

## What I added (this PM cycle)

| File | Cases | What it locks in |
|---|---|---|
| `src/lib/__tests__/transfer.test.ts` | ~20 | Export shape integrity (right keys, ghost-id filtering, never apiKey/model/maxTokens). `parseImport` error variants (malformed JSON, wrong shape, missing version, future version). Silent-drop survival: bad prompt entry, non-string favorite/recent, corrupt run entries. Force `isSeed: false` on import. Merge: id-dedup for prompts, union-without-dup for favorites, recent cap, no-op for re-importing the same file. Replace: wipes existing user keys AND per-prompt sub-keys, leaves apiKey/model/maxTokens/schemaVersion/onboarded untouched. |
| `src/lib/__tests__/markdown.test.ts` | ~21 | `isSafeUrl` accepts https/http/mailto; rejects javascript:/data:/vbscript:/relative. `parseInline` covers plain text, bold/em (incl. snake_case immunity), inline code, links with safe + unsafe protocols, unterminated tokens (graceful streaming partials). `parseMarkdown` covers h1-h3 + h4 capping, paragraphs, fenced code (closed and unclosed-for-streaming), ul/ol, raw HTML surviving as literal text. |

**PM cycle test totals: 2 new test files, ~41 new cases, ~530 lines of test code.**

Combined with this morning's QA additions and the AM-cycle's runs/values/getTags tests, the full Prompt Library test surface is now:

| Source | Cases |
|---|---|
| Pure-logic morning tests (variables / library / search) | ~43 |
| AM-cycle tests (runs / values / getTags) | ~32 |
| PM-cycle tests (transfer / markdown) | ~41 |
| **TOTAL waiting on Vitest install** | **~116** |

All tests use the same jsdom-agnostic in-memory localStorage stub — runs unchanged under either Jest+jest-environment-jsdom or Vitest with `environment: 'jsdom'`.

## What I verified

| Gate | Status |
|---|---|
| `npx tsc --noEmit` after every commit (PM cycle) | **pass** |
| `npx next build` clean (5 prerendered routes, no SSR creep) | **pass** |
| Tests excluded from tsc via tsconfig glob | yes |
| Zero source-code changes in this commit | yes — pure additive test files |

## Still-pending (unchanged from morning)

- **Vitest install** — `qa-reports/proposal-testing-2026-05-23.md`. Installing this single proposal would activate ~116 cases of regression coverage.
- **ESLint + Prettier** — `qa-reports/proposal-lint-2026-05-23.md`.
- **GitHub Actions CI** — `qa-reports/proposal-ci-2026-05-23.md`.

## Coverage gaps left for next cycle

1. **Component tests** for SettingsModal's import preview flow (RTL needed; not in any current proposal).
2. **`Markdown` component-level tests** verifying React-render outputs (vs the parser-level tests we added). Same RTL gap.
3. **Quota-exceeded write path through writeJSON** — easier under a real runner with `jest.spyOn`.
4. **End-to-end SSE event → run-history status** — feed fake SSE through streamClaude, verify the StoredRun's status.
5. **Theme on first visit** — F9's matchMedia path is hard to unit-test without a jsdom that responds; deferred.

## Forward-looking

- **Adopt the new ship gate** the moment Vitest lands: `npx tsc --noEmit && npm test && npx next build`. The CI proposal wires this for GitHub Actions; adopting it locally is what matters for day-to-day quality.
- **Co-locate one test file per new pure-logic module** — the PM cycle followed this; `transfer.ts` and `markdown.ts` each got a sibling test file the day they shipped.

Full PM perf companion: `qa-reports/perf-sweep-2026-05-23-pm.md`.
