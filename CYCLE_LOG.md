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

## Loop 1 — F1 Run history per prompt

_(in progress)_
