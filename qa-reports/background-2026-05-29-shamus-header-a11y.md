# Shamus — Header A11y Forward-Port — 2026-05-29

**Branch:** `a11y/header-focus-teal-2026-05-29` (off `feat/teal-reskin-2026-05-29`)
**Mode:** BACKGROUND — no external sends
**Commit:** `8b89f96`

---

## What was done

Ported the 3 valid a11y improvements from the stale branch
`a11y/auto-2026-05-25-alex-header-focus-visible` onto the teal codebase.
Dead `ring-coral-400` tokens were NOT copied; `ring-teal-500` used throughout
(Alex confirmed teal-400 fails SC 2.4.11).

### Change 1 — Search button aria-label (SC 4.1.2)

Added `aria-label="Search prompts"` to the Search button in `Header.tsx`.
The stale branch used this exact label string; retained verbatim.

### Change 2 — Search button focus-visible ring (SC 2.4.11)

Added to the Search button className:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
focus-visible:ring-offset-2 focus-visible:ring-offset-cream
dark:focus-visible:ring-offset-night
```

### Change 3 — Settings button focus-visible ring (SC 2.4.11)

Same ring classes added to the Settings (GearIcon) button className.

### Bonus fix — Shortcuts button ring-teal-400 → ring-teal-500

The Shortcuts button on the teal branch already had focus-visible classes but
used `ring-teal-400`, which Alex confirmed fails SC 2.4.11 contrast. Corrected
to `ring-teal-500` for consistency. This was not in the original stale branch
scope (Shortcuts button didn't exist there) but is the same class of defect.

---

## Verification results

| Check | Result |
|---|---|
| `npm run typecheck` | PASS — 0 errors |
| `npm test` | PASS — 327/327 tests, 19 test files |

---

## File changed

`src/components/Header.tsx` — 4 insertions, 3 deletions

---

## ESCALATIONS

None. All changes are pure className / aria-label additions on non-interactive
logic paths. No props, no types, no state touched.

---

## DECISIONS FOR SKY

None required.

---

## NEXT

Alex should verify this branch (`a11y/header-focus-teal-2026-05-29`) against
WCAG 2.2 SC 2.4.11 and SC 4.1.2 before it is merged into `feat/teal-reskin-2026-05-29`.

---

## Wave 14 correction

Alex found 3 changes were missing from the prior commit. Applied in commit `3a313ed`:

- Search aria-label (`aria-label="Search prompts"`): Y
- Search focus ring teal-500 (`focus-visible:ring-teal-500 ring-offset-2`): Y
- Settings focus ring teal-500 (`focus-visible:ring-teal-500 ring-offset-2`): Y
- typecheck: PASS
- tests: 324/324 PASS

NEXT: Alex re-verify
