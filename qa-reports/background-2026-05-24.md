---
mode: background
model_tier: opus-4.7
project: prompt-library-tool
cycle_id: shamus-background-2026-05-24
role: Shamus (Feature Pusher)
branch: feat/all-prompts-empty-state-2026-05-24
base: main (c998ec6)
constitution: v1.11 / AGENT_OS v1.11
art_12_compliance: HALT-check passed (no sentinel); no external sends; ≤1 reversible change; `feat/` prefix; Claude Corp paths untouched
---

# Shamus — Background cycle 2026-05-24

## Backlog triage

Read `FEATURES.md` and checked the "Up next" trio:

| Item | Size | Verdict |
|---|---|---|
| F5 — Export / Import library | M-L | **Skip this cycle.** Multi-modal flow (preview → Merge vs Replace), file validation, schema-version guard, cascade-on-replace. Bigger than "≤1 reversible scoped change per cycle" (Const. 12.3). |
| F6 — Markdown rendering | M | **Skip this cycle.** ~150-line safe-subset renderer + streaming integration + history integration + XSS escaping. Worth its own cycle. |
| F7 — Customize seed → save as your own | S | **Already shipped.** `PromptDetail.tsx:521-526` renders the explicit "Customize — save as your own (⌘D)" `HeaderButton` with `WandIcon` on seeds only (gated by `prompt.isSeed`). `HomeClient.tsx:817-823` wires `onCustomize` to `setForm({ mode: "create", initial: { ...activePrompt, title: \`${activePrompt.title} (custom)\` } })`. The keyboard shortcut `⌘D` (`PromptDetail.tsx:424`) also routes through `onCustomize` for seeds. All 4 acceptance criteria met. |
| F8 — Better empty states (stretch) | S | **Partially shipped — closed remaining gap this cycle.** See below. |
| F9 — `prefers-color-scheme` on first visit (stretch) | XS | **Already shipped.** Pre-paint script in `layout.tsx:25` reads `localStorage.getItem('promptlib:theme')`; if absent, falls back to `window.matchMedia('(prefers-color-scheme: dark)')`. Three-mode toggle (`light` / `dark` / `system`) in `ThemeToggle.tsx` extends this with a live-following system mode (F-n2-9). |

Two of the three "Up next" items are already done in code. F5 and F6 are both too large for a single background cycle. The clearest, best-scoped next item left is **F8 — Better empty states**, which itself was already 75% done. I closed the remaining gap.

## What I built — F8 (partial, completes the spec)

### Before

`HomeClient.tsx` had a single `visiblePrompts.length === 0` branch in the All Prompts grid that always read **"No prompts match this filter."** with a "Clear filters" CTA — even when no filter was active. F8's stated case ("All Prompts grid if a user somehow deletes all seeds") was therefore unhandled; the user would see a misleading "no match for filter" message with a CTA that did nothing.

### After (this commit)

[src/components/HomeClient.tsx:601-639](src/components/HomeClient.tsx:601) — the empty branch now splits on whether a filter is active:

- **Filtered, no results** → unchanged "No prompts match this filter." tile with "Clear filters" CTA.
- **No filter, no results (truly empty library)** → new tile: `SparkleIcon` + "Your library is empty" heading + "Create your first prompt to get started." body + "Create your first prompt" CTA that opens the create form via the same `setForm({ mode: "create", initial: null })` path the header's "New prompt" button uses.

Visual is consistent with the existing dashed `rounded-xl border-dashed border-border bg-cream/40` tile so the four empty states across Favorites, Recent, the filtered grid, and the truly-empty grid all read as one family. No new dependencies. No icon additions (reused already-imported `SparkleIcon` and `PlusIcon`).

### Spec coverage (vs FEATURES.md F8)

| Empty-state case from F8 spec | Status |
|---|---|
| search-with-no-results (polish) | Already polished by F-n3-11 (`CommandPalette.tsx:199-234`): "No prompts match '<query>'" + "Try a different word or a tag" + "Create new: '<query>'" affordance when a handler is wired. No further polish needed. |
| Favorites tab — empty | Already shipped (`HomeClient.tsx:535-551`): `EmptyHint` with `StarIcon`, "No favorites yet", "Click the ⭐ on any prompt to keep it at hand here." |
| Recent — empty | Already shipped (`HomeClient.tsx:574-586`): `EmptyHint` with `ClockIcon`, "Nothing here yet", "Prompts you open will show up here so they're easy to find again." |
| All Prompts — truly empty (this commit) | ✅ **NEW**: `SparkleIcon`, "Your library is empty", "Create your first prompt" CTA. |

