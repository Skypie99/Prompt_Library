# Prompt Library — Flagship Finishing Pass: full ship report (Phases A · B · D · C1)

**Date:** 2026-06-19 · **Session:** Opus 4.8 ultracode (Sky-initiated)
**Plan:** `~/.claude/plans/opus-4-8-ultracode-piped-kernighan.md`
**Phase 0 critique:** `qa-reports/2026-06-19_Phase0_Critique_and_PhaseA_Ship.md`

This session executed the surgical finishing pass that Phase 0 found the tool needed (it was already ~85–90% flagship — the original brief was stale). Sky's locked decisions: keep the Desert/Neon identity & tighten it · first-impression = the quiet trust line · execute the full list (A→D), queue taste/engine/device for review.

## Branch lineage (stacked, linear — pick your merge point)

```
main 1377824
 └─ feat/phase-a-credibility-2026-06-19   5c53ed7  (+ report 638a41d)
     └─ feat/phase-b-first-impression…    86f740d
         └─ feat/phase-d-type-material…   a897426   ← merge HERE for A+B+D (credibility + first-impression + type)
             └─ feat/phase-c-runmoment…   f9cbda0   ← merge HERE to also get C1 (RM scroll + Retry)
```

**Every phase:** verified in the built `out/` output, both themes, 375px→desktop (Chromium). Gate per phase: typecheck clean · lint **0 errors** (131 pre-existing warnings, none new) · **379 tests** green · build OK.
**Rollback target:** `git reset --hard 1377824`.

## What shipped, by phase

**A · Credibility & correctness** (`5c53ed7`) — dropped the footer `v0.1` (contradicted the `/v2` eyebrow; #1 tell); every light-theme resting/hover `text-teal-600` (3.41:1) → `text-teal-700` (4.97:1) across 6 components + `RunHistory` toggle `text-white` → `text-night` (restores the dark-text-on-teal AA contract); failed-run error gets `role="alert"`; README byline → "Sky Halisky" + leads with the streaming-client signal + cleaned the screenshot TODO. *Built CSS now has zero `text-teal-600`.*

**B · First-impression** (`86f740d`) — hero gains the quiet trust line *"No account, no backend — your key and prompts never leave your browser."* (new `LockIcon`, ink-soft/paper-muted); OnboardingHint now conveys the streaming payoff ("run a prompt and stream Claude's answer inline"). *Verified both themes + 375px, no overflow.*

**D · Type & material** (`a897426`) — new `text-2xs` (11px) token replaces all 21 arbitrary `text-[10px]/[11px]` across 8 components (lifts the former 10px sites to the 11px floor); the full type scale is now documented in `tailwind.config.ts` alongside color + radius. *Built CSS: `.text-2xs{font-size:.6875rem}`, zero arbitrary micro sizes.*

**C1 · Run-moment correctness** (`f9cbda0`) — reduced-motion now gates the JS "Run again" smooth-scroll (CSS override couldn't reach it); `network`/`unknown` errors get an input-preserving Retry (were dead-ends). New SSR-safe `prefersReducedMotion()` in `lib/dom.ts`.

## DECISIONS FOR SKY / queued items

**Review + merge** (you're the merge authority; not auto-merged because the stack bundles a11y + a public-name change and you're here):
```bash
git -C "/Users/skypie/Documents/Claude/Projects/Prompt Library Tool" diff main..feat/phase-d-type-material-2026-06-19   # A+B+D
git -C "/Users/skypie/Documents/Claude/Projects/Prompt Library Tool" diff main..feat/phase-c-runmoment-2026-06-19       # + C1
```
1. **Approve the README name** "Skyler Halisky" → "Sky Halisky" (matches the live footer + your public voice). Revert if you prefer "Skyler".
2. **README hero screenshot:** the one piece I couldn't write to disk (no headless browser installed). Drop `docs/screenshot.png` and uncomment the image line (the hero looks great in both themes — you saw it), or I'll capture it in a follow-up.
3. Retire `feat/open-to-work-footer-2026-06-19` — its availability link is already on `main` (`1377824`); Phase A's footer edit builds on it.

**iPhone Safari + VoiceOver device check** (can't be signed off on Chromium):
- VoiceOver: force a bad-key (401) + a rate-limit (429); confirm the error is announced and Open Settings / Retry are reachable (the new `role="alert"`).
- Streaming on WebKit: smooth incremental render, caret pulse, Stop, dark-text-on-teal CTAs, neon + backdrop-blur (header + 2 scrims), Fraunces opsz, the new 11px micro-labels legible, reduced-motion behaviors.

## Phase C2 — STILL QUEUED for Sky's eye + device (NOT built — needs your direction)

These are the visually-significant / engine-sensitive / taste calls the plan always reserved for you. Recommend a focused follow-up where you react to the direction first:
- **Modal two-accent ratify** — restore desert-as-ambient inside PromptDetail/Settings/RunHistory (reserve teal for action) so the Run CTA pops again. Touches the design-system contract → wants your ratification.
- **The streaming response-moment** — one restrained motion-safe panel entrance + a token-colored streaming indicator (replace the generic gray spinner); plus a reduced-motion steady-state so the spinner/caret don't freeze mid-frame. "One considered enter beats five effects." Engine-sensitive → your device.
- **First-paint skeleton** — a light skeleton grid until localStorage hydrates (cold-load flash). Engine-sensitive (hydration/theme-flip on WebKit) → your device.

## Hard rules honored
Preserved the in-flight footer work + the shipped polish sweep (re-design, not regress). No change to the on-device-key privacy model or the streaming/error semantics (C1's Retry reuses the existing input-preserving path; the error a11y is attribute-only). No merge to `main`. Did not touch the portfolio or `~/.claude/**`.
