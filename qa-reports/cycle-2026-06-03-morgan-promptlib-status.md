# Morgan — Prompt Library Tool: Status Review + Phased Plan
_Direct /morgan invocation by Sky · 2026-06-03 · ACTIVE mode · in-session delivery (no iMessage per Sky override 2026-05-28)_

```yaml
model_tier: opus (Sky-initiated, interactive)
coherence_score: 0.55
state_consistency: fail        # PROJECT_STATE claimed "main untouched / 11 ready"; git shows main +4 (incl. headline teal), 2 no-op branches, 2 conflicting branches, governance files uncommitted
duplicate_work_detected: yes   # identical 10MB import cap on Steve PR#3 AND F5 branch; Header.tsx a11y three-way divergence
drift_risk: high               # main advanced under the merge queue; 05-29 plan stale; ~40 qa-reports + state files untracked; local main +4 unpushed
delta_vs: 2026-05-29 (qa-reports/new-window-2026-05-29.md)
```

> **SCOPE NOTE:** Per PROJECT_REGISTRY, this project reverted to **ON HOLD** after the 14-hr push window (2026-05-29 noon). This review + plan was directly requested by Sky (intent > registry). It is **read-only analysis + PM state refresh** — no code touched, no merges, no agents dispatched. The phased plan is a **proposal for Sky to greenlight**.

---

## §0 VERIFIED GROUND TRUTH (git, not prose)

- **Last activity:** 2026-05-29 11:35. Dormant 5 days (team on AccessMap + Portfolio).
- **Current branch:** `shamus/f5-export-import-2026-05-29` (NOT main).
- **main HEAD:** `8b89f96` (2026-05-29 09:34) — **`main` is NOT untouched.** A background cycle landed 4 commits past the release tag `1b97da6`:
  - `7b39990` teal palette replace ← **the headline re-skin is already on main**
  - `e32cc89` F6 markdown polish ← already on main
  - `65e6e39` finder-dupe cleanup ← already on main
  - `8b89f96` header a11y focus rings ← already on main
- **local main is +4 ahead of `origin/main`** → the entire 05-29 push (incl. teal) is **local-only, unpushed, NOT deployed.** origin/main (the GH-Pages source) is stale.
- **Live verification on current F5 branch:** `tsc --noEmit` → **exit 0 (green)**; `vitest run` → **328/328 pass, 19 files, exit 0** (one benign `act()` warning). The freshest state compiles and tests clean.

