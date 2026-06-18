# Dani — Phase 1 Design Critique
**Date:** 2026-06-17  
**Role:** Creative Director — read-only audit  
**Scope:** Both themes (light Desert Parchment / dark Neon Terminal) × both breakpoints (desktop + mobile bottom-sheet). Code-only — no rendered pixel access; engine-sensitive items are tagged ES.  
**Repo:** `/Users/skypie/Documents/Claude/Projects/Prompt Library Tool/`  
**Live commit:** f16e411

---

## 1. Protect-List

Things that are good now and must NOT regress in Phase 2. These are deliberate, coherent decisions — touching them to "improve" them risks breaking the system.

| # | What to protect | Why + where |
|---|---|---|
| P-1 | **Focus ring split: desert on home grid, teal inside detail/modal** | This is semantically coherent: home grid is the browsing surface (desert accent), overlays are the action surface (teal). It reads as context, not accident. Verified in `PromptCard.tsx`, `Header.tsx`, `CategoryChips.tsx`, `TagChips.tsx` (desert) vs. `PromptDetail.tsx`, `SettingsModal.tsx` (teal). Do not unify blindly. |
| P-2 | **Error banner in `HomeClient` uses desert tokens** (not teal) | `storageWarning` at line 424 — `bg-desert-50 border-desert-300 text-desert-800 dark:bg-teal-500/10 dark:text-teal-200`. Light mode correctly avoids teal for a warning; dark mode leaning teal is an existing tradeoff. Don't touch the light-mode treatment. |
| P-3 | **`prefers-reduced-motion` blanket rule in `globals.css`** | Lines 94–103. Collapses every animation — `slide-up`, `scale-in`, `fade-in`, `pop`. Clean, honest. Do not break by introducing JS-side animation without honoring the CSS var. |
| P-4 | **`opacity-0` reveal rule for touch devices** (`globals.css` line 75–78) | Makes PromptCard star, Markdown copy-code, and RunHistory "+ label" unconditionally visible on `hover:none` devices. Blast radius is exactly documented. Any Phase-2 hover-reveal affordance must use the same `opacity-0 group-hover:opacity-1` pattern so this rule catches it automatically. |
| P-5 | **`danger` token usage in the Danger Zone section** (`SettingsModal.tsx` lines 501–556) | This is the only correctly scoped destructive UI in the entire app. `bg-danger-50`, `border-danger-200`, `text-danger-700/800/900` — all semantically accurate. The pattern must be the Phase-2 template for ALL error/destructive states. |

---

## 2. Ranked Findings Table

Severity: **P1** = visible coherence break or misdirection, fix before any new feature ships; **P2** = design polish gap, notable but non-blocking; **P3** = micro-detail.

Tag: **OBJ** = can be verified from code/tokens alone; **ES** = engine-sensitive, needs real-device / rendered eye before final call.

