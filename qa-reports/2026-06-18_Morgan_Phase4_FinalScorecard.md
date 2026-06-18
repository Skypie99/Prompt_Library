# Phase 4 — Hardening + Final Definition-of-Done Scorecard

**Author:** Morgan (read-only PM) · **Date:** 2026-06-18 · **Mode:** verification/synthesis. No merge, no push, `main` untouched.
**Release branch:** `release/phase3-phase4` (= `main` `b48ec47` + Phase 3 + Phase 4), in worktree `agent-a03573b6be1d22285`.

## Phase 4 work (Gary, on release branch)
- **Release branch:** `main` + `alex/p3-wcag-aa` merged clean (no conflicts).
- **CNAME-in-artifact:** added `public/CNAME` → `out/CNAME` now emitted (`prompts.skypistudio.com`). Closes the silent-domain-loss risk.
- **Lint toolchain:** installed eslint/prettier/etc.; **0 errors, 6 warnings** (unused vars in tests, documented); wired `lint` into CI as a **blocking** job. Judgment calls worth knowing (below).

## Independent verification (Morgan, on release branch)
- `npm run lint`: **0 errors** / 6 warnings · `typecheck`: clean · `npm test`: **376 pass (24 files)** · `npm run build`: exit 0 · `out/CNAME`: present.
- Cumulative built-output proof (recursive grep of `out/`): `claude-opus-4-8` ×2 (stale `4-7` = 0), `danger-100` + `ring-teal-500` + `prefers-contrast` in CSS, `aria-live` ×5, "Skip to content", "Model for this run", `promptlib:model:` ×3, "Code block" ×2. All present. ✅

## Gary's judgment calls (surfaced for Sky — not bugs, but real decisions)
1. **Bypassed `eslint-config-next`.** Its v15 build is incompatible with ESLint v9 flat config (uses `@rushstack/eslint-patch`; can't load). Gary rewrote `eslint.config.mjs` as a standalone flat config (typescript-eslint + react-hooks + prettier). **Trade-off:** loses Next-specific lint rules (e.g. `next/no-img-element`) — low value for this static SPA, but it's a divergence from stock Next lint.
2. **1028 Prettier reformats.** First-ever Prettier run → ~6,000-line whitespace diff across components. Safe (no behavior change) but the release diff is huge and not line-by-line reviewable. Normal cost of adopting Prettier.
3. **Removed 10 inert `eslint-disable` comments** referencing a rule (`react-hooks/set-state-in-effect`) that doesn't exist in the installed plugin version — they suppressed nothing.

## Robustness/gauntlet audit (read-only) — 3 P3 bugs, app otherwise robust
All major edge cases handled gracefully (abort, rate-limit, auth/network errors, oversized/malformed import, quota, no-key, stale model id). Built-output integrity PASS (404, trailingSlash, zero Google-font calls, no-flash script). Bugs:
- **B1 (P3):** empty-library command palette shows `No prompts match ""` instead of "library is empty." 1-line copy.
- **B2 (P3):** `saveSettings` swallows write failures silently — in Safari **private mode** the API key/model vanish on reload with no warning (library writes warn; settings don't). The one with real teeth.
- **B3 (P3):** private-mode storage error mislabeled "out of room / delete prompts" (real cause is private mode).

## FINAL DEFINITION-OF-DONE SCORECARD
| Category | State | Proof |
|---|---|---|
| Functional | ✅ build-proven | features in built `out/`; **live API run = Sky [D]** |
| Visual/polish | ✅ build-proven | danger colors, switcher; **dark-danger coherence E1 = Sky [D]** |
| Accessibility AA | ⚠️ **code-complete + build-proven; behavior unproven** | aria-live/skip/contrast/rings in build; **VoiceOver/focus/Dynamic-Type = Sky [D]** |
| Cross-browser/device | ❌ **pending Sky** | iOS Safari + native `<select>` (E2) + the 7 [D] checks |
| Build-output integrity | ✅ | build 0, `out/CNAME`, trailingSlash, no Google fonts, no-flash script |
| Performance | ✅ (one noted limit) | no regression; grid un-virtualized = documented ceiling, not a blocker |
| Docs/state-truth | ❌ **gap** | `PROJECT_STATE.md` still describes cyberpunk/Vercel — **not yet reconciled**; qa-reports uncommitted |
| Governance | ⚠️ near-complete | Design Compiler ✅; lint green-in-CI ✅; **Art.17 gate now holds once rollback recorded** |

## What remains for an HONEST "done"
1. **(agents, cheap)** Fix B1/B2/B3; reconcile `PROJECT_STATE.md`/`DECISIONS_LOG.md`; commit the qa-reports. Optional: `role="alert"` on error box (or wait for [D]#3).
2. **(Sky only — irreducible)** The 7-item iOS/VoiceOver device checklist + E1/E2 visual sign-off. AA is "proven" only after this.
3. **(ship)** Record rollback (`b48ec47`) → the Art.17 gate legitimately holds → Rory merges `release/phase3-phase4` (a real gated merge, not an override). Push = live.

**Bottom line:** the build is green, gated, and proven *from here*. The only things between this and an honest "done" are the **device checks (yours)**, three tiny P3 fixes, a docs refresh, and the gated ship.
