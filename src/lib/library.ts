import type { Prompt, PromptVariable } from "./types";

// Everything the user creates or curates, persisted to localStorage. Seed
// prompts stay in prompts.json and are never written here.
//
// Storage discipline:
//  - Every key is prefixed `promptlib:` so an unrelated app on the same
//    origin can never collide.
//  - The version key (`promptlib:schemaVersion`) is the single source of
//    truth for the on-disk shape. Bumped only when we do a breaking change;
//    bump triggers the migration step in `runStorageMigrations()`.
//  - Per-prompt sub-keys (runs, values, etc.) live under `promptlib:<feature>:<id>`
//    so `purgePromptStorage(id)` can wipe everything for a deleted prompt
//    in one pass without enumerating each feature key separately.
//  - All writes go through `writeJSON`, which returns a structured outcome
//    instead of silently swallowing — callers can react to quota / disabled
//    storage (e.g. show a banner) instead of losing data invisibly.

export const SCHEMA_VERSION = 1;

const STORAGE_KEYS = {
  schemaVersion: "promptlib:schemaVersion",
  userPrompts: "promptlib:userPrompts",
  favorites: "promptlib:favorites",
  recent: "promptlib:recent",
  onboarded: "promptlib:onboarded",
} as const;

// Per-prompt key prefixes. Keep the prefix list in `PER_PROMPT_PREFIXES`
// so `purgePromptStorage()` stays a one-liner when a new feature lands.
const PER_PROMPT_PREFIXES = [
  "promptlib:runs:", // F1 (run history) — added in a later commit
  "promptlib:values:", // F2 (saved variable values) — added in a later commit
  "promptlib:model:", // F3b (per-prompt model switcher) — added in a later commit
] as const;

export const RECENT_CAP = 10;

// ---------------------------------------------------------------------------
// Storage primitives
// ---------------------------------------------------------------------------

export type StorageWriteResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "quota" | "unknown"; error: unknown };

// Module-level listener so the app can surface write failures (toast / banner)
// without every call site duplicating error handling. Set once in HomeClient.
let onStorageWriteFailure: ((result: Exclude<StorageWriteResult, { ok: true }>) => void) | null =
  null;

export function setStorageWriteFailureHandler(
  handler: ((result: Exclude<StorageWriteResult, { ok: true }>) => void) | null,
): void {
  onStorageWriteFailure = handler;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Exported so feature modules (e.g. runs.ts) can route through the same
// write-failure surface instead of swallowing quota errors silently and
// leaving the user wondering where their data went.
export function writeJSON(key: string, value: unknown): StorageWriteResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "unavailable", error: null };
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    // QuotaExceededError is the one users actually hit. The constructor name
    // varies by engine ("QuotaExceededError" in modern browsers,
    // "NS_ERROR_DOM_QUOTA_REACHED" historically in Firefox).
    const name = (error as { name?: string } | null)?.name ?? "";
    const reason: "quota" | "unknown" =
      name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" ? "quota" : "unknown";
    const result: Exclude<StorageWriteResult, { ok: true }> = {
      ok: false,
      reason,
      error,
    };
    onStorageWriteFailure?.(result);
    return result;
  }
}

// Like writeJSON but stores a raw string instead of JSON.stringify'd value.
// Use for settings keys whose readers call localStorage.getItem() directly
// rather than JSON.parse — ensures round-trip fidelity while still routing
// failures through the same onStorageWriteFailure banner path.
export function writeRaw(key: string, value: string): StorageWriteResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "unavailable", error: null };
  }
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    const name = (error as { name?: string } | null)?.name ?? "";
    const reason: "quota" | "unknown" =
      name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" ? "quota" : "unknown";
    const result: Exclude<StorageWriteResult, { ok: true }> = { ok: false, reason, error };
    onStorageWriteFailure?.(result);
    return result;
  }
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

// ISO 8601 detection. Sufficient for our use — we only need to know a stored
// value WILL sort correctly with localeCompare. Tolerates the timezone-less
// form and the Z-suffixed form.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value);
}

