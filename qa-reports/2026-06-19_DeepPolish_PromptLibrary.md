# Deep UI Polish Sweep — Prompt Library

**Date:** 2026-06-19
**Surface:** Prompt Library — https://prompts.skypistudio.com
**Branch:** `design/polish-sweep-2026-06-19` (7 commits) — **Sky-only review + merge**
**Base:** `main` @ `198b0fd` (includes the tech-debt cleanup that merged mid-session)
**Rollback:** `git reset --hard 198b0fd`
**Gate:** typecheck clean · lint **0 errors** (131 pre-existing warnings) · **379 tests** green · build OK
**Diff:** +86 / −24 across 9 files — focused, not a rewrite

---

## TL;DR

The Prompt Library was already well above "fine" — disciplined tokens, real
accessibility, thorough states. This sweep is the **last 5%**: the taste-level
refinements that move it from "a careful engineer built this" to "someone with
real taste sweated every pixel." Seven refinements, each built to a checkable
criterion and **proven in the built output** (`out/`, served static), across
both themes and down to 320px. Two of them are genuine accessibility *wins*,
not just aesthetics.

**Decisions you made up front:** two-accent model = *formalize* (desert = the
room, teal = the button you press); depth = *full sweep*.

---

## The seven refinements — felt target → criterion → result

### 1 · Two-accent system + a real AA fix  (`8570903`)
**Felt:** "amber is the room, teal is the button you press" — and pressing a
button never fails a contrast check.
- **Coherence:** in light mode the only desert-tonal *primary actions* (`New
  prompt`, `Create your first prompt`) now use the teal tonal they already
  carried in dark mode. Ambient/brand/nav (cards, wordmark, hero eyebrow +
  gradient, category & tag chips, the favorite star, header chrome) stays
  desert. The detail modal's intentional teal "run moment" is left alone.
- **AA win (improves accessibility):** every solid teal CTA was white-on-teal
  and **failing WCAG 1.4.3** — measured in the built output:

  | CTA | before | after (dark text) |
  |---|---|---|
  | `Run with Claude` (teal-500) | **2.43:1** ✗ | **8.14:1** ✓ |
  | Export / Merge / Replace (teal-600) | 3.68:1 ✗ | 5.37:1 ✓ |
  | Settings Save, PromptForm Save, skip-link, Copy-filled confirm | 2.43:1 ✗ | 8.14:1 ✓ |

  Fix keeps the neon fill bright and switches text to `text-night` — so the
  "Neon Terminal" pop survives *and* it passes AA, in both themes. Danger-red
  CTAs already passed (4.84:1) and were left.
- Rule documented in `tailwind.config.ts`.

### 2 · Fraunces optical sizing  (`c7a7d74`) — ⚠️ engine-sensitive
**Felt:** the hero headline reads as type drawn for its size, not scaled up.
The default font build was wght-only, so Fraunces' opsz axis stayed pinned at
14 (text cut) even at 60px. Swapped to the `opsz` build; with
`font-optical-sizing:auto` the browser matches opsz to font-size → display
headings get the high-contrast **display cut**.
**Verify-then-keep, proven:** opsz woff2 emitted to `out/`,
`font-optical-sizing:auto` in the static CSS, and the axis *demonstrably
reshapes glyphs* — same hero string at 60px measures 1018px @opsz14 vs 829px
@opsz144 (−189px). **Cost:** latin woff2 36.6KB → 67KB (+30KB) — a deliberate
trade for the front-door headline.

### 3 · Tactile micro-lift  (`905e926`)
**Felt:** cards feel alive and pressable. 1px hover-lift on the card, hero
search box, and resume pill (`motion-safe:hover:-translate-y-px`), paired with
the existing shadow intensify. Transform-only → no neighbor reflow. Gated so
the lift rule lives inside `@media (prefers-reduced-motion:no-preference)` —
**reduced-motion users get no lift at all** (verified in the built CSS).

