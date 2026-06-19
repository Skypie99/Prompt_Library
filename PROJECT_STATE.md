# PROJECT_STATE — prompt-library-tool
_Last compiled: 2026-06-18 by /morgan (AA-fixes + housekeeping closeout). Supersedes 2026-06-18 Phase-4 closeout._

## Current Status
**Phases 0–4 + WCAG AA audit fixes ALL SHIPPED + LIVE** on GitHub Pages. **Live main = `7b3f96e`** (rollback `27a8f76`). Brand = **desert-parchment (light) + neon-terminal (dark)**. Host = **GitHub Pages**. URL = **`prompts.skypistudio.com`**.

AA fixes (1.4.3 contrast, 2.5.3 label-in-name, 2.5.8 24px touch targets incl. RunHistory `14811d1`) merged `b1f011c`, Sky-authorized; re-verified on live state — typecheck clean / lint 0 errors / 378 tests / build exit 0. Housekeeping 2026-06-18: branches 75→10, `origin` URL typo fixed.

**Open (Sky-decisions only, nothing blocked):** (1) live-device a11y check (`qa-reports/2026-06-18_Sky_DeviceCheck_Checklist.md`); (2) 9 hand-authored unmerged branches keep/drop; (3) adopt Art.17 gate-tightening (`qa-reports/2026-06-18_Rory_Housekeeping_Final.md`).

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
