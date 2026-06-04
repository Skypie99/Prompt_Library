// F5 — Export / Import the user's library.
//
// The export is the SOURCE OF TRUTH for "what we consider portable user
// data." If a future feature stores something per-prompt, it goes here too.
// Settings (apiKey / model / maxTokens) are intentionally excluded — the
// apiKey for security, model/maxTokens because they're personal preferences,
// not library content.

import type { Prompt } from "./types";
import type { StoredRun } from "./runs";
import { loadRuns, saveRuns } from "./runs";
import {
  RECENT_CAP,
  PER_PROMPT_PREFIXES_PUBLIC,
  clearValues,
  listStoredPromptIdsByPrefix,
  loadFavorites,
  loadRecent,
  loadUserPrompts,
  loadValues,
  saveFavorites,
  saveRecent,
  saveUserPrompts,
  saveValues,
  wipeAllUserData,
} from "./library";

export const EXPORT_VERSION = 1;

export interface ExportV1 {
  version: 1;
  exportedAt: string;
  userPrompts: Prompt[];
  favorites: string[];
  recent: string[];
  runs: Record<string, StoredRun[]>;
  values: Record<string, Record<string, string>>;
}

// What the import preview shows the user before they commit.
export interface ImportPreview {
  version: number;
  exportedAt: string | null;
  userPromptCount: number;
  favoritesCount: number;
  recentCount: number;
  runsCount: number; // total runs across all prompts in the file
  valuesPromptCount: number; // number of prompts that have a saved values draft
  droppedCount: number; // entries silently dropped during validation
}

export type ImportMode = "merge" | "replace";

// ---- export ----------------------------------------------------------------

/**
 * Snapshot the whole library into the portable v1 shape. Returns the
 * structure as an object so callers can JSON.stringify with their own
 * formatting (e.g. indent for a file download).
 */
export function buildExport(): ExportV1 {
  const userPrompts = loadUserPrompts();
  const favorites = loadFavorites();
  const recent = loadRecent();

  // Collect every prompt id that has runs/values in storage. We then
  // include sub-keys only for ids that are STILL in userPrompts — that
  // way a ghost runs entry for a deleted prompt doesn't leak into the
  // export file.
  const liveIds = new Set(userPrompts.map((p) => p.id));

  const runs: Record<string, StoredRun[]> = {};
  for (const id of listStoredPromptIdsByPrefix("promptlib:runs:")) {
    if (!liveIds.has(id)) continue;
    const list = loadRuns(id);
    if (list.length > 0) runs[id] = list;
  }

  const values: Record<string, Record<string, string>> = {};
  for (const id of listStoredPromptIdsByPrefix("promptlib:values:")) {
    if (!liveIds.has(id)) continue;
    const v = loadValues(id);
    if (Object.keys(v).length > 0) values[id] = v;
  }

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    userPrompts,
    favorites,
    recent,
    runs,
    values,
  };
}

/** Render the export as a pretty-printed JSON string ready for download. */
export function exportToJson(): string {
  return JSON.stringify(buildExport(), null, 2);
}

/** Filename Sky's browser will show in the Save dialog. */
export function defaultExportFilename(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `prompt-library-${y}-${m}-${d}.json`;
}

// ---- import: parse + validate ---------------------------------------------

export type ParseResult =
  | { ok: true; data: ExportV1; preview: ImportPreview }
  | { ok: false; kind: "malformed" | "future-version" | "wrong-shape"; message: string };

/**
 * Parse a JSON string into a validated, normalized ExportV1 + a user-facing
 * preview. Silently drops corrupt sub-entries (e.g. one bad run inside an
 * otherwise valid file) — the preview's `droppedCount` reflects how many.
 * Refuses files that are malformed, missing the envelope, or from a future
 * schema version we don't know how to read.
 */
