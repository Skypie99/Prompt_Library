# Design Compile Result — phase2-polish — 2026-06-17

**Feature:** Phase 2 polish — inline model switcher (F3b), error/destructive danger-scale swap, default model refresh  
**Branches audited:**
- `shamus/p2-f3b-model-switcher` — inline `<select>` model switcher in PromptDetail info-bar + per-prompt localStorage persistence
- `shamus/p2-errors-danger-scale` — error/destructive surfaces migrated from teal to `danger` token scale
- `shamus/p2-model-refresh` — default model updated to `claude-opus-4-8`

**Compiler version:** Const. Art. 2.4 (v1.11)  
**Prior audit reference:** `qa-reports/2026-06-17_Dani_Phase1_Critique.md`  
**Auditor:** Dani — Creative Director (code-only; no rendered pixel access)

---

## 1. COMPILER RESULT

> **POLISH**

All three branches are sound in intent and architecture. No BLOCK-level failures. Two must-fix items (both in `p2-errors-danger-scale`) must land before the merge set ships — both are straightforward Shamus fixes on the existing branch. One inline run-error block was missed by the danger-scale sweep and must be caught up. Layer 4 (Visual Entropy) and Layer 5 (Luxury UI) are escalated to Sky's eye; they cannot be certified from code alone.

---

## 2. LAYER BREAKDOWN

| Layer | Status | Score | Notes |
|---|---|---|---|
| 1. Tokenization | POLISH | — | 1 miss: inline run-error block in PromptDetail (lines ~949, 973) not converted |
| 2. Accessibility Parity | POLISH | — | Dot SC 1.4.1 OK (sr-only label exists); Cancel hover no-op in light mode |
| 3. Component Consistency | POLISH | 14/20 | Cancel border deviates from Danger Zone template (danger-200 vs danger-700); select ring-offset missing in dark |
| 4. Visual Entropy | ESCALATE | —/100 | Red in dual-palette context needs a rendered eye |
| 5. Luxury UI Score | ESCALATE | —/100 | Info-bar select affordance can't be rated without render |
| 6. Regression Safety | PASS | — | No new animations; tests green; model ID change in tests is opaque fixture data only |
| 7. Compile Decision | POLISH | — | 2 must-fix, 2 escalate, remainder PASS |

---

## 3. VIOLATIONS

### Layer 1 — Tokenization