// Normalize anything date-shaped to an ISO string. Falls back to "now" if
// the input is unparseable so a single bad import never breaks sorting.
export function normalizeIsoDate(value: unknown): string {
  if (isIsoDate(value)) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function isPromptVariable(value: unknown): value is PromptVariable {
  const v = value as Partial<PromptVariable> | null;
  return !!v && typeof v.name === "string" && typeof v.label === "string";
}

function isValidPrompt(value: unknown): value is Prompt {
  const p = value as Partial<Prompt> | null;
  if (!p) return false;
  if (typeof p.id !== "string" || p.id.length === 0) return false;
  if (typeof p.title !== "string" || p.title.length === 0) return false;
  if (typeof p.body !== "string") return false;
  if (typeof p.description !== "string") return false;
  if (typeof p.category !== "string") return false;
  if (!Array.isArray(p.tags) || !p.tags.every((t) => typeof t === "string")) return false;
  if (!Array.isArray(p.variables) || !p.variables.every(isPromptVariable)) return false;
  if (typeof p.isSeed !== "boolean") return false;
  if (typeof p.createdAt !== "string") return false;
  return true;
}

// Coerce a stored prompt back into a clean shape — useful when reading from
// localStorage where the entry MIGHT have been written before a validator
// tightened up. Drops entries that are too broken to repair.
function coercePrompt(value: unknown): Prompt | null {
  if (!isValidPrompt(value)) return null;
  return {
    ...value,
    createdAt: normalizeIsoDate(value.createdAt),
  };
}

// ---------------------------------------------------------------------------
// User prompts
// ---------------------------------------------------------------------------

export function loadUserPrompts(): Prompt[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.userPrompts, []);
  if (!Array.isArray(data)) return [];
  const out: Prompt[] = [];
  for (const entry of data) {
    const coerced = coercePrompt(entry);
    if (coerced) out.push(coerced);
  }
  return out;
}

export function saveUserPrompts(prompts: Prompt[]): StorageWriteResult {
  return writeJSON(STORAGE_KEYS.userPrompts, prompts);
}

// ---------------------------------------------------------------------------
// Favorites (array of prompt ids)
// ---------------------------------------------------------------------------

export function loadFavorites(): string[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.favorites, []);
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}

export function saveFavorites(ids: string[]): StorageWriteResult {
  return writeJSON(STORAGE_KEYS.favorites, ids);
}

// ---------------------------------------------------------------------------
// Recent (array of prompt ids, most-recent first, capped)
// ---------------------------------------------------------------------------

export function loadRecent(): string[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.recent, []);
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}

export function saveRecent(ids: string[]): StorageWriteResult {
  return writeJSON(STORAGE_KEYS.recent, ids);
}

// ---------------------------------------------------------------------------
// Onboarding flag
// ---------------------------------------------------------------------------

export function loadOnboarded(): boolean {
  return readJSON<boolean>(STORAGE_KEYS.onboarded, false) === true;
}

