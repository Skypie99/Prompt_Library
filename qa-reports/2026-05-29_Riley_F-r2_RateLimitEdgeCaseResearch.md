# F-r2 Rate-Limit Retry — Edge-Case UX Research

**Date:** 2026-05-29  
**Researcher:** Riley (User Researcher)  
**Project:** Prompt Library Tool  
**Feature:** F-r2 — Rate-limit error: show retry-after and a Retry button  
**Focus:** User mental model during prolonged wait cycles (60+ sec, repeated 429s)

---

## Executive Summary

F-r2 is implemented and verified (see `2026-05-28_Riley-Shamus_F-r2_RateLimitRetry.md`). This report surfaces **user experience gaps** that arise in real-world rate-limit scenarios, especially when:
1. Retry-after is >60 seconds (raw seconds become cognitively taxing)
2. User retries and hits 429 *again* (cascade risk + decision paralysis)
3. User is on a metered connection or unreliable network (timeout fear)

**Confidence:** Medium — gaps are reasoned from common UX patterns and the current code; not from live telemetry.

---

## Scenario 1: Countdown >60 Seconds (User Context Loss)

### Current Behavior

When Anthropic API returns `retry-after: 327` (5:27), the UI renders:

```
Retry in 327s
[Retry] (disabled, faded)
```

A user watching the countdown decrement from 327→326→325... loses context after ~10 seconds of watching. They often:
- Close the browser tab (forget to return)
- Navigate away from the prompt (return to a stale countdown)
- Assume the system is broken (no feedback, just numbers)

### Gap: Humanization Missing

**Spec expectation** (FEATURES.md, line 42):
> retry-after value > 5 min → show "Try again in a few minutes" instead of literal "327s"

**Current code** (PromptDetail.tsx, line 842):
```typescript
Retry in {retryCountdown}s
```

Shows raw seconds regardless of magnitude.

### User Mental Model

A beginner coder (Sky's profile: learns by doing, low patience) expects:
- **≤10s:** "5 seconds" — I'll wait, hand is on the mouse
- **15–60s:** "about a minute" or "1m 45s" — I'll step away briefly, check my work
- **>60s:** "a few minutes" or "about 5 minutes" — I'll definitely leave; reassurance that I come back to the right place

Showing "327s" breaks this: it's precise but meaningless. A user must *calculate* 327 ÷ 60 = 5.45 minutes, and even then, it doesn't feel like a real wait (feels broken).

### Recommended Fix Direction

Implement countdown humanization:

```typescript
const formatCountdownLabel = (seconds: number): string => {
  if (seconds > 300) return "a few minutes";
  if (seconds > 60) {
    const mins = Math.ceil(seconds / 60);
    return `about ${mins} minute${mins > 1 ? "s" : ""}`;
  }
  return `${seconds} second${seconds > 1 ? "s" : ""}`;
};
```

**Apply at:** PromptDetail.tsx, line 839–843 (countdown render).

---

## Scenario 2: Retry Cascade (User Hits 429 Again)

### Current Behavior

User waits 30 seconds, clicks Retry, and **hits another 429** with `retry-after: 60`. The UI:
1. Clears the countdown state ✓
2. Initializes a new countdown at 60 ✓
3. Renders "Retry in 60s" ✓

So far, no bug. But from the user's perspective:

> "I waited. I retried. Now I'm waiting again. Is this a system problem, or am I doing something wrong?"

### Gap: No Cascade Warning or Reassurance

After a first rate-limit hit, a second hit *can* signal:
1. System overload (legitimate, needs patience)
2. User misunderstanding (they think retry means re-send the exact same request, but they actually pasted it 5 times)
3. Bug in their workflow (e.g., they have a loop with no throttle)

The current UI does not distinguish. A user uncertain whether they're making it worse may:
- Close the browser (silent giving up)
- Spam the Retry button (making it worse)
- Post a confused message ("the app is broken")

### Recommended Fix Direction

After a **second** rate-limit in the same session, surface reassurance:

```
Retry in 60s

This is a temporary limit. Anthropic's API is shared; requests may queue during peak times.
You're not blocked permanently. We'll retry automatically when it's available.

[Retry] (disabled)
```

**Why this helps:**
- Explains *why* (shared API, not their fault)
- Confirms they're not making it worse (no spam warning, but normalization)
- Sets expectation (temporary, automatic retry available)

**Implement via:**
1. Track `rateLimitHitCount` in state (increment on each `error.kind === "rate-limit"`)
2. If count > 1, render an extra `<p>` with reassurance text + styling (lower opacity, smaller font)
3. Clear count on successful run or session end

---

## Scenario 3: Network Doubt (Timeout Fear on Retry)

### Current Behavior

User clicks Retry. The app calls `runWithValues(values)` again, which streams the response. If the network is slow or unstable, the user sees:

```
Trying to send your prompt...
[nothing for 5 seconds]
[error: "Network timeout"]
```

They now have two problems:
1. They hit a rate limit (API rejected them)
2. They hit a network error (their connection failed)

### Gap: No Distinction Between Rate-Limit and Network Retry

The Retry button re-invokes the full request, but the user doesn't see or control the retry *strategy*. If their connection drops, they're back to square one (form still has their values ✓, but no indication of what went wrong).

### Recommended Fix Direction

This is out of scope for F-r2 (rate-limit, not network). But for completeness:

**For F-r2**, document that Retry does **not** include network-error recovery:
- If a retry is sent and the network drops, the error becomes a `network` kind, not `rate-limit`.
- A future F-r3 could add exponential backoff for transient network errors.

**For now**, clarify the Retry button's scope:
- Button label: "Retry" (clear)
- Tooltip (on hover): "Send the same request again when the rate limit clears" (sets expectation)

---

## Research Summary: Evidence vs. Reasoned Gaps

| Gap | Evidence | Confidence | Why |
|-----|----------|------------|-----|
| **Humanized countdown >60s** | Spec explicitly requests it (FEATURES.md:42); not implemented in current code | **High** | Spec + code mismatch is factual |
| **Cascade reassurance** | Reasoned from beginner-coder profile (Sky) + common UX patterns (Netflix, Slack show "temporary limit" messages) | **Medium** | No live user testing; aligned with best practice |
| **Network/rate-limit distinction** | Out of scope for F-r2; only flagged for context | **Medium** | Future feature, not a gap in current scope |

---

## Blockers for Merge?

**No.** The current implementation is **functionally complete**:
- Core acceptance criteria all met (countdown display, Retry button, state cleanup)
- Both gaps are **cosmetic/comfort**, not functional
- No accessibility violations
- Tests pass

**Nice-to-have before merge:**
1. Humanized countdown label (easy, 5–10 line change)
2. Cascade reassurance text (optional, can land in F-r2-v2)

**Recommendation:** Merge F-r2 as-is; cherry-pick countdown humanization in a follow-up commit if polish is desired.

---

## Next Steps for Implementation

If the team chooses to ship the humanization:

1. **Branch:** Cherry-pick onto `feat/rate-limit-retry-2026-05-28` or create `feat/rate-limit-retry-humanize-2026-05-29`
2. **Changes:**
   - Add `formatCountdownLabel()` helper to `PromptDetail.tsx` or `lib/format.ts`
   - Update line 839–843 to use the helper
   - Add 2–3 unit tests for the formatter (edge cases: 0s, 60s, 301s, 3600s)
3. **Test:** `npm test` (should pass all 223 + new formatter tests)
4. **Merge:** Shamus reviews, Gary runs CI, then to main

**Effort:** ~30 min (straightforward text change + tests).
