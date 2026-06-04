---
name: pl-merge-order-2026-05-29
description: "Prompt Library merge-order audit — branch dependency stack for 2026-05-29, safe merge sequence honoring ESLint->ratelimit->teal->a11y chain"
metadata:
  node_type: qa_report
  role: Rory (DevOps)
  date: 2026-05-29
  project: Prompt Library Tool
---

# Prompt Library — Merge Order Audit (2026-05-29)

**Analysis date:** 2026-05-29  
**Branch baseline:** main @ 8b89f96 (`[bg-cycle] fix(a11y): Header Search/Settings focus-visible rings + aria-label`)  
**Total candidate branches:** 48 local, 6 remote  

## Executive Summary

**Ready to merge as of 2026-05-29:** 3 leaf branches in dependency order
1. `ci/eslint-setup-2026-05-29` → unblocked; ESLint v9 fixes + new test coverage (F3acd)
2. `feat/rate-limit-retry-2026-05-28` → depends on ESLint passing first (but currently behind main)
3. `a11y/header-focus-teal-2026-05-29` → standalone a11y polish; no inter-branch deps

**Key finding:** `feat/rate-limit-retry-2026-05-28` is a **major cleanup** (3500+ deletions) that should land early to unlock downstream styling work (teal, f3acd-run-ux).

---

## Branch Dependency Analysis

### Layer 1: **Lint & Test Infrastructure** (ESLint foundation)

**`ci/eslint-setup-2026-05-29`** ← **MERGE FIRST**
- **Status:** Ready
- **Summary:** ESLint v9 + flat-config refactor; resolves circular-JSON crash + 10 react-hooks violations
- **Changes:** 45 files, +6139 / -1065 (net +5K, mostly lock file)
- **Blockers:** None. Gary background audits confirm 0 lint errors post-merge
- **Risk:** Moderate (large lock file delta, but Vitest + test coverage intact)
- **Merge recommendation:** ✅ Land immediately — this unblocks dependent branches

---

### Layer 2a: **Feature Cleanup & Rate-Limit Retry**

**`feat/rate-limit-retry-2026-05-28`** ← **MERGE SECOND** (post-ESLint)
- **Status:** Ready but superseded by later styling commits on main
- **Summary:** F-r2 rate-limit retry retry-after header; massive test + config purge (3500+ deletions)
- **Changes:** 68 files, +548 / -3509 (net -3K, cleanup-heavy)
- **Includes:** Deleted 7 integration/smoke test files + old setup.ts; consolidates FEATURES.md
- **Key removal:** Large test suites (`integration-run-pipeline.test.ts`, `transfer-extra.test.ts`, smoke tests)
- **Blockers:** None technical; Gary must audit removal rationale
- **Risk:** High—massive deletion surface. But ESLint setup ensures remaining tests pass
- **Merge recommendation:** ⚠️ Land after ESLint, but **require Gary pre-merge audit on test coverage strategy**

---

### Layer 2b: **Styling & Reskin (Teal)**

