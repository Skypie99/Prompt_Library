# Alex — Header A11y Branch Verification
**Date:** 2026-05-29
**Branch:** a11y/header-focus-teal-2026-05-29
**Verdict:** BLOCK

---

## Changes verified

| Change | Applied correctly | Notes |
|--------|-------------------|-------|
| Search aria-label | N | `aria-label="Search prompts"` is absent from the Search button in `Header.tsx` (line 36-45). The button has no `aria-label` at all. |
| Search focus ring teal-500 | N | No `focus-visible:ring-*` classes on the Search button. Zero focus ring. |
| Settings focus ring teal-500 | N | Settings button (line 62-65) has `aria-label="Settings"` but no `focus-visible:ring-*` classes. No focus ring. |
| Shortcuts ring corrected (400→500) | Y | Shortcuts button (line 53) correctly has `focus-visible:ring-teal-500` with `ring-offset-2 ring-offset-cream`. |

---

## What the diff actually shows

Commit `3f30f8d` (`[bg-cycle] fix(a11y): address Alex WCAG 2.2 blockers on teal re-skin`) touched 13 files for the global ring-teal-400 → ring-teal-500 sweep. In `Header.tsx`, the commit's diff shows only one change: the Shortcuts button's `ring-teal-400` → `ring-teal-500`.

The Shamus report (`background-2026-05-29-shamus-header-a11y.md`) claims three header-specific changes:
1. `aria-label="Search prompts"` added to Search button
2. Focus ring added to Search button (`ring-teal-500`, `ring-offset-2`)
3. Focus ring added to Settings button (`ring-teal-500`, `ring-offset-2`)

**None of these three were applied.** The Shamus report describes the intended port from `a11y/auto-2026-05-25-alex-header-focus-visible` but the actual commit only addressed the Shortcuts button as part of the broader ring sweep.

The stale branch (`a11y/auto-2026-05-25-alex-header-focus-visible`) correctly contained these 3 changes (with `ring-coral-400` tokens that needed updating to `ring-teal-500`) — they simply were not ported.

---

## Contrast confirmation

`ring-teal-500` (#2F9E96) on cream (#FAF6EF): **3.021:1**

Barely clears the SC 2.4.11 (WCAG 2.2 Focus Appearance) minimum of 3.0:1. Acceptable — this is the same value Alex computed previously and confirmed passes.

---

## Remaining issues to fix

The following changes from the stale branch still need to be applied to `a11y/header-focus-teal-2026-05-29`:

### 1. Search button — add `aria-label` (SC 4.1.2)
```tsx
<button
  onClick={onOpenSearch}
  aria-label="Search prompts"
  className="hidden items-center gap-2 ... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:flex ... dark:focus-visible:ring-offset-night"
>
```

### 2. Settings button — add focus ring (SC 2.4.11)
```tsx
<button
  onClick={onOpenSettings}
  aria-label="Settings"
  className="flex h-9 w-9 ... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:... dark:focus-visible:ring-offset-night"
>
```

---

## Verdict

**BLOCK** — `a11y/header-focus-teal-2026-05-29` is NOT READY_FOR_SKY_TO_MERGE.

The Shortcuts button fix is correct. The three header-specific changes that were the purpose of this branch (Search aria-label, Search focus ring, Settings focus ring) were not applied. These are the same WCAG blockers identified in `2026-05-29_Alex_TealA11y.md` and reported as fixed by Shamus. They must be applied before merge.

**Recommended action:** Shamus should re-open the branch and add the two missing button patches, then Alex re-verifies.
