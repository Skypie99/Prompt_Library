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

### F6 — Markdown rendering of Claude responses  (M)
**User story**
Claude's responses come back with headings, lists, code blocks, bold/italic — and the app shows them as a wall of plain text. I want them rendered so what I read matches what Claude wrote.

**Scope**
- A tiny dependency-free safe-subset Markdown renderer (~150 lines): headings (h1-h3), paragraphs, bold/italic, inline code, fenced code blocks (no syntax highlighting in v1), unordered + ordered lists, line breaks, and links (`https://` / `http://` / `mailto:` only).
- Renders both during streaming (response panel in `PromptDetail`) and in the History expanded row.
- No raw HTML support. No images. No tables. No script execution. Steve double-checks the escape-everything-by-default rule.

**Acceptance**
| # | Behaviour |
|---|---|
| 1 | A response with `# Heading\nSome text **bold** *italic*` renders accordingly. |
| 2 | Fenced code blocks render in a mono font with a soft background. |
| 3 | Lists with `-` or `1.` items render as `<ul>` / `<ol>`. |
| 4 | Any `<script>` tag in the response renders as literal text, not executed. |
| 5 | An `<img>` tag in the response is escaped (no network request). |
| 6 | Plain text without markdown renders as plain text (idempotent). |
| 7 | Streaming partial markdown ("# Head") shows a partial render without flicker. |
| 8 | Typecheck green. |

**Dependencies** — None.

### F7 — Customize seed → save as your own  (S)
**User story**
I love that there are starter prompts but I want to tweak one without losing the original. Today the only way is "Duplicate" — fine, but the action label doesn't tell me that's what's happening.

**Scope**
- On a seed prompt's detail header, the existing **Duplicate** action gains an explicit **Customize** button (or replaces Duplicate's label for seeds only — Dani's call).
- "Customize" opens the create form pre-filled with the seed's content and `(custom)` appended to the title.
- The original seed is untouched.

**Acceptance**
| # | Behaviour |
|---|---|
| 1 | Clicking Customize on a seed opens the form pre-filled. |
| 2 | Saving creates a NEW user prompt; the seed remains in the library. |
| 3 | The button shows on seeds, not on user prompts. |
| 4 | Typecheck green. |

**Dependencies** — None.

---

## Stretch

### F8 — Better empty states  (S)
Friendly empty states for: search-with-no-results (already exists, polish it), Favorites tab when you have none (today: section hidden — give a "Star prompts to see them here" tile instead), Recent (same pattern), and the All Prompts grid if a user somehow deletes all seeds. Consistent affordance: small icon + one sentence + a one-click CTA.

### F9 — Respect `prefers-color-scheme` on first visit  (XS)
On first load (no stored theme preference), pick dark or light from the user's system preference. The toggle remains the source of truth from that moment forward.

---

## Done (most recent first)

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
