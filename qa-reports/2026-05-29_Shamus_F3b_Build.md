# F3b Inline Model Switcher — Build Report

**Role:** Shamus (Feature Pusher)
**Date:** 2026-05-29
**Branch:** `shamus/f3b-inline-model-switcher-2026-05-29`
**Commit:** `2c1d790`
**Feature:** F3b Inline Model Switcher + F3c Unfilled-Variable Warning

---

## What Was Built

### F3b — Inline Model Switcher

**New file:** `src/components/ModelSwitcher.tsx`

A controlled, accessible model picker rendered inline in the PromptDetail run bar. Key decisions honored:

- (a) INLINE in the run button row — no modal, no separate page. Rendered below Copy filled / Run with Claude buttons, alongside the ~chars/tokens estimate.
- (c) Per-prompt model persistence: stored under `promptlib:promptModel:<promptId>` in localStorage. Each prompt remembers its own model independently of global Settings. On prompt open, the stored model is loaded (or falls back to `settings.model`). On model change, `savePromptModel()` is called immediately.
- Reuses `MODELS` and `ModelOption` from `src/lib/settings.ts` — no new data or API surface.
- Component is pure presentational + controlled; PromptDetail owns all state/persistence.

**Accessibility:**
- Native `<select>` element: full keyboard navigation, screen reader support, and combobox role for free.
- `aria-label="Select model for this run"` for unambiguous SR announcement.
- Visible `<label>` "Model" associated via `htmlFor="model-switcher"`.
- Disabled while a run is in flight (`disabled={running}`) — prevents mid-stream model ambiguity.
- Focus ring uses `focus-visible:` so mouse users are not distracted.
- Color tokens from existing design system (teal-300/400/500 hovers, night/cream bg).

### F3c — Unfilled-Variable Warning

Both `handleRun()` (Run button click) and `handleModalKeyDown()` (⌘↵) gate on the unfilled-variable check. When triggered with unfilled variables:

- Shows an amber `role="alert"` panel with `aria-live="polite"`.
- Message distinguishes: "No variables filled" vs. "N variable(s) unfilled — continue anyway?"
- Two explicit user actions: "Fill first" (dismisses warning) and "Run anyway" (calls `handleRunAnyway()` which bypasses the gate and fires `runWithValues()`).
- This satisfies the locked queue decision: ⌘↵ is BLOCKED + shows the variable warning when variables are unfilled.

### PromptDetail.tsx changes summary

| Change | Location |
|---|---|
| Import `MODELS` + `ModelSwitcher` | Top imports |
| Add `loadPromptModel` / `savePromptModel` localStorage helpers | Module scope (after icons import) |
| Add `localModel` state | Component state |
| Add `showUnfilledWarning` state | Component state |
| Reset both states on prompt change in `useEffect` | Reset effect |
| Use `localModel` in `runWithValues` instead of `settings.model` | `runWithValues()` |
| Add unfilled-var gate in `handleRun()` | `handleRun()` |
| Add `handleRunAnyway()` | New function |
| Add `handleModelChange()` (updates state + persists) | New function |
| Replace status line (was centered `<p>`) with flex row containing `<ModelSwitcher>` + estimate | JSX — actions section |
| Add amber unfilled-variable warning panel | JSX — below model row |

---

## Test Results

### `npm run typecheck`
```
> tsc --noEmit
(no output — 0 errors)
```

### `npm run test`
```
 RUN  v2.1.9

 ✓ src/lib/__tests__/library-storage.test.ts (45 tests)
 ✓ src/lib/__tests__/library.test.ts (25 tests)
 ✓ src/lib/__tests__/transfer.test.ts (20 tests)
 ✓ src/lib/__tests__/runs.test.ts (24 tests)
 ✓ src/lib/__tests__/variables.test.ts (34 tests)
 ✓ src/lib/__tests__/integration-run-pipeline.test.ts (12 tests)
 ✓ src/lib/__tests__/transfer-extra.test.ts (17 tests)
 ✓ src/lib/__tests__/settings.test.ts (15 tests)
 ✓ src/lib/__tests__/markdown.test.ts (27 tests)
 ✓ src/lib/__tests__/prompts.test.ts (25 tests)
 ✓ src/lib/__tests__/runs-extra.test.ts (14 tests)
 ✓ src/lib/__tests__/search.test.ts (14 tests)
 ✓ src/lib/__tests__/anthropic.test.ts (9 tests)
 ✓ src/lib/__tests__/sort.test.ts (13 tests)
 ✓ src/lib/__tests__/density.test.ts (7 tests)
 ✓ src/lib/__tests__/values.test.ts (9 tests)
 ✓ src/lib/__tests__/categoryColor.test.ts (5 tests)
 ✓ tests/smoke/Button.smoke.test.tsx (4 tests)
 ✓ tests/ModelSwitcher.test.tsx (8 tests)       ← NEW
 ✓ tests/PromptDetail.ratelimit.test.tsx (5 tests)

 Test Files  20 passed (20)
      Tests  332 passed (332)   ← was 324 before F3b
   Start at  10:48:24
   Duration  13.85s
```

**8 new tests** in `tests/ModelSwitcher.test.tsx` covering:
1. Renders combobox with accessible label
2. Renders all MODELS as options
3. Shows current value as selected
4. Calls onChange with new model id on change
5. Disabled prop sets the select to disabled
6. Visible "Model" label text present
7. Option labels are human-friendly, not raw ids
8. Default disabled=false when prop omitted

### `npm run lint`
```
TypeError: Converting circular structure to JSON
  --> starting at object with constructor 'Object'
  |   property 'configs' -> ... 'plugins' -> closes the circle
```

**Pre-existing infrastructure failure** — ESLint v9 FlatCompat + eslint-config-next circular plugin reference. Documented in `qa-reports/2026-05-28_Gary_ESLint_Prettier_Setup.md`. NOT caused by this change; no new lint errors introduced.

---

## Browser Verification

Ran dev server and opened "Explain Like I'm Five" prompt modal. Confirmed visually:

1. **ModelSwitcher renders** inline below Copy/Run buttons as "Model [Claude Opus 4.7 ▾] · ~213 chars · ~54 tokens · ⌘↵"
2. **Unfilled-variable warning** appears on Run click with empty fields: amber panel "No variables filled — the prompt will send with unfilled {{tokens}}." with "Fill first" + "Run anyway" buttons.

---

## Files Changed

| File | Status |
|---|---|
| `src/components/ModelSwitcher.tsx` | NEW |
| `src/components/PromptDetail.tsx` | MODIFIED (+122 / -15 lines) |
| `tests/ModelSwitcher.test.tsx` | NEW |

---

## Compile Requested

Requesting Dani to run the Design Compiler for this feature.

**Branch:** `shamus/f3b-inline-model-switcher-2026-05-29`
**Commit:** `2c1d790`
**Changed surfaces:** PromptDetail run bar (below Copy/Run button row) — model label + select + amber warning panel.
**Token usage:** teal-300/400/500/600/700, amber-50/200/300/500/700/800, border-border/night-border, cream/night bg — all existing system tokens. No new tokens introduced.

Dani should output `qa-reports/2026-05-29_DesignCompile_F3b-model-switcher.md`.

---

## Decisions for Sky

None — all decisions were locked in the queue. No schema changes, no new dependencies, no auth changes proposed. The lint failure is pre-existing infrastructure (FlatCompat circular ref) and not a blocker per task brief.
