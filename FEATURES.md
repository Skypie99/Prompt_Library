# Prompt Library — Feature Backlog

> Living backlog reordered each loop by Morgan. Top = next to ship.

## Conventions

- Each item is a self-contained vertical slice (UI + logic + storage if any).
- Size: S (≤200 lines), M (~500 lines), L (~1000 lines).
- "Reachable" = wired into the UI a user can click to, not just a function in a file.

---

## Up next (this cycle — PM session)

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
