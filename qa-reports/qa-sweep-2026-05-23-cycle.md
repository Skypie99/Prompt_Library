# Test / CI sweep — end of cycle/auto-2026-05-23

_By Gary. One pass after F1–F4 landed. Net-new test files; **runner still not installed** (the Vitest proposal from this morning at `qa-reports/proposal-testing-2026-05-23.md` is still the unblock)._

## What I added

| File | Cases | What it locks in |
|---|---|---|
| `src/lib/__tests__/runs.test.ts` | ~17 | `generateRunId` shape + uniqueness; round-trip via `saveRuns`/`loadRuns`; corrupt-entry survival (3 paths: bad shape, non-array stored, corrupt JSON); `appendRun` cap (10) + per-response trim (32KB); `removeRun` selectivity; `clearRuns` only removes the key for THAT prompt; SSR safety (no-window) on both `loadRuns` and `clearRuns`; `formatRelativeTime` buckets for just-now / minutes / hours / days; unparseable-date returns "" |
| `src/lib/__tests__/values.test.ts` | ~9 | F2 round-trip; per-prompt isolation; `clearValues` removes the key; corrupt-shape (array / non-string value / corrupt JSON) all return `{}`; SSR safety |
| `src/lib/__tests__/prompts.test.ts` (extended) | +6 | `getTags` frequency sort; alphabetical tie-break; empty/whitespace tag drop; dedup; trim-before-count; empty-input behavior |

**Cycle total: 6 new test files? No — 2 new + 1 extended.** ~32 new cases written, ~622 lines of test code (the new files plus the prompts.test.ts addition).

All tests use the same jsdom-agnostic in-memory `localStorage` stub pattern Gary established earlier today — they run unchanged under either Jest+jest-environment-jsdom or Vitest with `environment: 'jsdom'`.

## What I verified

| Gate | Status |
|---|---|
| `npx tsc --noEmit` after every commit this cycle | **pass** (verified 10+ times) |
| `npx next build` (full production build + static export) | **pass** — 5 routes prerendered, `/` First Load JS 127 kB |
| Tests excluded from tsc by existing `tsconfig.exclude` glob | yes — they don't affect typecheck |
| No source-code edits in this commit | confirmed — pure additive test files |
| Storage write-failure path | not unit-tested (requires mocking `localStorage.setItem` to throw `QuotaExceededError`; deferred to a runner-installed pass that can do `jest.spyOn` cleanly) |

## What's still pending (unchanged from this morning)

These are this morning's proposals — they're the prerequisite for *any* test to actually run:

- **Vitest install** (`proposal-testing-2026-05-23.md`)
- **ESLint + Prettier** (`proposal-lint-2026-05-23.md`)
- **GitHub Actions CI** (`proposal-ci-2026-05-23.md`) — once tests run, the CI wiring is the next unlock

If you install Vitest right now (one `npm install`, two-minute config), today's cycle alone gives you ~75 cases of regression coverage on the new features.

## Coverage gaps left for next cycle

1. **Component-level smoke tests** for RunHistory and TagChips would be valuable but need React Testing Library, which isn't in any current proposal. Easy to add when Vitest lands.
2. **Anthropic stream error → run-status mapping** — covered indirectly by the runs.ts shape tests, but a focused test that feeds fake SSE events through `streamClaude` and verifies the resulting `StoredRun.status` would be a nice add.
3. **Quota-exceeded path** through `writeJSON` — needs `jest.spyOn(localStorage, 'setItem').mockImplementation(throw)` which is cleaner under a real runner.

## Forward-looking

- **Add a `test` script to `package.json`** the moment Vitest lands, then `npm test && npm run typecheck && npm run build` is the new ship gate. The CI proposal already wires this for GitHub Actions.
- **Co-locate one test file per new pure-logic module** — today's F1/F2/F3 additions follow this discipline; F4 (ShortcutsModal) is presentational only (no pure logic to test beyond the constant array — and asserting on a constant adds no signal).
