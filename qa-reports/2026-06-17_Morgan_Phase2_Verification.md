# Phase 2 — Build + Verification (merge-readiness)

**Author:** Morgan (read-only PM) · **Date:** 2026-06-17 · **Mode:** verification only (build/serve/render). No merge, no push, `main` untouched.
**Companions:** FinishingPlan · Phase0_Baseline · Dani_Phase1_Critique · DesignCompile_phase2-polish.

## What was built (Shamus, on branches off `main`)
| Branch | Scope | Tests | Build |
|---|---|---|---|
| `shamus/p2-f3b-model-switcher` | Inline `<select>` model switcher in run info-bar; ⌘↵ runs selected model; per-prompt persistence (`promptlib:model:<id>`, `loadPromptModel`/`savePromptModel`/`clearPromptModel` in `library.ts`, auto-purged on delete) | 376 (9 new) | exit 0 |
| `shamus/p2-errors-danger-scale` | F1–F4 + Compiler M1/M2: all error/destructive surfaces teal→`danger`; added `danger-100`; Cancel buttons match Danger-Zone template | 367 | exit 0 |
| `shamus/p2-model-refresh` | Default → `claude-opus-4-8`; list keeps Sonnet 4.6 / Haiku 4.5 | 367 | exit 0 |

## Built-output proof (grep of the actual `out/`, per branch + merged)
- Danger CSS rules present: `danger-50/100/300/700/800` (shades real; `danger-600` = `#DC2626`). Teal accent (`teal-600`) preserved = "go" color intact.
- `claude-opus-4-8` in built JS; **stale `claude-opus-4-7` gone (0)**; Sonnet 4.6 intact.
- F3b in build: `promptlib:model:` key (3×); `aria-label="Model for this run"` (1×).
- **No error/destructive surface still references teal** (grep clean across PromptDetail + RunHistory).

## Integration (throwaway `tmp/p2-integration`, since deleted)
- All three branches merge into `main` **with zero conflicts** (two edit `PromptDetail.tsx`).
- Merged result: **376 tests / 24 files pass**, typecheck clean, build exit 0, all markers present in the merged build.
- → The three branches are genuinely mergeable as a set, not just green in isolation.

## Design Compiler verdict (Const. Art. 2.4)
- Overall **POLISH**. Regression Safety **PASS**. Tokenization/A11y-Parity/Consistency POLISH (M1+M2) → **both fixed** on the danger branch and re-proven in build. Two layers **ESCALATED** to Sky (need rendered/iOS eye): E1 dark-mode danger coherence, E2 native `<select>` chrome.

## Rendered checks (Chromium, integration build)
- **E2 — switcher:** renders inline in the run info-bar as "Claude Opus 4.8 ⌄ · ⌘↵ to run"; options Opus 4.8 / Sonnet 4.6 / Haiku 4.5. Reads as embedded in Chromium. *Definitive native-select chrome on macOS Safari = Sky-only.*
- **E1 — dark danger:** errored run shows red dot (`danger-600`) + warm-coral text (`danger-300`) on neon-terminal bg; legible and distinct from the teal retry ▶ accent. *Subjective "feels premium in dark" = Sky's call.*
- **Light danger:** red on cream, clearly an error. Good.
- Note: the Next.js dev-tools overlay seen in screenshots is a dev artifact, NOT in the production `out/`.

## Merge-readiness
**Ready pending two things, both Sky's:** (1) E1/E2 visual sign-off (esp. E2 on real macOS Safari / iOS); (2) the merge itself — Sky merges manually (Const. Art. 1), OR it waits for the full Art. 17 gate, which still lacks a wired lint check (Phase 4) + a recorded rollback. Recommend: Sky eyeballs E1/E2 → merges the 3 branches → Phase 3 (a11y) proceeds on merged `main`.

## NOT done / next
- Not merged; `main` unchanged.
- Phase 3 (a11y) deferrals from the Compiler: SC 1.4.11 focus-ring sweep, dark-mode ring-offset on the new select, plus the top-priority streaming `aria-live`, skip-link, code-region label, `prefers-contrast`.
- Phase 4: lint toolchain (discovery-first), `out/CNAME`, real-device gauntlet, rollback record.