export function saveOnboarded(): StorageWriteResult {
  return writeJSON(STORAGE_KEYS.onboarded, true);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Merge user prompts with seeds and sort newest-first. createdAt is
// normalized to ISO at load time, so localeCompare is also chronological.
export function mergePrompts(userPrompts: Prompt[], seedPrompts: Prompt[]): Prompt[] {
  return [...userPrompts, ...seedPrompts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "prompt";
}

// Slug + full UUID suffix keeps ids readable AND collision-resistant. Old
// ids ("foo-ab12") keep working — the resolver matches by exact id only.
// `crypto.randomUUID` exists in every modern browser; the polyfilled fallback
// uses Math.random for the rare environment without it.
export function generateId(title: string): string {
  let suffix: string;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    suffix = crypto.randomUUID();
  } else {
    // 16 base-36 chars = ~83 bits of entropy — collision-safe even at scale.
    suffix = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  return `${slugify(title)}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Per-prompt variable values (F2 — variable values persistence)
// ---------------------------------------------------------------------------
//
// Remembers the in-flight {{variable}} values the user typed into a prompt's
// detail form, so reopening the prompt lands you back where you were rather
// than wiping the form. Keyed per prompt id so each prompt has its own
// independent draft. Cleared by the Clear button in PromptDetail or by the
// `purgePromptStorage(id)` cascade when the prompt itself is deleted.

const VALUES_PREFIX = "promptlib:values:";

function valuesKey(id: string): string {
  return `${VALUES_PREFIX}${id}`;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const v of Object.values(value)) {
    if (typeof v !== "string") return false;
  }
  return true;
}

export function loadValues(promptId: string): Record<string, string> {
  const data = readJSON<unknown>(valuesKey(promptId), {});
  return isStringRecord(data) ? data : {};
}

export function saveValues(promptId: string, values: Record<string, string>): StorageWriteResult {
  return writeJSON(valuesKey(promptId), values);
}

export function clearValues(promptId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(valuesKey(promptId));
  } catch {
    /* unavailable — no-op. */
  }
}

// ---------------------------------------------------------------------------
// Per-prompt model selection (F3b — inline model switcher)
// ---------------------------------------------------------------------------
//
// Remembers the last model the user selected in the per-prompt run info-bar.
// Keyed per prompt id so each prompt can default to a different model.
// Falls back to null (caller uses the global settings model) when nothing is
// stored. Cleared by `purgePromptStorage(id)` when the prompt is deleted.

const MODEL_PREFIX = "promptlib:model:";

function modelKey(id: string): string {
  return `${MODEL_PREFIX}${id}`;
}

export function loadPromptModel(promptId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(modelKey(promptId));
  } catch {
    return null;
  }
}

export function savePromptModel(promptId: string, modelId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(modelKey(promptId), modelId);
  } catch {
    /* unavailable — no-op */
  }
}

export function clearPromptModel(promptId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(modelKey(promptId));
  } catch {
    /* unavailable — no-op */
  }
}

// ---------------------------------------------------------------------------
// Per-prompt storage cleanup
// ---------------------------------------------------------------------------

// Wipe every per-prompt storage entry for the given id. Call from the
// `deletePrompt` action so feature keys (run history, saved variable values,
// future per-prompt state) don't accumulate forever as ghost entries.
export function purgePromptStorage(id: string): void {
  if (typeof window === "undefined") return;
  try {
    for (const prefix of PER_PROMPT_PREFIXES) {
      localStorage.removeItem(`${prefix}${id}`);
    }
  } catch {
    /* unavailable — see writeJSON */
  }
}

/**
 * Enumerate every prompt id that currently has at least one per-prompt
 * sub-key in storage (for the given prefix). Used by F5 (export) to gather
 * runs/values for every prompt — defensive: returns ghost ids too (a prompt
 * that was deleted but whose sub-keys lingered before purgePromptStorage
 * landed). The export caller filters down to ids that still exist as user
 * prompts.
 */
export function listStoredPromptIdsByPrefix(prefix: string): string[] {
  if (typeof window === "undefined") return [];
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        ids.push(key.slice(prefix.length));
      }
    }
  } catch {
    /* unavailable */
  }
  return ids;
}

/** All per-prompt key prefixes the app currently uses. Exported so the
 *  transfer module can enumerate runs + values + any future feature keys
 *  in one place. */
export const PER_PROMPT_PREFIXES_PUBLIC: readonly string[] = PER_PROMPT_PREFIXES;

// ---------------------------------------------------------------------------
// Storage usage readout (F-fast-3)
// ---------------------------------------------------------------------------

/**
 * The shape returned by `getStorageUsage()` — a coarse breakdown of how
 * much of the user's localStorage is taken up by this app. Rendered as a
 * tiny readout in Settings so users can see "where my space is going" at
 * a glance.
 *
 * `bytes` is a UTF-16 char-count approximation — `JSON.stringify(value)
 * .length * 2`. Browser quotas are usually expressed in characters and
 * not bytes, and the per-origin cap varies (5-10 MB), so we report a
 * "~rough" total and don't try to claim a quota percentage.
 */
export interface StorageUsage {
  totalBytes: number;
  buckets: {
    label: string;
    bytes: number;
  }[];
  /** Number of distinct prompt ids that have any per-prompt sub-key. */
  promptsWithSubKeys: number;
}

function approxByteSizeOf(key: string, value: string): number {
  // localStorage stores strings as UTF-16 in most engines; the heuristic
  // doubles char count. Add the key length too — it counts against quota.
  return (key.length + value.length) * 2;
}

/**
 * Walk every promptlib:* localStorage key once and bucket the byte cost
 * into human-readable categories. SSR-safe. O(N) where N is the count of
 * promptlib keys; cheap even for heavy users.
 */
export function getStorageUsage(): StorageUsage {
  const buckets: Record<string, number> = {
    "Prompts (custom)": 0,
    "Run history": 0,
    "Saved variable values": 0,
    "Favorites + Recent": 0,
    "Settings (API key, model, tokens)": 0,
    "App state (theme, schema, onboarding)": 0,
  };
  const promptIdSet = new Set<string>();

  if (typeof window === "undefined") {
    return {
      totalBytes: 0,
      buckets: Object.entries(buckets).map(([label, bytes]) => ({ label, bytes })),
      promptsWithSubKeys: 0,
    };
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("promptlib:")) continue;
      const value = localStorage.getItem(key) ?? "";
      const cost = approxByteSizeOf(key, value);

      if (key === STORAGE_KEYS.userPrompts) {
        buckets["Prompts (custom)"] += cost;
      } else if (key.startsWith("promptlib:runs:")) {
        buckets["Run history"] += cost;
        promptIdSet.add(key.slice("promptlib:runs:".length));
      } else if (key.startsWith("promptlib:values:")) {
        buckets["Saved variable values"] += cost;
        promptIdSet.add(key.slice("promptlib:values:".length));
      } else if (key.startsWith("promptlib:model:")) {
        // Per-prompt model selection (F3b) — tiny; bucket into "Saved variable values"
        // since it's the same per-prompt draft pattern (not a separate category worth
        // its own row in the readout).
        buckets["Saved variable values"] += cost;
        promptIdSet.add(key.slice("promptlib:model:".length));
      } else if (key === STORAGE_KEYS.favorites || key === STORAGE_KEYS.recent) {
        buckets["Favorites + Recent"] += cost;
      } else if (
        key === "promptlib:apiKey" ||
        key === "promptlib:model" ||
        key === "promptlib:maxTokens"
      ) {
        buckets["Settings (API key, model, tokens)"] += cost;
      } else {
        // Theme, schemaVersion, onboarded, and anything else under the
        // promptlib: prefix that doesn't match the above.
        buckets["App state (theme, schema, onboarding)"] += cost;
      }
    }
  } catch {
    /* localStorage unavailable */
  }

  const bucketList = Object.entries(buckets).map(([label, bytes]) => ({ label, bytes }));
  const totalBytes = bucketList.reduce((sum, b) => sum + b.bytes, 0);

  return {
    totalBytes,
    buckets: bucketList,
    promptsWithSubKeys: promptIdSet.size,
  };
}

/** Render bytes as "X KB" / "Y MB" with one decimal where useful. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return kb >= 10 ? `${Math.round(kb)} KB` : `${kb.toFixed(1)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

/**
 * Wipe ALL user-library data — `userPrompts`, `favorites`, `recent`, and
 * every per-prompt sub-key. Settings (apiKey/model/maxTokens), onboarded
 * flag, and the schema version are untouched.
 *
 * Used by F5 (import in Replace mode). Inline-confirmed in the UI; this
 * function itself does no confirmation — that's the caller's responsibility.
 */
export function wipeAllUserData(): void {
  if (typeof window === "undefined") return;
  try {
    // 1. Collect every per-prompt key first, THEN remove. Removing while
    //    iterating over localStorage by index would skip keys.
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (PER_PROMPT_PREFIXES.some((p) => key.startsWith(p))) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) localStorage.removeItem(key);
    // 2. The list-shaped keys.
    localStorage.removeItem(STORAGE_KEYS.userPrompts);
    localStorage.removeItem(STORAGE_KEYS.favorites);
    localStorage.removeItem(STORAGE_KEYS.recent);
  } catch {
    /* unavailable */
  }
}

// ---------------------------------------------------------------------------
// Schema migrations
// ---------------------------------------------------------------------------

// Run any one-time data migrations needed before the rest of the app reads
// from storage. Idempotent — safe to call on every boot. Called from
// HomeClient's first useEffect so it always runs before loadUserPrompts.
//
// The pattern: read the stored schema version (defaults to 0 for first-run
// or pre-versioning state), apply migrations in sequence, write the new
// version. Each migration is a small block here, not a separate file, so the
// whole on-disk evolution lives in one readable place.
export function runStorageMigrations(): void {
  if (typeof window === "undefined") return;

  let stored = readJSON<number>(STORAGE_KEYS.schemaVersion, 0);

  // ---- v0 -> v1 -----------------------------------------------------------
  // First time we've written a schema version. Nothing structural to migrate
  // — we're stamping the current shape as v1 so future bumps have a baseline.
  // If a future migration needs to e.g. rename a key, add another block here.
  if (stored < 1) {
    stored = 1;
  }
  // ---- end of v0 -> v1 ----------------------------------------------------

  writeJSON(STORAGE_KEYS.schemaVersion, stored);
}