### Branch reconciliation (ahead/behind current main)
| Branch | ahead | behind | Real status |
|---|---|---|---|
| `shamus/f5-export-import` (F5, current) | 4 | **0** | ✅ Cleanest. Fully built, current-with-main, green. Best merge candidate. |
| `feat/f-usage-token-display` | 6 | 1 | Real work. Rebase onto main first. |
| `ci/eslint-setup` | 11 | 4 | Real (large). Rebase. Blocks ratelimit. |
| `fix/ratelimit-retry-disabled` | 10 | 4 | Real. STACKED on eslint. Rebase. |
| `feat/f3acd-run-ux` | 3 | 2 | Real. Rebase. |
| `steve/auto-…-security-hardening` (PR#3) | 1 | 4 | Real (1 commit). **DUP with F5 10MB cap.** Rebase. |
| `qa/auto-…-gary-clean-sweep` | 1 | 4 | Real (1 commit). Rebase. |
| `docs/features-update` | 4 | 2 | Docs only. Rebase. |
| `feat/teal-reskin` | 2 | 3 | ⚠️ Teal base already on main. Unique = Alex WCAG follow-up fixes. **CONFLICTS** (Header.tsx, Markdown.tsx). |
| `a11y/header-focus-teal` | 3 | 3 | ⚠️ Header a11y already on main (different impl). 3-way Header.tsx divergence. **CONFLICTS.** |
| `feat/f6-markdown-polish` | **0** | 3 | ❌ NO-OP — already on main. Delete. |
| `ci/cleanup-finder-dupes` | **0** | 2 | ❌ NO-OP — already on main. Delete. |
| `a11y/auto-2026-05-25-alex-header-focus-visible` | — | — | ❌ Superseded (pre-teal). Delete. |

**Headline finding:** main advanced via a background cycle *after* the 05-29 "merge these 11 in order" plan was written. That plan is now **invalid** — 2 items are no-ops, 2 conflict, and **every remaining branch except F5 is behind main and must be rebased + re-verified before merge.**

---

## §1 Dependency Graph

nodes:
- morgan/reconcile#audit (Morgan, verify branch-vs-main) — DONE this cycle
- rory/reconcile#corrected-merge-order (Rory, produce rebased merge order)
- rory/cleanup#delete-noop-branches (Rory, delete f6 + finder-dupes + old-a11y)
- morgan/commit#governance-files (Morgan, commit untracked state + ~40 qa-reports)
- sky/merge#f5 (Sky, merge F5 export/import — cleanest)
- sky/merge#independent-features (Sky, merge eslint→ratelimit, f3acd, f-usage, gary-sweep, steve-pr3, docs — each rebased)
- steve/dedup#10mb-cap (Steve, resolve duplicate import cap before steve-pr3 OR fold into F5)
- alex/reconcile#teal-a11y-delta (Alex, re-apply only the WCAG-blocker delta from teal/header branches onto main)
- sky/decide#6-open-questions (Sky, answer F3b×3 + chip-contrast + f-usage-cost + f-usage-panels)
- shamus/build#f3b (Shamus, inline model switcher)
- gary/cleanup#14-lint-warnings (Gary, fix deferred @ts-expect-error)
- rory/ci#lint-gate (Rory, add lint to CI after warnings fixed)
- sky/deploy#push-origin (Sky, push local main +4 → origin → GH-Pages)

edges:
- rory/reconcile#corrected-merge-order → morgan/reconcile#audit (gate: verified branch table)
- sky/merge#independent-features → rory/reconcile#corrected-merge-order (gate: rebased + green)
- sky/merge#independent-features → steve/dedup#10mb-cap (gate: no double-apply)
- sky/merge#independent-features → sky/merge#f5 (order: F5 first, it's behind=0)
- fix/ratelimit-retry → ci/eslint-setup (gate: stacked, eslint merges first)
- alex/reconcile#teal-a11y-delta → sky/merge#f5 (gate: avoid re-touching Header.tsx mid-conflict)
- shamus/build#f3b → sky/decide#6-open-questions (gate: 3 F3b answers)
- rory/ci#lint-gate → gary/cleanup#14-lint-warnings (gate: 0 warnings before gate)
- sky/deploy#push-origin → sky/merge#f5 + sky/merge#independent-features (gate: main reflects intended release)

---

## §2 Reason for Ordering

- **Reconcile before merge** — `git rev-list` proves main advanced +4 under the 05-29 queue; merging stale branches risks reverting main's bg-cycle teal/a11y or conflicting. (LEARNINGS:2026-05-23 — "Stacking onto previous branches… Sky can still merge any subset" assumed main *didn't* move; it did. Reinforced by AccessMap memory: *concurrent git churn — parallel agents overwrite the shared tree; verify branch-vs-main with `git cherry`, not prose*.)
- **F5 first** — behind=0, typecheck+tests green now; lowest-risk highest-value merge. (Verified §0.)
- **Dedup 10MB cap before Steve PR#3** — identical `MAX_IMPORT_BYTES` block confirmed in both `steve/…-security-hardening` and F5 `b0ff4c6` on `SettingsModal.tsx`. Merging both = double code or conflict. (Const. 10 cross-role conflict; §5.)
- **Teal/header = delta-only re-apply, not branch merge** — teal palette + header a11y already on main via bg-cycle; the branches' unique commits are *follow-up WCAG fixes*. Re-apply the delta, don't re-merge the base. (DECISIONS_LOG [PALETTE-TEAL-ANCHOR]; `merge-tree` showed Header.tsx/Markdown.tsx conflict.)
- **F3b after Sky's 3 answers** — Quinn spec gates build. (DECISIONS_LOG [F3B-BLOCKED-SKY].)
- **Lint gate after warnings fixed** — 14 deferred `@ts-expect-error` will fail a lint CI gate if wired first. (new-window §6 risk.)
- **Commit governance files** — PROJECT_STATE/TASK_GRAPH/DECISIONS_LOG + ~40 qa-reports are untracked; the project's memory lives only in the working tree. (AccessMap memory: *commit your own files immediately, never `git add -A`.*)
- **Jordan check (Const. 7.6):** ran 6 triggers across all pending features (F5 export/import, F-usage, F3a/b/c/d, teal). **No trigger fires** — no location, no disability data, no PII beyond the already-existing local API key, no backend, no new external send. F5 export *deliberately excludes* `apiKey`/`model`/`maxTokens`. **Jordan not required as a gate** (Const. 4.5.4). Privacy sensitivity stays 🟡 MED (local API key only).