**L1-A — Teal-as-error: inline run error block NOT converted (MUST FIX)**
- File: `src/components/PromptDetail.tsx` line 949 (on `main` and on `shamus/p2-errors-danger-scale`)
- The primary run-error display block (`border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200`) was not touched by `p2-errors-danger-scale`. This is the most frequently visible error surface in the entire app — it fires on every API error, rate-limit, and overload.
- Also affected: the rate-limit countdown text at line ~973 (`text-teal-700 dark:text-teal-300`) sits inside this same teal error block and was not converted.
- The danger-scale branch correctly converted: RunHistory dot + error text + error block + clear-all confirmation; PromptDetail delete confirmation; SettingsModal import error alert. It missed the run-error block in PromptDetail.
- **Remedy:** Shamus adds to `shamus/p2-errors-danger-scale`:
  - Line 949 div: `border-danger-300 bg-danger-50 text-danger-800 dark:border-danger-300/40 dark:bg-danger-300/10 dark:text-danger-300`
  - Line 973 countdown span: `text-danger-700 dark:text-danger-300`
  - (The "Open Settings" and "Retry" button links inside the block inherit text color and don't need separate tokens — they use `underline` only.)

**L1-B — danger-100 not in scale — NOT an issue (informational)**  
All danger tokens used (`50, 200, 300, 600, 700, 800, 900`) map exactly to the defined Tailwind scale in `tailwind.config.ts`. Opacity variants (`/5`, `/10`, `/30`, `/40`) are Tailwind-native and do not require scale entries. No one-off hex values introduced. Clean.

**L1-C — model-refresh branch: comment-only hardcoded reference**  
`settings.ts` comment reads `// NOTE: claude-fable-5 is available if Sky wants it added later.` This is a comment, not a token. No action needed, but note: Fable is not yet in the MODELS array, so it will not appear in any UI dropdown. Correct.

---

### Layer 2 — Accessibility Parity

**L2-A — Errored status dot: SC 1.4.1 (color-only) — PASS (existing mitigation confirmed)**  
`RunHistory.tsx` renders the dot as `aria-hidden` and immediately follows with `<span className="sr-only">{STATUS_LABEL[run.status]}, </span>` (line 368). The sr-only label carries "Errored" as text. SC 1.4.1 is satisfied — color is NOT the sole carrier of meaning. `danger-600` on `cream` computes to 4.48:1 (above 3:1 SC 1.4.11 non-text threshold). PASS.

**L2-B — Cancel button hover: no visible state change in light mode (MUST FIX)**  
The new Cancel buttons in both delete-confirmation banners (PromptDetail and RunHistory clear-all) use `hover:bg-danger-50` but the element's resting background IS `bg-danger-50` (the entire banner is). The hover rule is a no-op — no change in appearance. While this is not strictly a WCAG failure (SC 1.4.1 applies to meaning, not interaction feedback), it is a UX gap: hover affords nothing on pointer devices. This violates the project's established premium interaction standard.
- **Remedy:** Change `hover:bg-danger-50` to `hover:bg-danger-100` on Cancel buttons in both confirmation banners. `danger-100` is absent from the Tailwind scale — Shamus should either (a) add `100: "#FEE2E2"` (Tailwind red-100) to the `danger` scale in `tailwind.config.ts`, or (b) use `hover:bg-danger-200/60` as an approximate. Option (a) is cleaner and sets up the scale correctly for future use.

**L2-C — New model `<select>` focus ring: systemic gap (defer to Phase 3)**  
The new select uses `focus-visible:ring-2 focus-visible:ring-teal-200` in light mode. `teal-200` (#A5F3FC) against `cream` (#FDF6E3) computes to 1.16:1 — well below SC 1.4.11's 3:1 non-text component threshold. However, this is a systemic issue: the SettingsModal global model select and other form controls also use `ring-teal-200` in light mode and `ring-teal-400` computes to only 1.68:1. The new select also adds `focus-visible:border-teal-400` (a solid border change from transparent) which provides a more visible cue.

The Phase 1 critique (Alex's reports) already flagged the ring system. Patching only the new select while the rest of the form controls have the same issue creates inconsistency. **Flag as a Phase 3 item for Alex to sweep the entire focus ring system.** The new select's border-teal-400 transition on focus is better-than-average for this codebase — accept for now.

**L2-D — New select missing `focus-visible:ring-offset` in dark mode**  
RunHistory's status filter select includes `dark:focus-visible:ring-offset-night`. The new model switcher select in PromptDetail does not. On a dark surface the ring can visually merge with the element. Minor inconsistency; defer to Phase 3.

**L2-E — Select in info-bar: touch device discoverability**  
The select `<option>` list is native OS UI — fine for accessibility. The affordance (a border-transparent control that only shows border on hover) may be invisible on `hover:none` devices. This is an engine-sensitive concern; ESCALATE to Sky's eye on a touch device (Layer 4/5 carry it forward).

---

### Layer 3 — Component Consistency

**L3-A — Cancel button border deviates from Danger Zone template (MUST FIX, same remedy as L2-B)**  
The existing Danger Zone template button in `SettingsModal.tsx` line 520 uses:
```
border-danger-700 text-danger-700 hover:bg-danger-50 focus-visible:ring-danger-600
```
The new Cancel buttons in the delete/clear confirmations use:
```
border-danger-200 text-danger-700 hover:bg-danger-50
```
`border-danger-200` (#FECACA) on `bg-danger-50` (#FEF2F2) provides only 1.32:1 contrast — the button border is invisible. The template uses `border-danger-700` (5.91:1 on danger-50) — a clearly visible stroke.

The Phase 1 protect list explicitly named the Danger Zone template (P-5) as the canonical pattern. The new branches deviated.

**Remedy (same commit as L2-B fix):**  
Change Cancel button class in both banners from `border-danger-200` → `border-danger-700`, and add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600 dark:focus-visible:ring-danger-300` to match the template. The confirm (Delete/Clear) buttons with `bg-danger-600` are correct — they match the template's primary destructive button pattern.

**L3-B — New model `<select>` vs. existing selects: typography/weight**  
The new select uses `font-sans text-xs` with `px-0.5 py-0` — intentionally minimal to fit in the info-bar inline context. Compared to RunHistory's status filter select (`rounded-md border border-border bg-surface px-1.5 py-0.5`), it is more compressed. This is contextually appropriate — the info-bar is a dense inline row, not a panel toolbar. The `font-sans` matches the surrounding `<p>` text and the existing `<kbd className="font-sans">` element. Consistent with the info-bar's established typographic rhythm. PASS.

**L3-C — model-refresh: MODELS array comment-only change in `runs.ts` JSDoc**  
The JSDoc comment in `runs.ts` updates `"claude-opus-4-7"` example to `"claude-opus-4-8"`. Housekeeping — correct. PASS.

---

### Layer 4 — Visual Entropy

**ESCALATE — needs rendered eye**

From code analysis:

The danger (red) scale enters two design contexts that have very different baseline palettes:
1. **Desert Parchment (light):** `cream` (#FDF6E3), warm sandy parchment, amber/sienna (`desert-600`). Red danger against warm-neutral is a known pairing — it reads clearly as alarming/destructive, which is semantically correct. Risk: both `desert-600` (amber-sienna) and `danger-600` (pure red) are warm-hued and may compete visually in the same panel if both are on screen simultaneously.
2. **Neon Terminal (dark):** `night` (#080A12) near-black + electric `teal-400`/`teal-500` accent. `danger-300` (#FCA5A5) is a desaturated warm pink on a cold dark surface — this is a non-trivial pairing. The teal accent is electric/saturated; the danger pink is warmer and softer. From code, the contrast numbers pass (10.4:1 for danger-300 on night), but tonal coherence — whether the red "feels like it belongs" in the neon-terminal palette — cannot be assessed without pixels.

**Escalation note:** The desktop rendered view and the dark-mode state of the error block, delete confirmation, and errored-run dot on the neon-terminal palette should be reviewed by Sky before the branch set merges. Specifically: does `danger-300` sit or fight in the dark context?

---

### Layer 5 — Luxury UI Score

**ESCALATE — needs rendered eye**

From code analysis:

**Positive signals:**
- The model switcher `<select>` uses `border-transparent bg-transparent` at rest — it reads as plain text (label-style), revealing interactivity only on hover (border appears). This is a subtle, considered reveal that fits the "quietly premium" tone.
- The `transition` class on the select ensures the border reveal has easing, not a hard pop.
- The per-prompt model persistence (`promptlib:model:<id>`) means the UI "remembers" without the user managing it — this feels considered.

**Concerns that need rendered validation:**
- A native OS `<select>` inside a polished typographic inline row may feel visually mismatched — the OS dropdown widget (arrow chevron, system styling) will interrupt the custom typography. On macOS in Safari, `<select>` elements have distinctive system chrome. Cannot assess without render.
- The danger confirmations (delete, clear-all) currently have a `hover:bg-danger-50` no-op (L2-B / L3-A). Even after the fix, the Cancel button on a `bg-danger-50` banner will have very subtle hover feedback. In the premium aesthetic, destructive confirmations typically feel weighty — the visual balance of the red banner, ghost Cancel, and filled Delete should be checked with pixels.

---

### Layer 6 — Regression Safety

**PASS**

- **Animations:** No new `animate-*` classes introduced. `transition` on the new select and the danger buttons uses Tailwind's default duration (150ms) — consistent with existing controls. The `prefers-reduced-motion` blanket in `globals.css` (P-3 from Phase 1 protect list) collapses `transition` via `transition-duration: 0ms` — confirmed safe, no JS-side animation bypass.
- **Teal accent preservation:** The teal neon-terminal accent (buttons, focus rings, streaming indicator, tag chips) is untouched by all three branches. `p2-errors-danger-scale` only changes teal-as-error/destructive surfaces; teal-as-accent is preserved. P-1 protect-list intact.
- **Tests:** The `p2-f3b-model-switcher` branch adds `src/lib/__tests__/prompt-model.test.ts` (7 unit tests covering SSR safety, round-trip, isolation, clear) and updates three existing test files to mock `loadPromptModel`/`savePromptModel`. All mocks return null by default (correct fallback behavior). The `p2-errors-danger-scale` branch adds no tests — color token changes are not unit-testable, which is expected. The `p2-model-refresh` branch adds no tests.
- **Model ID in tests:** Multiple test files hardcode `"claude-opus-4-7"` as fixture data in `StoredRun.model` and as stored string values in localStorage tests. These tests are checking storage passthrough and data preservation — the string is treated as opaque. They will continue to pass after `p2-model-refresh` because (a) `MODELS`/`DEFAULT_MODEL` changes only affect runtime behavior, and (b) the tests set and expect back the same hardcoded string without reference to the live MODELS catalog. The `settings.test.ts` suite uses `DEFAULT_MODEL` (the constant, not a hardcoded string) for the validation tests, so those update automatically. No test failures expected.
- **Mobile sheet:** No changes to the `Sheet` primitive or `slide-up` animation. Mobile surface unchanged.
- **No-flash theme:** Theme initialization script in `globals.css`/`layout.tsx` untouched. No regression.

---

## 4. FIXES PROPOSED

The two must-fix items are both in `shamus/p2-errors-danger-scale`. Shamus should amend that branch with a single follow-up commit:

| # | Layer | What to fix | Where |
|---|---|---|---|
| M1 | L1-A | Convert inline run-error block from teal to danger | `src/components/PromptDetail.tsx` ~line 949 (div), ~line 973 (countdown span) |
| M2 | L2-B + L3-A | Fix Cancel button border (`danger-200` → `danger-700`), fix no-op hover (`hover:bg-danger-50` → `hover:bg-danger-100`), add missing `focus-visible:ring-danger-600` | `src/components/PromptDetail.tsx` (delete confirmation), `src/components/RunHistory.tsx` (clear-all confirmation) |
| M2a | config | Add `100: "#FEE2E2"` to `danger` scale in `tailwind.config.ts` to enable `bg-danger-100` for hover state | `tailwind.config.ts` |

**Proposed M1 class replacement for PromptDetail run-error block:**
```
// Current (line ~949):
"rounded-md border border-teal-300 bg-teal-50 px-3 py-2.5 text-sm text-teal-800 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200"

// After:
"rounded-md border border-danger-300 bg-danger-50 px-3 py-2.5 text-sm text-danger-800 dark:border-danger-300/40 dark:bg-danger-300/10 dark:text-danger-300"
```

**Proposed M1 class replacement for rate-limit countdown span (line ~973):**
```
// Current:
"text-xs tabular-nums text-teal-700 dark:text-teal-300"
// After:
"text-xs tabular-nums text-danger-700 dark:text-danger-300"
```

**Proposed M2 class replacement for Cancel buttons (both PromptDetail + RunHistory):**
```
// Current pattern:
"rounded-md border border-danger-200 px-3 py-1.5 text-sm font-medium text-danger-700 transition hover:bg-danger-50 dark:border-danger-300/40 dark:text-danger-300 dark:hover:bg-danger-300/20"

// After (matching SettingsModal Danger Zone template):
"rounded-md border border-danger-700 px-3 py-1.5 text-sm font-medium text-danger-700 transition hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600 dark:border-danger-300/40 dark:text-danger-300 dark:hover:bg-danger-300/20 dark:focus-visible:ring-danger-300"
```
*(Adjust `px-3 py-1.5` vs `px-2 py-1` per context — PromptDetail uses larger, RunHistory uses smaller.)*

---

## 5. ESCALATIONS

### E1 — Visual Entropy + Luxury UI: danger red in Neon Terminal dark mode (→ Sky's eye)
Both Layer 4 and Layer 5 require a rendered view to certify. Specifically: the dark-mode state of the errored-run dot, the error block in the inline run panel, and the delete/clear-all confirmation banners against the `night` (#080A12) background with `danger-300` (#FCA5A5) text. The key question is whether desaturated warm pink reads "error" or "off-brand" in the cold neon-terminal context.

**Action for Sky:** After the M1/M2 fixes land, open the app in dark mode and trigger: (a) a run that errors (invalid key or overloaded), (b) a delete confirmation, (c) run history panel with an errored run. Report back — does the red feel coherent or discordant?

### E2 — Model `<select>` native OS chrome in info-bar (→ Sky's eye)
The inline `<select>` will render with the OS-native dropdown affordance (system arrow, font). On macOS Safari this is particularly distinctive and may interrupt the custom Inter typography. Cannot certify Luxury UI (Layer 5) without seeing it.

**Action for Sky:** Open PromptDetail for any prompt on macOS Safari. Does the model switcher feel embedded or bolted-on in the info-bar?

### E3 — Phase 3 handoff: focus ring system sweep (→ Alex)
`L2-C` and `L2-D` identify systemic focus ring gaps (ring-teal-200 in light mode = 1.16:1 against cream; missing ring-offset in dark for new select). These exist across the whole form-control system, not just the new select. Alex should perform a full SC 1.4.11 + SC 2.4.11 sweep of all interactive controls in Phase 3. Do not patch only the new select in isolation.

---

## 6. FINAL DECISION

**Decision: POLISH**

All three branches are technically sound. `p2-model-refresh` is a clean PASS — one-line change, correct, no risk. `p2-f3b-model-switcher` is a PASS with a Phase 3 flag (focus ring gap, escalated). `p2-errors-danger-scale` has two must-fix items: an incomplete sweep (the inline run-error block was missed) and a Cancel button that deviates from the established Danger Zone template. Both fixes are Shamus line-edits with no architecture risk. After M1 and M2 land on `shamus/p2-errors-danger-scale`, re-run Layers 1–3 (code-only, fast pass) and escalate Layers 4–5 to Sky's rendered eye per E1 and E2 above before final merge authorization.

---

*Dani — Creative Director | Design Compiler pass | Const. Art. 2.4 (v1.11) | 2026-06-17*  
*Code-only audit. Layers 4 and 5 carry ESCALATE flags — Sky's rendered eye required before final merge.*
