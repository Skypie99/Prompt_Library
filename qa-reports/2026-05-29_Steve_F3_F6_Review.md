# Steve — Security Review: F3a/c/d + F6 Polish

**Date:** 2026-05-29
**Branches reviewed:**
- `feat/f3acd-run-ux-2026-05-29` (F3a overloaded retry, F3c unfilled variable warning, F3d expand/collapse)
- `feat/f6-markdown-polish-2026-05-29` (link focus ring + rel attribute order) — already merged to main as commit `e32cc89`
**Verdict:** CLEAR_WITH_NOTES

---

## F3a — Overloaded Retry

**Finding: CLEAR**

The F3a Retry button for `error.kind === "overloaded"` (HTTP 503/529) calls `handleRetry()`, which is the **same path** already used by the rate-limit retry button (F-r2). That path:

1. Clears any active countdown interval.
2. Clears the error state.
3. Calls `void runWithValues(values)` — the same validated API call function used for normal runs.

There is **no new code path** for API calls. The API key check (`if (!settings.apiKey) return`) and all existing guards in `runWithValues` apply identically.

**Rapid-click / API credit exhaustion concern:** There is no debounce or client-side rate limit on the Retry button. A user clicking rapidly can fire multiple concurrent API calls. However, this is **not a new risk** — the same is true of the main Run button today. The app is a single-user tool where the user holds their own API key; the cost of over-clicking falls entirely on them. No shared-resource or multi-user surface exists. This is a UX hardening opportunity, not a security blocker.

**Recommendation (non-blocking):** Consider setting `disabled` on the Retry button while `running === true` to prevent concurrent request stacking. The existing Stop button approach in the Run button's code is the right model.

---

## F3c — Variable Warning

**Finding: CLEAR**

The warning message is constructed as:

```tsx
{variables.length - filledCount === 1
  ? "1 variable is empty — run anyway?"
  : `${variables.length - filledCount} variables are empty — run anyway?`}
```

This renders **only a count integer** (`variables.length - filledCount`) interpolated into a template literal inside JSX. No variable name or value is included in the warning text itself.

**No `dangerouslySetInnerHTML` anywhere in this diff.** Confirmed by grep across all `src/` TSX/TS files — the only `dangerouslySetInnerHTML` in the codebase is in `src/app/layout.tsx` for the no-flash theme script, which is an inlined string literal, not user-supplied data.

**querySelector with variable name:** The "Fill it" button uses:
```tsx
panelRef.current?.querySelector<HTMLElement>(`#var-${firstEmpty.name}`)?.focus()
```
Variable names come from `extractVariables()` in `src/lib/variables.ts`, which extracts them from `{{token}}` patterns in the prompt body. These names are used as HTML `id` attributes (`id={`var-${variable.name}`}`) and here as querySelector selectors. A crafted variable name like `foo" onmouseover="...` or `foo]input` could technically produce a malformed selector string.

**Risk assessment:** Low. The querySelector is called on `panelRef.current` (a scoped DOM node, not `document`), and the worst outcome of an invalid selector is a caught exception — focus silently doesn't happen. There is no code execution path from a malformed selector. The variable names are also stored in and come from the user's own localStorage (their own prompt bodies), not from untrusted third-party input. Still, it's worth noting.

**Hardening recommendation (non-blocking):** Wrap the querySelector call in a try/catch, or sanitize variable names to alphanumeric+hyphen+underscore at extraction time in `extractVariables()`. The latter would also prevent edge cases in the `id` attribute and `htmlFor` uses.

---

## F3d — Expand Toggle

**Finding: CLEAR**

This is a pure UI state toggle. The entire change is:

1. New `useState<boolean>(false)` for `responseExpanded`.
2. A button that calls `setResponseExpanded((prev) => !prev)`.
3. A conditional `clsx` that adds or removes `max-h-72` from the response div's className.

No network calls. No localStorage reads or writes. No new user-supplied data. No new DOM APIs. The `responseExpanded` state is reset to `false` on prompt change (in the `useEffect` that resets all run state), so there's no stale-state leakage across prompts.

Attack surface delta: zero.

---

## F6 — Markdown Link Polish

**Finding: CLEAR — already merged to main (commit e32cc89)**

The branch contained only cosmetic changes to `src/components/Markdown.tsx`:
- `rel="noreferrer noopener"` → `rel="noopener noreferrer"` (canonical order, no functional change; both attributes present before and after)
- Added `focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1` classes to the `<a>` element

**rel="noopener noreferrer" on ALL external links:** Confirmed. The `Markdown.tsx` renderer has exactly one `<a>` render site (in the `Inline` function `case "link":`) and it carries both attributes. There is no other link-rendering surface in this component.

**href protocol allowlist:** This pre-dates the F6 branch but was audited as requested. The allowlist exists and is well-implemented:

In `src/lib/markdown.ts`:
```ts
const SAFE_PROTOCOL_RE = /^(https?:|mailto:)/i;

export function isSafeUrl(href: string): boolean {
  return SAFE_PROTOCOL_RE.test(href.trim());
}
```

This is called in two places inside `parseInline`:
1. Markdown `[text](url)` links — invalid href drops the href, renders text only (no link node emitted).
2. Bare URL auto-links — `isSafeUrl` gated before emitting a link node.

`javascript:` URIs would fail the regex and be demoted to plain text. `data:` URIs likewise. The `.trim()` call prevents whitespace-padding bypasses. The check is case-insensitive (`/i`), preventing `Javascript:` capitalization tricks.

**No `dangerouslySetInnerHTML`:** Confirmed. `Markdown.tsx` and `markdown.ts` both explicitly call this out in comments, and the grep confirms there is no such call. The renderer produces only React elements from the parsed AST.

---

## Issues

### Non-blocking hardening items (not BLOCKERs)

1. **No debounce/disable on Retry button (F3a):** Rapid clicks can stack concurrent API requests. Same gap exists on the main Run button. Recommend adding `disabled={running}` to both Retry buttons (rate-limit and overloaded). Cost: 2-line fix.

2. **querySelector with unvalidated variable name (F3c):** `#var-${firstEmpty.name}` is passed directly to querySelector. Variable names come from the user's own prompt bodies, so practical exploitability is self-only. Wrap in try/catch or constrain variable name characters at extraction time. Cost: small.

---

## ESCALATIONS

None. No blockers requiring Sky's decision. Both branches are safe to merge.

The two hardening notes above are recommendations for a follow-up pass — neither rises to BLOCK status for a single-user local tool where the only data flowing in is the user's own content and their own API key.