### 4 · Copy-feedback consistency  (`8d85349`)
**Felt:** every copy action confirms the same way. `Copy template` and `Copy
response` now use the same CheckIcon + "Copied" gesture as `Copy filled`
(three actions, one confirmation). Resting link form preserved.
*Note:* the success flash can't be exercised in the headless preview (clipboard
writes need document focus) → on the device checklist; markup is the identical
icon-in-button pattern as the working Copy-filled.

### 5 · Empty-state warmth  (`51f8bc4`)
**Felt:** the unhappy path is as considered as the happy path. The command
palette's two empty states gained a muted 24px glyph above the text —
`SparkleIcon` (empty library, matches HomeClient's tile) and `SearchIcon`
(no match). Verified: no-match state renders a centered 24×24 glyph.

### 6 · Radius ladder  (`d92292e`)
**Felt:** rounded corners feel systematic. Audit was milder than feared — the
only off-scale value was the search mark's `rounded-[2px]` → `rounded-sm`
(same 2px). The intentional ladder (sm marks / 4px micro-tokens / md controls
/ lg rows / xl cards / full pills) is now documented in `tailwind.config.ts`.
No arbitrary `rounded-[]` remain.

### 7 · Hero rhythm + search affordance  (`d3b3e7d`)
**Felt:** deliberate groupings, and the box says "search" instantly. Subhead
now hugs the headline (16px) while the search box keeps its 32px separation;
resume pill tucked closer (12px). A leading magnifier (matching the real
command palette's input) makes the box read as search at a glance, with a
subtle warm/neon hover tint. No horizontal overflow at 320px.

---

## Verification (built-output standard, not dev-only)

Served the static `out/` build (`prompt-library-static`, :3100) and verified
each change against its criterion, both themes, 320 / 1180px:

| Refinement | Light | Dark | 320px |
|---|:-:|:-:|:-:|
| Two-accent + AA contrast | ✓ | ✓ | ✓ |
| Optical sizing (Chromium) | ✓ | ✓ | ✓ |
| Micro-lift (reduced-motion gated) | ✓ | ✓ | ✓ |
| Copy gesture (markup) | ✓ | ✓ | — |
| Empty-state glyph | ✓ | ✓ | ✓ |
| Radius ladder | ✓ | ✓ | ✓ |
| Hero rhythm + glyph | ✓ | ✓ | ✓ |

Console clean (0 errors). No horizontal overflow at 320px. AA re-checked on
every touched color.

---

## ⚠️ Sky's real-device checklist (do NOT claim verified on Chromium)

1. **Fraunces optical sizing on iPhone Safari** — confirm the hero headline
   shows the display cut (WebKit renders opsz; verified on Chromium only).
2. **Dark-text-on-teal CTAs** — confirm `Run with Claude` etc. read well on a
   real display (the look changed from white→dark text; contrast is 8.14:1).
3. **Copy-feedback flash** — tap `Copy response` / `Copy template`, confirm the
   CheckIcon + "Copied" flash fires (couldn't trigger in headless preview).
4. **Micro-lift + reduced-motion** — confirm cards lift subtly on a trackpad,
   and that turning on Reduce Motion removes it.
5. **+30KB font** — if the hero font payload matters to you, say so and I'll
   revert refinement #2 (it's the one isolated, optional cost).

---

## Merge & autonomy

The Prompt Library is the one repo with Art.17 delegated auto-merge — **but
this sweep does NOT auto-merge.** It's *visually significant* (accent change)
and *engine-sensitive* (optical sizing), which routes to your review +
real-device check first. Branch only; **you review and merge.**

```
# review
git -C "~/Documents/Claude/Projects/Prompt Library Tool" log --oneline main..design/polish-sweep-2026-06-19
git -C "~/Documents/Claude/Projects/Prompt Library Tool" diff main..design/polish-sweep-2026-06-19
# rollback target if anything's off
git reset --hard 198b0fd
```

## Decisions for Sky
- Approve the **dark-text-on-teal** primary-button look (it's the AA fix; keeps neon).
- Keep or drop the **+30KB optical-sizing** font (refinement #2, isolated).
- After your device check, merge `design/polish-sweep-2026-06-19` to main (Sky-only).
