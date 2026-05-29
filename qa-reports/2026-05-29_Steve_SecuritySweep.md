# Steve — Security & Robustness Sweep
**Date:** 2026-05-29
**Branch:** `steve/auto-2026-05-29-security-hardening`
**PR:** https://github.com/Skypie99/Prompt_Libary/pull/3
**Stack:** Next.js 15 static export, React 19, TypeScript strict, localStorage only, Anthropic API called from browser

---

## Findings

### MEDIUM — SSE error message leak in `handleEvent()` (FIXED)

**File:** `src/lib/anthropic.ts` line 120 (pre-fix)

`handleEvent()` was constructing a `ClaudeError` with `payload.error?.message` taken directly from the Anthropic streaming API's SSE error event body. This raw message was then displayed directly in the UI as `{error.message}`. Anthropic SSE error payloads may contain internal context: policy labels, token counts, model identifiers — none of which are useful to an end user and could be confusing or misleading.

**Fix:** Replaced with the same generic hardcoded message used by the HTTP-level `mapHttpError()` fallback: `"Something went wrong on Claude's side. Please try again."` — consistent surface, no internal detail leakage.

### LOW — HTTP `mapHttpError` suffix interpolation (FIXED)

**File:** `src/lib/anthropic.ts` (pre-fix)

`mapHttpError()` was constructing `bad-request` and `unknown` error messages with a `${suffix}` variable interpolated from raw API response body detail. While the `bad-request` case already had a comment noting this concern, the generic `unknown` case was still interpolating. Fixed to hardcoded strings.

### LOW — Form inputs lacked `maxLength` guards (FIXED)

**Files:** `src/components/PromptForm.tsx`, `src/components/RunHistory.tsx`, `src/components/SettingsModal.tsx`

User-facing text inputs (prompt title, description, body, category, tags, API key, run label) had no `maxLength` attribute. A user could paste arbitrarily large content that would be sent directly to the Anthropic API or persisted to localStorage. Added:

- `maxLength={200}` — title
- `maxLength={500}` — description
- `maxLength={50000}` — body
- `maxLength={100}` — category
- `maxLength={50}` — individual tag
- `maxLength={100}` — run label
- `maxLength={300}` — API key (Anthropic keys are ~100 chars; 300 is generous)

### LOW — Library import had no file size cap (FIXED)

**File:** `src/components/SettingsModal.tsx`

The JSON library import path read the file contents via `FileReader` with no size check first. A user who accidentally selected a large file (video, binary dump) would stall the UI while `FileReader` loaded it. Added a 10 MB guard before reading that returns a friendly error and resets the input.

---

## Areas inspected and found clean

| Area | Finding |
|---|---|
| API key safety | Never logged, never interpolated into error messages, only passed as `fetch` header. The settings module comment explicitly documents this. |
| `maxTokens` / model validation | `clampMaxTokens()` enforces [256, 8192] at both load time and save time. `isKnownModel()` allowlist prevents unknown model IDs reaching the API. No `temperature` parameter used at all. |
| localStorage write resilience | All writes route through `writeJSON` in `library.ts` which properly detects `QuotaExceededError` / `NS_ERROR_DOM_QUOTA_REACHED` and surfaces to a top-of-page banner handler. `saveSettings()` silently swallows (documented, intentional for ephemera). |
| localStorage read validation | All reads use typed parse + validator functions (`isValidPrompt`, `isStoredRun`, `isStringRecord`, `isKnownModel`, `clampMaxTokens`). Corrupt/missing entries fall back gracefully. |
| XSS / content injection | Single `dangerouslySetInnerHTML` in `layout.tsx` is a **static build-time literal** (`noFlashTheme`) — no user data, no runtime interpolation. |
| Markdown renderer | Custom AST renderer with no `dangerouslySetInnerHTML`. URL href validated against `SAFE_PROTOCOL_RE` allowlist (`https?:` / `mailto:`). All text leaf nodes are plain React children — React's automatic escaping applies. |
| AbortController cleanup | `PromptDetail` holds an `abortRef`, calls `.abort()` on prompt change and on unmount. Rate-limit countdown interval also cleared on unmount. No setState-after-unmount risk. |
| `useEffect` cleanup returns | All event listener `useEffect`s return cleanup functions. |
| Console logging | No `console.log/warn/error` calls in production paths that could expose API key or error internals. |

---

## npm audit

```
7 moderate severity vulnerabilities
```

No HIGH or CRITICAL. The moderate vulns are in `vite` and `postcss` (transitive via Next.js). Fixing would require `npm audit fix --force` which installs Next.js 9.3.3 — a major breaking change. **Not auto-fixed.** Recommend monitoring upstream Next.js releases.

---

## Test results

```
Test Files  19 passed (19)
     Tests  324 passed (324)
```

Typecheck: 0 errors (`tsc --noEmit`).

---

## DECISIONS FOR SKY

None required. All changes are high-confidence, minimal-diff fixes with no behaviour change for the happy path. Tests pass.