/**
 * Danger keys that can pollute the JS prototype chain when assigned to objects
 * via `Object.assign` / spread. `JSON.parse` itself is safe in modern engines
 * (V8 and SpiderMonkey both guard `__proto__`), but we explicitly reject any
 * parsed object that contains these keys so downstream spread/assign is safe.
 */
const PROTOTYPE_POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Returns true if the value (or any nested object/array) contains a key that
 * could be used for prototype pollution. Called once on the top-level parsed
 * value before we touch any sub-keys. O(N) on total key count — cheap.
 */
function hasPollutionKey(value: unknown, depth = 0): boolean {
  // Guard against deeply-nested circular references crafted in the JSON.
  if (depth > 20) return false;
  if (!value || typeof value !== "object") return false;
  for (const key of Object.keys(value as object)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) return true;
    if (hasPollutionKey((value as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}

export function parseImport(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      kind: "malformed",
      message: "This file isn't valid JSON. Did you select the right file?",
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      kind: "wrong-shape",
      message: "This file doesn't look like a Prompt Library export.",
    };
  }

  // Prototype pollution guard — reject any file that contains __proto__,
  // constructor, or prototype keys at any nesting level. In practice
  // JSON.parse in modern engines already neutralises __proto__, but we
  // add an explicit check so the app is resilient even in edge-case
  // environments and clearly documents the security contract.
  if (hasPollutionKey(parsed)) {
    return {
      ok: false,
      kind: "malformed",
      message: "This file contains unsafe keys and cannot be imported.",
    };
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version !== "number") {
    return {
      ok: false,
      kind: "wrong-shape",
      message: "This file doesn't look like a Prompt Library export (missing version).",
    };
  }
  if (obj.version > EXPORT_VERSION) {
    return {
      ok: false,
      kind: "future-version",
      message: `This file is newer (v${obj.version}) than this app supports (v${EXPORT_VERSION}). Please update.`,
    };
  }

  let dropped = 0;

  // ---- userPrompts ----
  const userPrompts: Prompt[] = [];
  if (Array.isArray(obj.userPrompts)) {
    for (const entry of obj.userPrompts) {
      if (isValidPromptShape(entry)) {
        // Force isSeed: false on import — only the shipped seeds are seeds.
        userPrompts.push({ ...entry, isSeed: false });
      } else {
        dropped++;
      }
    }
  } else {
    // Missing list → empty, but the file IS still importable.
    dropped++;
  }

  // ---- favorites + recent (string ids only) ----
  const favorites = Array.isArray(obj.favorites)
    ? (obj.favorites.filter((v) => typeof v === "string") as string[])
    : [];
  const recent = Array.isArray(obj.recent)
    ? (obj.recent.filter((v) => typeof v === "string") as string[])
    : [];
  if ((Array.isArray(obj.favorites) ? obj.favorites.length : 0) > favorites.length) dropped++;
  if ((Array.isArray(obj.recent) ? obj.recent.length : 0) > recent.length) dropped++;

  // ---- runs: per-id list of StoredRun ----
  const runs: Record<string, StoredRun[]> = {};
  if (obj.runs && typeof obj.runs === "object" && !Array.isArray(obj.runs)) {
    for (const [id, list] of Object.entries(obj.runs as Record<string, unknown>)) {
      if (typeof id !== "string" || !id) {
        dropped++;
        continue;
      }
      if (!Array.isArray(list)) {
        dropped++;
        continue;
      }
      const valid: StoredRun[] = [];
      for (const r of list) {
        if (isValidStoredRunShape(r)) valid.push(r);
        else dropped++;
      }
      if (valid.length > 0) runs[id] = valid;
    }
  }

  // ---- values: per-id Record<string, string> ----
  const values: Record<string, Record<string, string>> = {};
  if (obj.values && typeof obj.values === "object" && !Array.isArray(obj.values)) {
    for (const [id, v] of Object.entries(obj.values as Record<string, unknown>)) {
      if (typeof id !== "string" || !id) {
        dropped++;
        continue;
      }
      if (!v || typeof v !== "object" || Array.isArray(v)) {
        dropped++;
        continue;
      }
      const ok: Record<string, string> = {};
      let okCount = 0;
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof k === "string" && typeof val === "string") {
          ok[k] = val;
          okCount++;
        } else {
          dropped++;
        }
      }
      if (okCount > 0) values[id] = ok;
    }
  }

  const exportedAt = typeof obj.exportedAt === "string" ? obj.exportedAt : null;

  const data: ExportV1 = {
    version: 1,
    exportedAt: exportedAt ?? new Date().toISOString(),
    userPrompts,
    favorites,
    recent,
    runs,
    values,
  };

  const preview: ImportPreview = {
    version: obj.version,
    exportedAt,
    userPromptCount: userPrompts.length,
    favoritesCount: favorites.length,
    recentCount: recent.length,
    runsCount: Object.values(runs).reduce((n, list) => n + list.length, 0),
    valuesPromptCount: Object.keys(values).length,
    droppedCount: dropped,
  };

  return { ok: true, data, preview };
}