---

## §3 Blocked Nodes

- `{node: shamus/build#f3b, why: 3 F3b placement/⌘↵/persistence questions unanswered, unblock: Sky answers Q1–Q3 below, type: DECISION_FOR_SKY}`
- `{node: sky/merge#independent-features, why: branches stale vs main (1–4 behind) + 10MB-cap duplication, unblock: Rory rebases + Steve dedups, type: BLOCKER}`
- `{node: alex/reconcile#teal-a11y-delta, why: Header.tsx/Markdown.tsx conflict between branch a11y fixes and main's bg-cycle a11y, unblock: Alex re-applies delta onto current main, type: BLOCKER}`
- `{node: sky/deploy#push-origin, why: local main +4 unpushed; teal/F6/a11y not live, unblock: Sky decides to push origin (or not), type: DECISION_FOR_SKY}`
- `{node: project-resume, why: registry has project ON HOLD post-push-window, unblock: Sky greenlights resuming Prompt Library work, type: DECISION_FOR_SKY}`

---

## §4 Checkpoint References

- `{name: F5 export/import built+green, role: Shamus, artifact: branch:shamus/f5-export-import-2026-05-29 (4 commits, behind=0), qa-report: 2026-05-29_Shamus_F5_Build.md}`
- `{name: main bg-cycle (teal+F6+finder+header), role: background, artifact: commit:8b89f96 (range 1b97da6..main), qa-report: background-2026-05-29-*.md}`
- `{name: ESLint v9 + ratelimit stack, role: Gary/Peter, artifact: branch:ci/eslint-setup-2026-05-29 (+11) → fix/ratelimit-retry-disabled (+10), qa-report: 2026-05-28_Gary_ESLint_Prettier_Setup.md}`
- `{name: F-usage token display, role: Shamus, artifact: branch:feat/f-usage-token-display-2026-05-29 (+6), qa-report: 2026-05-29_Steve_FUsage_Review.md}`
- `{name: typecheck+tests green (current), role: Morgan-verify, artifact: F5 branch tsc=0 / vitest 328pass, qa-report: this file §0}`

---

## §5 Duplication Report

- `{agents: [Steve (PR#3), Shamus (F5)], overlap: identical MAX_IMPORT_BYTES=10*1024*1024 import cap + same error string in SettingsModal.tsx, resolution: F5 (newer, behind=0) keeps it; drop/rebase Steve's cap so it doesn't double-apply — Steve PR#3 then carries only SSE-leak + XSS + maxLength}`
- `{agents: [background bg-cycle (on main), teal-reskin branch, header-focus-teal branch], overlap: Header.tsx a11y focus rings / aria-labels applied 3 ways, resolution: main's version is canonical; Alex re-applies only the unique WCAG-blocker delta from the branches; delete the two branches after}`

---

## §7 Execution Plan Summary

- **Phases:** 5 (Phase 0 reconcile → 1 clean merges → 2 teal/a11y delta → 3 unblock+build F3b → 4 hygiene/deploy/backlog).
- **Classification:** total 14 nodes · READY 3 (rory reconcile, rory cleanup, morgan commit) · LOCKED 6 (merges, build, lint gate — await Phase-0 rebase) · BLOCKED 5 (§3 — 4 Sky decisions + 1 resume greenlight).
- **Critical path:** rory/reconcile → steve/dedup → sky/merge#f5 → sky/merge#independent → alex/teal-delta → sky/decide → shamus/f3b.
- **Parallelizable:** {rory/cleanup#delete-noop, morgan/commit#governance} independent of merge path; {gary/14-lint, docs} anytime.
- **`acyclic: true`** confirmed.
- BACKGROUND constraints: N/A (ACTIVE). All merges & push remain **Sky-only** (Const. Art. 1).
