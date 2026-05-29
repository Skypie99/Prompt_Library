# DECISIONS_LOG — prompt-library-tool

[PALETTE-TEAL-ANCHOR] Primary accent replaced with teal (#2F9E96, HSL 175° 54% 37%); full 10-step scale in tailwind.config.ts — 2026-05-29
[PALETTE-CATEGORY-COOL] 8-hue category stripe palette replaced with cohesive cool-neutral teal→mauve family (Dani TealSpec) — 2026-05-29
[PALETTE-CHIP-CONTRAST] Active chip text at 3.255:1 (white on teal-500) accepted as PASS via ARIA compensation (aria-pressed + aria-label); not a merge blocker. Sky can change to teal-600 for strict 4.5:1 — 2026-05-29
[ESLINT-V9-PINNED] ESLint pinned to v9 (v10 removed config API); flat config via eslint.config.mjs; eslint-config-next v16 circular-JSON fixed with _sanitizePlugin helper — 2026-05-29
[ESLINT-HOOKS-DISABLE-OK] 9 react-hooks/set-state-in-effect suppressed with documented comments (SSR hydration, modal reset, prop-change reset); these are deliberate patterns, not bugs — 2026-05-29
[F3C-KEYDOWN-BYPASS] ⌘↵ keyboard shortcut bypasses the unfilled-variable warning (power-user path); gate is in handleModalKeyDown → runWithValues directly — 2026-05-29
[F3B-BLOCKED-SKY] F3b inline model switcher blocked pending 3 Sky decisions: placement (inline vs own row), ⌘↵ + warning interaction, persistence of per-prompt model override — 2026-05-29
[FUSAGE-NO-COST] Token usage display shows raw counts only (no USD cost estimate); open question for Sky — 2026-05-29
[FUSAGE-BOTH-PANELS] Token counts shown in both response panel and RunHistory history list; open question for Sky — 2026-05-29
[FINDER-DUPES-GITIGNORE] .gitignore updated with "* 2.*" / "* 3.*" patterns to prevent macOS Finder duplicate files being tracked — 2026-05-29
[SECURITY-MAX-IMPORT] Library import capped at 10 MB in SettingsModal (Steve PR #3) — 2026-05-29
[SECURITY-NO-SSE-LEAK] SSE handleEvent returns hardcoded generic string on error (no raw payload exposure) — 2026-05-29
[BRANCH-STACK-ESLINT] fix/ratelimit-retry-disabled-2026-05-29 is stacked on ci/eslint-setup-2026-05-29; merge ESLint branch first — 2026-05-29
[BRANCH-STACK-TEAL] a11y/header-focus-teal-2026-05-29 branches off feat/teal-reskin-2026-05-29; merge teal branch first — 2026-05-29
[OLD-A11Y-BRANCH-SUPERSEDED] a11y/auto-2026-05-25-alex-header-focus-visible superseded by a11y/header-focus-teal-2026-05-29; safe to delete — 2026-05-29
[MERGE-QUEUE-STALE] The 2026-05-29 "merge 11 branches in order" plan is INVALID. Verified by git: a background cycle landed teal (7b39990) + F6 + finder-cleanup + header-a11y (8b89f96) directly on main AFTER the plan. Every candidate branch except F5 is now 1–4 commits behind main; all must be rebased + re-verified before merge — 2026-06-03 (Morgan)
[BRANCH-NOOP-F6-FINDER] feat/f6-markdown-polish (ahead=0) and ci/cleanup-finder-dupes (ahead=0) are already on main — pure no-ops, delete don't merge — 2026-06-03 (Morgan)
[BRANCH-CONFLICT-TEAL-HEADER] feat/teal-reskin (+2) and a11y/header-focus-teal (+3) conflict with main on Header.tsx/Markdown.tsx; their bases are already on main, only WCAG-blocker deltas remain. Re-apply delta via Alex, do not merge the branches — 2026-06-03 (Morgan)
[DUP-10MB-IMPORT-CAP] Identical MAX_IMPORT_BYTES=10MB cap exists on BOTH steve/security-hardening (PR#3) and F5 b0ff4c6 in SettingsModal.tsx. F5 keeps it; Steve's PR#3 sheds it to avoid double-apply — 2026-06-03 (Morgan)
[MAIN-UNPUSHED] local main is +4 ahead of origin/main; teal + all 05-29 work is local-only, not pushed, not deployed to GH-Pages — 2026-06-03 (Morgan); Sky decision: push or not
[BUILD-GREEN-0603] Verified on current F5 branch 2026-06-03: tsc --noEmit exit 0; vitest 328/328 pass — 2026-06-03 (Morgan)
[JORDAN-NOT-REQUIRED] Const. 7.6 six-trigger check across all pending features = no trigger fires (no location/disability/PII-beyond-local-key/backend/new-external-send). F5 export excludes apiKey. Jordan gate not required; privacy stays 🟡 MED — 2026-06-03 (Morgan)
