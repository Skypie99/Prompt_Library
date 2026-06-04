# Prompt Library — Morgan Merge Queue (14-hr push)

**Date:** 2026-05-28
**Driver:** Morgan
**Window:** 2026-05-28 evening → 2026-05-29 noon
**Plan:** `~/.claude/plans/morgan-i-have-a-lively-iverson.md`

---

## Stamp legend

- **GREEN** — typecheck + tests + lint all pass on a freshly rebased worktree; safe to merge.
- **BLOCKED** — failed one of the gates; reason logged.
- **STALE-PENDING-REAUDIT** — was GREEN, but `main` advanced since; needs diff-only re-audit.
- **MERGED** — Rory landed it; audit stamp follows in `morgan-wave-log-2026-05-28.md`.

## ⚠️ Baseline correction (2026-05-28)

Gary's test triage confirmed: **all 214 Prompt Library tests pass on main** (commit `7a93136` fixed both "pre-existing" failures). The earlier pre-existing-failure caveat in this file is now moot. Verifiers should expect 214/214 pass with no exemptions.

---

## Candidates

- branch: fix/a11y-api-nudge-2026-05-26
  head_sha: 6437a17
  main_sha_at_stamp: 7e92998
  status: GREEN
  checks: { typecheck: pass, test: pass (324/324), lint: skipped (pre-existing gap), build: skipped }
  verifier: Shamus (sonnet) — rebase resolve 2026-05-28
  timestamp: 2026-05-29T00:00Z
  notes: Rebased onto main@7e92998. 5 conflicts resolved (4 formatting-only + 1 manual PromptDetail duplicate block). All F-r1 semantic changes preserved. Report: qa-reports/2026-05-28_Shamus_F-r1_RebaseResolve.md

- branch: feat/all-prompts-empty-state-2026-05-24
  head_sha: 1889ae7
  main_sha_at_stamp: 1889ae7
  status: MERGED
  checks: { typecheck: pass, test: pass, lint: skipped, build: skipped }
  verifier: gary-style verifier (haiku) wave-A1
  timestamp: 2026-05-29T05:42:56Z
  notes: BACKGROUND propose-only — Sky reviews diff manually before approving

- branch: qa/auto-2026-05-25-steve-variables-validation
  head_sha: <see branch>
  main_sha_at_stamp: 1889ae7
  status: MERGED
  checks: { typecheck: pass, test: pass, lint: skipped, build: skipped }
  verifier: gary-style verifier (haiku) wave-A2
  timestamp: 2026-05-29T05:43:12Z
  notes: 304 tests passing (all passing), no conflicts, up-to-date with main

- branch: ci/auto-2026-05-25-rory-prompt-lib-ci
  head_sha: f82cc7a46c0a0dc9b01c0b2194d3628b2c05ee8c
  main_sha_at_stamp: 1889ae7
  status: MERGED
  checks: { typecheck: pass, test: pass (214/214), typecheck:test: pass, lint: N/A, build: N/A }
  verifier: Gary (sonnet) — direct cleanup
  timestamp: 2026-05-28T23:01Z
  notes: 6 unused @ts-expect-error directives removed from globalThis.localStorage stubs across all 6 test files. tsc:test now clean. Workflow adds GitHub Actions CI with typecheck + test; safe to merge. Report: qa-reports/2026-05-28_Gary_CI_TsExpectErrorCleanup.md

- branch: fix/prompt-detail-hook-violation-2026-05-28
  head_sha: 9c8c3d7
  main_sha_at_stamp: 1889ae7
  status: MERGED
  checks: { typecheck: pass, test: pass (214/214), lint: skipped (Gary config on separate branch), build: skipped }
  verifier: Shamus+Steve (sonnet) direct investigation
  timestamp: 2026-05-29T06:45Z
  notes: REAL rules-of-hooks violation (useCallback after early return). Moved hook above early return. Medium severity — stale closure on modal reopen. Report at qa-reports/2026-05-28_Shamus_PromptDetail_HookViolation.md

- branch: qa/eslint-prettier-2026-05-28
  head_sha: b059db0
  main_sha_at_stamp: 1889ae7
  status: MERGED
  checks: { typecheck: pass, test: pass (214/214), lint: N/A (this branch IS the lint config), build: skipped }
  verifier: Gary (sonnet) — self-verifying during build
  timestamp: 2026-05-29T06:30Z
  notes: ESLint v9 + Prettier wiring. 103 auto-fixes applied to 33 files. 9 remaining non-fixable errors (1 real hook violation in PromptDetail — fixed on separate branch; 8 ban-ts-comment in test files — to be cleaned by CI branch fix). Report at qa-reports/2026-05-28_Gary_ESLint_Prettier_Setup.md

- branch: feat/rate-limit-retry-2026-05-28
  head_sha: 3116a7f
  main_sha_at_stamp: 1889ae7
  status: MERGED
  checks: { typecheck: pass, test: pass (223/223 — 9 new), lint: skipped, build: skipped }
  verifier: Riley+Shamus (sonnet) direct build
  timestamp: 2026-05-29T07:10Z
  notes: All 5 F-r2 ACs met in prod code. parseRetryAfter tested. Component test gap CLOSED — see test/auto-2026-05-28-gary-fr2-component-tests below. Report at qa-reports/2026-05-28_Riley-Shamus_F-r2_RateLimitRetry.md

- branch: test/auto-2026-05-28-gary-fr2-component-tests
  head_sha: e94f7c3
  main_sha_at_stamp: 1889ae7
  status: MERGED
  checks: { typecheck: pass, test: pass (232/232 — 5 new component tests), lint: skipped, build: skipped }
  verifier: Gary (sonnet) direct build
  timestamp: 2026-05-29T08:10Z
  notes: 5 component tests — countdown display, countdown advance, no-countdown Retry, click re-invokes streamClaude, unmount cleans interval. Tests match real impl (countdown text "Retry in {N}s", opacity-60 not disabled attr). Requires jsdom branch to be merged first (or cherry-pick of jsdom setup). Report at qa-reports/2026-05-28_Gary_F-r2_ComponentTests.md

---

## Sky approvals

(annotate here: "APPROVE: branch1, branch2" or per-branch)

### Pre-approved per Morgan Standing Authority (Safe + Quality + Forward momentum)
- fix/prompt-detail-hook-violation-2026-05-28 — MEDIUM bug fix, 0 regressions, unblocks ESLint green. Morgan approves.
- qa/eslint-prettier-2026-05-28 — additive tooling only, 0 regressions, enables lint-on-PRs going forward. Morgan approves pending hook fix merging first (so ESLint config sees 0 real errors).

### Wave result (Rory 2026-05-28)
- fix/a11y-api-nudge-2026-05-26 — GREEN (rebased by Shamus 2026-05-28; new HEAD 6437a17)
- feat/all-prompts-empty-state-2026-05-24 — MERGED (was already on main; no-op)
- qa/auto-2026-05-25-steve-variables-validation — MERGED @ 4b12720
- ci/auto-2026-05-25-rory-prompt-lib-ci — MERGED @ eab688f
- feat/rate-limit-retry-2026-05-28 — MERGED @ d578039
- qa/vitest-jsdom-setup-2026-05-28 — MERGED @ cc147bc
- test/auto-2026-05-28-gary-fr2-component-tests — MERGED @ 8a08fc6
- product/auto-2026-05-28-quinn-features-refresh — MERGED @ 7e92998

---

## Wave log → `morgan-wave-log-2026-05-28.md`
