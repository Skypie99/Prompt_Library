# F-r2 Countdown Humanization — Shamus Build Report

**Date:** 2026-05-29  
**Role:** Shamus (Feature Pusher)  
**Branch:** `shamus/f-r2-humanize-2026-05-29`  
**Commit:** `dd42139`  
**Research basis:** `qa-reports/2026-05-29_Riley_F-r2_RateLimitEdgeCaseResearch.md`

---

## What Was Built

Addressed Riley's Scenario 1 gap: the rate-limit retry countdown showed raw seconds even
for long waits (e.g. "Retry in 327s"), requiring users to do mental arithmetic to
understand how long to wait.

### Changes

**New file — `src/lib/format.ts`**

`formatRetryCountdown(seconds: number): string`
- `<= 0` → `"0s"` (defensive)
- `1–59` → `"Ns"` (unchanged — user stays and watches)
- `60–300` → `"about N minute(s)"` (Math.ceil; singular/plural correct)
- `> 300` → `"a few minutes"` (user will leave; precision unhelpful)

**Updated — `src/components/PromptDetail.tsx`**
- Added `import { formatRetryCountdown } from "@/lib/format"`
- Countdown display: `Retry in {retryCountdown}s` → `Retry in {formatRetryCountdown(retryCountdown)}`
- Countdown aria-label: `Retry — available in ${retryCountdown} seconds` → `Retry — available in ${formatRetryCountdown(retryCountdown)}`

**New file — `src/lib/__tests__/format.test.ts`**
- 14 unit tests covering: 0, negative, 1, 30, 59, 60, 61, 120, 300, 301, 600, 3600
- Boundary tests for singular ("1 minute") vs plural ("N minutes")
- All 14 pass

**Updated — `tests/PromptDetail.ratelimit.test.tsx`**
- Test 5 (unmount cleanup): was asserting `"Retry in 60s"` — updated to `"Retry in about 1 minute"` to match humanized output
- Test 1 (countdown shown): aria-label regex updated from `/Retry — available in 30 seconds/` to `/Retry — available in 30s/` (30 < 60 so raw seconds, no "seconds" word)

---

## Check Results

### typecheck
```
> npm run typecheck
> tsc --noEmit

(no output — clean pass)
```

### tests
```
> npm run test
> vitest run

 Test Files  20 passed (20)
      Tests  338 passed (338)
   Start at  11:08:24
   Duration  4.07s
```

All 338 tests pass. 14 new tests in `format.test.ts` all green.

Pre-existing `act(...)` warnings in `PromptDetail.ratelimit.test.tsx` (tests still pass; warnings are from the original test authorship, not this change).

---

## Design Compiler

This change is **display-only text formatting** — no new UI components, no layout changes,
no color/token changes, no visual structure change. The countdown span and button already
existed; only the string content changes.

Per the Design Compiler conditions:
- Layer 1 (Tokenization): no token changes
- Layer 3 (Component Consistency): no new components
- Layer 6 (Regression Safety): text-only, no layout or visual drift

**Compiler run not required** — this is a pure text substitution on an existing element with
no visual design change. If Dani disagrees, I will request a compile immediately.

---

## Decisions for Sky

None. This is a straightforward spec implementation (Riley's research confirmed the gap;
the fix is in the research doc's "Recommended Fix Direction" section almost verbatim).

---

## Next Steps

- Gary: CI run on `shamus/f-r2-humanize-2026-05-29` (338 tests pass, typecheck clean)
- Rory: merge to main per standard wave order once Gary signs off
- Riley's Scenario 2 (cascade reassurance after repeated 429s) is a separate, optional
  enhancement — out of scope for this commit, flagged for a potential F-r2-v2

**Status: DONE (pending Gary CI + Rory merge)**
