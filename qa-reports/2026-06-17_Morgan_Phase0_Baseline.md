# Phase 0 — Reconcile Reality (baseline)

**Author:** Morgan (read-only PM) · **Date:** 2026-06-17 · **Mode:** READ-ONLY (build + serve + fetch only; no code, no merge, no deploy).
**Feeds:** Phase 1 Critique. **Companion:** `2026-06-17_Morgan_FinishingPlan.md`.

## The one-paragraph baseline (what Phase 1 critiques against)

As of 2026-06-17 the live tool at **`https://prompts.skypistudio.com` is UP (HTTP 200), served from GitHub Pages** (response headers: `server: GitHub.com`, `x-github-request-id`, `via: 1.1 varnish`), and it is serving the **desert-parchment (light) + neon-terminal (dark)** brand — **not** the cyberpunk/Vercel reality that `PROJECT_STATE.md` still claims. The live HTML fingerprint matches a fresh local production build of current `main` exactly (`desert` 116 hits both sides, `cyberpunk/neon` 0 both sides, identical `<title>`), so the deployed site is current `main` (`f16e411`, 2026-06-05). This is the factual baseline the critique stands on.

## Evidence

**Git state**
- Branch `main`; HEAD `f16e411` ("fix(theme): persist explicit Dark/Light choice across reload", 2026-06-05).
- `main == origin/main` (rev-list 0/0); working tree clean (only the new qa-reports files untracked).

**Fresh build (`npm run build`)**
- Exit 0. Next.js 15.5.18. Compiled in ~8s; 5/5 static pages exported; `/` first-load JS 141 kB.
- ⚠️ Build log emitted: **"ESLint must be installed in order to run during builds: npm install --save-dev eslint."** The build *skips* lint rather than failing — so the missing-lint-toolchain gap is invisible unless you read the build log. Confirms the Phase-4 lint finding.

**Built artifact (`out/`)**
- 🔴 **No `out/CNAME`.** The custom domain survives only via the GitHub Pages repo setting; nothing copies the repo-root `CNAME` into the artifact. A repo-settings reset would silently drop the domain. (Phase-4 fix: add a `public/CNAME` or copy step so the artifact carries it.)
- Brand fingerprint: `desert` 116, `cream` 44, `teal` 61, `cyberpunk|neon` 0 → desert-parchment build confirmed.
- Self-hosted fonts: **16 woff2 bundled, 0 Google-Fonts references** → matches the "fully local" mandate; no third-party font network call.
- Asset paths root-absolute (`/_next/static/...`) → correct for domain-root custom-domain serving; would break under any project-subpath deploy. Consistent with `next.config.js` (`output:"export"`, no basePath, `trailingSlash:true`).
- Viewport `width=device-width, initial-scale=1, viewport-fit=cover` (notch-safe). No `theme-color` meta (minor polish candidate).

**Live vs local (served `out/` on :4321 vs `prompts.skypistudio.com`)**
- Local served build: HTTP 200, title "Prompt Library", `desert` 116.
- Live: HTTP 200, title "Prompt Library", `desert` 116, `cyberpunk/neon` 0.
- **Match.** Brand + title fingerprints identical → live is the current-`main` build.

## What this resolves / changes in the plan

- ✅ Live-health unknown → **RESOLVED**: site is up, GH Pages, current-main desert brand.
- ✅ Deploy-of-record ambiguity (Vercel vs GH Pages) → **RESOLVED**: it's **GitHub Pages**. Open decision #6 can be answered "GH Pages canonical, retire Vercel."
- 🔴 `out/CNAME` risk → confirmed real; carry to Phase 4.
- 🔴 Lint toolchain missing → confirmed at build time; carry to Phase 4 (discovery-first).
- 🟡 `PROJECT_STATE.md` brand/host claims → confirmed stale; doc reconciliation stays a Phase-2 Will task.

## Honesty note on commit-level proof

The brand/content **fingerprint** proves live == current-main *build*; a byte-for-byte commit stamp is not embedded in the static export, so "live == `f16e411`" rests on (a) the fingerprint match plus (b) `main == origin` and GH Pages auto-deploy-on-push. That is strong but inferential — flagged honestly rather than asserted as a hash match.

## Exit gate

- [x] Written, dated baseline naming live commit (inferred `f16e411`), brand (desert), host (GH Pages).
- [ ] Screenshot of served `out/` in both themes — **deferred**: a Chromium screenshot adds little over the fingerprint match, and the engine-sensitive visual truth (glow/blur/safe-area/no-flash) is Sky-on-Safari only. Captured as the first real-device checkpoint instead.

**Phase 0: COMPLETE.** Next: Phase 1 Critique (Dani) — needs Sky's §6 decisions to fully unblock the Phase-1→2 boundary.
