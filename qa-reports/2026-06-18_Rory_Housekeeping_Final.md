---
role: Rory (DevOps/Release)
mode: ACTIVE (direct, Sky-requested)
date: 2026-06-18
project: Prompt Library Tool
subject: Final housekeeping — branch prune, remote URL fix, Art.17 gate-gap proposal
authority: Const. Art. 10.2 (branch deletion) · Sky "do all 3"
model_tier: Opus 4.8 (Sky-initiated session)
---

# Rory — Final Housekeeping (3 items)

## #1 — Branch prune: 75 → 10 local branches
- Earlier this cycle: deleted `alex/p3-aa-audit-fixes` + 55 fully-merged branches (safe `-d`).
- This step: force-deleted **9 unmerged "auto-*" autoloop branches**, each verified moot in
  `main` first. All local-only (none on origin). SHAs recorded for recovery (reflog window):

  | SHA | branch | why moot |
  |---|---|---|
  | `ebc1944` | a11y/auto-…header-focus-visible | main has `aria-label="Search prompts"` + focus rings (teal-reskinned) |
  | `72650af` | cycle/auto-2026-05-23-n3 | docs/QA sweep, superseded |
  | `ae48607` | cycle/auto-2026-05-23-n3-cleanup | docs sweep, superseded |
  | `5436b4e` | docs/auto-…tsconfig-types-lesson | docs only, superseded |
  | `dfbabe9` | product/auto-2026-05-29 | FEATURES grooming, superseded |
  | `974f18a` | qa/auto-2026-05-29 | Steve security report, superseded |
  | `068bd8f` | qa/auto-…gary-clean-sweep | clean-code report, superseded |
  | `c4e230e` | qa/auto-…steve-hardening | eslint FlatCompat fix — main lint = 0 errors, moot |
  | `36fc825` | ui-clean/auto-2026-05-23 | **Rules-of-Hooks fix — confirmed already in main (PromptDetail.tsx:260 above early-return:273)** |

- **Kept for Sky's review (9 hand-authored, unmerged):** `a11y/header-focus-teal-2026-05-29`,
  `ci/fix-eslint-circular-2026-05-29`, `deploy/gh-pages-2026-05-25`, `feat/features-sync-2026-05-25`,
  `feat/teal-reskin-2026-05-29`, `fix/a11y-api-nudge-2026-05-26`, `gary/ts-expect-error-cleanup-2026-05-29`,
  `shamus/f-r2-humanize-2026-05-29`, `shamus/f3b-inline-model-switcher-2026-05-29`.
  Recovery for any deleted branch: `git branch <name> <sha>` (within reflog window).

## #2 — Remote URL corrected
`origin` pointed at the misspelled old name `Skypie99/Prompt_Libary.git` (relied on GitHub's
auto-redirect — a likely cause of the earlier terminal hang). Now set to canonical
`https://github.com/Skypie99/Prompt_Library.git` (fetch + push). No redirect round-trip anymore.

## #3 — PROPOSAL FOR SKY: Art. 17 gate tightening (NOT self-applied)
> No agent self-amends the Constitution (Authority order). This is a proposal only — Sky decides.

**Gap observed:** the AA ship recorded its rollback SHA and ran the check chain on the 4-commit
branch tip; a 5th commit (`14811d1`, RunHistory 24px) was added before merge and shipped without
its own gate run. Post-hoc re-verification on live `b1f011c` was green, so no harm — but the gate
is meant to verify the exact shipped bytes.

**Proposed addition to Art. 17.3 (gate conditions):**
> *"If the branch HEAD changes between rollback-record and merge, re-record the branch HEAD and
> re-run the full check chain (lint / typecheck / `npm test` / `npm run build`) on the merged
> result before `git push`. The ship report must cite the final merged SHA, not the pre-merge tip."*

Cost: one extra check-chain run when a branch grows mid-ship. Benefit: closes the only integrity
gap seen this cycle. (Also logged in `LEARNINGS.md`, 2026-06-18.)

---

## Final state
- `main` = `origin/main` = `3396507` + this docs commit (after push). Working tree clean.
- Live site unchanged (docs not in built `out/`).
- Production rollback target unchanged: `git reset --hard 27a8f76 && git push --force-with-lease origin main`.