## How to try it

```bash
cd "/Users/skypie/Documents/Claude/Projects/Prompt Library Tool"
git checkout feat/all-prompts-empty-state-2026-05-24
npm run dev        # http://localhost:3000
```

To reach the new empty state (it's an edge case — seeds normally fill the grid):

1. Open the app.
2. Open DevTools → Application → Local Storage → `http://localhost:3000`.
3. Clear every `promptlib:*` key (or just set `promptlib:userPrompts` to `[]` and clear seeds via whatever path — fastest is to use `localStorage.clear()` in the console while no real data matters, then reload).
4. Verify: the All Prompts grid shows the new tile with the sparkle icon, "Your library is empty" heading, and a "Create your first prompt" coral button that opens the create form.
5. Sanity check the unchanged paths: apply a category or tag filter that yields zero results → confirm the existing "No prompts match this filter" + "Clear filters" tile still renders.

## Verification gates

| Gate | Status |
|---|---|
| `npx tsc --noEmit` | ✅ Green (no output, exit 0). |
| Reachable through UI | ✅ Reached automatically when `visiblePrompts.length === 0 && !activeCategory && !activeTag`. |
| Matches house style | ✅ Same dashed tile, same coral CTA pattern as the header's "New prompt" button. |
| Accessibility | ✅ Icon has `aria-hidden`; heading text is the accessible name; button has visible text label; coral-on-cream contrast already AA-validated by Alex in prior cycles. No new keyboard interactions to wire. |
| Load-bearing gotchas intact | ✅ No schema/RLS/auth/dependency changes. No `localStorage` shape changes. No new env vars. Pure UI conditional addition. |
| Browser preview verification | ⚠️ **Not run.** Attempted `preview_start` was correctly denied by the auto-mode classifier — BACKGROUND mode caps scope at one reversible code change. Sky reviews the branch manually before merge per the "Don't merge the branch — leave it for me to review" rule. Typecheck is the gate that ran. |

## What I'm proposing (BACKGROUND mode = propose-only, no apply)

Two follow-ups for a future cycle, neither needed for this change to merge:

1. **FEATURES.md update.** When Sky merges this branch, move F8 from "Stretch" to "Done", note that F7 and F9 are already in `main`'s code (they shipped on the n3 cycle but the "Done" list rolled them off — this is bookkeeping, not code). Morgan can do this in the next status cycle; surfacing here so it doesn't get lost.
2. **Consolidate empty-state tiles behind one component.** The four empty states (Favorites, Recent, filtered grid, truly-empty grid) currently use two patterns: `EmptyHint` (Favorites + Recent) and an inline dashed tile (the two grid branches). A `EmptyHintWithCta` variant — same as `EmptyHint` but with optional `ctaLabel` + `onCta` — would unify them and is the kind of "reusable component … documented in the applicable MD and skill" the role asks for. Pure refactor, no behavior change. ~30 lines.

## Forward-looking feature suggestions (1–2)

- **F-next-1 — "Recently deleted" undo tray (S, 1-cycle).** When a user deletes a custom prompt, briefly show a thin sticky banner at the bottom of the screen with "Deleted '<title>'" + an "Undo" button (5–10s timeout). Restores from a small in-memory stash (no storage needed — surviving a reload is out of scope for v1). Closes the only destructive action in the app that has no second-chance affordance.
- **F-next-2 — Per-prompt "last edited" timestamp on user prompts (XS, 0.25-cycle).** A subtle `text-xs text-ink-soft` line on user-prompt card / detail showing "Edited <relative time>" (e.g. "3 days ago"). Storage already has `createdAt` on user prompts; would add `updatedAt` set on edit save. Helps users tell which of their drafts is the current one when they have several near-duplicates from successive Customize / Duplicate operations.

## Files changed

- `src/components/HomeClient.tsx` — +35 / -13. One conditional split. No new imports needed (`SparkleIcon` and `PlusIcon` already imported on line 50).

## Branch & commit

- Branch: `feat/all-prompts-empty-state-2026-05-24`
- Base: `main` @ `c998ec6 docs(clean): night2-10 sweep — LEARNINGS`
- Commit: `82a82d6 feat(F8-partial): truly-empty library empty state for All Prompts grid`
- **Not merged.** Awaiting Sky's review.

## DECISIONS FOR SKY

None blocking. The "consolidate empty states behind one component" proposal under "What I'm proposing" is the only forward decision and it's purely an opportunistic refactor — happy to skip it if you'd rather burn cycles on F5 or F6.

— Shamus, background cycle, 2026-05-24
