# Prompt Library — Feature Backlog

> Living backlog reordered each loop by Morgan. Top = next to ship.

## Conventions

- Each item is a self-contained vertical slice (UI + logic + storage if any).
- Size: S (≤200 lines), M (~500 lines), L (~1000 lines).
- "Reachable" = wired into the UI a user can click to, not just a function in a file.

---

## Up next (this cycle — PM session)

### F-r1 — First-run "add your API key" nudge — Riley 2026-05-26
**User:** Sam, beginner coder visiting for the first time (composite persona — modeled on Sky's profile: learns by doing, low patience for opaque errors)
**Story:** As a first-time visitor, I want the app to tell me up-front that I need to paste in my Anthropic API key, so that I don't waste my first interaction by clicking Run on a seed prompt and getting an "auth" error I have to decode.
**Why this matters:** Today the only path to discovering "you need a key" is: open the app → click any prompt → click Run → hit a `ClaudeError(kind: "auth")` → notice the "Open Settings" button (PromptDetail.tsx:767). For a beginner that's 4 steps of failure before the first success. The empty-state banner removes the failure path.
**Acceptance criteria:**
  1. On app load, if `apiKey` is missing from settings storage, a dismissible banner renders above the prompt grid: "Add your Anthropic API key to start running prompts" with an inline "Open Settings" action.
  2. Banner does NOT render once a key is stored (even if later cleared, it doesn't re-appear in the same session — avoids nag).
  3. Banner is dismissible with `×`; dismissal persists for the session (sessionStorage), so it returns next visit but isn't sticky inside one session.
  4. Banner is keyboard-focusable; "Open Settings" is reachable by Tab; `Esc` does not dismiss (avoid hijacking global Esc).
  5. Banner does NOT appear when the user has at least one completed run in any prompt's history (proof they're set up).
  6. `npx tsc --noEmit` green; existing tests untouched.
**Edge cases:** Storage disabled / private-mode → assume no key, show banner (degrades to current behavior — they'll still hit the auth error path, but the banner is a no-op safety net). Multiple tabs → each tab evaluates independently; that's fine.
**A11y:** `role="status"` on the banner so it's announced, not interruptive. "Open Settings" is a real `<button>`, not a styled div. Banner stays out of the natural reading order tab sequence's middle — top of main, before the grid heading.
**Confidence:** medium — grounded in code I read (auth error path in PromptDetail.tsx:767, ClaudeError kinds in anthropic.ts:9-17) and in Sky's stated beginner-coder profile, but not from observed first-visit telemetry (none exists; static site, no analytics).

### F-r2 — Rate-limit error: show retry-after and a Retry button — Riley 2026-05-26
**User:** Sam, returning user mid-flow (composite — same beginner-coder profile, now with API key, running their 3rd prompt of the day)
**Story:** As a user who hit Anthropic's rate limit, I want the error to tell me approximately when I can retry and let me retry with one click, so that I don't have to either re-fill the form or guess at a wait time.
**Why this matters:** `anthropic.ts` already distinguishes a `rate-limit` kind (line 47) but `PromptDetail.tsx` only special-cases the `auth` kind for an action affordance. For rate-limit, the user currently sees the generic error string and no path forward — they have to manually wait, manually re-click Run, and their in-flight inputs are still present (good) but the error stays until they retry.
**Acceptance criteria:**
  1. When `error.kind === "rate-limit"`, the error block renders an extra **Retry** button next to (or replacing) the dismiss control.
  2. If the API response carries a `retry-after` header (seconds), surface it: "Try again in ~12s" with a live-updating countdown; Retry button is disabled until countdown ends.
  3. If no `retry-after` header is present, the button is enabled immediately with text "Retry now".
  4. Clicking Retry re-invokes `streamClaude` with the same args that triggered the error — no form re-fill, no lost variable values.
  5. Existing auth-error "Open Settings" affordance is unchanged.
  6. The countdown uses `setInterval` cleaned up on unmount / on dismiss / on retry; no leak.
  7. Typecheck green; new path covered by one unit test in `anthropic.test.ts` (header parse) and one in `PromptDetail` (or component test if applicable).
**Edge cases:** retry-after value > 5 min → show "Try again in a few minutes" instead of literal "327s" (cognitive load). retry-after = 0 or negative → treat as no header. User retries and rate-limits AGAIN → countdown resets from the new header.
**A11y:** Retry button announces its disabled state and the remaining seconds (`aria-label="Retry — available in 12 seconds"`). Countdown updates use `aria-live="polite"` not `assertive` (no screen-reader spam every second — update once per 5s or only at "Retry available" moment).
**Confidence:** medium-high — grounded in real anthropic.ts code (rate-limit kind exists but is unused beyond the message) and a concrete UX gap. Lower confidence on whether the Anthropic streaming endpoint actually surfaces `retry-after` on a 429 here — Shamus should verify against current API docs as part of implementation; if absent, fall back to acceptance criterion 3 only.

---

### F5 — Export / Import library  (M-L)
**User story**
Everything in this app lives in this browser. If I clear my data, switch laptops, or hand the app to someone else, I lose all my custom prompts, favorites, history, and saved variable values. I want a one-click backup file and a one-click restore.

**Scope**
- **Export**: a button (probably in Settings) that downloads a `prompt-library-<date>.json` file containing:
  - `version: 1`
  - `exportedAt` (ISO)
  - `userPrompts` (all custom prompts)
  - `favorites` (id list)
  - `recent` (id list)
  - `runs` (full per-prompt history)
  - `values` (per-prompt saved draft values)
  - **Never**: `apiKey`, `model`, `maxTokens`, `schemaVersion`. (API key would be a security footgun in a file users might share.)
- **Import**: a file-picker (also in Settings). Validates the file, shows a preview ("This file has X prompts, Y favorites, Z runs from 2026-05-22"), then asks:
  - **Merge** — keep existing data; only add prompts whose id you don't have. Favorites/recent/runs/values for an imported prompt only land if you also accept the prompt.
  - **Replace** — wipe your existing user prompts/favorites/recent/runs/values and use the file's. Inline confirm.
- File validation: reject anything missing `version` or with the wrong top-level shape; partial validity (one corrupt run) drops only the corrupt entry, not the whole import.

**Acceptance**
| # | Behaviour |
|---|---|
| 1 | Export downloads a valid JSON file with the right keys; opening it in a text editor shows readable JSON. |
| 2 | `apiKey`, `model`, `maxTokens` are never in the export. |
| 3 | Importing the same file you just exported is a no-op in Merge mode (everything already exists). |
| 4 | Replace mode wipes user prompts AND the per-prompt sub-keys (runs, values) for the wiped prompts. |
| 5 | A malformed file shows a friendly error, not a crash. |
| 6 | A file from a future `version` shows a friendly "this file is newer than this app" message. |
| 7 | Seed prompts never appear in the export (they're shipped with the app). |
| 8 | `npx tsc --noEmit` green. |

**Dependencies** — None new. Builds on the existing `library.ts` helpers + `runs.ts` per-prompt storage.

### F-r1 — API key nudge on first run  (S)  <!-- STATUS: partial — fix/a11y-api-nudge-2026-05-26, pending merge -->
**User story**
New users may not realize they need to enter an API key to use the app. A gentle in-app prompt guides them.

**Scope**
- First-run detection: show a dismissible banner if `apiKey` is empty.
- Banner content: "Paste your Claude API key in Settings to start running prompts" with a Settings link.
- Dismissible once per session; reappears on next app load if the key is still missing.
- Fully accessible (a11y pass complete on the branch).

**Acceptance**
| # | Behaviour |
|---|---|
| 1 | Banner appears on first load with no API key. |
| 2 | Banner disappears if user pastes a key into Settings. |
| 3 | Banner is accessible (label, focus, keyboard). |
| 4 | Typecheck green. |

**Dependencies** — None.

### F-r2 — Rate-limit retry with countdown  (S)  <!-- STATUS: partial — feat/rate-limit-retry-2026-05-28, pending merge -->
**User story**
When I hit the Claude API rate limit, the app shows me how long to wait before retrying, not just "Error — try again."

**Scope**
- On rate-limit error (HTTP 429), parse the `Retry-After` header.
- Show an inline countdown (e.g., "Retry in 45 seconds…").
- Auto-retry when the countdown expires.
- Fully accessible (aria labels, keyboard support).

**Acceptance**
| # | Behaviour |
|---|---|
| 1 | Rate-limit error shows countdown instead of generic "Error". |
| 2 | Countdown is live; decrement is visible. |
| 3 | Auto-retry triggers when countdown reaches 0. |
| 4 | Accessible form elements and labels. |
| 5 | Typecheck green. |

**Dependencies** — None.

---

## Stretch

### F8 — Better empty states  (S)  <!-- STATUS: partial — code exists, integration pending -->
Friendly empty states for: search-with-no-results (already exists, polish it), Favorites tab when you have none (today: section hidden — give a "Star prompts to see them here" tile instead), Recent (same pattern), and the All Prompts grid if a user somehow deletes all seeds. Consistent affordance: small icon + one sentence + a one-click CTA.

---

## Done (most recent first)

### F9 — Respect `prefers-color-scheme` on first visit  (XS)  ✅ landed on main
On first load (no stored theme preference), pick dark or light from the user's system preference. The toggle remains the source of truth from that moment forward. Pre-paint script in `layout.tsx` prevents flash; `ThemeToggle` component wired in Header.

### F7 — Customize seed → save as your own  (S)  ✅ landed on main
On a seed prompt's detail header, **Customize** button opens the create form pre-filled with the seed's content and `(custom)` appended to the title. Gated by `prompt.isSeed` in `PromptDetail.tsx`. The original seed is untouched.

### F6 — Markdown rendering of Claude responses  (M)  ✅ landed on main
Dependency-free safe-subset Markdown renderer: headings (h1-h3), paragraphs, bold/italic, inline code, fenced code blocks, unordered + ordered lists, line breaks, and links. Wired into response panels in `PromptDetail.tsx` and `RunHistory.tsx`; renders both during streaming and in history.

### F1 — Run history per prompt  (M)  ✅ landed on `cycle/auto-2026-05-23`
Last 10 runs per prompt with restore-inputs, copy-response, delete-one, clear-all. Storage: `promptlib:runs:<id>`, cap 10, 32KB per-response trim.

### F2 — Variable values persistence  (S)  ✅ landed on `cycle/auto-2026-05-23`
Per-prompt `promptlib:values:<id>` draft. Survives reopen; cleared by Clear; cascade-on-delete via `purgePromptStorage`.

### F3 — Tag filter  (S)  ✅ landed on `cycle/auto-2026-05-23`
Frequency-sorted `TagChips`; tags clickable on cards + detail header; category + tag intersect; auto-clear stale tag; empty state with Clear filters.

### F4 — Keyboard shortcuts overlay  (S, stretch)  ✅ landed on `cycle/auto-2026-05-23`
Press `?` (not while typing). One canonical `SHORTCUTS` constant drives the render.

---

## Later / parked

- **F-future-1 — Cross-prompt history view** — global "what did I run today?" timeline.
- **F-future-2 — Per-run usage / token display** — parse `message_delta` from the stream and store tokens used.
- **F-future-3 — Multiple named variable presets per prompt** — beyond the single in-flight draft.
- **F-future-4 — Storage usage readout in Settings** — "your library uses 1.2 MB of 5 MB".
- **F-future-5 — Cloud sync** — out of scope for v1 / requires a backend.
