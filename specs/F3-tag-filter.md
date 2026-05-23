# F3 — Tag filter

_Quinn + Dani, compressed._

## Problem

Every prompt has tags rendered in cards and the detail header — but they're decorative. Clicking them does nothing. Users see "claude tells me a useful tag exists; I want to see all prompts that share it" and can't act.

## Goal

Make tags first-class filters, exactly like categories already are, with the same one-click affordance.

## Scope

- New `TagChips` component below `CategoryChips`. Same shape as CategoryChips but uses the `#tag` visual (smaller pill, `bg-cream` style).
- `activeTag: string | null` state in `HomeClient`. Filter combines with `activeCategory` (intersection — both must match).
- Clicking a tag chip on `PromptCard` selects that tag (and stops the card click). Clicking the same chip again clears it.
- Clicking a tag chip in `PromptDetail` header closes the modal and selects that tag.
- Tag list is frequency-sorted (most-used first), tie-broken alphabetically. The first 12 are shown; "+N more" disclosure if there are more.
- Empty-state if intersection yields zero prompts: a friendly "No prompts match this filter — clear it to see everything."

## Acceptance

| # | Behaviour |
|---|---|
| 1 | Selecting a tag narrows the visible grid. |
| 2 | Selecting a category AND a tag intersects the two. |
| 3 | Clicking the active tag clears it; clicking another switches to it. |
| 4 | Tag click on PromptCard does NOT also open the prompt. |
| 5 | Tag click in PromptDetail closes the modal AND sets the tag filter. |
| 6 | Empty intersection shows a friendly empty state, not a blank grid. |
| 7 | Count text in "All prompts / {category}" reflects the filtered count. |
| 8 | Keyboard: tag chips are focusable buttons; Enter activates. |
| 9 | Tag chips have AA contrast (`text-ink-muted` on `bg-cream`, not `text-ink-soft`). |
| 10 | `npx tsc --noEmit` green. |

## Design

- Use the existing pill shape from CategoryChips, but slightly smaller (`px-3 py-1`, `text-xs`).
- Active state mirrors CategoryChips active: `border-coral-500 bg-coral-500 text-white`.
- Place beneath CategoryChips with `mt-2` gap, centered, wrapping.
- "Show more / fewer" toggle button if tag count > 12.

## Size

**S–M** — TagChips component (new), HomeClient state + intersection (small), PromptCard tag click handler (small), PromptDetail tag click handler (small).
