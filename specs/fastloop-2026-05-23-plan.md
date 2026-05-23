# Fastloop plan — 2026-05-23

_Morgan. Branch `fastloop/auto-2026-05-23` stacked on `cycle/auto-2026-05-23-pm`._

## Picks (5 small, visible, independent — no migrations, no auth, no PII)

| # | Feature | Visible where | Roles |
|---|---|---|---|
| F-fast-1 | Char/token estimate by Run button | PromptDetail right column footer | Quinn, Shamus, Steve, Alex |
| F-fast-2 | "Run N×" usage badge on cards | PromptCard top area | Quinn, Dani, Shamus, Steve, Alex |
| F-fast-3 | Storage usage readout | Settings → Backup & Restore | Quinn, Shamus, Steve, Alex |
| F-fast-4 | Copy template (unfilled) button | PromptDetail actions | Quinn, Shamus, Steve, Alex |
| F-fast-5 | Compact/Comfortable grid toggle | Header | Quinn, Dani, Shamus, Steve, Alex |

Dana skipped on every feature — none needs a schema/migration. F-fast-5 adds one localStorage key (`promptlib:density`), reversible without a migration.

End-of-session sweep: Peter (perf) → Gary (tests/lint) → Will (LEARNINGS) → Morgan (briefing).