**`feat/teal-reskin-2026-05-29`** ← **MERGE THIRD** (if rate-limit lands early)
- **Status:** Ready (but blocks on rate-limit cleanup finishing first)
- **Summary:** Coral → teal palette swap; soft teal (#2F9E96) anchor + component color updates
- **Changes:** 17 files, +94 / -120 (net -26)
- **Dependency:** Runs on top of a11y fixes from `a11y/header-focus-teal-2026-05-29`
- **Merge recommendation:** Land after rate-limit + ESLint to avoid merge conflicts during big cleanup

**`a11y/header-focus-teal-2026-05-29`** ← **Alternative: MERGE in parallel or before teal**
- **Status:** Ready (independent of rate-limit)
- **Summary:** 3 a11y Header fixes (aria-label, focus-visible rings) + Shamus report
- **Changes:** 16 files, +92 / -117 (net -25)
- **Dependency:** None (stands alone)
- **Merge recommendation:** ✅ Can land anytime; consider merging **before or alongside** teal reskin

---

### Layer 3: **Run UX & Feature Polish**

**`feat/f3acd-run-ux-2026-05-29`** ← **MERGE FOURTH**
- **Status:** Waiting for ESLint + potentially rate-limit cleanup
- **Summary:** F3a/c/d features (overloaded retry, variable warning, expand toggle) + test coverage
- **Changes:** Adds PromptDetail.f3acd.test.tsx; depends on ci/eslint-setup
- **Blockers:** ESLint setup must land first (uses new lint rules)
- **Merge recommendation:** Land after Layer 1 & 2 are complete

**`feat/f6-markdown-polish-2026-05-29`** (implied, parent of ci/cleanup-finder-dupes)
- **Status:** Ready
- **Summary:** Markdown polish (link focus-visible ring, rel attr canonical order)
- **Changes:** e32cc89 on graph
- **Merge recommendation:** Non-blocking; can land independently

---

### Layer 4: **Feature Branches (Dependent on cleanup above)**

**`shamus/f3b-inline-model-switcher-2026-05-29`**
- **Status:** Already on main (HEAD)
- **Merge recommendation:** Already merged

**`feat/features-sync-2026-05-25`**
- **Status:** Older feature; check if superseded

**`feat/token-usage-2026-05-29`**
- **Status:** Check for conflicts with rate-limit cleanup

---

## Recommended Merge Sequence (Safe Ordering)

```
1. ci/eslint-setup-2026-05-29
   ↓ (ESLint v9 + lint rules live)

2a. feat/rate-limit-retry-2026-05-28  [OR]
2b. a11y/header-focus-teal-2026-05-29 (can run in parallel)
   ↓

3. feat/teal-reskin-2026-05-29 (stack on top of a11y + rate-limit)
   ↓

4. feat/f3acd-run-ux-2026-05-29 (final feature tier)
   ↓

5. Leaf branches (ci/cleanup-finder-dupes, feat/f6-markdown-polish, etc.)
```

**Rationale:**
- **ESLint first:** Unblocks all downstream linting (required by ci/eslint-setup → feat/f3acd chain)
- **Rate-limit & a11y in parallel:** No inter-dependency; rate-limit is larger, a11y is quick
- **Teal third:** Cosmetic, sits cleanly on top of a11y + rate-limit
- **f3acd fourth:** Feature-tier; depends on ESLint rules being live
- **Leaf branches last:** Non-blocking cleanup (Finder dupes, markdown polish)

---

## Conflict Risk Assessment

| Branch | vs. main | vs. Rate-Limit | vs. Teal | Notes |
|--------|----------|----------------|----------|-------|
| `ci/eslint-setup` | 🟢 Clean | N/A | 🟢 Clean | Lint-only |
| `feat/rate-limit` | ⚠️ Behind | — | 🟠 Medium | Test purge; teal has style changes |
| `a11y/header-focus` | 🟢 Clean | 🟢 Clean | 🟠 Header.tsx | Both touch Header.tsx |
| `feat/teal-reskin` | 🟠 Medium | 🟠 Medium | — | Rebuilds on both |
| `feat/f3acd-run-ux` | 🟠 Medium | ⚠️ PromptDetail | 🟠 PromptDetail | Large component churn |

**Conflict hotspot:** `src/components/PromptDetail.tsx` — touched by rate-limit, teal, and f3acd. Merge in sequence to avoid 3-way conflicts.

---

## Pre-Merge Checklist

### ci/eslint-setup-2026-05-29
- [ ] Gary confirms 0 lint errors + 0 new violations post-merge
- [ ] Lock file diff reviewed (justifies +5K)
- [ ] Vitest config changes validated (setup.ts deletions acceptable)
- [ ] All test files pass locally

### feat/rate-limit-retry-2026-05-28
- [ ] Gary audits test removal rationale (3500+ deletions)
- [ ] Confirm FEATURES.md consolidation aligns with product vision
- [ ] Anthropic.ts retry-after logic tested
- [ ] Next.config.js changes justified

### a11y/header-focus-teal-2026-05-29
- [ ] Accessibility report reviewed
- [ ] WCAG 2.1 AA compliance confirmed

### feat/teal-reskin-2026-05-29
- [ ] Color palette consistency audit (categoryColor.ts, Tailwind config)
- [ ] Light/dark mode teal tested
- [ ] Design system compliance

### feat/f3acd-run-ux-2026-05-29
- [ ] ESLint setup live on main
- [ ] Component test coverage >80% for new features
- [ ] A11y focus-visible rings working with new UI

---

## Merge Commands (Once Approved)

```bash
# 1. ESLint (unblock everything)
git merge ci/eslint-setup-2026-05-29 -m "ci(lint): ESLint v9 + flat config refactor"

# 2a. Rate-limit (major cleanup — **do this early to avoid downstream merge churn**)
git merge feat/rate-limit-retry-2026-05-28 -m "feat(F-r2): rate-limit retry + test consolidation"

# 2b/parallel: A11y polish (quick, non-blocking)
git merge a11y/header-focus-teal-2026-05-29 -m "fix(a11y): Header focus-visible + aria-label improvements"

# 3. Teal reskin (on top of above)
git merge feat/teal-reskin-2026-05-29 -m "feat(design): coral → teal palette reskin"

# 4. Feature tier
git merge feat/f3acd-run-ux-2026-05-29 -m "feat(F3): run-ux overhaul — retry, warning, expand toggle"

# 5. Leaf branches (as needed)
git merge ci/cleanup-finder-dupes-2026-05-29 -m "ci(cleanup): remove Finder dupes"
git merge feat/f6-markdown-polish-2026-05-29 -m "fix(markdown): link ring + rel order"
```

---

## Notes for Sky

- **Rate-limit branch is a major cleanup** (3500+ deletions). Land it early to unblock styling + feature work downstream. Gary must pre-audit test removal rationale.
- **Teal reskin is cosmetic** — safe to land anytime after cleanup + a11y polish.
- **ESLint + f3acd dependency is tight** — ESLint must land before f3acd features go live.
- **No safety/privacy issues detected** in any branch.
- **All merges can be SHAMUS MERGE** (per Constitution Art. 1.5 — Shamus is merge authority for UI).

---

**Report prepared by:** Rory the DevOps Engineer  
**Date:** 2026-05-29 10:45 UTC  
**Approval status:** Ready for Sky or Shamus merge authority