// ---- import: apply ---------------------------------------------------------

/**
 * Apply a validated import. Returns the count of things actually written so
 * the UI can show "imported 5 prompts, 3 favorites, ...".
 */
export interface ApplyImportResult {
  promptsAdded: number;
  favoritesAdded: number;
  recentMerged: number;
  runsPromptsWritten: number;
  valuesPromptsWritten: number;
}

export function applyImport(data: ExportV1, mode: ImportMode): ApplyImportResult {
  if (mode === "replace") {
    return applyReplace(data);
  }
  return applyMerge(data);
}

function applyMerge(data: ExportV1): ApplyImportResult {
  const existingPrompts = loadUserPrompts();
  const existingIds = new Set(existingPrompts.map((p) => p.id));
  const importedThisRun = new Set<string>();

  // 1. Prompts — add only new ids.
  const merged = [...existingPrompts];
  let promptsAdded = 0;
  for (const p of data.userPrompts) {
    if (existingIds.has(p.id)) continue;
    merged.push(p);
    importedThisRun.add(p.id);
    promptsAdded++;
  }
  if (promptsAdded > 0) saveUserPrompts(merged);

  // 2. Favorites — union, preserving existing-first order.
  const existingFavs = loadFavorites();
  const favSet = new Set(existingFavs);
  let favoritesAdded = 0;
  const nextFavs = [...existingFavs];
  for (const id of data.favorites) {
    if (favSet.has(id)) continue;
    nextFavs.push(id);
    favSet.add(id);
    favoritesAdded++;
  }
  if (favoritesAdded > 0) saveFavorites(nextFavs);

  // 3. Recent — prepend imported, dedupe, cap.
  const existingRecent = loadRecent();
  const nextRecent: string[] = [];
  const seen = new Set<string>();
  let recentMerged = 0;
  for (const id of data.recent) {
    if (seen.has(id)) continue;
    if (!existingRecent.includes(id)) recentMerged++;
    nextRecent.push(id);
    seen.add(id);
  }
  for (const id of existingRecent) {
    if (seen.has(id)) continue;
    nextRecent.push(id);
    seen.add(id);
  }
  if (recentMerged > 0) {
    saveRecent(nextRecent.slice(0, RECENT_CAP));
  }

  // 4. Runs — per-id replace only for prompts we just imported OR that
  //    already existed. (Always-replace ensures the imported timeline is
  //    coherent.)
  let runsPromptsWritten = 0;
  for (const [id, list] of Object.entries(data.runs)) {
    if (!existingIds.has(id) && !importedThisRun.has(id)) continue;
    saveRuns(id, list);
    runsPromptsWritten++;
  }

  // 5. Values — same per-id rule.
  let valuesPromptsWritten = 0;
  for (const [id, v] of Object.entries(data.values)) {
    if (!existingIds.has(id) && !importedThisRun.has(id)) continue;
    saveValues(id, v);
    valuesPromptsWritten++;
  }

  return {
    promptsAdded,
    favoritesAdded,
    recentMerged,
    runsPromptsWritten,
    valuesPromptsWritten,
  };
}

