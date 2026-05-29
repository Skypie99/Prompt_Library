# Shamus — Rate-Limit Retry Disabled Guard Fix
**Date:** 2026-05-29
**Branch:** fix/ratelimit-retry-disabled-2026-05-29
**Mode:** BACKGROUND

---

## Summary

Peter's perf audit identified that the F-r2 rate-limit "Retry now" / "Retry" buttons in `PromptDetail.tsx` were missing `disabled={running}`, a concurrent-request guard that the F3a overloaded retry button (added later) had correctly included. A rapid click during an active run could stack a second concurrent `streamClaude` call.

---

## Bug Confirmed: YES

**File:** `src/components/PromptDetail.tsx`

**Affected buttons** (lines 936, 945 on main):
- The countdown "Retry now" button (shown when `retryCountdown !== null`)
- The plain "Retry" button (shown when `retryCountdown === null`)

Both buttons called `handleRetry` with no `disabled` guard, allowing concurrent invocations if the user clicked again before the previous run completed.

**Reference pattern (F3a overloaded retry, line 965):**
```tsx
<button
  onClick={handleRetry}
  disabled={running}
  className="font-medium underline underline-offset-2 disabled:opacity-50"
>
```

---

## Fix Applied: YES

Added `disabled={running}` and `disabled:opacity-50` to both F-r2 rate-limit retry buttons, exactly matching the F3a pattern.

**Diff summary:**
- `Retry now` button: added `disabled={running}`, appended `disabled:opacity-50` to className
- `Retry` button: added `disabled={running}`, appended `disabled:opacity-50` to className

4 insertions, 2 deletions. One logical change across two sibling buttons.

---

## Verification: PASS

| Check | Result |
|---|---|
| `npm run typecheck` | PASS (no errors) |
| `npm run test` | PASS — 335 tests passed across 20 test files |
| Pre-existing `act()` stderr warnings | Pre-existing, not introduced by this fix |

---

## Commit

`60ea6f0` — `[bg-cycle] fix(run): add disabled={running} to rate-limit retry button`

---

## ESCALATIONS FOR SKY

None. Minimal, targeted fix. No logic change — only the HTML `disabled` attribute and a Tailwind opacity variant. Safe to merge when Rory is ready to include in the next wave.
