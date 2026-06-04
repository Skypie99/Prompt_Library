# Alex — Stale A11y Branch Review
**Date:** 2026-05-29
**Branch:** `a11y/auto-2026-05-25-alex-header-focus-visible`
**Reviewer:** Alex (Accessibility Engineer, BACKGROUND mode — read-only audit)

---

## What the branch does

Adds `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream` (and a dark-mode offset variant) to the Search button and Settings button in `src/components/Header.tsx`. It also adds `aria-label="Search prompts"` to the Search button, which was previously unlabelled.

The fix was authored against the old **coral palette** (pre-teal re-skin).

---

## Colour conflict with teal reskin

**YES — hard colour conflict.**

The branch introduces `focus-visible:ring-coral-400` on both header buttons. The teal re-skin removes all `coral-*` tokens across the app. Merging this branch after `feat/teal-reskin-2026-05-29` would re-introduce coral ring classes that are inconsistent with the new palette, and which may not even exist in the teal token set (depending on whether `coral-*` Tailwind colours are retained in `tailwind.config`).

Specific lines of conflict:
- Search button: `focus-visible:ring-coral-400` (added by a11y branch)
- Settings button: `focus-visible:ring-coral-400` (added by a11y branch)

Both should read `focus-visible:ring-teal-400` (or `ring-teal-500`) to match the teal branch's existing pattern.

---

## File overlap conflict risk

**YES — both branches modify the same single file.**

| File | a11y branch | teal branch |
|---|---|---|
| `src/components/Header.tsx` | YES (focus ring + aria-label) | YES (full coral→teal sweep + new shortcuts button) |

The teal branch also adds a new **keyboard shortcuts button** (`aria-label="Keyboard shortcuts"`) between the Search button and DensityToggle, with its own focus-visible ring already applied using `ring-teal-500`. This structural addition means the line numbers and surrounding context that the a11y branch's diff applies to have shifted — a mechanical merge would produce a conflict at minimum, possibly a silent mis-apply at worst.

---

## Is the fix still needed?

**Partially superseded, partially not.**

| Fix | Status on teal branch | Status on main |
|---|---|---|
| Settings button — focus-visible ring | **NOT present** on teal branch or main. The Settings button has `hover:border-teal-300 hover:text-teal-600` but no `focus-visible:*` classes on either branch. **Still needed.** | Missing |
| Search button — focus-visible ring | **NOT present** on teal branch or main. Same omission. **Still needed.** | Missing |
| Search button — `aria-label="Search prompts"` | **NOT present** on teal branch or main. **Still needed.** | Missing |
| Keyboard shortcuts button — focus-visible ring | Present on teal branch (`ring-teal-500`). Already handled. | Present on main (teal branch likely already merged or main is ahead) |

So the a11y branch is **not superseded** — the teal re-skin swept hover colours to teal but did not carry forward the focus-visible ring additions from this branch. The three accessibility improvements (two focus rings + one aria-label) are still absent from teal-branch HEAD.

---

## Verdict

**REBASE_ON_TEAL** — the branch must be rebased onto `feat/teal-reskin-2026-05-29`, with `coral-400` updated to `teal-400` (matching the teal branch's ring tone for peer buttons) in the two focus-ring class strings. After rebase, the three a11y improvements land cleanly without re-introducing coral.

Estimated effort: 1 file, 2 class-string edits (`ring-coral-400` → `ring-teal-400`). The `aria-label` and `ring-offset-*` classes are palette-neutral and survive the rebase unchanged.

---

## ESCALATIONS

None — no privacy, security, or Sky-decision-required items. This is a straightforward rebase + token swap task suitable for Shamus or a direct re-commit on a new branch off `feat/teal-reskin-2026-05-29`.

**Recommended next action:** Assign to Shamus to create `a11y/header-focus-teal` off `feat/teal-reskin-2026-05-29`, apply the three changes with `coral-400` → `teal-400`, and verify `npm run typecheck` passes before flagging for merge.
