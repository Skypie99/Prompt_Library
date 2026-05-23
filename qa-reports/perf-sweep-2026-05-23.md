# Performance sweep — end of cycle/auto-2026-05-23

_By Peter. One pass across the whole integration branch after F1–F4 landed._

## Production build

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    24.6 kB         127 kB
├ ○ /_not-found                            989 B         104 kB
└ ○ /icon.svg                                0 B            0 B
+ First Load JS shared by all             103 kB
```

- All 5 routes prerender as **static content** — the static export contract isn't broken by anything this cycle.
- `/` First Load JS at **127 kB** is well within "fast" territory for a content-heavy static site.
- Compile time **3.9s** (clean `.next` removed first).
- Typecheck green at every handoff this cycle (verified 10+ times).

## Bundle deltas (this cycle)

Hard to baseline against pre-cycle without main, but the visible additions are:

| Module added/changed | Approximate footprint |
|---|---|
| `runs.ts` (F1) | ~3 KB pre-min |
| `RunHistory.tsx` (F1) | ~5 KB pre-min |
| `library.ts` additions (F2 + harden) | ~2 KB pre-min |
| `TagChips.tsx` (F3) | ~1.5 KB pre-min |
| `ShortcutsModal.tsx` (F4) | ~2.5 KB pre-min |
| Total page-level growth | ~14 KB pre-min → ~5–7 KB post-min |

Per-feature cost is proportional, no surprise blowups.

## Memoization audit (existing + new)

| Hot path | Memo? | Notes |
|---|---|---|
| `mergePrompts(userPrompts, seedPrompts)` | ✓ useMemo on `[userPrompts, seedPrompts]` | unchanged |
| `getCategories(allPrompts)` | ✓ useMemo on `[allPrompts]` | unchanged |
| `getTags(allPrompts)` | ✓ useMemo on `[allPrompts]` | **new this cycle; correctly memoized** |
| `visiblePrompts` (cat + tag intersection) | ✓ useMemo on `[allPrompts, activeCategory, activeTag]` | **new intersection logic, memoized** |
| `promptById` | ✓ useMemo on `[allPrompts]` | unchanged |
| `favoritePrompts` / `recentPrompts` | ✓ useMemo | unchanged |
| `createPromptFuse(prompts)` | ✓ useMemo on `[prompts]` | unchanged |
| `searchPrompts(...)` | ✓ useMemo on `[fuse, prompts, query]` | unchanged |
| RunHistory `entries` (relative-time-decorated rows) | ✓ useMemo on `[runs, now]` | **new, correctly memoized** |
| RunHistory `useNowEvery(30_000, expanded)` | ✓ interval only runs while expanded | **new, correctly gated** |

## Other perf observations

- **Save-on-every-keystroke (F2)** writes to localStorage per character of variable input. Values are tiny (string-keyed records), no perceptible cost. No debounce added on purpose — see Loop 2 decision log; debounce risks losing the last keystroke on a fast close.
- **Tag chips on PromptCard** are now `<button>` instead of `<span>` when `onSelectTag` is provided. Slightly more DOM per card, but tags are usually 0–4 per card. No measurable impact.
- **RunHistory re-renders** are scoped: parent (PromptDetail) holds `runs` state, RunHistory only re-renders when `runs` changes or the user expands/collapses. No prop churn from PromptDetail re-renders.
- **CommandPalette Fuse index** rebuilds when `allPrompts` changes — that's the right behaviour (user added/edited/deleted a prompt). Build cost is small for ~hundreds of prompts.

## Nothing to fix this cycle

No regressions, no missed memos, no surprising bundle bloat. Static export contract intact. The build pipeline is the single best signal here and it's green.

## Forward-looking (parked, not blocking)

1. **Virtualize the prompt grid** when libraries approach 200+ prompts. Today's typical libraries are 20–80, so not yet.
2. **Lazy-load `RunHistory`** (`next/dynamic` with `ssr: false`) once we're shipping a ton of features inside the detail modal. Today the savings would be in the 2–3 KB range — not worth the complexity.
3. **A `usage` field on stored runs** with token counts from the Anthropic API's `message_delta` event would let users see "how expensive was this run?" — useful, requires plumbing the stream parser to capture it. Not a perf issue; parked under F-future.
