# PROJECT_STATE — prompt-library-tool
_Last compiled: 2026-06-18 by /morgan (Phase 4 closeout). Supersedes 2026-06-03 rebrand-ship state._

## Current Status
**Phase 2 SHIPPED + LIVE** on GitHub Pages (2026-06-17, merge `b48ec47`). Brand = **desert-parchment (light) + neon-terminal (dark)**. Host = **GitHub Pages**. URL = **`prompts.skypistudio.com`**.

Phase 3 (WCAG 2.2 AA) + Phase 4 (lint CI, CNAME-in-artifact, P3 fixes B1/B2/B3) on `release/phase3-phase4`, pending Sky device-check + gated ship.

## What Shipped (Phase 2 — 2026-06-17, merge `b48ec47`)

- **Danger/error color system:** `danger-100/600/700` tokens wired into all error states
- **F3b inline model switcher:** per-prompt model select (inline in run bar), ⌘↵ runs selected model, per-prompt persistence via `promptlib:model:<id>`
- **Default model:** `claude-opus-4-8`
- **Model refresh:** updated model list to current Anthropic lineup
- **Storage-failure banner (B2):** surfaces `saveSettings` write failures as top-of-page banner
- **Verify:** tsc: exit 0 · vitest: 376/376 tests

## Phase 3 — WCAG 2.2 AA (on `release/phase3-phase4`)

Alex audit — 14 fixes, 19 pass, 7 device checks pending Sky:
- Focus rings upgraded (teal-500, 24px min-height on F3b select)
- Skip-to-content link, aria-live regions, contrast fixes
- 7 behavior checks (VoiceOver, iOS Safari native select, Dynamic Type) require Sky's device

## Phase 4 — Hardening (on `release/phase3-phase4`)

- **CNAME-in-artifact:** `public/CNAME` → `out/CNAME` emitted at build (`prompts.skypistudio.com`)
- **Lint toolchain:** ESLint + Prettier installed; 0 errors / 6 warnings; `lint` wired into CI as blocking job
- **B1 fix:** empty-library command palette copy corrected
- **B2 fix:** `saveSettings` write failures surfaced via banner
- **B3 fix:** storage-failure banner copy covers private-browsing mode (commit `69c980a`)

## Ship Gate (Art. 17 — pending)

1. **Sky device checks** — 7-item iOS/VoiceOver checklist + E1/E2 visual sign-off
2. **Record rollback:** `b48ec47` (Phase 2 tip = last known-good main)
3. **Rory merges** `release/phase3-phase4` → main + pushes → GitHub Pages deploys

## CNAME / Hosting

- **Host:** GitHub Pages (static export via `next export`)
- **Domain:** `prompts.skypistudio.com`
- **CNAME file:** `public/CNAME` committed; `out/CNAME` emitted at build
- **Old Vercel config:** removed (basePath/assetPrefix gone; `vercel.json` not present)
