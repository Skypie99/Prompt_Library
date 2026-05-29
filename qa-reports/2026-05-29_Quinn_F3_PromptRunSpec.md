# Quinn — F3: Prompt-Running Improvements Spec

**Date:** 2026-05-29  
**Status:** READY_FOR_SHAMUS  
**Mode:** AUDIT-ONLY (spec only — no code written)

---

## Naming note

The original FEATURES.md "F3" slot (Tag Filter) is already shipped. This spec
uses "F3" as the label Morgan assigned in the morning briefing for a cluster of
prompt-running improvements. Think of it as the next feature cycle, not a
correction to the backlog numbering.

---

## What F3 is

Users can run prompts against the Claude API directly in the browser, but the
run experience has rough edges that slow down iteration: the "overloaded" error
gives no recovery path, switching models requires a Settings round-trip that
blows away your mental context, long responses are cramped into a fixed-height
box, and unfilled variable slots silently survive into the live API call. Each
of these produces a small friction that compounds across the day. F3 tightens
the run loop so users can iterate faster without losing inputs or being puzzled
by dead-ends.

---

## Current state (what exists today)

- Streaming response display with a live cursor indicator — token-by-token SSE stream
- Auth error (`401/403`) surfaces an "Open Settings" affordance in the error block
- Rate-limit error (`429`) surfaces a countdown timer + Retry button (F-r2, shipped)
- Overloaded error (`503/529`) shows message text only — no action affordance
- Variable preview panel (left side of PromptDetail) — live substitution highlighting
- Unfilled variable count badge ("2/3 filled") but no pre-run warning or block
- Model selection lives only in Settings (global, modal-gated, requires Save)
- Response panel: `max-h-72` fixed cap; no expand option; copy button at top of panel
- Run history: 10-entry cap, labels, status filter, last-24h toggle, restore/run-again, export
- Token + char estimate shown below Run button (approximate, pre-run only)

---

## Sub-features

### F3a — "Overloaded" error: add Retry affordance (S effort)

**User story:** As a user who hits a 503/529 overload error, I want a Retry
button in the error block — the same as the rate-limit error — so that I don't
have to manually re-click Run after Claude recovers.

**Why it matters:** `anthropic.ts` defines four error kinds that Shamus should
handle specially (`auth`, `rate-limit`, `overloaded`, `bad-request`). Today
only the first two have action affordances. Overload errors are transient and
often resolve in seconds; a Retry button closes that loop immediately.

**Acceptance criteria:**
- [ ] When `error.kind === "overloaded"`, the error block renders a **Retry**
      button below the message text (same pattern as the rate-limit Retry, no
      countdown needed — there is no retry-after header for 503/529).
- [ ] Clicking Retry calls `handleRetry()` — clears the error and re-invokes
      `streamClaude` with the same args. No form re-fill.
- [ ] The button is keyboard-reachable and labeled `aria-label="Retry"`.
- [ ] `npx tsc --noEmit` passes.
- [ ] No new tests required for this path (the rate-limit Retry tests in
      `PromptDetail` already cover the `handleRetry` function; a comment
      noting the new trigger is sufficient).

**Files to touch:**
- `src/components/PromptDetail.tsx` — add `error.kind === "overloaded"` branch
  in the error block (lines ~810–857), mirroring the rate-limit UI.

**Blocked on:** nothing.

---

### F3b — Inline model switcher in PromptDetail (M effort)

**User story:** As a user comparing Claude models on a prompt, I want to switch
the model directly in the prompt detail panel — without opening Settings, saving,
and reopening — so I can run the same inputs against Haiku and Opus back-to-back
without losing my variable values.

**Why it matters:** The current model selection is global and modal-gated.
Every "compare two models" workflow requires: open Settings → change model →
Save → run → open Settings → change back → Save → run. That is six interactions
per comparison. An inline selector cuts it to one. Model is already stored in
`settings.model` and passed into `PromptDetail`; the switcher just needs to
override it locally without persisting.

**Acceptance criteria:**
- [ ] A model selector appears in the action bar area of `PromptDetail`, between
      the token estimate line and the "Copy template" link (or in the info
      line next to "⌘↵ to run"). It shows the current model label and a
      dropdown to switch.
- [ ] The selector overrides the model for this run only. It does NOT write to
      `settings` or `localStorage`. When the modal closes, the global setting
      is unchanged.
- [ ] The selected model persists across runs within the same modal open (if
      the user runs twice in the same session with Haiku selected, both use
      Haiku).
- [ ] The selected model is stored in `StoredRun.model` (already in the shape)
      so history correctly shows which model produced each response.
- [ ] The selector resets to `settings.model` on each new prompt open (same as
      other in-modal local state).
- [ ] The global Settings model is shown as the default with a "(default)" hint
      or similar so users know what they're deviating from.
- [ ] Selector is keyboard-navigable (native `<select>` is fine — same pattern
      as Settings modal).
- [ ] `npx tsc --noEmit` passes.

**Files to touch:**
- `src/components/PromptDetail.tsx` — add `localModel` state (init from
  `settings.model`, reset on `prompt?.id` change). Thread `localModel` into
  `runWithValues` in place of `settings.model`. Add the `<select>` element to
  the action bar. Import `MODELS` from `@/lib/settings`.

**Blocked on:** nothing. Uses existing `MODELS` constant and `StoredRun.model` shape.

---

### F3c — Unfilled-variable soft warning before Run (S effort)

**User story:** As a user who clicks Run with some variables still blank, I want
a brief inline warning that tells me which variables are empty and lets me
confirm or fill them — so I don't waste an API call sending literal
`{{variableName}}` tokens to Claude.

