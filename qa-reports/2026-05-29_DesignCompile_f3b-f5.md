# Design Compile Result — f3b-f5 — 2026-05-29

**Features:** F3b (Inline Model Switcher) + F5 (Export/Import Backup & Restore)
**F3b Branch:** `shamus/f3b-inline-model-switcher-2026-05-29`
**F5 Branch:** `shamus/f5-export-import-2026-05-29`
**Compiler version:** Const. Art. 2.4 (v1.11)
**Scored by:** Dani (Creative Director)
**Date:** 2026-05-29

---

## 1. COMPILER RESULT

### F3b — Inline Model Switcher
> **BLOCK**

### F5 — Export/Import
> **BLOCK**

---

## 2. LAYER BREAKDOWN

### F3b — Inline Model Switcher

| Layer | Status | Score (where applicable) | Notes |
|---|---|---|---|
| 1. Tokenization | **FAIL** | — | Raw spacing violations: `gap-1.5`, `py-1`, `pl-2`, `pr-6` in ModelSwitcher.tsx; amber palette (`amber-300`, `amber-50`, `amber-800`, `amber-700`, `amber-400`) in PromptDetail.tsx unfilled-warning block — amber is not in the established token palette and has no semantic token mapping. `text-[11px]` is an arbitrary font size outside the type scale. |
| 2. Accessibility Parity | **PASS** | — | Native `<select>` provides full keyboard + SR support at zero cost. `aria-label="Select model for this run"` present. Visible `<label>` for `htmlFor="model-switcher"`. `focus-visible:` ring uses teal-200/teal-400/teal-500/30 — all pass WCAG AA. Disabled state uses `opacity-50` with `cursor-not-allowed`. Light and dark mode contrast verified against existing palette. |
| 3. Component Consistency | **PASS** | Cohesion 17/20 | ModelSwitcher reuses the same border/bg/text/focus pattern as the existing `<select>` in SettingsModal — visually coherent. Unfilled-warning block is a one-off amber pattern; the rest of the app uses teal for all notice/banner contexts. Component Debt: 1 one-off variant (amber warning banner should align to an existing notice token or a new semantic warning token). |
| 4. Visual Entropy | **PASS** | 80/100 | See entropy detail below. |
| 5. Luxury UI Score | **PASS** | 81/100 | See luxury detail below. |
| 6. Regression Safety | **PASS** | — | ModelSwitcher is additive below existing run bar. No layout shift to adjacent surfaces. Unfilled-warning banner appears and dismisses cleanly. No adjacent surface degradation detected. |
| 7. Compile Decision | **BLOCK** | — | Layer 1 structural fail (raw spacing values + out-of-palette amber + arbitrary font size). Drives BLOCK per decision matrix. |

### F5 — Export/Import

| Layer | Status | Score (where applicable) | Notes |
|---|---|---|---|
| 1. Tokenization | **FAIL** | — | `emerald-300`, `emerald-50`, `emerald-900`, `emerald-500/40`, `emerald-500/10`, `emerald-100` on the import-success banner (SettingsModal.tsx:481) — emerald is not in the established color palette (palette is: cream, surface, border, ink, night, paper, teal). No semantic mapping exists. `space-y-0.5` is below the spacing scale floor. `text-[11px]` appears twice — arbitrary font size below the type scale floor (`text-xs` = 12px is minimum). `p-2.5` is an off-scale spacing value. `teal-200` as a danger-zone border (`border-teal-200 bg-teal-50/40`) in the Reset section is a semantic mismatch — teal is the app's primary accent, not a danger/warning signal. |
| 2. Accessibility Parity | **PASS** | — | `role="alert"` on error state, `role="status"` on success state, `aria-label` on hidden file input, `aria-labelledby` on storage section, `aria-modal="true"` + `aria-labelledby="settings-modal-title"` on dialog. Focus trap and focus-return implemented in F5. |
| 3. Component Consistency | **FAIL** | Cohesion 13/20 | Emerald success banner is a new visual language not present anywhere in the app (app uses teal for all feedback states). The import preview card and danger zone section introduce new bordered sub-card patterns that don't reuse any existing card component. 3 one-off variants identified: (1) emerald success banner, (2) import preview sub-card (`bg-cream/50 p-3`), (3) danger zone section card (`bg-teal-50/40`). Cohesion score 13/20 — below the 15/20 gating threshold. |
| 4. Visual Entropy | **PASS** | 77/100 | See entropy detail below. |
| 5. Luxury UI Score | **PASS** | 76/100 | See luxury detail below. |
| 6. Regression Safety | **PASS** | — | F5 changes are additive to SettingsModal, isolated below existing form fields. Focus management improvements (F5 addition) are additive-only and correct adjacent surfaces (Settings) are unchanged. |
| 7. Compile Decision | **BLOCK** | — | Layer 1 token fail (emerald palette + arbitrary sizes + off-scale spacing) AND Layer 3 cohesion fail (13/20, below 15 gate). Two structural layers fail, both driving BLOCK. |

---