| ID | Short Title | Sev | OBJ/ES | Phase | Affected Files | Before → After Intent |
|----|------------|-----|--------|-------|----------------|----------------------|
| F1 | **Error states painted teal, not danger** | P1 | OBJ | Polish | `RunHistory.tsx:53`, `RunHistory.tsx:508,540`, `PromptDetail.tsx:949` | `errored` status dot = `bg-teal-600`; errored error-message text = `text-teal-700`; errored response box = `border-teal-300 bg-teal-50` → Replace all with `bg-danger-600`, `text-danger-700`, `border-danger-200 bg-danger-50` (dark: `border-danger-300/40 bg-danger-300/5 text-danger-300`). Teal is the app's "go" color; it must not mean "failed." |
| F2 | **Import `role="alert"` fires for errors in teal** | P1 | OBJ | Polish | `SettingsModal.tsx:352–357` | `role="alert"` block (file parse error) is `border-teal-300 bg-teal-50 text-teal-800` → same danger token swap as F1; alert semantics demand a visually distinct danger color. |
| F3 | **Delete confirmation in PromptDetail uses teal** | P1 | OBJ | Polish | `PromptDetail.tsx:589–608` | "Delete this prompt?" confirmation bar is `bg-teal-50 border-teal-200` — teal is the confirm action color, not a warning. → `bg-danger-50 border-danger-200 text-danger-900`, danger-scale Cancel/Confirm buttons. |
| F4 | **Clear-all confirmation in RunHistory uses teal** | P1 | OBJ | Polish | `RunHistory.tsx:306–327` | "Delete all N entries?" confirmation panel is `border-teal-200 bg-teal-50`. Same problem: destructive confirm should be `danger`, not `teal`. Clear button → `bg-danger-600 hover:bg-danger-700`. |
| F5 | **Default model is stale (`claude-opus-4-7`)** | P1 | OBJ | QA | `src/lib/settings.ts:18,23` | `MODELS[0]` and `DEFAULT_MODEL` are `claude-opus-4-7`; Opus 4.8 exists. New users default to an outdated model. → Update both the array entry label and the default string. Model list should be verified against current Anthropic API IDs whenever the MODELS array is touched. |
| F6 | **Focus ring color conflict inside PromptDetail header** | P2 | OBJ | Polish | `PromptDetail.tsx:85–91` (`HeaderButton`) | `HeaderButton` uses `hover:border-teal-300 hover:text-teal-600` correctly for the action surface, but no `dark:focus-visible:ring-offset-*` is set — the ring-offset will fall back to white on dark. → Add `dark:focus-visible:ring-offset-night` to `HeaderButton`. |
| F7 | **Notice banner in SettingsModal (teal info, not warning)** | P2 | OBJ | Polish | `SettingsModal.tsx:219–221` | The `notice` prop (e.g., "Add your API key") renders as `border-teal-300 bg-teal-50` — this is informational, and teal-for-info is fine in dark mode but could read as an action affordance in light. Minor: consider `border-desert-300 bg-desert-50 text-desert-800` for light, keeping current dark tokens. |
| F8 | **No `theme-color` meta tag** | P2 | OBJ | Polish | `src/app/layout.tsx` | `Metadata` export has no `themeColor`. On mobile Chrome/Safari the browser chrome stays default grey regardless of theme. → Add `themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#080A12' }, { media: '(prefers-color-scheme: light)', color: '#FDF6E3' }]` to the `viewport` export or `metadata`. |
| F9 | **`text-[10px]` / `text-[11px]` arbitrary sizes in 6 places** | P2 | ES | Polish | `RunHistory.tsx`, `PromptDetail.tsx`, `PromptCard.tsx`, `PromptForm.tsx` | Tailwind's `text-xs` is 12px; the app drops to 10–11px for token counts, run badges, "Use last" chips, "+ label" button. These are sub-`text-xs` sizes that may hit legibility thresholds on non-retina screens. ES: Confirm these are readable at 1× density before deciding whether to lift them to `text-xs`. If lifted, ensure vertical rhythm doesn't break the compact-density layout. |
| F10 | **`amber` used only once (F3c unfilled-variable warning)** | P2 | OBJ | Polish | `PromptDetail.tsx:807` | One-off `border-amber-300 bg-amber-50 text-amber-800` for the unfilled-variable warning — `amber` is not in the token system (not in `tailwind.config.ts`). It uses Tailwind's default amber, so it's technically compiled but is a non-system color. → Either add `warning` semantic tokens to `tailwind.config.ts` mirroring the `danger`/`success` pattern, or remap this state to `desert-*` (which IS the system's warm/caution color in light mode). |
| F11 | **PromptDetail header buttons don't use desert on light mode** | P2 | OBJ | Polish | `PromptDetail.tsx:85–91` (`HeaderButton`) | The modal's header buttons use `hover:border-teal-300 hover:text-teal-600` in both light and dark. The home header (same button shape) uses `hover:border-desert-300 hover:text-desert-600` in light. This is an inconsistency: modal surface uses the same button shape as home header but ignores the desert accent. Decision needed: does teal-inside-modals apply even to neutral header actions (close, star, duplicate), or should neutral actions use desert in light? The Star button already uses `text-desert-500` when active — suggesting desert is the "bookmark/favorite" accent and teal is the "run/action" accent. Neutral icon buttons (Close, Duplicate, Edit, Delete) arguably belong to neither — this split should be documented. |
| F12 | **Category pill in PromptDetail header is teal; on PromptCard it's desert** | P2 | ES | Polish | `PromptDetail.tsx:510`, `PromptCard.tsx:85` | Detail header: `bg-teal-50 text-teal-700`. Card: `bg-desert-100 text-desert-700`. Same data, different color. In light mode this is visually jarring if you notice it. The command palette (F-n2-19) uses the correct category-hash color dot. → Unify: either both use desert (more coherent with the card grid), or document the intentional difference. |
| F13 | **`scrollbar-soft` applies desert color in light mode** | P3 | ES | Polish | `globals.css:28–45` | Light scrollbar thumb is `desert.300` (#E8B96A). Dark is teal/40. These are correct per theme. ES: only visible on systems that show scrollbars (Windows, non-default macOS). Tag to verify on Windows Chrome. |
| F14 | **No OG/Twitter meta; layout title is generic** | P3 | OBJ | Polish | `src/app/layout.tsx:10–13` | `title: "Prompt Library"` with no `og:image`, `og:title`, or `twitter:*`. When shared as a link it previews as plain text. Low priority for an internal tool, but worth a one-time fix. |
| F15 | **PromptForm `fieldClass` uses teal focus on light mode** | P3 | OBJ | A11y | `src/components/PromptForm.tsx:32–33` | All form inputs share `focus:border-teal-400 focus:ring-2 focus:ring-teal-200`. In light mode, the rest of the form surface uses desert hover/focus signals (category chips, tag suggestions). The teal focus ring inside PromptForm is consistent with SettingsModal's input style, which is correct — but this means PromptForm is the only light-mode form that uses teal (the create/edit form). Decision: pick teal-for-all-forms or desert-for-home-form. |

---

## 3. F3b Inline Model-Switcher — Design Recommendation

**The three open questions:**

### (a) Placement
**Recommended: inline in the "info bar" beneath the Run button**, alongside the existing `~N chars · ~N tokens · ModelName · ⌘↵ to run` line.  
Rationale: The model name is already surfaced in that line (see `PromptDetail.tsx:868`). Turning the model name into a tappable/clickable `<select>` or segmented control in-place costs zero vertical space, is zero distance from where the current model is already read, and keeps the Run button as the sole CTA in the action row. Placing it inline beside the Run button would crowd two equally important CTAs together and create chord-trap risk.

### (b) ⌘↵ interaction
**Recommended: ⌘↵ runs with the switcher's currently selected model; the control must NOT trap the chord.**  
Rationale: `handleModalKeyDown` in `PromptDetail.tsx:483–489` currently fires `⌘↵` → `runWithValues(values)` at the panel level, which passes `settings.model`. A per-prompt switcher must write its selection into the same `sentModel` capture path. If the control is a `<select>`, the keydown handler at line 483 fires before the select's native keydown, so it won't trap ⌘↵. If it's a custom dropdown, it must `event.stopPropagation()` only on its own open/close keys (Arrow, Enter when open, Escape) and never on ⌘+Enter.

### (c) Persistence
**Recommended: per-prompt, persisted to localStorage alongside variable values.**  
Rationale: users who override the model for a specific prompt (e.g., "always use Haiku for this cheap reformatter") want that preference to survive navigation. The existing `saveValues` / `loadValues` pattern in `src/lib/library.ts` provides the exact hook. Reset-on-open would make the per-prompt switcher almost useless; global would override Settings, which is a separate trust surface. Per-prompt is the narrowest scope that's actually useful.

---

## 4. Design Compiler Pre-Read

When the formal Design Compiler gate runs for Phase 2 (rebrand polish + mobile), focus on these layers:

| Layer | Risk level | What to check |
|---|---|---|
| 1. Tokenization | **HIGH** | The `amber` one-off (F10) and the stale model strings (F5) are token-system gaps. Verify every color in the changed files traces back to a named token in `tailwind.config.ts` — no bare hex, no non-system Tailwind colors. |
| 2. Accessibility Parity | **HIGH** | F1–F4 are the error-color fixes. Before any Phase-2 merge, run Alex's contrast check on the new `danger-*` values in dark mode specifically — `danger-300/5` background with `danger-300` text is very low contrast by default. The existing `danger` scale in `tailwind.config.ts` was built for light mode; dark mode needs verification. |
| 3. Component Consistency | **MEDIUM** | F11 and F12 — the modal-header button accent split and the category pill color split — must be resolved with a documented decision, not just patched. The Compiler should check that any component touched in Phase 2 follows the resolved rule. |
| 4. Visual Entropy | **LOW** | The current app has disciplined entropy. The only risk is if Phase 2 introduces a new accent color (e.g., warning amber as a full token) without retiring the ad-hoc usage first. |
| 5. Luxury Score | **MEDIUM** | ES — the hero section (`bg-desert-hero` / `bg-dot-grid`) is the premium moment. The score depends on render quality (gradient smoothness, dot-grid density at different DPRs). Needs Sky's real-device eye on mobile Safari and Windows Chrome. |
| 6. Regression Safety | **HIGH** | The `@media (hover: none)` rule in `globals.css` has a wide blast radius (`opacity-0` → force to 1). Any new hover-reveal affordance in Phase 2 must be grep-checked to confirm it uses `opacity-0` and will be caught by this rule. |
| 7. Compile Decision | n/a | Pre-read only — formal decision runs after Phase 2 implementation. |

---

## Decisions for Sky

1. **Danger-zone token split in dark mode**: The existing `danger` scale in `tailwind.config.ts` lacks dark-specific steps. Before fixing F1–F4, decide whether to add dark-mode danger tokens (e.g., `danger.dark-text`, `danger.dark-border`) or use the existing `/40` opacity approach like the teal states do.

2. **Amber vs. Desert for warnings**: F10 — should the unfilled-variable warning use `desert-*` (system color) or should a `warning` semantic token be added to match `success` and `danger`?

3. **Modal neutral-button accent**: F11 — do Close/Edit/Delete/Duplicate header buttons in PromptDetail use desert (home-parity) or teal (modal-parity) in light mode?
