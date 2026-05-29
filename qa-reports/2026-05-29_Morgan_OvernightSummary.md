# Morgan — Overnight Loop Summary
**Date:** 2026-05-29  **Ran from:** ~midnight to ~6am  
**Scope:** Prompt Library Tool only

---

## ⚡ Sky's decisions needed before next work can proceed

1. **F3b inline model switcher** — 3 open questions (from Quinn's spec):

   - **Placement:** The action bar area is already dense (Copy filled / Run, then char/token estimate, then "Copy template" link). Should the inline model selector live in the info line ("⌘↵ to run · Sonnet 4.6 ▼") or get its own row? Propose: inline in the info line as a styled `<select>` — but Sky should confirm this doesn't feel cluttered.

   - **`⌘↵` and the F3c variable warning:** The spec proposes `⌘↵` bypasses the warning (power-user path). If Sky wants consistent behavior (warning always shows regardless of input method), `handleModalKeyDown` needs the same gate. Propose bypassing it — power users who set up `⌘↵` know what they're doing.

   - **Model override persistence:** Should the inline model override persist across modal opens for the same prompt (e.g. "I always want to run this prompt with Haiku")? The current spec says no — reset on close. If yes, it becomes a per-prompt settings key in `library.ts`. Propose no persistence for now (simpler, avoids another storage key).

2. **Teal chip contrast** — active chip text is 3.25:1 (ARIA-compensated, Alex cleared it). If strict SC 1.4.3 text contrast is required → use teal-600 as active bg instead of teal-500. Alex says current is acceptable; your call.

---

## Branches ready for Sky to merge (recommended order)

1. `steve/auto-2026-05-29-security-hardening` — 4 security fixes; Rory verified diff, PR #3 open on GitHub
2. `qa/auto-2026-05-29-gary-clean-sweep` — code hygiene: shared `isTypingTarget` utility, `COPY_TOAST_MS` + `STEP_MAX_TOKENS` constants extracted; 324/324 tests pass
3. `feat/teal-reskin-2026-05-29` — coral → teal palette swap across 20 files; Alex PASS_WITH_NOTES (one documented contrast tradeoff, no blocker)
4. `feat/f6-markdown-polish-2026-05-29` — link focus ring added to Markdown.tsx; Steve CLEAR; already at commit `e32cc89` (may already be on main — verify before merging)
5. `ci/eslint-setup-2026-05-29` — ESLint v9 installed, react-hooks violations fixed (all documented exceptions), 0 ban-ts-comment errors; 14 deferred lint errors remain (test files only)
6. `feat/f3acd-run-ux-2026-05-29` — F3a/c/d run-UX features; Alex final PASS (all a11y polish applied P1–P4 + Steve hardening); READY_FOR_SKY_TO_MERGE
7. `docs/features-update-2026-05-29` — FEATURES.md + this overnight summary
8. `ci/cleanup-finder-dupes-2026-05-29` — 6 Finder " 2"/" 3" duplicate files removed, .gitignore updated; tests pass
9. `fix/ratelimit-retry-disabled-2026-05-29` — pre-existing bug: rate-limit retry button now has `disabled={running}`; found by Peter's perf audit

---

## What shipped (one sentence each)

- **Security hardening (PR #3):** Patched an SSE error-message leak, removed raw API response interpolation in error strings, added `maxLength` guards on every user-facing input, and capped library import at 10 MB.
- **Code hygiene clean-sweep:** Eliminated two copies of `isTypingTarget` by extracting to `src/lib/dom.ts`, and replaced four magic-number `1500` literals and three `256`/`8192` literals with named constants in `settings.ts`.
- **Teal re-skin:** Swapped the coral design palette for teal across Tailwind config, globals.css, categoryColor.ts, and all 16 components that referenced coral tokens — no structural or logic changes.
- **F6 markdown link polish:** Added keyboard focus ring (`focus-visible:ring-2 focus-visible:ring-teal-500`) to external links in the Markdown renderer and corrected `rel` attribute order to canonical `noopener noreferrer`.
- **ESLint v9 setup:** Installed ESLint with react-hooks plugin; fixed 10 set-state-in-effect violations (all documented intentional patterns); fixed the one real bug (`Date.now()` in useMemo → stable hook value).
- **F3 run-UX (F3a/c/d):** Added a Retry button for overloaded errors (F3a), an inline soft warning when variables are empty before Run (F3c), and an expand/collapse toggle on the response panel (F3d) — all in `PromptDetail.tsx`, 324 tests pass.

---

## What's pending Sky's decision

### F3b — Inline model switcher
Quinn's spec has 3 open questions that block Shamus from building it:

1. **Placement:** Should the model selector live inline in the `⌘↵` info line (e.g. "⌘↵ to run · Sonnet 4.6 ▼") or get its own row below the action buttons? Quinn proposes inline; Sky should confirm it won't feel cluttered.
2. **`⌘↵` and the F3c variable warning:** Quinn proposes that `⌘↵` bypasses the empty-variable warning (power-user path). If Sky wants consistent behavior regardless of input method, `handleModalKeyDown` needs the same gate. Propose: bypass it.
3. **Model override persistence:** Should the inline model selection persist across modal opens for the same prompt (stored as a per-prompt settings key), or reset to the global default each time the prompt opens? Quinn proposes no persistence (simpler). Sky call.

### Teal chip contrast note (documented, not blocking)
Active chip text (white on teal-500) = 3.255:1. WCAG SC 1.4.3 requires 4.5:1 for normal text. Alex cleared this as PASS_WITH_NOTES because `aria-pressed` + `aria-label` communicate state correctly and the ratio is above the non-text threshold (3:1). Shamus's `font-semibold` fix was the Wave 3 remediation. If Sky wants strict 4.5:1 conformance: use teal-600 (`#238178`, yields ~4.1:1) or teal-700 as chip background. Not a merge blocker.

### `a11y/auto-2026-05-25-alex-header-focus-visible` — NOT in current merge queue
This branch (1 commit ahead of main: Header focus-visible fix) predates the teal re-skin. It was written against coral tokens and has **not been re-verified against teal**. Do not merge until Alex re-reviews it against the teal baseline. Queue it for the session after `feat/teal-reskin-2026-05-29` lands on main.

### 14 lint errors remain on ESLint branch (deferred, not blocking)
All 14 are `@typescript-eslint/ban-ts-comment` in 7 test files — pre-existing patterns, not introduced by Gary or tonight's work. Recommend a Shamus or Gary cleanup cycle before the next CI enforcement pass. 2 `no-unused-vars` in `transfer-extra.test.ts` also deferred.

---

## Recommended merge order — rationale

1. **Security first** — PR #3 is the highest-value/lowest-risk change. Rory diff-verified it line by line. Merge first so the fixes land on main before any feature branches are built on top.
2. **Hygiene next** — Gary's clean-sweep is pure code quality with zero behavior change; getting named constants on main reduces merge-conflict surface for downstream branches.
3. **Teal re-skin** — design-only; Alex cleared it. Getting it on main makes the color token baseline stable for all future component work.
4. **F6 polish** — tiny single-file change; Steve cleared it. Note: commit `e32cc89` may already be on main (Shamus's report says this branch was 1 commit ahead of main at branch creation time — verify `git log --oneline main | head` before merging to avoid a no-op merge).
5. **ESLint** — once the palette and features are stable, lock in the lint baseline. Merge before F3 so the F3 branch's hook patterns are linted on arrival.
6. **F3 run-UX** — largest change; Alex final PASS issued (Wave 8). Merge last so it lands on a clean, linted, teal-stable main.
7. **Docs branch** — this summary + FEATURES.md; low-risk, can merge any time.
8. **Finder dupe cleanup** — CI housekeeping; independent, no functional impact.
9. **Rate-limit retry fix** — single-line a11y/UX hardening; merge any order after F3.

> ⚠️  MERGE ORDER DEPENDENCY:
> `ci/eslint-setup-2026-05-29` MUST be merged before `fix/ratelimit-retry-disabled-2026-05-29`
> The ratelimit branch is stacked on the ESLint branch.

---

## Next priorities (for next session)

1. **F3b** — unblocked the moment Sky answers the 3 placement/behavior questions above. Single Shamus cycle, M-effort.
2. **Token usage display** (Quinn spec ready, no Sky decisions needed for base case):
   - Quinn spec: `qa-reports/2026-05-29_Quinn_NextFeatureSpec.md`
   - F-usage-a/b/c: wire SSE usage events in streamClaude → StoredRun → display
   - 2 open questions for Sky (cost display, which panels to show in)
   - Shamus can build this as next cycle's first task
3. **Shamus react-hooks + ban-ts-comment cleanup** — 14 test-file lint errors remain on the ESLint branch; a targeted Gary/Shamus pass would clear CI to green.
4. **F5 — Export/Import library** — next big user-facing feature in the backlog; Quinn's spec is ready.
5. **Peter's remaining open finding** — `querySelector` in variable extraction should be wrapped in try/catch (or sanitize variable names at extraction point). Low-risk; worth a short Shamus pass after the Wave 8 merges land.

---

*Will (Technical Writer) — BACKGROUND cycle, docs branch `docs/features-update-2026-05-29`*