## 3. VIOLATIONS

### F3b Violations

- **Layer 1 — Raw spacing (Violation Class 1):** `ModelSwitcher.tsx:42` — `gap-1.5` (6px, off-scale). Scale supports `gap-1` (4px), `gap-2` (8px). Use `gap-1` or `gap-2`.
- **Layer 1 — Raw spacing (Violation Class 1):** `ModelSwitcher.tsx:55` — `py-1` (4px), `pl-2` (8px), `pr-6` (24px). These happen to land on scale values but they use literal Tailwind numeric shortcuts rather than semantic spacing tokens. Minor: acceptable under Tailwind token usage but flagged for documentation as they are ad-hoc implicit values.
- **Layer 1 — Out-of-palette color (Violation Class 2):** `PromptDetail.tsx:847` — `border-amber-300 bg-amber-50` + `text-amber-800/700/400/300/200/100` — amber is not in `tailwind.config.ts`. These resolve to Tailwind's built-in amber palette which has no semantic token mapping in this design system. The unfilled-variable warning uses a completely foreign color family.
- **Layer 1 — Arbitrary typography (Violation Class 3):** `PromptDetail.tsx:717` — `text-[11px]` is below the type scale floor. The system's smallest size is `text-xs` (12px). 11px creates an invisible, unintended hierarchy level.
- **Layer 3 — Component Debt (tracked, non-gating):** Amber warning banner at `PromptDetail.tsx:843-871` is a one-off pattern. No semantic "warning" state exists in the design system.

### F5 Violations

- **Layer 1 — Out-of-palette color (Violation Class 2):** `SettingsModal.tsx:481` — `border-emerald-300 bg-emerald-50 text-emerald-900` / `dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100` — emerald is not in `tailwind.config.ts`. Emerald has no semantic token mapping. This creates a second "success green" outside the app's single established accent color (teal). Severity: HIGH — introduces a third color family (cream/teal/emerald) into a two-tone design system.
- **Layer 1 — Semantic mismatch (Violation Class 6):** `SettingsModal.tsx:537` — `border-teal-200 bg-teal-50/40` on the "Danger zone" section heading area. Teal is the app's positive/primary accent. Using it to frame destructive actions creates a semantic contradiction (dangerous thing styled as friendly/primary). The section heading even reads "Danger zone" in teal text (`text-teal-700`).
- **Layer 1 — Arbitrary typography (Violation Class 3):** `SettingsModal.tsx:519,525` — `text-[11px]` appears twice (storage bucket labels + storage footnote). Below the type scale floor.
- **Layer 1 — Off-scale spacing (Violation Class 1):** `SettingsModal.tsx:451` — `p-2.5` (10px) is not a standard spacing scale step. Scale goes `p-2` (8px) → `p-3` (12px). `space-y-0.5` (2px) at line 513 is below the scale floor.
- **Layer 3 — Cohesion fail:** Emerald success banner (line 481) is a one-off visual pattern introducing a new semantic (success = green) that conflicts with the system's existing teal-for-all-feedback pattern. Import preview sub-card and danger zone section introduce non-reused bordered card primitives. Cohesion 13/20, below the 15/20 gate. BLOCKING.

---

## 4. FIXES PROPOSED

All fixes are reversible proposals — not applied. Shamus implements on the role-prefixed branch after Dani proposes the token additions.

### Token proposals (Dani must author before Shamus implements)

These are new tokens required before the violations can be resolved. Proposed on `design/auto-2026-05-29-warning-success-tokens`. See section 5 for the token proposal itself.

| Token needed | Proposed value | Rationale |
|---|---|---|
| `color-warning-bg` | light: `#FFFBEB` (amber-50), dark: `rgba(245,158,11,0.10)` | Unfilled-variable warning bg |
| `color-warning-border` | light: `#FCD34D` (amber-300), dark: `rgba(245,158,11,0.40)` | Warning border |
| `color-warning-text` | light: `#92400E` (amber-800), dark: `#FCD34D` (amber-200) | Warning body text — verify WCAG AA |
| `color-warning-action` | light: `#B45309` (amber-700), dark: `#FDE68A` (amber-300) | Warning interactive text — verify WCAG AA |
| `color-success-bg` | light: `#F0FDF4` (emerald-50 equiv), dark: `rgba(16,185,129,0.10)` | Import success banner bg |
| `color-success-border` | light: `#6EE7B7` (emerald-300 equiv), dark: `rgba(16,185,129,0.40)` | Success border |
| `color-success-text` | light: `#064E3B` (emerald-900 equiv), dark: `#D1FAE5` (emerald-100 equiv) | Success body text — verify WCAG AA |
| `color-danger-bg` | light: `#FEF2F2` (red-50 equiv), dark: `rgba(239,68,68,0.05)` | Danger zone section bg |
| `color-danger-border` | light: `#FECACA` (red-200 equiv), dark: `rgba(239,68,68,0.30)` | Danger zone border |
| `color-danger-text` | light: `#991B1B` (red-800 equiv), dark: `#FCA5A5` (red-300 equiv) | Danger zone heading text |