function applyReplace(data: ExportV1): ApplyImportResult {
  wipeAllUserData();

  // After wipe, just write everything from the import.
  saveUserPrompts(data.userPrompts);
  saveFavorites(data.favorites);
  saveRecent(data.recent.slice(0, RECENT_CAP));

  let runsPromptsWritten = 0;
  for (const [id, list] of Object.entries(data.runs)) {
    saveRuns(id, list);
    runsPromptsWritten++;
  }

  let valuesPromptsWritten = 0;
  for (const [id, v] of Object.entries(data.values)) {
    saveValues(id, v);
    valuesPromptsWritten++;
  }

  return {
    promptsAdded: data.userPrompts.length,
    favoritesAdded: data.favorites.length,
    recentMerged: data.recent.slice(0, RECENT_CAP).length,
    runsPromptsWritten,
    valuesPromptsWritten,
  };
}

// ---- shape validators (local to this module; mirror library.ts patterns) --

function isValidPromptShape(value: unknown): value is Prompt {
  const p = value as Partial<Prompt> | null;
  if (!p) return false;
  if (typeof p.id !== "string" || !p.id) return false;
  if (typeof p.title !== "string" || !p.title) return false;
  if (typeof p.body !== "string") return false;
  if (typeof p.description !== "string") return false;
  if (typeof p.category !== "string") return false;
  if (!Array.isArray(p.tags)) return false;
  if (!p.tags.every((t) => typeof t === "string")) return false;
  if (!Array.isArray(p.variables)) return false;
  if (!p.variables.every(isValidVariableShape)) return false;
  if (typeof p.createdAt !== "string") return false;
  // isSeed will be coerced to false on import — accept any boolean (or missing).
  if (p.isSeed !== undefined && typeof p.isSeed !== "boolean") return false;
  return true;
}

function isValidVariableShape(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || !v.name) return false;
  if (typeof v.label !== "string" || !v.label) return false;
  // placeholder is optional; if present it must be a string.
  if (v.placeholder !== undefined && typeof v.placeholder !== "string") return false;
  return true;
}

function isValidStoredRunShape(value: unknown): value is StoredRun {
  const r = value as Partial<StoredRun> | null;
  if (!r) return false;
  if (typeof r.id !== "string" || !r.id) return false;
  if (typeof r.ranAt !== "string") return false;
  if (typeof r.model !== "string") return false;
  if (!r.values || typeof r.values !== "object" || Array.isArray(r.values)) return false;
  for (const v of Object.values(r.values)) {
    if (typeof v !== "string") return false;
  }
  if (typeof r.sentPrompt !== "string") return false;
  if (typeof r.response !== "string") return false;
  if (r.status !== "completed" && r.status !== "aborted" && r.status !== "errored") return false;
  if (r.errorMessage !== undefined && typeof r.errorMessage !== "string") return false;
  // tokensUsed is optional; if present, both fields must be numbers.
  if (r.tokensUsed !== undefined) {
    if (
      typeof r.tokensUsed !== "object" ||
      r.tokensUsed === null ||
      typeof r.tokensUsed.input !== "number" ||
      typeof r.tokensUsed.output !== "number"
    ) return false;
  }
  return true;
}

// Re-export the PER_PROMPT_PREFIXES so a test file can verify the export
// covers every prefix the app knows about — a forgotten new feature key
// is a real silent-data-loss risk.
export { PER_PROMPT_PREFIXES_PUBLIC };

// Helper for replace-mode purges of a single prompt's per-prompt sub-keys
// (used in tests; tree-shaken from prod by the bundler).
export { clearValues };
