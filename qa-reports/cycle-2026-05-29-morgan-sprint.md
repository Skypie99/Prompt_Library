# Morgan — Sprint Cycle Report & Sky Decision Brief (2026-05-29)

**Scope:** Prompt Library (PL) · Pac-Man (PM) · Claude Corp (CC). **AccessMap / Portfolio / Dashboard untouched** (staffed elsewhere, per Sky).
**Duration:** ~1.5h continuous sprint. **Model tier:** Mixed Haiku+Sonnet (Sky-approved). **Constitution rails held:** no `main` merges, no external sends, no live DB, no `~/.claude/**` edits, no secrets.

---

## Headline
- **F3b inline model switcher SHIPPED** to branch `shamus/f3b-inline-model-switcher-2026-05-29` (commit `2c1d790`) with your locked decisions baked in.
  Independently re-verified by Morgan on the branch: **typecheck 0 errors · 332/332 tests pass (20 files, 8 new F3b tests), zero failures.**
  ⚠️ **Lint caveat:** `npm run lint` exits 0 but prints a **pre-existing ESLint config crash** (FlatCompat circular reference in `@eslint/eslintrc`) — this is infrastructure, not F3b code (both Shamus and Gary independently flagged it; documented in Gary's 2026-05-28 ESLint report). It predates this sprint and affects all branches. Worth a dedicated fix next cycle.
- 16 new `qa-reports/` deliverables across the 3 projects.
- 3 net-new code branches (F3b, Gary typing cleanup, Casey README).
- An execution incident was caught + recovered cleanly (see "Process note").

### Locked decisions implemented (F3b)
| Decision | Choice | Status |
|---|---|---|
| Model picker placement | **Inline in run bar** | ✅ built |
| ⌘↵ with unfilled variables | **Block + show warning** | ✅ built + tested |
| Model persistence | **Per-prompt (localStorage)** | ✅ built + tested |
| F-usage token display | **Both panels** | already on `feat/f-usage-token-display-2026-05-29` |

---

## DECISIONS FOR SKY

### 1. Merge authority — the real bottleneck (you alone merge `main`)
PL now has **~13 verified branches** awaiting your merge. Rory's full audit: `qa-reports/2026-05-29_Rory_MergeOrder_Audit.md`. Recommended order (honors stack deps):
1. `steve/auto-2026-05-29-security-hardening`
2. `qa/auto-2026-05-29-gary-clean-sweep`
3. `ci/eslint-setup-2026-05-29` *(prereq for #4)*
4. `fix/ratelimit-retry-disabled-2026-05-29` *(stacked on #3)*
5. `feat/teal-reskin-2026-05-29` *(prereq for #6)*
6. `a11y/header-focus-teal-2026-05-29` *(stacked on #5)*
7. `feat/f3acd-run-ux-2026-05-29` *(prereq for F3b)*
8. **`shamus/f3b-inline-model-switcher-2026-05-29`** *(new — stacked on #7)*
9. `feat/f-usage-token-display-2026-05-29`
10. `feat/f6-markdown-polish-2026-05-29`
11. `gary/ts-expect-error-cleanup-2026-05-29` *(new — cleaned 34 directives across 9 test files; typecheck:test 4→0 errors; 324 tests pass)*
12. `ci/cleanup-finder-dupes-2026-05-29`
13. `docs/features-update-2026-05-29`
⚠️ Conflict hotspot: `PromptDetail.tsx` is touched by f3acd → f-usage → f3b. Merge in that order to minimize conflicts.

**PM:** `feat/pacman-premium-polish-2026-05-29` (Design Compiler PASS) + 8 older branches ready (incl. `community/auto-2026-05-25-casey-readme` — README already polished, no new branch needed). Rory confirms CI workflow branch is safe to merge.

### 2. F5 Export/Import — ready to build next
Full spec (`Quinn_F5_ExportImport_Spec.md`) + schema (Dana) + security review (Steve) + a11y pre-spec (Alex) + user-flow research (Riley) + user docs (Will) all written. **One open call:** import default = **merge vs replace**. Recommendation across Quinn/Riley/Steve: **merge-by-default** (safer, industry-standard, avoids data-loss anxiety). Confirm and Shamus can build F5 next sprint.

### 3. Pac-Man contrast — likely a no-op
Dani verified: after the Round-2 dark gradient stops, **all four answer cards already pass WCAG AA** (worst case `dot.s` = 7.10:1). The open `fix/answer-card-contrast-2026-05-29` branch may be **redundant** — review before merging. Report: PM `qa-reports/2026-05-29_Dani_AnswerCard_Contrast.md`.

### 4. Claude Corp governance (all PROPOSALS — your call, `~/.claude/**` untouched)
- **Grant expiry (C1):** Rory + memory agree Rory's merge grant runs through **2026-06-30** (the 2026-05-30 figure was stale) — no conflict, no action needed.
- **Version banner:** CLAUDE.md still says AGENT_OS v1.11; true deployed is **v1.16**. Will drafted corrected banner text — apply at your discretion. ⚠️ Do **not** blind `cp -R` master→deployed (would delete the deployed Opus rule).
- **Relay sanitization (B2):** Will drafted a checklist for Morgan to treat qa-report bodies as untrusted data before relaying. Proposal only.
- **STATE-WINS authority (B3):** Quinn drafted the spec. Proposal only.
- Jordan: CC governance files are privacy-clean; PL F-usage storage is LOW risk (no PII; API key plaintext in localStorage is the known browser trade-off).

---

## Deliverables by project

### Prompt Library (`qa-reports/`)
Shamus_F3b_Build · Gary_TsExpectError_Cleanup · Quinn_F5_ExportImport_Spec · Rory_MergeOrder_Audit · Will_F5_UserFacingDocs · Dani_APIKey_Banner · Jordan_Privacy_Review · Riley_F-r2_RateLimitEdgeCaseResearch · Riley_F5_ExportImportUserFlowResearch · Casey_Onboarding
**Branches:** `shamus/f3b-inline-model-switcher-2026-05-29`, `gary/ts-expect-error-cleanup-2026-05-29`

### Pac-Man (`qa-reports/`)
Dani_AnswerCard_Contrast · Rory_CI_Workflow_Review · Riley_PacManFlashcardLearnerFrictionResearch
**Branch:** none new — Casey confirmed README already polished on `community/auto-2026-05-25-casey-readme` (no work needed).
**Notable:** Riley proposes a Learning-Mode vs Arcade-Mode split + hint escalation to improve retention (next-cycle backlog).

### Claude Corp (`qa-reports/`) — all proposals
Will_MorganRelaySanitization_VersionBanner · Quinn_B3_StateWinsAuthority · Rory_GrantExpiry_Reconcile · Jordan_GovPrivacy_Check

---

## Process note (transparency)
The first dispatch launched 13 role agents as parallel background tasks in **shared git working trees** — they collided (one refused to start on a "dirty tree" it didn't create; Shamus was mid-edit in `PromptDetail.tsx` when stopped). Sky flagged it and redirected to a **Workflow**. Recovery: all 7 in-flight agents stopped, no data lost (Pac-Man `index.html` confirmed intact), Shamus's partial edit parked in `git stash` (`stash@{0}`, now superseded by the clean F3b build — safe to drop). Re-run as a single workflow: **6 report-writers in parallel** (file-only, no git) + **3 code agents sequential** (one git-toucher at a time). Zero collisions second time.

**Cleanup for Sky:** `git stash drop stash@{0}` in PL once you've confirmed F3b (the parked partial is obsolete).

---

## Next-sprint backlog (queued, not started)
- **Fix the pre-existing ESLint config crash** (FlatCompat circular ref) — blocks real lint signal on every branch
- Shamus: build **F5 Export/Import** (spec-ready, pending your merge-vs-replace call)
- Shamus: F-r2 countdown humanization (>60s → "a few minutes") — Riley flagged spec/impl gap
- PM: Learning-Mode split (Riley) + Dani premium-polish follow-on
- CC: apply approved governance proposals (version banner, relay sanitization)

## Pending Dani gate on F3b
Shamus's F3b report requests a Design Compiler pass (Dani) before UI is marked fully DONE — not run this sprint (compiler needs Dani's judgment; deferred to next cycle alongside merge).
