# Shamus — F6 Markdown Polish QA Report

**Date:** 2026-05-29  
**Mode:** BACKGROUND  
**Branch:** feat/f6-markdown-polish-2026-05-29  
**Commit:** e32cc89  
**Status:** DONE — all checks pass

---

## What was asked

Two polish items from Dani's F6 Markdown Visual Spec (`qa-reports/2026-05-28_Dani_F6_MarkdownVisualSpec.md`):

1. Inline code missing `rounded` class
2. Link `focus-visible` styling not explicitly wired

---

## Findings

### Item 1: Inline code — `rounded` class

**Pre-existing fix — already done.** The inline code element at line 160 of `src/components/Markdown.tsx` already had `rounded` in its className:

```
className="rounded bg-cream px-1 py-0.5 font-mono text-[0.85em] text-ink dark:bg-night dark:text-paper"
```

No change needed. The spec note flagged this as "optional polish, not required for v1" and a prior pass had already addressed it.

### Item 2: Link focus-visible ring

**Applied.** The `<a>` element in the `Inline` component's `"link"` case was missing keyboard focus styling. Added:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1
```

Ring color: `teal-500` — matches the teal design system already in use (copy button uses `ring-teal-400`; `teal-500` at the link level gives slightly stronger affordance without being garish).

Also corrected `rel` attribute order from `"noreferrer noopener"` to `"noopener noreferrer"` (canonical per spec; functionally identical but matches the spec exactly).

`target="_blank"` was already present — no change needed there.

---

## Diff summary (`src/components/Markdown.tsx`)

```diff
-          rel="noreferrer noopener"
-          className="text-teal-700 underline underline-offset-2 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
+          rel="noopener noreferrer"
+          className="text-teal-700 underline underline-offset-2 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 dark:text-teal-300 dark:hover:text-teal-200"
```

---

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | PASS — no errors |
| `npm run test` | PASS — 324 tests, 19 files, 0 failures |
| Pre-existing `act()` warnings in `PromptDetail.ratelimit.test.tsx` | Pre-existing, not caused by this change |

---

## Escalations / Decisions for Sky

None. Both items were in scope, one was already done, the other was a small additive class change with no type surface or logic impact.

---

## Branch state

`feat/f6-markdown-polish-2026-05-29` — 1 commit ahead of main at the time of branch creation. Ready for merge when Sky approves.
