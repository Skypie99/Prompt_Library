# Shamus — F3 A11y Polish + Security Hardening
**Date:** 2026-05-29
**Mode:** BACKGROUND (no external sends)
**Branch:** `feat/f3acd-run-ux-2026-05-29`
**Source file:** `src/components/PromptDetail.tsx`
**Test file:** `tests/PromptDetail.f3acd.test.tsx`

---

## Fixes Applied

All 6 fixes verified present in the committed branch HEAD (`1e2a6fc`).

| # | Fix | Status |
|---|-----|--------|
| P1 | Focus management after "Run anyway" — `responsePanelRef.current?.focus()` before DOM removal; response panel gets `tabIndex={-1}` + `id="response-panel"` + `focus:outline-none` | **Y** |
| P2 | "Fill it" button aria-label → `aria-label="Fill empty variables"` (visible text unchanged) | **Y** |
| P3 | F3d expand toggle — `aria-expanded={responseExpanded}` added (WCAG 4.1.2) | **Y** |
| P4 | F3d expand toggle — `aria-controls="response-content"` + `id="response-content"` on controlled div | **Y** |
| Steve 1 | F3a overloaded Retry button — `disabled={running}` + `disabled:opacity-50` prevents concurrent request stacking | **Y** |
| Steve 2 | "Fill it" querySelector wrapped in try/catch; on DOMException falls back to first `input, textarea` in form | **Y** |

---

## Verification

**typecheck:** PASS (tsc --noEmit, 0 errors)

**tests:** 335/335 PASS
- `tests/PromptDetail.f3acd.test.tsx` — 11/11 (includes all F3a/c/d coverage)
- `tests/PromptDetail.ratelimit.test.tsx` — 5/5
- All other test suites — unaffected

Test update: the "Fill it" test query was updated from `{ name: "Fill it" }` to `{ name: "Fill empty variables" }` to match the new aria-label.

---

## ESCALATIONS

None. All 6 fixes applied cleanly. No blockers.

**Note on branch complexity:** During this background cycle, `ci/eslint-setup-2026-05-29` and `feat/f3acd-run-ux-2026-05-29` had significant overlap due to cherry-picks. The fixes landed on `feat/f3acd-run-ux-2026-05-29` via commit `1e2a6fc` which captured stashed work from the ESLint branch.

---

## NEXT

- Alex should re-verify P1–P4 on `feat/f3acd-run-ux-2026-05-29` (all WCAG items addressed)
- Rory: branch is ready for merge once Alex signs off
