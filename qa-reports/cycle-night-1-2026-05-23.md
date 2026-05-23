# Night cycle 1 — Prompt Library — 2026-05-23

_Morgan. Branch `cycle/auto-2026-05-23-night-1`, stacked on `clean/auto-2026-05-23-eve`. In-repo artifact (Const. Art. 9)._

---

## DECISIONS FOR SKY

**None.** 3 features + 1 clean sweep. All reversible, no migrations, no auth, no PII. 0 FAIL_FAST, 0 BLOCKER.

---

## Shipped

| Commit | Feature | Where you'll see it |
|---|---|---|
| `6a98624` | F-night-1 Variable count badge | PromptCard (e.g. "5 fields") |
| `76dbddb` | F-night-2 "Clear filters" header button | All Prompts header (only when filters active) |
| `e3feb29` | F-night-3 Markdown code block copy | Response panel + history view, hover/focus on a fenced block |

## Clean sweep

No source-code fixes — in-loop Alex+Gary reviews already caught the real issues. Will appended a LEARNINGS entry noting the patterns reinforced (`group/code` for nested hover, reusing existing regex constants for derived helpers, "no fix needed" as a real outcome).

## Day stats so far

39 + 4 = **43 commits** ahead of main. 18 + 3 = **21 features** today. Branch tip: `cycle/auto-2026-05-23-night-1`.

— Morgan
