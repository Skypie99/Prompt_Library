# Accessibility Review — API Key Nudge Feature

**Date:** 2026-05-26
**Reviewer:** Alex (Claude Corp Accessibility Engineer)
**Scope:** `ApiKeyNudge.tsx`, `OnboardingHint.tsx`, and their host context in `HomeClient.tsx`
**Standard:** WCAG 2.2 AA

---

## Verdict: BLOCKED

7 blocking failures must be fixed before merge. 4 non-blocking warnings follow.

---

## FAIL — Blocking (must fix before merge)

### F1 — Touch target too small: ApiKeyNudge dismiss button

**File:** `src/components/ApiKeyNudge.tsx` line 29
**WCAG:** 2.5.5 Target Size (AA)
**Detail:** The dismiss button is `h-7 w-7` = 28×28 CSS px, below the 44×44pt minimum.
**Fix:**

```tsx
// Change h-7 w-7 to h-11 w-11 (44px)
className = "flex h-11 w-11 shrink-0 items-center justify-center ...";
```

Or use a padding approach to expand the hit area without changing visual size:

```tsx
className = "flex h-7 w-7 shrink-0 items-center justify-center p-2 -m-2 ...";
```

The `-m-2 p-2` trick expands the interactive area to 44px while keeping the 28px visual size.

---

### F2 — Touch target too small: OnboardingHint dismiss button

**File:** `src/components/OnboardingHint.tsx` line 18
**WCAG:** 2.5.5 Target Size (AA)
**Detail:** Same `h-7 w-7` = 28×28 CSS px issue.
**Fix:** Same pattern as F1 — either `h-11 w-11` or `-m-2 p-2` on the `h-7 w-7` container.

---

### F3 — Missing focus indicator: OnboardingHint dismiss button

**File:** `src/components/OnboardingHint.tsx` line 18–24
**WCAG:** 2.4.11 Focus Appearance (AA)
**Detail:** The dismiss button has no `focus-visible:ring-*` classes. The `ApiKeyNudge` equivalent has a proper ring; `OnboardingHint` does not. A keyboard user pressing Tab to this button gets zero visible focus cue.
**Fix:** Add the same ring pattern used in `ApiKeyNudge.tsx` line 33:

```tsx
className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-coral-700
  transition hover:bg-coral-100
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500
  focus-visible:ring-offset-1 focus-visible:ring-offset-coral-50
  dark:text-coral-200 dark:hover:bg-coral-500/20
  dark:focus-visible:ring-offset-night"
```

---

### F4 — SettingsModal missing dialog role and accessible name

**File:** `src/components/SettingsModal.tsx` line 173
**WCAG:** 4.1.2 Name, Role, Value (AA)
**Detail:** The modal container `div` has no `role="dialog"`, no `aria-modal="true"`, and no `aria-labelledby` connecting it to the `<h2>Settings</h2>` inside. Screen readers won't announce the modal boundary or its name when focus enters it.
**Fix:**

```tsx
// Line 173: add role, aria-modal, aria-labelledby
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="settings-modal-title"
  className="relative w-full max-w-md ..."
>
  ...
  // Line 175: add id to match
  <h2 id="settings-modal-title" className="font-display text-xl font-semibold ...">
    Settings
  </h2>
```

---

### F5 — SettingsModal: no focus management on open

**File:** `src/components/SettingsModal.tsx` lines 73–89 (the `useEffect` on `open`)
**WCAG:** 2.4.3 Focus Order (AA)
**Detail:** When `open` transitions to `true`, focus stays wherever it was — typically on the "Open Settings" button in the nudge or the gear icon in the header. A keyboard or AT user navigating forward will Tab through the entire page behind the overlay before reaching the modal.

Without a focus trap, pressing Tab eventually escapes the modal and interacts with the document behind it.

**Fix (minimal):** Move focus to the modal container or the first focusable element on open, and add a focus trap. A `useRef` on the dialog `div` combined with a `focus()` call in the effect is sufficient:

