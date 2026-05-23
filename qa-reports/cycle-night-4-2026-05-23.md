# Night cycle 4 — Prompt Library — 2026-05-23

_Morgan. Branch `cycle/auto-2026-05-23-night-4`, stacked on `cycle/auto-2026-05-23-night-3`._

## DECISIONS FOR SKY

**None.** 3 features + clean sweep. All reversible.

## Shipped

| Commit | Feature | Where you'll see it |
|---|---|---|
| `b180713` | F-night-10 Auto-link bare URLs in Markdown | Response panel + history view (any `https://...` in text) |
| `38ea240` | F-night-11 Category color stripe | PromptCard 3px left edge |
| `88f9529` | F-night-12 Category count badges | CategoryChips ("writing 5") |

## Clean sweep

One real catch: the `getCategoriesWithCounts` test block from F-night-12 didn't land cleanly in its feature commit (multi-edit ordering issue — first edit shifted the file state out from under the second). The clean pass appended the 5 missing cases. LEARNINGS notes the pattern: always `grep -c` after a multi-edit on the same file to verify all halves landed.

## Day stats so far

51 + 4 = **55 commits** ahead of main. 27 + 3 = **30 features** today.

— Morgan
