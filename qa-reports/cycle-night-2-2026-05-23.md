# Night cycle 2 — Prompt Library — 2026-05-23

_Morgan. Branch `cycle/auto-2026-05-23-night-2`, stacked on `cycle/auto-2026-05-23-night-1`._

## DECISIONS FOR SKY

**None.** 3 features + clean sweep. All reversible.

## Shipped

| Commit | Feature | Where you'll see it |
|---|---|---|
| `86a635f` | F-night-4 History status filter | RunHistory header dropdown (All / Completed / Stopped / Errored) |
| `0e2400a` | F-night-5 Auto-grow variable textareas | Multiline variable inputs in PromptDetail |
| `f7001e2` | F-night-6 Suggested tags chips | Below tag input in PromptForm |

## Clean sweep

No source-code fixes. LEARNINGS appended with the patterns reinforced (filter-before-decoration, reset-transient-state-on-prompt-switch, AutoGrowTextarea pattern, suggested-from-context).

## Day stats so far

43 + 4 = **47 commits** ahead of main. 21 + 3 = **24 features** today.

— Morgan
