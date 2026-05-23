# Prompt Library — Feature Backlog

> Living backlog reordered each loop by Morgan. Top = next to ship.

## Conventions

- Each item is a self-contained vertical slice (UI + logic + storage if any).
- Size: S (≤200 lines), M (~500 lines), L (~1000 lines).
- "Reachable" = wired into the UI a user can click to, not just a function in a file.

---

## Up next (this cycle)

### F1 — Run history per prompt  (M)
**User story**
As someone who uses the same prompt multiple times, I want to see my last few runs (input values + the response Claude gave) so I can compare results, copy a past response, or replay a prompt with the same inputs without retyping.

**Scope**
- Save the last 10 runs per prompt to `localStorage` (`promptlib:runs:<promptId>`), oldest evicted.
- Each run captures: ISO timestamp, model id, filled variable values, full response text, completion status (`completed` | `aborted` | `errored`).
- A new "History" disclosure inside `PromptDetail`, collapsed by default, opens to a list of timestamped entries.
- Per-entry actions: **View** (expands inline to show inputs + response), **Restore inputs** (loads values into the live form), **Copy response**, **Delete**.
- Clear-all-history button at the top of the panel with inline confirm.
- Skipped completely if 0 history entries (no empty panel).

**Acceptance**
- Running a prompt successfully writes a new entry; running again pushes the previous one down.
- Aborted runs save with `aborted` status and whatever streamed in.
- Errored runs save the user-facing error message, not a stack trace.
- Reopening the modal still shows the history.
- Deleting a prompt deletes its history (`promptlib:runs:<id>` removed).
- Cap at 10 entries per prompt is enforced.
- `npx tsc --noEmit` green.

**Dependencies** — None.
**Out of scope** — Cross-prompt global history view; export/import (covered later).

### F2 — Variable values persistence  (S)
**User story**
When I reopen a prompt I worked on earlier, I want my last typed values still there so I can tweak one thing instead of retyping everything.

**Scope**
- Save the in-flight variable values per prompt to `localStorage` (`promptlib:values:<promptId>`) on change (debounced or simple onChange — pick simple).
- Restore on open. Cleared by the existing "Clear" button (also wipes storage).
- Pruned when a prompt is deleted.

**Acceptance**
- Type values, close modal, reopen → values are still there.
- Hit Clear → values disappear from both UI and storage.
- Deleted prompts have no leftover values in storage.
- Does NOT auto-load from history (that's F1's "Restore inputs" path).
- Typecheck green.

**Dependencies** — Reuses the same per-prompt storage discipline as F1, so Dana lands both keys together.

### F3 — Tag filter  (S)
**User story**
I see tags on the prompt cards and detail header but can't click them to filter. I'd like the same one-click filter behaviour I get from categories, but for tags.

**Scope**
- Derive the tag list from all prompts (sorted by frequency, then alphabetical).
- A `TagChips` row beneath `CategoryChips` (or merged into it as a second tier — Dani decides).
- Clicking a tag filters the visible grid; clicking again clears.
- Clicking a tag on `PromptCard` or in `PromptDetail` opens the home grid filtered by that tag.
- Active tag has the same visual treatment as the active category.

**Acceptance**
- Selecting a tag narrows the grid; the count text updates.
- Selecting a category + tag intersects the two filters.
- Selecting "All categories" keeps the tag selection; clearing the tag returns to all-of-that-category.
- Empty result → a friendly empty state, not a blank grid.
- Typecheck green.

**Dependencies** — None.

---

## Stretch (if time allows)

### F4 — Keyboard shortcuts overlay  (S)
Press `?` (when not typing) → modal listing every shortcut (`⌘K`, `/`, `Esc`, `⌘↵`, `?`). Auto-built from a static list so adding a shortcut means adding one line.

---

## Later / parked

- **F5 — Export / Import library** — JSON download of user prompts + favorites + recent + history (NOT the API key), and an upload-to-merge flow. Necessary backup story for an all-localStorage app.
- **F6 — Markdown rendering of Claude responses** — headings, lists, code blocks while streaming. Quality bump, needs a tiny dependency-free renderer or a vetted lib.
- **F7 — Customize seed prompt → save as your own** — pre-fills the create form from a seed, keeps the seed intact.
- **F8 — Better empty states** — for favorites, recent, search, and (post-F3) tag-filtered grids.
- **F9 — Theme: respect `prefers-color-scheme` on first visit** — currently the toggle works; confirm system preference is honoured on first load.

---

## Done (most recent first)

_(none yet on this cycle — see git log on `cycle/auto-2026-05-23`)_
