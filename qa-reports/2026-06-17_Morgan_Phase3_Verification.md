# Phase 3 — Accessibility (WCAG 2.2 AA) — Verification

**Author:** Morgan (read-only PM) · **Date:** 2026-06-17 · **Mode:** verification (build/grep). No merge, no push, `main` untouched.
**Built by:** Alex on branch `alex/p3-wcag-aa` (off post-Phase-2 `main` `b48ec47`). **Detail:** `qa-reports/2026-06-17_Alex_Phase3_WCAG_AA.md`.

## Audit outcome
- **14 AA failures found → all fixed** (8 commits) + **focus-ring sweep** (1 commit, 17 instances) closing the residual gap. 19 pre-existing PASS. 7 device-only checks escalated to Sky.

## Fixes (each a discrete, revertible commit)
1. Streaming response `aria-live="polite"` + `aria-label="Claude response"` (`PromptDetail` `#response-content`) — SR users now hear the answer stream. **Top item.**
2. Skip-to-content link (visually-hidden-until-focused) → `#main-content` landmark.
3. Errored-run status: ✕ glyph replaces color-only red dot (SC 1.4.1, sighted-colorblind).
4. Code blocks: `role="region" aria-label="Code block"` + labeled `<pre>`.
5. RunHistory `aria-live` status announces completed/errored/stopped runs.
6. `prefers-contrast: more` treatment added to `globals.css` (stronger borders, lifted muted text, wider rings).
7. Focus-ring contrast: all **light-mode** `ring-teal-400` (1.57:1) → `ring-teal-500` (4.59:1) across 7 files; select/inputs/card rings fixed; protect-listed desert-grid split preserved.
8. Touch target on the F3b select (≥24px); focus rings added to icon-only/secondary buttons.

## Independent build-output proof (Morgan)
- Built `out/`: `aria-live` ×6, "Skip to content" ×2, `main-content` ×4, "Code block" ×2, "Claude response" ×1, `prefers-contrast` in CSS ×1, `ring-teal-500` in CSS ×22.
- **Light-mode (non-`dark:`) `ring-teal-400` remaining: 0.** The 9 remaining are all `dark:`-prefixed (teal-400 on `#080A12` > 3:1) — acceptable.
- typecheck clean · **376 tests pass** · build exit 0.

## Honest status
- **AA floor reached for everything provable from here (code + built artifact).** ✅
- **NOT yet confirmed: screen-reader/device BEHAVIOR.** Code is correct; whether VoiceOver actually announces, focus restores, Dynamic Type scales, etc. is **only verifiable on Sky's device.** Until then, Phase 3 is "AA-complete in code, pending device confirmation" — not "AA-conformant, proven."

## Device-only checklist [D] — needs Sky on real iOS Safari
1. VoiceOver announces streamed tokens as they arrive?
2. VoiceOver announces run completion (completed/errored/stopped)?
3. VoiceOver reads the error block text? (danger box has no `role="alert"` — if not auto-read, add one in Phase 4)
4. Focus returns to the opening card after a Sheet closes?
5. iOS Dynamic Type: text scales at max without clipping?
6. F3b model `<select>` opens reliably from a finger tap?
7. `prefers-reduced-motion` (iOS Reduce Motion) suppresses the Sheet slide-up? + 200% zoom: no horizontal overflow, all controls reachable?

## Merge-readiness
Single branch, clean off current `main`. Not merged. Same boundary as Phase 2: Sky merges (override) or it waits for the full Art. 17 gate (Phase 4 completes lint + recorded rollback). Recommend Sky run the [D] checklist (validates the phase's whole purpose) before/after shipping.

## Next: Phase 4 (final)
Lint toolchain (install + wire CI), `out/CNAME`, `role="alert"` on error box if [D]#3 fails, rollback record + gate completion, cross-browser + real-device gauntlet, full regression. Phase 4 is what lets the tool be honestly called **done**.