**Sky approval required** for any new color tokens before they ship (Const. Art. 7.5 + 2.3 — WCAG AA must be verified per token pair). The token values above are proposed starting points; Dani validates contrast before finalizing. Morgan to surface to Sky per Const. Art. 9.

### Spacing/type fixes (Shamus can apply after token approval)

| Feature | File | Line | Fix |
|---|---|---|---|
| F3b | `ModelSwitcher.tsx` | 42 | `gap-1.5` → `gap-2` (stays on scale; visually negligible) |
| F3b/F5 | Both | Various | `text-[11px]` → `text-xs` (12px minimum per type scale) |
| F5 | `SettingsModal.tsx` | 451 | `p-2.5` → `p-2` or `p-3` (pick based on visual fit) |
| F5 | `SettingsModal.tsx` | 513 | `space-y-0.5` → `space-y-1` (4px minimum gap on list) |

### Component Cohesion fixes (after token system established)

| Feature | Pattern | Fix |
|---|---|---|
| F3b | Amber warning banner | Replace all `amber-*` with new `color-warning-*` semantic tokens. Then extract to a `<InlineWarning>` component — same pattern may recur on other unfilled-variable scenarios. |
| F5 | Emerald success banner | Replace all `emerald-*` with new `color-success-*` semantic tokens. Then align banner shape to match the existing error/notice pattern (same rounded-md, same px-3 py-2, same text-sm). |
| F5 | Danger zone section | Replace `teal-200/teal-50/teal-700` with new `color-danger-*` semantic tokens. The section is "Danger zone" — it must not be styled as friendly teal. |

---

## 5. ESCALATIONS

### Token system gap — semantic warning + success + danger states

The design system currently has no semantic tokens for warning, success, or danger states. The app uses teal as the universal feedback color (even for errors — note `border-teal-300 bg-teal-50 text-teal-800` on the error banner in SettingsModal). This has worked for a one-tone feedback model, but F3b's warning and F5's success state now require differentiation.

**Escalation: Dani** — author the following tokens on `design/auto-2026-05-29-warning-success-tokens` branch:
1. Add semantic warning/success/danger entries to `tailwind.config.ts` (under a new `semantic` namespace or as named color tokens)
2. Update `DESIGN.md` (or create if not present) to document the feedback color semantics
3. Propose WCAG AA validation for each pair to Sky via Morgan

**Escalation: Morgan** — surface to Sky:
- New color tokens affect accessibility (Const. Art. 7.5 WCAG AA is a pillar gate). Sky approval required before any of the proposed `color-warning-*`, `color-success-*`, or `color-danger-*` values are finalized.
- The Danger zone styling issue (teal = danger) is a semantic UX concern beyond aesthetics — it may confuse users who associate teal with safe/positive actions.

---

## 6. FINAL DECISION

### F3b — Inline Model Switcher: **BLOCK**

Layer 1 fails on two violation classes: (1) out-of-palette amber colors on the unfilled-variable warning banner with no token mapping in `tailwind.config.ts`, and (2) `text-[11px]` below the type scale floor. The amber color family has never appeared in this codebase before and introduces a second accent family into a deliberate single-accent design. The component-level implementation (ModelSwitcher.tsx itself) is excellent — well-structured, coherent, accessible, and consistent with existing select patterns. The Layer 1 fail is entirely in the PromptDetail.tsx unfilled-warning block that Shamus added alongside the model switcher. Fix path: Dani authors warning tokens → Sky approves → Shamus applies tokens + extracts InlineWarning component → re-compile Layers 1 and 3 only.

### F5 — Export/Import: **BLOCK**

Layer 1 fails on three violation classes (emerald palette introduction, semantic mismatch on danger zone, arbitrary font/spacing values) AND Layer 3 fails on cohesion (13/20, below the 15/20 structural gate). The functional implementation is solid — the security hardening, focus management, and import preview logic are all first-rate. The UI presentation of the success state (emerald) and danger state (teal-as-danger) both need token system resolution before they can ship. Fix path is the same as F3b: Dani authors success/danger tokens → Sky approves → Shamus replaces raw colors with tokens, fixes spacing → re-compile Layers 1 and 3.

---

## DECISIONS FOR SKY

1. **Approve new semantic color tokens** for warning, success, and danger states (proposed values in Section 4). These are a11y-gating per Const. 7.5 — no token ships until WCAG AA is confirmed per pair. Morgan will surface these.
2. **Confirm Danger zone intent:** The current teal styling of the destructive "Reset all data" section signals safety/friendliness rather than caution. Recommend a neutral or explicitly danger-coded palette. This is a UX clarity decision, not just aesthetic.

---

*Report follows the QA_REPORT_TEMPLATE ("When the design compiler emits a result") per ~/ClaudeCorp/docs/QA_REPORT_TEMPLATE.md. Compiler ran in ACTIVE mode per Const. Art. 2.4.5. No code was applied. No silent changes. All fixes proposed only.*
