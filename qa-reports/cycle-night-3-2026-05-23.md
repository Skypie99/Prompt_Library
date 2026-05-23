# Night cycle 3 — Prompt Library — 2026-05-23

_Morgan. Branch `cycle/auto-2026-05-23-night-3`, stacked on `cycle/auto-2026-05-23-night-2`._

## DECISIONS FOR SKY

**None.** 3 features + clean sweep. All reversible.

## Shipped

| Commit | Feature | Where you'll see it |
|---|---|---|
| `7eaa296` | F-night-7 `s` shortcut to favorite the open prompt | PromptDetail; tooltip shows "(s)"; added to the `?` overlay |
| `e74b33e` | F-night-8 Live word + char count in PromptForm body | Below the body textarea |
| `5069b00` | F-night-9 Live preview pane in PromptForm | Below the body field, mirrors PromptDetail's preview chip style |

## Clean sweep

No source-code fixes. LEARNINGS appended with the patterns: inline a 6-line util when crossing domains for it costs more; "(s)" in visible tooltips teaches shortcuts to sighted users; reuse the same primitive (parseBody) across surfaces for visual consistency; memo at the parse boundary not the render.

## Day stats so far

47 + 4 = **51 commits** ahead of main. 24 + 3 = **27 features** today.

— Morgan
