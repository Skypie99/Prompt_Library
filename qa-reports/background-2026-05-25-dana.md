---
mode: background
model_tier: opus-4.7
project: prompt-library
cycle_id: dana-background-2026-05-25
role: Dana (Backend & Database Engineer)
branch: data/auto-2026-05-25-dana-clamp-maxtokens
base: main
constitution: v1.11 / AGENT_OS v1.11
art_12_compliance: HALT-check passed; ≤1 reversible change applied (loadSettings maxTokens clamp + test); no external sends; ~/.claude/** and ~/ClaudeCorp/.claude/** untouched
---

# Dana — Prompt Library background cycle 2026-05-25

## Posture for this cycle

No live database, no backend. Data layer = `src/lib/*` (persistence
helpers) + `localStorage['promptlib:*']`. Eligible for the single
per-cycle change (Const. 12.3). This cycle's change slot is spent here
on the highest-impact eligible item: **clamping `loadSettings().maxTokens`
to match the `[256, 8192]` range that `SettingsModal.handleSave` already
enforces on the save path** — closing a known load-path gap pinned by a
documented test.

## Baseline (what's on disk)

**Persistence layer modules:**
- [src/lib/library.ts](src/lib/library.ts) (498 lines) — Schema version,
  storage primitives (`readJSON` / `writeJSON` with structured `StorageWriteResult`),
  validators, per-prompt cascade purge, storage usage readout, migrations
  scaffold (`runStorageMigrations`).
- [src/lib/runs.ts](src/lib/runs.ts) (273 lines) — Per-prompt run history,
  `RUNS_PER_PROMPT_CAP = 10`, `MAX_RESPONSE_CHARS_PERSISTED = 32_000`.
  Routes writes through library.ts `writeJSON` so quota errors surface
  to the same banner.
- [src/lib/settings.ts](src/lib/settings.ts) (70 lines) — apiKey, model,
  maxTokens. Hand-rolled persistence; bypasses `writeJSON` (more on this
  below).
- [src/lib/transfer.ts](src/lib/transfer.ts) (429 lines) — JSON export
  / import.

**localStorage key namespace:** all keys prefixed `promptlib:` — no
collision risk with other apps on the same origin ✓.

**Schema version:** `promptlib:schemaVersion = 1`. `runStorageMigrations()`
in library.ts is the migration pipeline. Currently a v0→v1 stamp with no
structural change.

**Baseline tests:** 12 suites, **214 tests passing** before the change.
(Verified with `npm test`.)

**TypeScript drift:** none. All persistence helpers correctly model
their stored shapes; no `any` slipping through.

## Findings

### F1 — `loadSettings().maxTokens` accepts unbounded values; SettingsModal clamps but load does not 🟡 medium (FIXED THIS CYCLE)

[src/lib/settings.ts:55](src/lib/settings.ts:55):
```ts
const maxTokens = Number.isFinite(parsedMax) ? parsedMax : DEFAULT_MAX_TOKENS;
```

[src/components/SettingsModal.tsx:103–105](src/components/SettingsModal.tsx:103):
```ts
const safeMax = Number.isFinite(parsed)
  ? Math.min(8192, Math.max(256, Math.round(parsed)))
  : DEFAULT_MAX_TOKENS;
```

The save path clamps to `[256, 8192]`; the load path does not. The test
suite has been pinning this gap as a known issue
([src/lib/__tests__/settings.test.ts:158–162](src/lib/__tests__/settings.test.ts:158)):

```ts
it("currently does not clamp absurdly-large stored maxTokens (gap to close)", () => {
  const store = installLocalStorage();
  store["promptlib:maxTokens"] = "1000000000";
  expect(loadSettings().maxTokens).toBe(1_000_000_000);
});
```

**Real-world impact:** a stored `1_000_000_000` flows through `loadSettings` →
`HomeClient.tsx` `settings` state → `PromptDetail.tsx:289` `maxTokens:
settings.maxTokens` → the `Anthropic.messages.create({ max_tokens: 1_000_000_000 })`
call. The Anthropic API will reject it with a 400, but the cost is wasted
network round-trip, confused user, and (more importantly) a load-time
contract that doesn't match the save-time contract. The fix codifies the
same range on both sides.

**Fix applied this cycle:**
```ts
// src/lib/settings.ts
export const MIN_MAX_TOKENS = 256;
export const MAX_MAX_TOKENS = 8192;

function clampMaxTokens(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_TOKENS;
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(n)));
}

// loadSettings():
const maxTokens = rawMax !== null ? clampMaxTokens(Number(rawMax)) : DEFAULT_MAX_TOKENS;
```

Test that was pinning the gap flipped to assert clamped value (`MAX_MAX_TOKENS = 8192`).
214 → 214 tests still passing post-change. Typecheck green.

### F2 — `saveSettings` swallows storage errors silently (inconsistent with library.ts contract) 🟡 medium (NOT actioned — bundle with F1 follow-up)

[src/lib/settings.ts:62–70](src/lib/settings.ts:62):
```ts
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.apiKey, settings.apiKey);
    localStorage.setItem(STORAGE_KEYS.model, settings.model);
    localStorage.setItem(STORAGE_KEYS.maxTokens, String(settings.maxTokens));
  } catch {
    /* localStorage unavailable (private mode / disabled) — settings just won't persist. */
  }
}
```

The library.ts file header is explicit about the design discipline:
> All writes go through `writeJSON`, which returns a structured outcome
> instead of silently swallowing — callers can react to quota / disabled
> storage (e.g. show a banner) instead of losing data invisibly.

`saveSettings` doesn't follow that discipline. It returns `void`, swallows
the catch, and the user has no way to know their API key save failed in
Safari private mode. The apiKey field is the only piece of user-settings
state that *cannot* be re-derived after a session — losing it silently
means the next prompt run errors out with "no API key configured" and
the user can't tell whether they typed it wrong or whether storage failed.

**Why not actioned this cycle:** changing `saveSettings` to return
`StorageWriteResult` ripples to `HomeClient.tsx:193`
(`saveSettings(next);`) which would need to consume the result and route
into the same `onStorageWriteFailure` handler that library.ts sets up.
That's two-file change + ripple coverage in tests — modest scope but
crosses Const. 12.3's "≤1 reversible change" budget for this cycle.

**Proposed for next data/ cycle:**
```ts
// src/lib/settings.ts
import { writeJSON, type StorageWriteResult } from "./library";

