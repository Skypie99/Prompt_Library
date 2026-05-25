# Steve — Prompt Library Tool Security & Robustness Audit
**Date:** 2026-05-25
**Mode:** background · model_tier: opus-4-7 · project: Prompt Library Tool · cycle_id: steve-bg-2026-05-25
**Eligibility:** Eligible for 1 reversible change per Const. 12.3 (not AUDIT-ONLY).

---

## Summary

The Prompt Library Tool's load-bearing security surfaces remain in good shape:
markdown rendering has no XSS path, the import flow validates shape at the
trust boundary, API key never appears in logs, console output, or error
messages.

One small robustness gap worth a tiny fix: the import-shape validator accepts
prompts whose `variables` field is an array of any object shape — it should
also verify each entry has `name: string` and `label: string`.

This audit cycle: writing a fix for the variables-validation gap is the most
useful change available across the change-eligible projects. **Applied as the
one cycle change** (see report bottom).

---

## Findings

### Markdown rendering — clean (verified, no action)

[src/components/Markdown.tsx:18](src/components/Markdown.tsx:18) parses to an
AST and renders via React elements. Every leaf is a `{string}` child. No
`dangerouslySetInnerHTML` in the response path. Links go through a protocol
allowlist (`https:` / `http:` / `mailto:`) at the parser level and are
rendered with `rel="noreferrer noopener"`. The one `dangerouslySetInnerHTML`
in [src/app/layout.tsx:35](src/app/layout.tsx:35) is the noFlash theme script
— a hard-coded string, not user input.

### API key handling — clean (verified)

- Stored in `localStorage` under `promptlib:apiKey`
  ([src/lib/settings.ts:27](src/lib/settings.ts:27)).
- Sent in `x-api-key` header only when running a prompt
  ([src/lib/anthropic.ts:104](src/lib/anthropic.ts:104)).
- `console.log` / `console.error` / `console.warn` over the apiKey surface
  returns no matches.
- Error mapping (`mapHttpError`) includes `detail` extracted from response
  body; Anthropic's error responses do not echo the request header, so this
  isn't a vector.
- `transfer.ts` import/export **excludes** apiKey from exports
  ([src/lib/transfer.ts:5](src/lib/transfer.ts:5)) — confirmed by the existing
  test "never includes apiKey/model/maxTokens".
- Settings input uses `type={showKey ? "text" : "password"}` and
  `autoComplete="off" spellCheck={false}` — appropriate hygiene.

### Storage failures — handled

`loadSettings`, `saveSettings`, `loadPersist`-like patterns across `lib/`
wrap `localStorage` in `try/catch` and return safe defaults / silently no-op
on quota or private-mode failures. `writeJSON` (via `library.ts`) returns a
structured `StorageWriteResult`, surfacing failures rather than silently
dropping writes. `runs.ts:MAX_RESPONSE_CHARS_PERSISTED = 32_000` caps any
individual run's persisted response to prevent quota exhaustion from one
runaway model output.

### Import validation — almost-clean

`parseImport`
([src/lib/transfer.ts:123](src/lib/transfer.ts:123))
correctly:
- Rejects malformed JSON / wrong envelope shape / future schema versions.
- Silently drops corrupt sub-entries (counted in `droppedCount`).
- Forces `isSeed: false` on all imported prompts so a malicious file can't
  smuggle in fake "official" prompts.
- Filters favorites/recent to string ids only.
- Validates each `StoredRun` shape rigorously (id, ranAt, model, values map,
  sentPrompt, response, status enum).

### Robustness gap — `isValidPromptShape` doesn't validate `variables` entries

[src/lib/transfer.ts:388-403](src/lib/transfer.ts:388)
checks:

```ts
if (!Array.isArray(p.variables)) return false;
```

…but does **not** verify each entry's shape. A maliciously-crafted (or just
buggy) import file with `variables: [{}, "not-an-object", null, 42]` passes
validation and lands in `localStorage`. Downstream:
- `PromptForm.tsx` renders inputs based on `variable.name` / `.label` —
  undefined values render as empty labels, no crash, just UX corruption.
- `substituteBody({{var}}, values)` works off the body's `{{name}}` tokens
  directly, not the variables array — so a broken variables array doesn't
  break substitution.

Not exploitable, but the validator is the trust boundary; tightening it
gives parity with the (already-strict) `isValidStoredRunShape` next door.
This is the **one change applied this cycle** (see bottom).

### No exposed secrets

Code grep confirms:
- No hard-coded API keys.
- No tokens or credentials in `prompts.json` or seed data.
- `.env*.local` patterns are gitignored.

---

## Already-known propose-only items still pending

Carrying over from `qa-2026-05-25-security-audit.md`:
- (none security-blocking — that report's lift was mainly verification
  toolchain-related, not code-substantive)

---

## Change applied this cycle

See companion `background-2026-05-25-steve-variables-fix.md` for the
verify+apply trail.

**File:** `src/lib/transfer.ts`
**Function:** `isValidPromptShape`
**Change:** Add per-entry validation for `p.variables` — each must have a
non-empty `name: string` and `label: string`; `placeholder` if present must
be a string.
**Branch:** `qa/auto-2026-05-25-steve-variables-validation`
**Test coverage:** Existing tests + new "import with malformed variables"
test asserts they are dropped not stored.

---

## Decisions for Sky

None blocking. The cycle change is small and additive — tighter validation,
no behavior change for well-formed exports.
