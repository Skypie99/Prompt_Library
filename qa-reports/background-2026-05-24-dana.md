---
mode: background
model_tier: opus-4.7
project: prompt-library-tool
cycle_id: dana-background-2026-05-24
role: Dana (Backend & Database Engineer)
branch: (none — AUDIT-ONLY per Const. 12.5 NOTE below)
base: main
constitution: v1.11 / AGENT_OS v1.11
art_12_compliance: HALT-check passed; observation-only audit; no commits; no external sends; `~/.claude/**`, governance docs untouched
---

# Dana — Prompt Library Tool background cycle 2026-05-24

## Posture

BACKGROUND mode. The Prompt Library is NOT in the AUDIT-ONLY list
(Const. 12.5 names only AccessMap + MutualMesh) — so technically a
≤1 reversible code change is permitted this cycle. I evaluated and
chose **not** to ship one. Rationale: the data layer is in genuinely
good shape, all the items I'd touch are observations rather than bugs,
and a Shamus run already landed a code change to this repo today
([background-2026-05-24.md](qa-reports/background-2026-05-24.md) — F8
empty state). Two background-mode commits to the same project on the
same day is more churn than the findings warrant. AUDIT this cycle;
proposals below for Sky to apply at leisure.

## Baseline check ✓

The Prompt Library has no Supabase or external DB — Dana's data-layer
remit here covers `localStorage` shape, schema versioning, persistence
helpers, and integrity. Reviewed:

- [src/lib/library.ts](src/lib/library.ts) (499 lines) — primary
  persistence module: schema versioning, user prompts, favorites,
  recent, onboarded flag, per-prompt values, storage usage readout,
  wipe-all
- [src/lib/runs.ts](src/lib/runs.ts) (274 lines) — per-prompt run
  history with validation, cap, cleanup
- [src/lib/settings.ts](src/lib/settings.ts) (71 lines) — API key,
  model, max tokens persistence
- [src/data/prompts.json](src/data/prompts.json) — seed prompts (read
  but not written)

## What's working well (codified for the LEARNINGS curator)

The localStorage layer hits every Dana checklist item from the role
brief's "Prompt Library specifically" line:

| Role-brief checkpoint | Status | Where |
|---|---|---|
| localStorage schema versioning | ✓ | [library.ts:19](src/lib/library.ts:19) — `SCHEMA_VERSION = 1` |
| Migration step | ✓ | [library.ts:483-498](src/lib/library.ts:483) — `runStorageMigrations()`, idempotent, called from HomeClient |
| Collision-safe IDs | ✓ | [library.ts:230-240](src/lib/library.ts:230) — `crypto.randomUUID()` with Math.random fallback (~83 bits entropy); [runs.ts:232-237](src/lib/runs.ts:232) — same pattern for run IDs |
| Surfaced write failures | ✓ | [library.ts:48-94](src/lib/library.ts:48) — module-level `onStorageWriteFailure` callback; `writeJSON()` returns structured `StorageWriteResult`; quota-detection across browser variants (`QuotaExceededError` + `NS_ERROR_DOM_QUOTA_REACHED`) |
| Normalized dates | ✓ | [library.ts:103-118](src/lib/library.ts:103) — `ISO_DATE_RE`, `isIsoDate`, `normalizeIsoDate`; applied in `coercePrompt` so loaded data sorts correctly |

Two further hardening choices worth recognizing:

- **Per-prompt cleanup cascade** ([library.ts:291-300](src/lib/library.ts:291)) — `purgePromptStorage(id)` wipes every per-prompt sub-key in one pass. Adding a new per-prompt feature requires only adding its prefix to `PER_PROMPT_PREFIXES`. No ghost-key accumulation.
- **SSR safety everywhere** — every `localStorage` access is guarded by `typeof window === "undefined"` returning the empty/fallback shape. Compatible with Next.js 15 static export.

## Observations (not bugs)

### P1 — `getStorageUsage()` hardcodes settings key names

[library.ts:404-407](src/lib/library.ts:404) literal-matches
`"promptlib:apiKey" | "promptlib:model" | "promptlib:maxTokens"`. The
canonical source for those keys is
[settings.ts:26-30](src/lib/settings.ts:26) `STORAGE_KEYS`. If someone
adds a fourth setting (e.g. a system-prompt prefix), the usage readout
would bucket it under "App state" instead of "Settings" — silently
incorrect.

**Proposal (no commit):** export a `SETTINGS_KEYS` constant from
`settings.ts`:

```ts
// settings.ts — change const → export const, drop the leading word.
export const SETTINGS_KEYS = {
  apiKey: "promptlib:apiKey",
  model: "promptlib:model",
  maxTokens: "promptlib:maxTokens",
} as const;

// existing internal alias kept for backward compatibility:
const STORAGE_KEYS = SETTINGS_KEYS;
```

Then in [library.ts:404-407](src/lib/library.ts:404):

