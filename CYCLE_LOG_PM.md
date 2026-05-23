# Cycle Log — `cycle/auto-2026-05-23-pm`

> Second build session of the day. Stacked on `cycle/auto-2026-05-23` (which already contains the morning's QA + this morning/early-afternoon's F1-F4 + data harden + sweep). Sky can merge in whichever order — both branches are reversible and not pushed to main.

## Session plan (initial)

Top of backlog (in order):
1. **F5 — Export / Import library** (M-L) — biggest impact, biggest piece
2. **F6 — Markdown rendering of Claude responses** (M) — visible quality bump
3. **F7 — Customize seed → save as own** (S) — small, explicit affordance over the existing Duplicate path
4. **F8 — Better empty states** (S) — sprinkles (stretch)
5. **F9 — `prefers-color-scheme` on first visit** (XS) — tiny (stretch)

Conflicts considered:
- F5 export needs to know about runs + values — both already exist (F1 + F2 from the AM cycle). Dana proposal lists every keyspace + which is in/out of the export.
- F6 changes how response text renders in BOTH the live response panel (PromptDetail) AND the History expanded row (RunHistory). A new `<Markdown>` component is the single render surface.
- F6 is a security-sensitive component (renders model output). Steve owns the "escape-everything-by-default + tiny safelist" review.
- F7 is just labeling/wiring on top of the existing Duplicate action; nothing new under the hood.
- F8 is purely additive UI per surface.
- F9 is a `useEffect` that runs once on mount when no stored theme. No conflict.

Quality rails (same as AM):
- `npx tsc --noEmit` after every role handoff.
- Small, reversible commits.
- Steve + Alex per loop; Peter + Gary sweep once at the end.

---

## Loop 1 — F5 Export / Import library  ✅ done

| Role | Output |
|---|---|
| Quinn + Dani | `specs/F5-export-import.md` |
| Dana | `qa-reports/proposal-export-import-2026-05-23-pm.md` (envelope shape, what's in/out, rollback, privacy note) |
| Shamus | `src/lib/transfer.ts` (~360 lines); `library.ts` additions (`listStoredPromptIdsByPrefix`, `wipeAllUserData`, public prefix export); SettingsModal Backup & Restore section with preview + merge/replace; HomeClient `refreshLibraryFromStorage` hook |
| Steve | Verified apiKey/model/maxTokens never in export; ghost-key filtering at export build time; `isSeed: false` forced on import; replace requires inline confirm; replaced wasteful `buildExport()` call in render with a cheap `loadUserPrompts().length` read |
| Alex | aria-label on file input; role="status" success / role="alert" error; focus-within ring on file picker label; consistent inline-confirm pattern matches existing delete-prompt UX |
| Dana audit | No new keyspaces created — F5 read/writes only existing keys. Forward-compat point is the single `version` field; v2 would land as a `migrateFromV1ToV2()` block in transfer.ts. |

**Decisions made:**

- **Export omits API key, model, maxTokens** — apiKey for security (users may share the file), model/maxTokens because they're personal preferences, not library content.
- **Default import mode is Merge** — additive, lowest-risk. Replace exists but requires inline confirm.
- **Per-id runs/values are full-replace on import** — merging two runs lists for the same prompt would produce a confusing duplicate timeline. Full-replace per id is cleaner.
- **Silent drop of corrupt sub-entries** — the preview tells the user how many were dropped, but a single bad run never blocks an otherwise valid import.
- **Tip in the preview**: "export your current library first if you want to come back to it" — the one mitigation for Replace's irreversibility.

**Decisions deferred to Sky** — none.

---

## Loop 2 — F6 Markdown rendering of Claude responses  ✅ done

| Role | Output |
|---|---|
| Quinn + Dani + Steve | `specs/F6-markdown-rendering.md` (Steve weighed in early on the safety contract) |
| Dana | n/a (no storage) |
| Shamus | `src/lib/markdown.ts` (parser + AST, ~250 lines), `src/components/Markdown.tsx` (renderer, ~100 lines), wiring into PromptDetail response panel + RunHistory expanded view |
| Steve | Verified: zero `dangerouslySetInnerHTML`, zero `eval`/`Function`, link protocol allowlist (https/http/mailto only), raw HTML and images render as literal text (no network requests), streaming partials safely render as literal text until the closer arrives |
| Alex | Heading levels capped at 3 to keep the type scale clean; markdown reused the existing color/font tokens; links open in new tab with `rel="noreferrer noopener"` |
| Dana audit | n/a |

**Decisions made:**
- **No external markdown library** — kept the bundle small and avoided supply-chain surface; the safe subset is plenty for Claude responses.
- **No syntax highlighting** — would need a heavyweight dep; out of scope.
- **No images, tables, blockquotes, math** for v1 — every one is a separate XSS surface or a noticeable size hit. Plain text fallback for each.
- **Links open in a new tab with `noreferrer noopener`** so the response panel never gives the linked page a handle on the app's window.

**Decisions deferred to Sky** — none.

---

## Loop 3 — F7 Customize seed → save as own

_(in progress)_
