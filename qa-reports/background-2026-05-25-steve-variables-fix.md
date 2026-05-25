# Steve — Prompt Library variables-validation fix
**Date:** 2026-05-25
**Mode:** background · model_tier: opus-4-7 · project: Prompt Library Tool · cycle_id: steve-bg-2026-05-25
**Branch:** `qa/auto-2026-05-25-steve-variables-validation`
**Commit:** `a865a5e`
**Status:** Committed to branch. NOT merged (Const. 12.3 — only Sky merges).

---

## What changed

**File 1:** [src/lib/transfer.ts](src/lib/transfer.ts) — `isValidPromptShape`.

Before:
```ts
if (!Array.isArray(p.variables)) return false;
```

After:
```ts
if (!Array.isArray(p.variables)) return false;
if (!p.variables.every(isValidVariableShape)) return false;
```

Plus a new helper:
```ts
function isValidVariableShape(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || !v.name) return false;
  if (typeof v.label !== "string" || !v.label) return false;
  if (v.placeholder !== undefined && typeof v.placeholder !== "string") return false;
  return true;
}
```

**File 2:** [src/lib/__tests__/transfer.test.ts](src/lib/__tests__/transfer.test.ts)
— two new security-tagged tests, both inside the existing
`describe("parseImport — success and silent drops", ...)` group so they sit
next to the parallel "drops corrupt prompt" / "drops corrupt run entries"
tests:

1. **`drops a prompt whose variables array contains malformed entries`** —
   confirms an import file with one well-formed prompt + one prompt-with-junk-
   variables results in only the well-formed prompt landing in storage.
2. **`accepts a prompt with well-formed variables (including optional placeholder)`** —
   confirms the new validator doesn't over-reject; both `{name, label}` and
   `{name, label, placeholder}` shapes pass.

Both tagged with the `// Security test — Steve` comment per the cross-training
spec in the skill prompt.

---

## Why this fix

The Prompt Library's import path is its primary trust boundary — JSON files
shared between users (or pulled from old backups). Every other validator in
`isValidPromptShape` and `isValidStoredRunShape` checks both the field type
**and** the per-entry shape (e.g. `tags` is checked Array.isArray AND every
element is a string). `variables` was the lone exception — it only got the
array check.

Pre-fix attack/accident vector:

```json
{
  "version": 1,
  "userPrompts": [{
    "id": "p1", "title": "Imported", "body": "...",
    "description": "", "category": "x", "tags": [],
    "variables": [{"foo": "bar"}, null, 42, "not-an-object"],
    "createdAt": "2026-01-01T00:00:00Z"
  }],
  ...
}
```

That whole prompt would have landed in `localStorage` under
`promptlib:userPrompts`, then `PromptForm.tsx` would render input rows with
`undefined` labels for any non-conformant entry. Not exploitable — but a
data-integrity bug that the existing strict validation everywhere else
already prevented.

After the fix the entire prompt is dropped (counted in `droppedCount`,
visible in the import preview the user sees before confirming).

---

## Verification

- **Typecheck.** `npx tsc --noEmit` only emits four pre-existing
  `TS2688: Cannot find type definition file for 'babel__core 2'`-class
  errors from polluted node_modules duplicate `@types/*` directories
  (carry-over from a previous report). My change introduces zero new
  TypeScript errors.
- **Unit tests.** `npx vitest run` — **304/304 pass** (was 302/302 — the two
  new security tests are the additions). The full `transfer.test.ts` suite
  passes (20/20) and every other test file is untouched and still green.
- **Backwards compatibility.** The fixture `makePrompt()` uses
  `variables: []` by default; every existing test that exercises
  `parseImport` continues to pass, confirming the tightened validator is
  not over-rejecting.

---

## What I deliberately did NOT do

- **Did not merge to main.** Const. Art. 1 + 12.3: only Sky merges.
- **Did not push the branch to a remote.** No external sends in BACKGROUND
  mode.
- **Did not modify the broader import flow** (`applyImport`, merge vs.
  replace semantics, recursion depth, etc.). One reversible change per
  cycle.
- **Did not touch the other variable validators** (e.g.
  `isValidStoredRunShape` is correct already; nothing to fix).

---

## Decisions for Sky

When ready, merging this branch is a one-line interaction (`git merge
qa/auto-2026-05-25-steve-variables-validation`). No follow-up needed —
the diff is purely additive validation logic + two test cases.

Morgan: do not relay externally (BACKGROUND mode, Art. 12.4).
