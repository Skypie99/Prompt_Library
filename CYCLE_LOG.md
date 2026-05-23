# Cycle Log — `cycle/auto-2026-05-23`

> Running log of each loop, role-by-role. Morgan reconciles at the end of every loop.

## Session plan (initial)

Built on `qa/auto-2026-05-23` (3 pending commits adding unit tests and CI/lint proposals). Stacking forward — nothing on this branch is merged to main; that's for Sky to do in one review pass.

Loop order (sized to leave room for the final Peter+Gary sweep):

1. **F1 — Run history per prompt** (M)
2. **F2 — Variable values persistence** (S)
3. **F3 — Tag filter** (S)
4. _(stretch)_ **F4 — Keyboard shortcuts overlay** (S)

Conflicts considered:
- F1 and F2 both add per-prompt `localStorage` keys. Dana lands both keyspaces in one written proposal during Loop 1 so the storage discipline is consistent.
- F1 lives inside `PromptDetail`; F3 lives at the grid level; F4 is a top-level modal — no UI conflicts between loops.
- Deletion paths in `HomeClient.deletePrompt` need to also clean up F1's `promptlib:runs:<id>` and F2's `promptlib:values:<id>` — Shamus handles both touches in Loop 2.

Quality rails:
- `npx tsc --noEmit` after every role handoff.
- Small, reversible commits.
- Steve + Alex run lightly per loop; Peter + Gary sweep once at the end.

---

## Loop 1 — F1 Run history per prompt  ✅ done

| Role | Output |
|---|---|
| Quinn | `specs/F1-run-history.md` — user story, 12 acceptance criteria, size M |
| Dani | `specs/F1-run-history-design.md` — collapsed-by-default panel, status dots (emerald/coral/ink-soft), Intl.RelativeTimeFormat, accessible row markup |
| Dana | `qa-reports/proposal-storage-runs-and-values-2026-05-23.md` — per-prompt keyspaces for F1+F2, cap 10, 32KB per-response trim, rollback recipe |
| Shamus | `src/lib/runs.ts` + `src/components/RunHistory.tsx` + `PromptDetail.tsx` wiring + 2 new icons (`RotateCcwIcon`, `ChevronIcon`) |
| Steve | Routed `saveRuns` through `library.writeJSON` so quota failures hit the banner; exported `writeJSON` |
| Alex | Focus-visible rings on every interactive in `RunHistory`; bumped privacy note to AA contrast |
| Dana audit | `qa-reports/data-audit-F1-2026-05-23.md` — 7 invariants verified, no further migrations needed |

**Decisions made (logged here, all reversible — Sky can edit on review):**

- **Status dot palette**: used Tailwind's `emerald-500` for completed (no custom green token added). If Sky wants a palette-native green later, it's a one-token change in `tailwind.config.ts` and a swap in `STATUS_DOT_CLASS`.
- **Delete-one is no-confirm**: a single row delete is low-stakes (the run is reproducible by re-running). Clear-all keeps the inline confirm, mirroring the existing delete-prompt pattern.
- **No empty state inside the modal**: when history is empty, the panel hides entirely. The cue to run is the Run button itself. (Documented in Dani's spec.)
- **32KB per-response persistence cap**: a runaway response is trimmed at write time; the user still saw the full response in the live UI. Above the typical Claude response length but below the per-origin localStorage quota.
- **Stored-only privacy note** ("Stored only in this browser.") sits at the top of the expanded panel — small but honest disclosure that history isn't sync'd anywhere.

**Decisions deferred to Sky** — none. Everything in this loop is browser-local and reversible.

**FEATURES.md update** — F1 moves to "Done"; F2 is now top of "Up next".

---

## Loop 2 — F2 Variable values persistence  ✅ done

| Role | Output |
|---|---|
| Quinn + Dani | `specs/F2-variable-values-persistence.md` (compressed — behavior-only feature, no visuals) |
| Dana | Storage already proposed in Loop 1; this loop just consumes `promptlib:values:<id>` |
| Shamus | `loadValues` / `saveValues` / `clearValues` in `library.ts`; PromptDetail wired (hydrate on open, persist on change, clear on Clear, persist on Restore-from-history) |
| Steve / Alex | Routed through existing `writeJSON` banner; no UI surface changes to harden |
| Dana audit | Cascade-on-delete verified (`PER_PROMPT_PREFIXES` includes `promptlib:values:`, exercised by `purgePromptStorage` in `HomeClient.deletePrompt`) |

**Decisions made:**

- **No debounce on save.** Values are tiny, write-on-change matches the rest of the app, and the user's mental model is "what I see is what's saved." A 200ms debounce would be invisible to the user but would risk losing the last keystroke on an immediate close.
- **Restore-from-history persists too.** A restored set IS the user's new draft. Avoids the "I picked a run, closed, reopened, where'd my picked values go?" surprise.
- **No "Saved" indicator.** Persistence is invisible by design.

**Decisions deferred to Sky** — none.

---

## Loop 3 — F3 Tag filter

_(in progress)_