```ts
import { SETTINGS_KEYS } from "./settings";

// ...

} else if (
  (Object.values(SETTINGS_KEYS) as string[]).includes(key)
) {
  buckets["Settings (API key, model, tokens)"] += cost;
}
```

Pure refactor; no on-disk shape change. Single-file edits in
`settings.ts` + `library.ts` + maybe one unit test.

### P2 — `settings.ts` write path doesn't surface failures

[settings.ts:62-70](src/lib/settings.ts:62) `saveSettings()` swallows
errors silently in the `catch {}`. The rest of the app routes through
`writeJSON()` (which raises to the `onStorageWriteFailure` banner). If
the user types their API key and storage is full, the key isn't
persisted AND the user sees no banner — they'll hit "no API key" the
next session and not know why.

**Proposal (no commit):**

```ts
import { writeJSON } from "./library";

export function saveSettings(settings: Settings): void {
  writeJSON(SETTINGS_KEYS.apiKey, settings.apiKey);
  writeJSON(SETTINGS_KEYS.model, settings.model);
  writeJSON(SETTINGS_KEYS.maxTokens, String(settings.maxTokens));
}
```

Same surface as before (still returns void) but now the failure handler
fires consistently. The `writeJSON` wrapper double-encodes strings as
JSON; for raw-string values like the API key, that's a minor change in
on-disk shape — bump `SCHEMA_VERSION` to 2 and add a one-time migration
to re-read the legacy raw-string values and write them through the new
path. Concrete migration block (drop in `runStorageMigrations()`):

```ts
// ---- v1 -> v2 -----------------------------------------------------------
// Migrate settings keys from raw-string storage to writeJSON's JSON shape.
// Each value was stored as a bare string ("sk-xxx", "claude-opus-4-7",
// "2048"); the new path JSON-encodes them ("\"sk-xxx\"", etc.). Read raw
// first, then if it doesn't parse as JSON, treat it as a legacy raw value
// and re-write through writeJSON.
if (stored < 2) {
  const settingsKeys = ["promptlib:apiKey", "promptlib:model", "promptlib:maxTokens"];
  for (const key of settingsKeys) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    let isJsonString = false;
    try {
      const parsed = JSON.parse(raw);
      isJsonString = typeof parsed === "string";
    } catch {
      // Not parseable — legacy raw string.
    }
    if (!isJsonString) {
      writeJSON(key, raw);
    }
  }
  stored = 2;
}
// ---- end of v1 -> v2 ----------------------------------------------------
```

Or — simpler — leave `saveSettings` as-is and accept the tiny
inconsistency. P2 is a nice-to-have, not a correctness bug. **Sky's
choice.**

### P3 — `loadOnboarded()` uses `=== true` against `readJSON<boolean>(..., false)`

[library.ts:200-202](src/lib/library.ts:200). `readJSON` already
narrows on the type parameter; the `=== true` guard is belt-and-braces
against a legacy stored value that wasn't a strict boolean (e.g. the
string `"true"` from an earlier shape). Harmless paranoia and probably
worth keeping — flagging only because a future reader might ask "why
the redundant compare?" Worth a one-line code comment:

```ts
// === true guards against legacy non-boolean values returning truthy from
// readJSON (e.g. a stray "true" string would not have been narrowed).
return readJSON<boolean>(STORAGE_KEYS.onboarded, false) === true;
```

### P4 — No per-key max-size guard on `userPrompts`

`saveUserPrompts` writes the entire array through `writeJSON`. Quota
failure surfaces correctly via the handler. But there's no
"this single prompt is too big to persist" trim, unlike `appendRun`
which trims responses to `MAX_RESPONSE_CHARS_PERSISTED = 32_000`
([runs.ts:41](src/lib/runs.ts:41)).

In practice, prompt bodies are short (the LLM call's *response* is
where bulk lives, and that's handled). Worth noting as a future
hardening item if Sky ever sees a quota issue traced to a single
runaway prompt body. **Not actionable today.**

## What I did NOT touch

- No code changes shipped. The proposals above are intended for Sky's
  review and a future small PR (or to defer indefinitely — P1/P3 are
  cosmetic; P2 has a non-trivial migration cost; P4 is forward-looking).
- No new branches, no commits, no external sends.

## DECISIONS FOR SKY

1. **P1 (SETTINGS_KEYS export refactor)** — approve / defer / decline?
   Smallest item, cleanest win.
2. **P2 (settings.ts → writeJSON path)** — approve with migration /
   defer / decline? Adds a `SCHEMA_VERSION` bump; worth the
   one-time cost for consistent error surfacing, but not blocking.
3. **P3 (one-line comment)** — approve as a drive-by add next time
   anyone touches [library.ts:200](src/lib/library.ts:200) / decline.

None of these are urgent; queue at convenience.

## Const. Art. 12 compliance ledger

- HALT sentinel check: passed.
- ≤1 reversible scoped change: zero changes shipped (I evaluated and
  chose not to — see Posture).
- Hard exclusions: respected. No touch to `~/.claude/**` or
  governance docs.
- External sends: none. Morgan picks this up.

## End of cycle
