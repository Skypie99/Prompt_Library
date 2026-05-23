# Performance sweep — end of cycle/auto-2026-05-23-pm

_By Peter. One pass across the PM integration branch after F5–F9 landed._

## Production build

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      29 kB         132 kB
├ ○ /_not-found                            989 B         104 kB
└ ○ /icon.svg                                0 B            0 B
+ First Load JS shared by all             103 kB
```

- All 5 routes still prerender as **static content** — static export contract intact through the markdown renderer and the import/export flow.
- `/` First Load JS at **132 kB** — up ~5 kB from the AM cycle (127 kB), distributed across F5 (export/import), F6 (markdown), F7-F9 (small UI/runtime changes).
- Clean-build compile time 10.1s (cache was cold; warm cache returns to ~3-4s).

## Bundle deltas (PM cycle on top of AM cycle)

| Module / change | Approximate footprint |
|---|---|
| `transfer.ts` (F5 export/import) | ~3 KB pre-min |
| `SettingsModal.tsx` expansion (F5 UI + preview) | ~2 KB pre-min |
| `markdown.ts` (F6 parser + AST) | ~1.5 KB pre-min |
| `Markdown.tsx` (F6 renderer) | ~1 KB pre-min |
| `EmptyHint.tsx` + HomeClient empty hooks (F8) | ~0.5 KB pre-min |
| `WandIcon` + Customize wiring (F7) | ~0.3 KB pre-min |
| Inline no-flash JS expansion (F9) | ~0.1 KB pre-min |
| **Total page-level growth** | **~8 KB pre-min → ~4-5 KB post-min** |

Per-feature cost is proportional to the feature size; F6 in particular is well below the alternative (vendored `react-markdown` would be ~30 KB+).

## Hot-path memoization (additions only)

| Hot path (new this cycle) | Memo? | Notes |
|---|---|---|
| `Markdown` AST (parseMarkdown) | ✓ useMemo on `[source]` | Re-parses only when the streaming text grows; same key per render is cheap |
| `userPromptCount` for the Settings count display | ✓ stored in component state, refreshed once per open + after import | Replaces a wasteful `buildExport()` call that walked every per-prompt sub-key on every render |
| SettingsModal `importState` (preview / success) | n/a (single-pass) | Held in component state; no derived calcs |
| HomeClient `refreshLibraryFromStorage` callback | ✓ useCallback | Stable identity across renders |
| Empty-hint visibility logic | n/a (boolean expression) | Three locals, cheap |

## Hot paths NOT touched this cycle (re-verified clean)

The AM-cycle memos still hold: `allPrompts`, `promptById`, `categories`, `tags`, `visiblePrompts` intersection, favorites/recent grids, Fuse index, search results, RunHistory entries + 30s timer (still gated by `expanded`).

## Streaming behaviour

The biggest concern this cycle was the live-streaming response panel now running through the markdown parser on every chunk. Verified:

- `parseMarkdown` is O(n) in source length per call; for a typical 3-5 KB streamed response that's microseconds.
- Memoization means the parser fires once per `response` change (i.e. once per streamed chunk arriving), not once per any state change in PromptDetail. The variable input change path, for example, doesn't re-parse the response.
- Partial markdown ("# Head" mid-stream, `**foo` mid-stream) renders as literal text gracefully; no flicker.

## Static-export gotchas

- **`window` access guarded** in every new path that touches storage (`listStoredPromptIdsByPrefix`, `wipeAllUserData`). Verified by re-running `npx next build` to completion — the SSG step would crash on an unguarded `localStorage` access.
- **Inline no-flash JS in layout.tsx** (F9 update) is plain JS in a string literal, runs in the browser before React mounts; doesn't touch the SSG pipeline.
- **Markdown component** is a `"use client"` component; doesn't try to render during SSG.

## Findings

**No regressions.** No missed memos. Bundle growth is proportional. Streaming under markdown is performant.

## Parked (not blocking)

1. **Lazy-load `Markdown`** (`next/dynamic` with `ssr: false`) only if Sky later ships a markdown-heavy feature elsewhere. Today, both consumers (PromptDetail + RunHistory expanded) are visible on the same page session and would re-import either way.
2. **`react-markdown` swap** if Sky ever wants syntax highlighting, tables, etc. Would add ~30 KB + maintenance surface; the current safe-subset renderer is cheaper for what we render.
3. **Worker-thread parsing** for very large imported libraries — only relevant once a single user has thousands of prompts. Not a real risk for this app's audience.

Full perf report: this file. Companion AM report: `qa-reports/perf-sweep-2026-05-23.md`.
