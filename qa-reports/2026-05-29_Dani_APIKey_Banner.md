# Design Spec: F-r1 "Add API Key" First-Run Banner
**Date:** 2026-05-29  
**Feature:** F-r1 — First-run "add your API key" nudge  
**Component:** `Banner.tsx` (new) + `PromptGrid.tsx` (integration)  
**Scope:** Empty-state banner for first-time visitors missing an Anthropic API key  
**Author:** Dani (Design)  
**Status:** Design complete; ready for Riley implementation

---

## Visual Design

### Container
- **Position:** Top of `PromptGrid`, above the heading "All Prompts" / filter bar
- **Layout:** Full-width banner that spans the content area (follows the grid's padding/margin)
- **Height:** Single-line banner, 56–64px including padding
- **Background:** Teal accent (matches app's teal button theme) — `#1ed4e6` or `rgba(30, 212, 230, 0.12)` with subtle background fade
- **Border:** 1px top + bottom in teal (divides visually from content above/below)
- **Padding:** 16px horizontal, 12px vertical (standard grid spacing)
- **Semantics:** `<div role="status" aria-live="polite" aria-label="...">`

### Content Layout
- **Flex row** with three zones:
  1. **Icon** (optional, left): accessibility symbol or key icon, 20×20px, teal fill
  2. **Text** (center-left, grows): "Add your Anthropic API key to start running prompts"
  3. **Actions** (right, no-shrink):
     - **"Open Settings"** button (inline, small, secondary style)
     - **Dismiss button** (`×`, icon-only, 32px square, low opacity)

### Typography
- **Message text:** Inherit from body (VT323, 16px, `--soft` / off-white)
- **Subtle styling:** No bold; message is informational, not urgent
- **Button text:** "Open Settings" in same font, teal text (`#1ed4e6`)

### Styling Details
- **Button** ("Open Settings"):
  - Style: secondary / ghost (border: 1px teal, background: transparent, no fill on hover)
  - Padding: 6px 12px (compact, button-sized)
  - Hover: background fades to `rgba(30, 212, 230, 0.08)`, text stays teal
  - Active/focus: focus ring (3px teal) following project focus style
  - Cursor: pointer
  
- **Dismiss button** (`×`):
  - Style: icon button, no background, opacity 0.5
  - Size: 32×32px, centered child icon (16×16px)
  - Hover: opacity 1.0, subtle background wash
  - Color: inherit from `--soft` (off-white)
  - No keyboard shortcut hijacking; `Esc` does not dismiss

### Dark Mode / Synthwave Alignment
- **Background:** Subtle teal tint (`rgba(30, 212, 230, 0.08)`) — does NOT clash with the dark grid background
- **Text:** Inherited off-white (`--soft` = `#f1e6ff`) for readability
- **Accents:** Teal throughout (border, button text, icon) — consistent with primary UI color
- **No neon glow or drop-shadow** — banner is informational, not decorative; keeps visual weight low

---

## Behavior

### Display Rules
1. **Show condition:** Banner renders if:
   - `apiKey` is falsy (undefined, null, empty string) in `settings.apiKey`
   - **AND** no run history exists in any prompt (checked via `runs` storage: if all prompts have `runs.length === 0`, show)
   - **AND** banner has not been dismissed in this session

2. **Hide condition:**
   - Once an API key is entered (any update to settings.apiKey) → banner unmounts immediately
   - Once any prompt is run successfully (history length > 0 for any prompt) → banner unmounts
   - User clicks `×` (dismiss) → banner unmounts, dismissal recorded in `sessionStorage['api-key-banner-dismissed'] = true`

3. **Session persistence:**
   - Dismissal is **session-scoped** only (sessionStorage, not localStorage)
   - Refresh the page → banner may re-appear if no key and no runs
   - Banner does NOT nag within a single session once dismissed

### Keyboard & A11y
- **Focus trap:** Banner's "Open Settings" button is reachable by Tab (positioned after any top content, before grid heading)
- **Screen reader:** 
  - `role="status"` so it's announced on load
  - `aria-live="polite"` (non-interruptive)
  - aria-label on dismiss button: "Dismiss API key banner" or similar
  - aria-label on "Open Settings": "Add your Anthropic API key in Settings"
- **Dismiss mechanism:**
  - Click the `×` icon
  - **NOT** Esc (Esc is global, reserved for larger UX patterns in the app)
  - No Enter key hijack; Enter only activates the button if focused
- **Focus on action:** When "Open Settings" is clicked, Settings modal opens and focus moves there (Settings handles its own focus management)

### Interaction Flow
```
Load app / refresh
  ↓
Check: apiKey falsy AND no runs in any prompt?
  ├─ YES → render banner
  │        user sees: "Add your Anthropic API key to start running prompts"
  │        [ Open Settings ]  [×]
  │
  │        User clicks "Open Settings"?
  │        ├─ YES → navigate to Settings modal; banner hidden
  │        │        user adds key
  │        │        Settings closes (or auto-closes on save)
  │        │        banner auto-unmounts
  │        │
  │        └─ NO → user clicks [×]
  │                banner dismissed (session-scoped)
  │                banner hidden for rest of session
  │
  └─ NO (key exists OR runs exist) → banner does not render
```

---

## Technical Integration Points

### Component Tree
```
PromptGrid.tsx
  ├─ Banner.tsx (conditional render)
  │  └─ <button>Open Settings</button>
  │  └─ <button aria-label="Dismiss">×</button>
  ├─ <h2>All Prompts</h2>
  ├─ [Filter bar]
  └─ [Prompt cards grid...]
```

### State Dependencies
- **From `useSettings()`:**
  - `apiKey` (truthy check)
  - `setShowSettings()` (or route change) to trigger Settings modal
  
- **From `useRuns()` or storage hook:**
  - `runs` object (to check if any prompt has history)
  
- **Local state:**
  - `dismissed` (boolean, managed in component or via sessionStorage)

### CSS Classes / Tokens
- **Banner background:** `var(--banner-bg)` = `rgba(30, 212, 230, 0.08)` or hardcode
- **Teal accent:** `var(--neon-cyan)` (already in project)
- **Button focus:** Reuse project's focus-ring style (likely defined in a utilities file or Tailwind config)
- **Typography:** Use existing `--soft` (off-white text), `--term` (VT323 font)

---

## Acceptance Checklist

- [ ] Banner renders at app load if apiKey is missing and no run history exists
- [ ] Banner does not re-render once apiKey is added
- [ ] Banner does not re-render once first run is completed
- [ ] Dismiss button (`×`) hides banner for the session (sessionStorage-scoped)
- [ ] "Open Settings" button opens the Settings modal
- [ ] Banner is keyboard-focusable; "Open Settings" reachable by Tab
- [ ] Esc key does NOT dismiss the banner (focus remains in app)
- [ ] Screen reader announces role="status" on load
- [ ] Focus ring on buttons follows project style
- [ ] Teal color (`#1ed4e6`) used for all accents (border, text, icon)
- [ ] Background fade is subtle; does not compete with grid content
- [ ] Component file: `src/components/Banner.tsx` (self-contained, ~80 lines)
- [ ] `PromptGrid.tsx` integration: ~5 lines to conditionally render `<Banner />`
- [ ] TypeScript: no `any` types; `apiKey` and `runs` state inferred
- [ ] `npx tsc --noEmit` passes
- [ ] Existing tests untouched

---

## Spec Notes for Riley

1. **sessionStorage key:** Use `'api-key-banner-dismissed'` to track dismissal state
2. **Run detection:** Assume a `useRuns()` hook or `runs.ts` utility returns an object; iterate its keys and check if any prompt has `runs[promptId]?.length > 0`
3. **Settings trigger:** Clicking "Open Settings" should set a context flag (or route param) so Settings modal knows to scroll/focus the API key field on open
4. **Edge case — storage disabled:** If `sessionStorage` is unavailable (private mode), banner dismissal won't persist, but the banner should still render (degrades gracefully)
5. **No tests required for this ticket** — Riley can add an E2E test in a follow-up if desired (smoke test: banner renders on first load, hides after key entry)

---

## Design Review Notes

**Visual coherence:** The teal accent aligns with the existing button theme (secondary buttons throughout the app use teal for hover/focus states). The banner fits naturally into the top of the grid without visual shock.

**A11y compliance:** Status role + polite aria-live ensures the message reaches screen-reader users without hijacking focus. Dismissal is keyboard-accessible and does not conflict with global hotkeys.

**Performance:** Component is tiny (80 lines, one conditional render) — zero perf impact.

**Future enhancements:** If telemetry is added later, this banner can log "shown" / "dismissed" / "opened settings" events for product insights.

---

**Status:** Design complete. Ready to hand off to Riley for implementation (F-r1 story).
