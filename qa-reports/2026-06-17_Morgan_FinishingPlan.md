# Prompt Library Tool — Finishing Plan (the map to "done")

**Author:** Morgan (read-only PM) · **Date:** 2026-06-17 · **Mode:** READ-ONLY planning — review/assess/sequence only, no code touched.
**Canonical home on approval:** `/Users/skypie/Documents/Claude/Projects/Prompt Library Tool/qa-reports/2026-06-17_Morgan_FinishingPlan.md` (per-project convention; plan-mode wrote it here first).
**Repo:** `/Users/skypie/Documents/Claude/Projects/Prompt Library Tool/` · **Live:** GitHub Pages, custom domain `prompts.skypistudio.com` (unverified since 2026-06-03).

---

## 1 · TL;DR — read this in 60 seconds

**Current state (3 lines):**
1. The tool is **feature-rich, polished, and green-on-paper** — Next.js 15 / React 19 static-export SPA; runs user prompts against the Anthropic API (user's own key in localStorage); search, favorites, run history, export/import, dark/light themes, mobile bottom-sheets. `main == origin/main`, clean tree, **367 tests pass, typecheck exit 0**.
2. It is **~90% built but ~0% *proven* finished** — a high-velocity burst (7 features + a full mobile-native overhaul + a WCAG 2.2 AA audit) all merged 2026-06-04/05, but **nothing has been verified live since 2026-06-03**: no post-merge QA report, no real-device check, no Design-Compiler sign-off on the rebrand.
3. The state docs **lie about reality** — `PROJECT_STATE.md` describes a deleted cyberpunk brand on Vercel; the truth is desert-parchment + neon-terminal on GitHub Pages. That drift is exactly the "trust the doc / looks-verified" failure this plan exists to kill.

**The finishing arc (sequential — each phase assumes the prior is merged):**
> **Phase 0 Reconcile reality** → **Phase 1 Critique** → **Phase 2 Polish (+ F3b build + model refresh)** → **Phase 3 Accessibility (WCAG 2.2 AA, hard floor)** → **Phase 4 QA sweep (built-output + real-Safari proof, lint gate)**

**Broken / unverified RIGHT NOW (loud):**
- 🔴 **No live proof.** Nobody has confirmed `prompts.skypistudio.com` serves the current build, in either theme, on a real device, since June 3.
- 🔴 **`out/` has no `CNAME` file.** The custom domain survives only via GH Pages repo settings; any reset silently breaks the domain. Not provable until Phase 4.
- 🔴 **ESLint/Prettier is not installed** — scripts/config reference 5 missing deps; `npm run lint` crashes. "Lint" is currently a broken command, not a passing gate.
- 🟠 **Error states are painted in brand-teal, not red.** A failed run and a successful accent look the same — a coherence *and* an accessibility-signaling bug.
- 🟠 **The streaming response has no `aria-live`** — a screen-reader user hears silence while Claude answers. Highest-value a11y fix.
- 🟠 **Default model `claude-opus-4-7` is a version behind 4.8.** The tool advertises a stale default.
- 🟡 `PROJECT_STATE.md` / `DECISIONS_LOG.md` / `LEARNINGS.md` ~2 weeks stale; a stray `PROJECT_STATE 2.md` duplicate sits in the repo root.

**Sky's scope decisions (captured 2026-06-17):** F3b inline model-switcher → **BUILD IT** · Model-ID refresh → **YES, Phase 2** · Lint toolchain → **YES, scoped with discovery first**.

**What "done" means (one line):** every Definition-of-Done item in §3 is **true AND proven** — built-output proof for objective items, real-Safari/iOS proof for engine-sensitive ones — with nothing marked done on a dev render or an agent's "looks verified."

---

## 2 · Current state, grounded (not from memory)

**What it IS today.** A fully client-side static SPA. Stack confirmed from `package.json` / `next.config.js`: Next.js 15.1.6 (App Router), React 19, TypeScript strict, Tailwind 3.4, Fuse.js 7, Vitest 2. `next.config.js`: `output: "export"`, **no basePath**, `trailingSlash: true`, `images.unoptimized`. Builds to `./out/`; `npm run preview` = `npx serve out`. Deploy is **GitHub Actions (`deploy.yml`) → GitHub Pages on push to `main`**, served at domain root via the `prompts.skypistudio.com` CNAME. (The registry's old "basePath `/prompt-library-tool/`" note is **stale** — there is no basePath.)

**Feature set (all merged to main):** browse seed + user prompts in a responsive grid; Fuse.js fuzzy search via ⌘K command palette; category/tag filters with live counts; fill `{{variables}}` and stream a Claude run; favorites; per-prompt run history (10 cap, 32 KB response cap); settings (API key, model picker, max-tokens); JSON export/import with preview; dark/light theme (OS-default + no-flash script); grid density; 5 sort modes; create/edit custom prompts; mobile bottom-sheets; keyboard shortcuts (⌘K, /, ?, Esc).

**How finished:** functionally complete for its stated purpose; a11y posture already strong (dialog semantics + focus trap in `ui/Sheet.tsx`, 45+ `focus-visible` rings, reduced-motion, 44px targets, a teal-500 contrast fix). Tests genuinely green (367/0, typecheck 0 — verified by running, not asserted). **The form-label gap from earlier notes is already fixed** (PromptForm + SettingsModal bind `htmlFor`/`id`) — verify, don't redo.

**What's broken/unverified:** see the TL;DR "loud" list. The through-line: the *code* is in good shape; the *proof* and the *truth-of-record* are not.

**Governance note (Const. Art. 17):** the Prompt Library is the one project with Rory's delegated merge+push grant, gated by the full check chain + built-output proof + recorded rollback. The June 4/5 merges predate any complete gate and have no recorded Design-Compiler or post-merge QA artifact — Phase 4 closes that gap so the gate can legitimately hold for the final ship.

---

## 3 · The finishing arc — Phase 0 → 4

> Engine-sensitive = anything touching glow/`boxShadow`, `backdrop-blur`, opacity layering, font-variation, `env(safe-area-inset-bottom)`, `prefers-*`, the no-flash theme script. These can pass in Chromium and fail in Safari/iOS (the Portfolio has shipped exactly these bugs). Objective = layout/spacing/markup/copy/contrast-token changes Chromium proves honestly **when run against the built `out/`**.

### PHASE 0 — Reconcile reality  *(small, read-only, 0 code chunks)*
- **Goal:** establish what is *actually* live so Phase 1 critiques the real artifact, not a deleted brand.
- **Scope (in):** `npm run build` → `npx serve out`; record the brand the artifact renders (both themes); fetch `prompts.skypistudio.com` and confirm it matches `out/`; record true host (GH Pages), last-deployed commit vs `main`, and the `CNAME`-not-in-artifact risk. Produce a one-paragraph "this is what's live, on what host, at what commit" baseline.
- **Scope (out):** no fixes, no doc rewrites (the `PROJECT_STATE.md` rewrite is a Phase-2 Will task), **do not** run the Design Compiler here (needs Dani's judgment — it's a Phase-1 instrument).
- **Size:** S (half a session). **Owner:** Morgan/Rory. **Sky-gated:** none. **Exit gate:** a written, dated baseline naming the live commit + brand + host, with a screenshot of the served `out/` in both themes.

### PHASE 1 — Critique  *(Creative Director, read-only; feeds Phase 2)*
- **Goal:** judge the live tool against *its own* intended bar (keyboard-first, local, fast, coherent), surface findings ranked by impact, and protect what's already good — the same method that worked for the Portfolio.
- **Scope (in):** both themes × both breakpoints (desktop + mobile sheet). Visual hierarchy, type scale (Fraunces/Inter/JetBrains coherence), **color semantics (the teal-as-error problem)**, empty/loading/error/streaming states, mobile-sheet ergonomics. **Run the Design Compiler's 7-layer gate here** on the never-gated rebrand + mobile work; fold its PASS/POLISH/BLOCK into the findings. **Also produce a design recommendation for F3b's 3 open questions** (placement, ⌘↵ interaction, persistence) since those are Creative-Director-shaped.
- **Scope (out):** any code change; deep WCAG conformance (that's Phase 3 — Phase 1 may *flag* obvious a11y issues but not fix them); new features beyond the F3b design rec.
- **Size:** M, 0 code chunks (output is a ranked findings list = Phase 2's backlog). **Owner:** Dani. **Sky-gated:** the *prioritization* — Sky strikes/approves findings + the F3b design before Phase 2 spends effort.
- **Exit gate:** one ranked findings list, every finding tagged severity + objective/engine-sensitive + target-phase, plus a Design-Compiler verdict and an F3b design proposal — all reviewed by Sky.

### PHASE 2 — Polish + F3b build + model refresh  *(execute, in revertible chunks)*
- **Goal:** land the Phase-1 findings and the two Sky-approved feature/correctness items, each as an independently revertible chunk.
- **Scope (in):**
  - **F3b inline model-switcher (BUILD — Sky said include):** sequence this **first**, because it changes the run-UI surface that later polish *and* Phase 3/4 evaluate. Build per the Phase-1 design + Sky's answers to the 3 questions. Larger chunk; gets its own tests.
  - **Model-ID refresh (Sky-gated chunk):** update the model list to current (recommend **Opus 4.8 default**, Sonnet 4.6, Haiku 4.5; consider Fable 5) in `src/lib/settings.ts`. *(The global "no-Opus-default" rule governs which model **Claude Corp agents** run on — it does not constrain the **app's** user-facing default, which runs on Sky's own key. Flagged for awareness.)*
  - **Critique findings:** UI/UX/type/coherence fixes, incl. **error-color teal→`danger` scale** (objective). The `PROJECT_STATE.md`/`DECISIONS_LOG.md` reconciliation + duplicate-file cleanup rides here as a Will doc task.
- **Scope (out):** formal WCAG work (Phase 3 owns the AA floor — don't half-do it twice); the lint toolchain (Phase 4); engine-sensitive chunks merge only after the Phase-4 Safari gate.
- **Chunking philosophy:** **one chunk = one finding = one branch = one diff whose title predicts the visual change.** Slice by *what changes for the user*, not by file. Land any shared-token change (e.g. introducing `danger`) as its own chunk *before* its consumers, so a revert never strands a half-used token. Every chunk states its before/after observable + theme + breakpoint, and carries an objective/engine-sensitive tag from creation. One chunk through the merge gate at a time (Art. 17 / Shamus). Litmus: if reverting chunk N forces reverting N±1, they were one chunk.
- **Size:** M–L; realistically **8–14 revertible chunks** (F3b + model + critique findings). **Owners:** Shamus (F3b/build), Dani (visual), Will (docs). **Sky-gated:** F3b design answers, model default choice, anything touching deploy/CNAME.
- **Exit gate:** every approved finding either merged-with-built-output-proof (objective) or proposed-and-Chromium-screenshotted-awaiting-Safari (engine-sensitive); F3b built + unit-tested + green; docs reconciled; `main` still green (367+ tests, typecheck 0).

### PHASE 3 — Accessibility (WCAG 2.2 AA — hard floor, non-negotiable for "done")
- **Goal:** close every AA gap across all states in both themes, on the *final* surface (post-F3b).
- **Scope (in), priority order:** (1) **`aria-live="polite"` on the streaming response** (`PromptDetail` `#response-content`) — top value; (2) **error signaling beyond color** (pairs with the Phase-2 teal→danger fix: add text/icon, not color alone); (3) **skip-to-content link** (none exists); (4) Markdown **code-block region labeling**; (5) **RunHistory list-update announcement**; (6) **`prefers-contrast` handling** (none exists); (7) full keyboard / screen-reader / focus / 44px-target / reduced-motion / dynamic-type sweep across empty/loading/error/streaming states in both themes — **including F3b's new control**.
- **Scope (out):** net-new components, AAA, anything Phase 2 already shipped (verify, don't redo — e.g. form labels).
- **Size:** M, **4–7 revertible chunks** (gap-closing on an already-strong base). **Owner:** Alex. **Sky-gated:** essentially none (AA fixes are objective); confirm the `danger` hue once with Dani.
- **Dependency:** after Phase 2 so polish/F3b reflow doesn't move the target mid-audit. Live-region + error-signaling first (load-bearing).
- **Exit gate:** the §4 AA checklist fully walked; every `[B]` item proven against built `out/`, every `[D]` item escalated to Sky's device with a one-line check. **No item closed on a dev render.**

### PHASE 4 — QA sweep (hardening + honesty — the gate to "done")
- **Goal:** prove the finished state cross-browser, in the built artifact, and on a real device — so Sky can *honestly* call it done.
- **Scope (in):**
  - **Built-output gate** (mechanics below) — the standard for every objective claim.
  - **Real Safari/iOS pass** — the engine-sensitive batch, escalated to Sky as a one-sitting checklist.
  - **Lint toolchain (Sky-gated, scoped, discovery-first):** step 1 — *does `main` even lint clean?* (never run). Step 2 — install the 5 missing deps + regenerate lockfile. Step 3 — clear/triage violations. Step 4 — wire `npm run lint` into CI. Bounded so it can't balloon; if step 1 surfaces a wall, re-scope with Sky.
  - **Edge cases:** empty library, 10 MB import guard, rate-limit countdown, aborted stream, localStorage-disabled/private-mode, oversized response cap.
  - **Regression:** 367 tests + typecheck + build; **CNAME-in-artifact** assertion; last-deployed-commit reconciliation.
- **Scope (out):** new polish (anything non-regression found here is a *new* finding for a future cycle, not scope creep).
- **Size:** M, but with a **hard external dependency on Sky's device**. **Owners:** Gary (tests/CI/lint), Rory (build/deploy/Art.17 gate), Sky (Safari). **Sky-gated:** real-iOS verification, lint deps/lockfile, the Art. 17 production merge+push.
- **Exit gate:** every §3 DoD item true AND proven; engine-sensitive items signed off by Sky on real Safari; lint either green-in-CI or explicitly descoped with a reason; the Art. 17 gate legitimately holds (full check chain · built-output proof · recorded rollback).

**Built-output verification gate (the mechanic, used everywhere "proven" appears):**
1. `npm run build` — non-zero exit fails the gate. (With `output:"export"`, build *is* the deploy artifact.)
2. `npx serve out` — exercise the **artifact**, never `next dev`. Dev runs un-minified with HMR and can pass while the static export breaks (hydration, the no-flash theme script, trailingSlash routing). The gate trusts only `out/`.
3. **Smoke the served artifact, both themes:** cold load (no theme flash — only testable in the built artifact), open a prompt, paste a throwaway key, run + watch it stream, error path (bad key → new danger color + `aria-live` fires), import/export round-trip, reload-persists-theme, F3b switch-model-per-run.
4. **Artifact-integrity asserts dev can't catch:** `out/CNAME` exists; `/` and `404` resolve under trailingSlash; self-hosted fonts load with **no** Google network request; served brand == Phase-0 baseline.
5. **Diff-the-build discipline:** proof that "the change is in `out/`" is a grep hit for the changed string/class in built `out/`. "Fixed" without a corresponding `out/` grep hit does **not** pass.

---

## 4 · WCAG 2.2 AA walkable checklist (this app's surfaces)

Tags: **[B]** provable against built `out/` (Chromium-on-artifact is legitimate here) · **[D]** device-only, escalate to Sky · **[A]** source-check.
Surfaces: Header/toggles · Command Palette (⌘K) · Prompt grid/cards · Prompt Detail + **run/stream** + **F3b switcher** · Settings · Run History · Forms (create/edit) · empty/loading/error/streaming states.

- **Keyboard [B]:** every surface reachable + operable by keyboard; ⌘K/`/`/`?`/Esc/arrows work; F3b switcher keyboard-operable; no traps except intended modal focus-trap; logical tab order in both themes.
- **Focus visible [B]:** `focus-visible` ring on every interactive element incl. F3b control, density/theme toggles, card star; ring meets 3:1 against its background in **both** themes.
- **Screen reader [D/A]:** streaming response announces (`aria-live`) **[A→D]**; run errors announce; RunHistory new entries announce; modals have name/role/`aria-modal`; code blocks labeled as code; icons either labeled or `aria-hidden`. Final VoiceOver pass **[D]**.
- **Contrast, both themes [B]:** body text ≥4.5:1, large/UI ≥3:1; **error text/icons ≥4.5:1 and not signaled by color alone**; chips, muted text, placeholder all pass; check desert-on-cream *and* paper-on-night.
- **Touch targets [B/D]:** ≥24×24 CSS (2.2 AA min; project already targets 44px); verify tag chips and F3b control; confirm on device **[D]**.
- **Reduced motion [B/D]:** `prefers-reduced-motion` disables fade/scale/slide-up; verify on iOS **[D]**.
- **Dynamic type / zoom [B/D]:** 200% browser zoom no loss of content/function **[B]**; iOS Dynamic Type / 16px-input no-zoom rule holds **[D]**.
- **States [B]:** empty (no prompts / no search match), loading (streaming), error (bad key / rate-limit / overloaded / aborted), and success each have an accessible, distinguishable treatment.

---

## 5 · Project-level DEFINITION OF DONE (the provable checklist)

**Proof standard.** ✅ *Counts as proof:* the item observed in the **built `out/`** via `npx serve out` (objective) **or** confirmed by **Sky on real Safari/iOS** (engine-sensitive); for code-only facts, a grep/test/CI artifact. ❌ *Does NOT count:* a `next dev` render, an agent's "looks verified," a Chromium-only check of an engine-sensitive item, a unit test standing in for a visual/behavioral claim, or a prior (possibly stale) report.

Done = **all** boxes below true AND proven by their named artifact:

**Functional**
- [ ] Every feature works end-to-end in built `out/`: search, filter, run+stream, favorites, history, export/import, sort, density, create/edit, **F3b model switch per run**. *(proof: built-output smoke, both themes)*
- [ ] A real prompt run streams against the live API with a real key. *(proof: Sky live run [D])*

**Visual / polish**
- [ ] All Sky-approved Phase-1 findings landed; error states read as errors (`danger`, not teal). *(proof: built-output + `out/` grep)*
- [ ] Coherent across both themes × both breakpoints. *(proof: screenshots desktop+mobile, light+dark)*

**Accessibility (WCAG 2.2 AA — hard floor)**
- [ ] §4 checklist fully walked; every `[B]` proven on artifact, every `[D]` signed off by Sky. *(proof: checklist + VoiceOver/iOS confirmation)*
- [ ] Streaming output + run errors announce to screen readers. *(proof: VoiceOver [D])*

**Cross-browser / device**
- [ ] Engine-sensitive items (glow/blur/safe-area/no-flash/contrast) confirmed on real iOS Safari. *(proof: Sky one-sitting checklist [D])*
- [ ] Works in Chrome + Safari desktop + iOS Safari. *(proof: Sky [D])*

**Build-output integrity**
- [ ] `npm run build` exits 0; `out/CNAME` present; trailingSlash routes resolve; fonts load with no Google request. *(proof: built-output asserts)*
- [ ] Last-deployed commit == `main`; live URL == built artifact. *(proof: deploy log + fetch diff)*

**Performance**
- [ ] No regression in load/interaction vs baseline; grid renders cleanly at the seed+typical custom-prompt count. *(proof: built-output observation; note the no-virtualization ceiling as a documented limit, not a blocker)*

**Docs / state-truth**
- [ ] `PROJECT_STATE.md`, `DECISIONS_LOG.md`, `LEARNINGS.md` reflect reality (brand, host, URL, merged work); duplicate `PROJECT_STATE 2.md` removed. *(proof: file contents vs git reality)*
- [ ] A dated post-merge QA report exists covering the June 4/5 work + this arc. *(proof: qa-reports/ file)*

**Governance**
- [ ] Design Compiler run on the rebrand + mobile + F3b with a recorded verdict. *(proof: DesignCompile report)*
- [ ] Lint either green-in-CI or explicitly descoped with reason. *(proof: CI run or DECISIONS_LOG entry)*
- [ ] Art. 17 gate holds for the final ship (full check chain · built-output proof · recorded rollback). *(proof: Rory gate record)*

**The irreducible "cannot prove from here" set (escalate to Sky + device):** backdrop-blur render · sticky-header behavior · `env(safe-area-inset-bottom)` on a notched iPhone · no-flash theme on cold load · VoiceOver announcements · reduced-motion on iOS · iOS 16px-input no-zoom · Dynamic Type · a live API run on a real key · live asset/domain resolution. Each ships to Sky as a one-minute check with the *why*.

---

## 6 · Open decisions for Sky (one-line each)

1. **Model default:** ship the app defaulting to **Opus 4.8** (most capable) or **Sonnet 4.6** (cheaper default, since F3b lets users switch per run)?
2. **F3b — placement:** inline control in the run panel header, or a compact dropdown beside the Run button?
3. **F3b — ⌘↵ interaction:** does ⌘↵ run with the currently-selected switcher model, and does the switcher trap/ignore that chord?
4. **F3b — persistence:** is the per-run model choice remembered per-prompt, globally, or reset each open?
5. **Error `danger` hue:** approve a red/danger token for both themes (replacing teal-as-error) — Dani to propose one swatch?
6. **Deployment of record:** confirm **GitHub Pages + `prompts.skypistudio.com`** is canonical and Vercel is retired (docs currently disagree)?
7. **Lint scope ceiling:** if `main` doesn't lint clean, cap the cleanup at N violations and descope the rest, or treat a clean lint as mandatory for "done"?
8. **Old branches:** prune the stale May auto-branches + the 97-ahead `origin/release/initial-push`, or leave them?

---

## 7 · How to execute / verify this plan

- **Order is load-bearing:** 0 → 1 → 2 → 3 → 4. Do not start Phase 3/4 on a surface F3b will still change; F3b lands first in Phase 2 by design.
- **Per-phase exit gates** (§2) are the checkpoints; **§3 DoD** is the finish line; **§5 proof standard** governs the word "done" everywhere.
- **Verification spine:** `npm run build && npx serve out`, smoke both themes, grep `out/` for the changed strings, then escalate the engine-sensitive batch to Sky for one Safari sitting. Never close an item on `next dev` alone.
- **Roles:** Morgan/Rory (Phase 0), Dani (Phase 1 critique + Compiler), Shamus/Dani/Will (Phase 2), Alex (Phase 3), Gary/Rory/Sky (Phase 4). All work on role-prefixed branches; Sky/Art.17 owns merge to `main`.
- **Honesty clause:** this plan is "done" only when §3 is *proven*, not asserted. If a check can't be run from here, it is escalated to Sky and the item stays open until Sky confirms — that gap is reported, never papered over.