export function saveSettings(settings: Settings): StorageWriteResult {
  // apiKey is a sensitive raw-string field; can't go through JSON.stringify
  // wrapping since it'd be doubly-quoted. Inline the try/catch and surface
  // the same StorageWriteResult shape for caller consistency.
  if (typeof window === "undefined") {
    return { ok: false, reason: "unavailable", error: null };
  }
  try {
    localStorage.setItem(STORAGE_KEYS.apiKey, settings.apiKey);
    localStorage.setItem(STORAGE_KEYS.model, settings.model);
    localStorage.setItem(STORAGE_KEYS.maxTokens, String(settings.maxTokens));
    return { ok: true };
  } catch (error) {
    const name = (error as { name?: string } | null)?.name ?? "";
    const reason =
      name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED"
        ? ("quota" as const) : ("unknown" as const);
    return { ok: false, reason, error };
  }
}
```

And `HomeClient.tsx:191–194`:
```ts
const updateSettings = useCallback((next: Settings) => {
  setSettings(next);
  const result = saveSettings(next);
  // onStorageWriteFailure handler set elsewhere will surface a banner if !result.ok
}, []);
```

### F3 — Schema migration scaffold is set up but never used 🟢 low

[src/lib/library.ts:474–498](src/lib/library.ts:474):
```ts
export function runStorageMigrations(): void {
  let stored = readJSON<number>(STORAGE_KEYS.schemaVersion, 0);
  if (stored < 1) {
    stored = 1;  // v0 → v1: stamp the current shape; no structural change yet.
  }
  writeJSON(STORAGE_KEYS.schemaVersion, stored);
}
```

This is well-shaped scaffolding — exactly the pattern the Pac-Man report
recommended for future shape changes. No active migration runs today.
**No action.** If/when a future feature requires changing the shape of
`userPrompts`, `cardStats`-equivalent, or any per-prompt sub-key,
extend `runStorageMigrations` with a new `if (stored < 2) { … stored = 2; }`
block.

### F4 — `generateId(title)` is collision-safe via crypto.randomUUID with Math.random fallback 🟢 low (observation only)

[src/lib/library.ts:227–238](src/lib/library.ts:227):
```ts
export function generateId(title: string): string {
  let suffix: string;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    suffix = crypto.randomUUID();
  } else {
    suffix =
      Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  return `${slugify(title)}-${suffix}`;
}
```

Good defense-in-depth: tries `crypto.randomUUID()` (every modern browser)
and falls back to a 16-char base-36 string (~83 bits of entropy, still
collision-safe). The slug prefix is for readability; the UUID is the
collision guard. **No action.**

### F5 — `ISO_DATE_RE` permits offsets without colons; not a roundtrip-safe shape 🟢 low

[src/lib/library.ts:103](src/lib/library.ts:103):
```ts
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;
```

Accepts `2026-05-25T18:00:00+0530` (no colon in offset) which is legal
ISO 8601 *basic* but NOT the same shape `new Date().toISOString()` produces
(`...Z`). String-compare sorting would put `...+0530` AFTER `...Z` at the
same instant. The current path (`normalizeIsoDate`) re-runs `new Date(...).toISOString()`
on anything that doesn't match the regex, so a `+0530` shape passes the
regex but doesn't get normalized — sorts wrong.

**Why it's still safe today:** the only writer (`generateId`, runs.ts,
etc.) writes `new Date().toISOString()` which always produces the
`Z`-suffix form. The regex tolerance is for imported JSON from an
unknown source — `transfer.ts` import. If a user imports a bundle from
a tool that emits `+0530` offsets, the sort order will be off until the
next `coercePrompt` pass.

**Recommendation (deferred):** tighten the regex to require the
`Z`-or-`±HH:MM` colon form, OR call `normalizeIsoDate` unconditionally
in `coercePrompt` instead of trusting the regex. Probably the latter —
cheaper and more conservative.

## What I checked and didn't find

- No drift between `STORAGE_KEYS` in `library.ts` and `settings.ts` —
  both use `promptlib:*` prefix consistently.
- No leak of API key into non-apiKey storage paths.
- `wipeAllUserData()` correctly enumerates per-prompt prefixes via the
  `PER_PROMPT_PREFIXES` constant; no duplicated knowledge of feature keys.
- `purgePromptStorage(id)` walks the same `PER_PROMPT_PREFIXES`, so
  delete-prompt fully cleans up. Tests cover this.

## Change applied this cycle (≤1 per Const. 12.3)

**Branch:** `data/auto-2026-05-25-dana-clamp-maxtokens`
**Files:**
- `src/lib/settings.ts` — add `MIN_MAX_TOKENS = 256`, `MAX_MAX_TOKENS = 8192`,
  `clampMaxTokens()` helper; route `loadSettings().maxTokens` through it.
- `src/lib/__tests__/settings.test.ts` — flip the pinned gap test to
  assert clamped value, update the comment to record the closure.

**Verification:**
- `npm test` — 214/214 passing (same count, behavior preserved for valid values).
- `npm run typecheck` — green.

**Not merged** per BACKGROUND mode discipline. Branch left for Sky /
Morgan to inspect and merge if desired.

## Decisions for Sky

1. **Merge `data/auto-2026-05-25-dana-clamp-maxtokens`** — small,
   reversible, closes a documented gap. Pure persistence hardening.
2. **F2 — schedule saveSettings StorageWriteResult upgrade** for the
   next Dana cycle. Two-file change; modest scope; lifts the silent
   save-failure failure mode that's the most user-confusing storage
   bug class on this app.
3. **F5 — tighten or normalize-always for ISO dates.** Defer until
   `transfer.ts` import grows a non-Z-suffix consumer.

## What I did NOT touch (Const. Art. 12 compliance ledger)

- Wrote nothing to `~/.claude/**` or `~/ClaudeCorp/.claude/**`.
- Made no commits to AccessMap or MutualMesh (those projects are
  AUDIT-ONLY per 12.5).
- Sent no external messages.
- No deploy, no app-store submit.

## End of cycle

Morgan picks up. The qa-report describes the audit; the `data/` branch
holds the single reversible change.