```tsx
const dialogRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (open) {
    // ... existing setup code ...
    // Focus the dialog so AT announces it immediately
    dialogRef.current?.focus();
  }
}, [open, settings]);

// On the dialog div:
<div
  ref={dialogRef}
  tabIndex={-1}   // makes it programmatically focusable
  role="dialog"
  aria-modal="true"
  aria-labelledby="settings-modal-title"
  className="relative w-full max-w-md ..."
>
```

A full focus trap (intercepting Tab at the last focusable child) is strongly recommended. A lightweight option is the `focus-trap-react` library or a small hook.

---

### F6 — SettingsModal close button: focus ring contrast 2.50:1 (needs 3:1)

**File:** `src/components/SettingsModal.tsx` line 178
**WCAG:** 2.4.11 Focus Appearance (AA)
**Detail:** The close button uses `focus-visible:ring-coral-400 focus-visible:ring-offset-cream`. `coral-400` (#E48468) on `cream` (#FAF6EF) = **2.50:1**, below the 3:1 minimum for a UI component focus indicator.
**Fix:** Upgrade the ring to `coral-500` (same token used everywhere else for focus rings) and match the offset:

```tsx
// Line 178: change ring-coral-400 → ring-coral-500
focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream
```

`coral-500` (#DC6B4E) on `cream` = **3.08:1** — passes.

---

### F7 — "Show/Hide" key toggle: text contrast 4.29:1 (needs 4.5:1)

**File:** `src/components/SettingsModal.tsx` line 199
**WCAG:** 1.4.3 Contrast (Minimum) (AA)
**Detail:** The "Show" / "Hide" toggle is `text-coral-600` (#C85539) on `surface` (#FFFDF9) = **4.29:1**. Normal-weight text at ~12px (rendered as `text-xs`) requires 4.5:1. Fails by 0.21 ratio.

Note: this button is inside the Settings modal which is opened from the nudge flow. It is in-scope because it is the first thing a first-time user touches after the nudge directs them there.

**Fix:** Use `text-coral-700` (#A6442D) instead:

```tsx
// Line 199:
className = "text-xs font-medium text-coral-700 hover:text-coral-800 dark:text-coral-300";
```

`coral-700` on `surface` = **5.64:1** — passes.

Dark mode `dark:text-coral-400` on `night-surface` should be verified separately (out of scope for the nudge review).

---

## WARN — Non-blocking (polish before next release)

### W1 — animate-fade-in not reduced-motion safe

**File:** `src/components/OnboardingHint.tsx` line 8; `tailwind.config.ts` keyframes
**WCAG:** 2.3.3 Animation from Interactions (AAA) — also good practice for AA
**Detail:** `animate-fade-in` uses a 180ms opacity fade. No `@media (prefers-reduced-motion: reduce)` override exists in `globals.css` or Tailwind config. Users with vestibular disorders who have set the OS "Reduce Motion" preference will still see the animation.
**Fix:** Add to `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Or in `tailwind.config.ts`, add a `motion-safe:` / `motion-reduce:` variant to the `animate-fade-in` usage.

---

### W2 — OnboardingHint has no live region: content not announced on insert

**File:** `src/components/OnboardingHint.tsx` line 8
**WCAG:** 4.1.3 Status Messages (AA)
**Detail:** `ApiKeyNudge` correctly uses `role="status"` so screen readers announce it when inserted. `OnboardingHint` is a plain `div` with no live region role. A screen reader user who lands on the page will not hear the onboarding tip unless they navigate through the DOM to reach it.
**Fix:** Add `role="status"` to the outer `div` (same treatment as `ApiKeyNudge`):

```tsx
<div
  role="status"
  className="mb-6 flex animate-fade-in ..."
>
```

---

### W3 — OnboardingHint SparkleIcon: missing aria-hidden

**File:** `src/components/OnboardingHint.tsx` line 9
**WCAG:** 1.1.1 Non-text Content (AA)
**Detail:** The decorative `SparkleIcon` has no `aria-hidden` attribute. Some screen readers will announce it as an unlabeled image. Compare to `ApiKeyNudge.tsx` line 35 where `CloseIcon` correctly carries `aria-hidden`.
**Fix:**

```tsx
<SparkleIcon className="h-5 w-5 shrink-0 text-coral-500" aria-hidden />
```

---

### W4 — ApiKeyNudge "Open Settings" inline button: no guaranteed minimum height

**File:** `src/components/ApiKeyNudge.tsx` lines 21–28
**WCAG:** 2.5.5 Target Size (AA)
**Detail:** The "Open Settings" text link is rendered as a plain `<button>` inside a `<span>` with no explicit height or padding. On mobile the rendered height is likely under 44px. It is not as severe as the dismiss icon issue (F1/F2) because the touch target extends to the width of the text, but tight vertical spacing can make tapping it on small screens unreliable.
**Fix:** Add `py-1` to give the button a bit of vertical tap area, or wrap it in a `min-h-[44px] inline-flex items-center` span. Low priority if the nudge is desktop-first, but worth addressing for a full mobile-friendly release.

---

## Passing Checks

| #   | Check                                                   | Detail                                                                                                 |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| P1  | **Color contrast — ApiKeyNudge body text (light)**      | `coral-900` on `coral-50` = 9.11:1. PASS.                                                              |
| P2  | **Color contrast — ApiKeyNudge body text (dark)**       | `coral-100` on blended `coral-500/10 + night` = 12.59:1. PASS.                                         |
| P3  | **Screen reader label — dismiss (ApiKeyNudge)**         | `aria-label="Dismiss this notice"`. PASS.                                                              |
| P4  | **Focus ring — ApiKeyNudge dismiss (light)**            | `coral-500` ring on `coral-50` offset = 3.08:1. PASS.                                                  |
| P5  | **Focus ring — ApiKeyNudge dismiss (dark)**             | `coral-500` ring on `night` offset = 5.21:1. PASS.                                                     |
| P6  | **Role semantics — ApiKeyNudge**                        | `role="status"` is correct for non-urgent informational banner. PASS.                                  |
| P7  | **Color contrast — OnboardingHint body text (light)**   | `coral-900` on `coral-50` = 9.11:1. PASS.                                                              |
| P8  | **Color contrast — OnboardingHint kbd element (light)** | `coral-900` on `coral-100` = 8.08:1. PASS.                                                             |
| P9  | **Screen reader label — OnboardingHint dismiss**        | `aria-label="Dismiss"`. PASS.                                                                          |
| P10 | **Keyboard — Escape dismisses overlays**                | `HomeClient.tsx` line 384 handles `Escape` at `window` level, closing settings, palette, prompt. PASS. |
| P11 | **Role semantics — all buttons**                        | All interactive elements are native `<button>` elements. PASS.                                         |
| P12 | **Decorative icon — ApiKeyNudge CloseIcon**             | `aria-hidden` present on line 35. PASS.                                                                |

---

## Decisions for Sky

None required — all findings are clear, actionable, and do not require privacy or data decisions.

---

## Required changes summary (BLOCKED items only)

```
F1: ApiKeyNudge.tsx line 29    — h-7 w-7 → h-11 w-11 (or -m-2 p-2 pattern)
F2: OnboardingHint.tsx line 18 — h-7 w-7 → h-11 w-11 (or -m-2 p-2 pattern)
F3: OnboardingHint.tsx line 19 — add focus-visible:ring-2 ring-coral-500 ring-offset classes
F4: SettingsModal.tsx line 173 — add role="dialog" aria-modal="true" aria-labelledby
F4: SettingsModal.tsx line 175 — add id="settings-modal-title" to h2
F5: SettingsModal.tsx          — add focus management on open (useRef + dialogRef.focus())
F6: SettingsModal.tsx line 178 — ring-coral-400 → ring-coral-500
F7: SettingsModal.tsx line 199 — text-coral-600 → text-coral-700 (dark:text-coral-400 unverified)
```
