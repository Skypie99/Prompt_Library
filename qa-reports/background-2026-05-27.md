---
mode: background
model_tier: sonnet
project: Prompt Library Tool
cycle_id: 2026-05-27
role: peter
change_applied: true
---

# Peter — Prompt Library Tool Performance Audit (2026-05-27)

**Mode:** BACKGROUND · 1 change applied

---

## Change Applied

**`isFavorite` O(n) → O(1) via `favoritesSet` useMemo**

- **File:** `src/components/HomeClient.tsx:205–206`
- **Before:**
  ```tsx
  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);
  ```
- **After:**
  ```tsx
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const isFavorite = useCallback((id: string) => favoritesSet.has(id), [favoritesSet]);
  ```
- **Why it matters:** `isFavorite` is called once per card in every PromptGrid render. With `favorites` as an array, each call is O(k) where k = favorites.length. With a Set, each call is O(1). The cost is invisible at k=5 but grows linearly — a user with 30 favorites and 50+ visible prompts was paying 1,500 comparisons per grid render.
- **Reversibility:** Functionally identical. `Set.has()` and `Array.includes()` return the same boolean for this use case. Rollback by reverting the two lines.

---

## Other Findings (not applied)

### F-PL-1 — `totalRuns` computed in render-body IIFE

- **File:** `src/components/HomeClient.tsx:702–710`
- **What:** `Array.from(runCounts.values()).reduce(...)` runs inside a JSX `{(() => {...})()}` on every HomeClient render. Any state change (category filter, activePrompt, etc.) re-runs this reduction.
- **Impact now:** Low — runCounts.size is typically small.
- **Recommendation:** Wrap in `useMemo([runCounts])` to gate recomputation to actual run-count changes.
- **Not applied this cycle** — one change rule (Const. 12.3).

### F-PL-2 — `visiblePrompts` memo re-runs on runCounts Map reference change

- **File:** `src/components/HomeClient.tsx:180–187`
- **What:** `visiblePrompts` depends on `runCounts` (for sort-by-usage). A new Map reference from `refreshRunCounts()` will re-sort the full visible list even if counts didn't change for the affected IDs.
- **Impact now:** Negligible — sort is O(n log n) on a small array.
- **Recommendation:** Sort only when the actual count values change (granular comparison). Low priority.

---

## Positive Observations

- All major derived data paths (allPrompts, categoriesWithCounts, tagsWithCounts, favoritePrompts, recentPrompts, promptById) use useMemo correctly: ✅
- Fuse.js index rebuilt only when `allPrompts` changes: ✅
- CommandPalette search runs synchronously (small dataset, comment-documented): ✅
- sortPrompts called on filtered subset, not full library: ✅
- 127 KB first-load JS (Next.js static export); well within fast territory: ✅
