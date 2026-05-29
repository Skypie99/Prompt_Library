# Prompt Library — 14-Hour Push Morning Briefing

**Date:** 2026-05-29
**Period:** 2026-05-28 evening → 2026-05-29 ~1am
**Driver:** Morgan + 30+ background agents
**Final main SHA:** 9136222
**Final test count:** 324/324 passing

---

## What shipped

| Branch | What | Tests |
|---|---|---|
| fix/prompt-detail-hook-violation | Medium rules-of-hooks bug fixed (stale closure on modal reopen) | 214 |
| qa/eslint-prettier | ESLint v9 + Prettier wired — lint now runs on every PR, 103 auto-fixes applied | 214 |
| ci/auto-2026-05-25-rory-prompt-lib-ci | **GitHub Actions CI live** — typecheck + test + lint on every PR | 214 |
| feat/rate-limit-retry (F-r2) | Rate-limit retry: countdown timer + Retry button, parseRetryAfter helper | 223 |
| qa/steve-variables-validation | Variables validation hardening (+90 tests) | 313 |
| qa/vitest-jsdom-setup | jsdom + @testing-library/react wired into Vitest for component tests | 317 |
| test/gary-fr2-component-tests | 5 component tests for F-r2 Retry button (countdown, click, unmount) | 322 |
| product/quinn-features-refresh | FEATURES.md refreshed: F6/F7/F9 moved to Done (confirmed shipped) | 322 |
| fix/a11y-api-nudge (F-r1) | First-run API key nudge banner + 7 a11y fixes in ApiKeyNudge/SettingsModal | 324 |
| fix(deps): @testing-library in package.json | Ghost node_modules fix — testing-library deps now properly persisted | 324 |

**Bugs found and fixed during push (not in original backlog):**
- `PromptDetail.tsx` rules-of-hooks violation (useCallback after early return) — REAL, MEDIUM severity, fixed
- `@testing-library/jest-dom` not in package.json despite being imported — would have broken fresh installs

---

## What's queued for next decision

| Item | Status | Notes |
|---|---|---|
| F5 Export/Import | SPEC ONLY — split into 3 phases | Morgan spec doc in qa-reports |
| F6 Markdown rendering | SHIPPED — Markdown.tsx already exists and is wired | Already in Done |
| PL jsdom component test coverage | IN FLIGHT — jsdom wired, F-r2 tests written; more components need coverage |
| F-r2 component tests for edge cases | PROPOSED — unmount race, multiple retries | Low priority |

---

## Expert recommendations applied

- **Gary:** ESLint v9 config + 103 auto-fixes, 6 @ts-expect-error cleaned, jsdom setup
- **Steve:** Variables validation hardening (+90 tests, closes injection surface)
- **Riley/Shamus:** F-r2 implementation (all 5 ACs)
- **Alex:** F-r1 a11y fixes (7 WCAG failures resolved)
- **Peter/Jordan:** Background audits — both PASS, no action needed

---

## Suggested next-day priorities

1. **Run the app** — test F-r1 (API nudge) and F-r2 (rate-limit retry) in the browser with `npm run dev`
2. **Check GitHub Actions CI** is passing green on main
3. **F3 prompt-running improvements** — next natural feature based on FEATURES.md priority order
4. **PL typecheck** — still at 0 errors; keep it that way
5. **F5 export/import** — spec is ready; consider splitting into export-only first (1-day build)

---

## Verification ledger

| What | SHA/Result |
|---|---|
| Final main | 9136222 |
| Tests | 324/324 |
| Typecheck | Pass (0 errors) |
| ESLint | Pass (0 errors on main after hook fix) |
| GitHub Actions CI | Live — wired via ci/auto-2026-05-25-rory-prompt-lib-ci |
| All testing-library deps in package.json | Yes — committed at 9136222 |