**Why it matters:** Today, `substituteBody` leaves unfilled tokens as raw
`{{name}}` strings and the prompt goes to the API as-is. The char/token counter
shows the raw count (which inflates slightly), and the preview pane shows the
dashed placeholders — but the Run button fires unconditionally. A soft warning
(not a hard block) preserves the power-user experience while protecting beginners
from a confusing first run.

**Acceptance criteria:**
- [ ] If the user clicks Run and `filledCount < variables.length` (at least one
      variable is empty), a single-line warning replaces the normal action bar
      for one interaction: "{{name}} is empty — run anyway?" with two buttons:
      **Fill it** (focuses the first empty variable field) and **Run anyway**
      (proceeds with the unfilled values).
- [ ] If there are zero variables, or all variables are filled, the warning is
      never shown — Run fires immediately as today.
- [ ] **Fill it** focuses the first unfilled `input` or `textarea` by variable
      order and dismisses the warning (user can then fill and run).
- [ ] **Run anyway** calls `runWithValues(values)` and dismisses the warning.
- [ ] `⌘↵` keyboard shortcut still fires Run immediately (bypasses the warning
      — power-user path; they know what they're doing).
- [ ] The warning is a `role="alert"` region so it's announced to screen
      readers when it appears.
- [ ] The warning state is local, ephemeral — cleared when `prompt.id` changes.
- [ ] `npx tsc --noEmit` passes.
- [ ] One unit test for the `filledCount < variables.length` gate logic
      (existing `countFilled` tests in `variables.test.ts` or a new test in
      `PromptDetail` component tests).

**Files to touch:**
- `src/components/PromptDetail.tsx` — add `showUnfilledWarning` state; gate
  `handleRun` to set it when `filledCount < variables.length`; add the warning
  UI between the action buttons and the token estimate line.

**Blocked on:** nothing.

---

### F3d — Response panel expand toggle (S effort)

**User story:** As a user reading a long Claude response, I want to expand the
response panel to fill more of the modal — instead of scrolling through a tiny
72px-tall box — so I can read the full response without losing context.

**Why it matters:** `max-h-72` (288px) cuts off almost any substantive response.
Power users copy responses immediately; beginners try to read in place and scroll
a small box inside a scrollable panel inside a modal. An expand toggle fixes this
without changing the default layout (collapsed view stays the same for short
responses).

**Acceptance criteria:**
- [ ] An expand/collapse icon button appears in the "Response" header bar, to
      the left of (or next to) the "Copy response" button.
- [ ] Clicking the toggle removes the `max-h-72` cap: the response fills
      available vertical space in the modal's scrollable right panel.
- [ ] A second click collapses back to `max-h-72`.
- [ ] The expanded state is local to the current modal open — it resets when
      the prompt changes or the modal closes.
- [ ] The toggle button has a clear `aria-label` ("Expand response" /
      "Collapse response") and updates when toggled.
- [ ] The toggle only appears while `showResponsePanel` is true and
      `!running` (no response yet, or still streaming → no expand button).
- [ ] `npx tsc --noEmit` passes.

**Files to touch:**
- `src/components/PromptDetail.tsx` — add `responseExpanded` state; toggle
  between `max-h-72 overflow-y-auto` and `overflow-y-auto` (no max-height) on
  the response div. Add the toggle button in the "Response" header row.

**Blocked on:** nothing.

---

## Open questions for Sky

1. **F3b model switcher placement:** The action bar area is already dense (Copy
   filled / Run, then char/token estimate, then "Copy template" link). Should
   the inline model selector live in the info line ("⌘↵ to run · Sonnet 4.6 ▼")
   or get its own row? Propose: inline in the info line as a styled `<select>`
   — but Sky should confirm this doesn't feel cluttered.

2. **F3c warning behavior for `⌘↵`:** The spec proposes `⌘↵` bypasses the
   warning (power-user path). If Sky wants consistent behavior (warning always
   shows regardless of input method), `handleModalKeyDown` needs the same gate.
   Propose bypassing it — power users who set up `⌘↵` know what they're doing.

3. **F3b persistence decision:** Should the inline model override persist across
   modal opens for the same prompt (e.g. "I always want to run this prompt with
   Haiku")? The current spec says no — reset on close. If yes, it becomes a
   per-prompt settings key in `library.ts`. Propose no persistence for now
   (simpler, avoids another storage key).

---

## Out of scope for F3

- **Token usage display after run** (F-future-2) — parked per FEATURES.md.
  Would require parsing `message_delta` usage events from the stream, storing
  tokens in `StoredRun`, and surfacing it in the response header. Worth a
  separate cycle.
- **Multiple variable presets per prompt** (F-future-3) — different scope.
- **System prompt field** — would require a new `StreamClaudeParams` field and
  UI, not a run-improvement in the existing sense.
- **Temperature / top-p controls** — beyond beginner-friendly scope; Settings
  already has max-tokens as the only exposed parameter.
- **F-r1 / F-r2** — already shipped (first-run API nudge, rate-limit retry).

---

## Sequencing recommendation

| Order | Sub-feature | Effort | Why first |
|-------|------------|--------|-----------|
| 1 | **F3a** — Overloaded Retry | S | Smallest change; closes the last unhandled error kind |
| 2 | **F3c** — Unfilled variable warning | S | Protects beginners; no design ambiguity |
| 3 | **F3d** — Response expand toggle | S | Pure UI addition; independent of logic |
| 4 | **F3b** — Inline model switcher | M | Most impactful for power users; requires Sky's placement call first |

All four can ship in one Shamus cycle if Sky answers the F3b placement question.
If timeline is tight, F3a + F3c ship first; F3d + F3b follow in the next cycle.

---

**Report generated by Quinn (Product Manager)**  
**For:** Shamus (Engineer), Morgan (PM + decision gating)
