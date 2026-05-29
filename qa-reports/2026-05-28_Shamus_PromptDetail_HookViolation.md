# PromptDetail Hook Violation — Fix Report

**Date:** 2026-05-28
**Author:** Shamus (+ Steve consulting)
**Branch:** `fix/prompt-detail-hook-violation-2026-05-28`
**Commit SHA:** 9c8c3d7
**Flagged by:** Gary's ESLint v9 setup (`qa-reports/2026-05-28_Gary_ESLint_Prettier_Setup.md`)
**Rule:** `react-hooks/rules-of-hooks` at `src/components/PromptDetail.tsx:337`

---

## Verdict: REAL violation

Not a false positive. This is a textbook conditional hook call.

---

## The Actual Code (before fix)

```tsx
// Line 200 — early return in the component body
if (!prompt) return null;

// … ~137 lines of non-hook logic …

// Line 347 — hook called AFTER an early return
const handleRestoreInputs = useCallback(
  (restored: Record<string, string>) => {
    const next = { ...restored };
    setValues(next);
    if (prompt) saveValues(prompt.id, next);
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
    });
  },
  [prompt],
);
```

`useCallback` at line 347 is only reached on renders where `prompt !== null`. On renders where `prompt` is null, React executes the `return null` on line 200 and the hook is never called. This breaks the hook call count invariant React depends on.

---

## Severity: MEDIUM

The early return fires on every render cycle where `prompt` is null — which is the normal "modal closed" state. The component is rendered even when the modal is closed (prompt=null), so this conditional skip happens routinely, not on a rare code path.

**User-visible consequence:** When the modal transitions from open→closed→open, React's internal hook state array desynchronizes for `useCallback` and all hooks declared after it (none in this case, but the memoized callback itself gets stale). Concretely: `handleRestoreInputs` could hold a stale `prompt` reference after a reopen, causing "Restore inputs" from history to silently fail to persist (the `saveValues(prompt.id, next)` call uses the wrong prompt id or is skipped). This would be intermittent and hard to reproduce, but real.

---

## Fix Applied

Moved `handleRestoreInputs` to above the early return (between the unmount cleanup `useEffect` and `if (!prompt) return null`). The null-guard that already existed inside the callback body (`if (prompt) saveValues(...)`) safely handles the prompt-is-null case.

The comment block on the original declaration was updated to note the rules-of-hooks rationale. The original declaration site is removed.

### Diff sketch

```diff
-  if (!prompt) return null;
+  // NOTE: declared before the early-exit so hooks are called unconditionally.
+  const handleRestoreInputs = useCallback(
+    (restored: Record<string, string>) => {
+      const next = { ...restored };
+      setValues(next);
+      if (prompt) saveValues(prompt.id, next);
+      requestAnimationFrame(() => {
+        panelRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
+      });
+    },
+    [prompt],
+  );
+
+  if (!prompt) return null;

   const filledCount = countFilled(variables, values);
   ...

-  const handleRestoreInputs = useCallback(
-    (restored: Record<string, string>) => { ... },
-    [prompt],
-  );
-
   // F-eve-4 — "Run again" from history: ...
```

---

## Test Results

- `npm run typecheck` — PASS (zero errors)
- `npm test` — PASS (12 test files, 214 tests, 0 failures)
- `npx eslint src/components/PromptDetail.tsx` — skipped: Gary's ESLint config lives on a separate branch not yet merged to main; the tool exits with "no config found". Visual inspection confirms the violation is resolved.

---

## Recommendation for Gary's ESLint Config

Keep `react-hooks/rules-of-hooks` as **error** (not warn, not suppressed). This was a genuine bug that could cause stale-closure issues on the restore-inputs path. The rule correctly caught it. No suppression comment needed on this file post-fix.

If Gary's config wants to add a note: this pattern (early return before hooks) is easy to introduce when adding a new `useCallback`/`useMemo` inside a component that already has early returns. Worth calling out in Gary's lint setup docs as a common gotcha.

---

## Status

Branch `fix/prompt-detail-hook-violation-2026-05-28` is ready to merge. No push, no merge performed per instructions.
