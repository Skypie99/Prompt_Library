// User settings, persisted to localStorage. Nothing here ever leaves the
// browser except the API key, and only when the user runs a prompt.

// writeRaw is imported so settings write failures are surfaced through the
// same onStorageWriteFailure mechanism that library writes use — meaning the
// HomeClient storage-warning banner fires on private-mode / quota failures
// for settings, not just for prompt library writes. writeRaw (not writeJSON)
// is used because loadSettings reads with localStorage.getItem() directly,
// not JSON.parse — writeRaw preserves raw-string round-trip fidelity.
import { writeRaw } from "./library";

export interface Settings {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface ModelOption {
  id: string;
  label: string;
  hint: string;
}

// The only models offered — latest generation, per project spec.
// NOTE: claude-fable-5 is available if Sky wants it added later.
export const MODELS: ModelOption[] = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", hint: "Most capable" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Balanced" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", hint: "Fastest" },
];

export const DEFAULT_MODEL = "claude-opus-4-8";
export const DEFAULT_MAX_TOKENS = 2048;

// Inclusive bounds on maxTokens. Must match the clamp inside
// SettingsModal.handleSave — load-time and save-time enforce the same
// range so a hand-edited or pre-clamp localStorage value can never reach
// the Anthropic API as an absurd number.
export const MIN_MAX_TOKENS = 256;
export const MAX_MAX_TOKENS = 8192;

const STORAGE_KEYS = {
  apiKey: "promptlib:apiKey",
  model: "promptlib:model",
  maxTokens: "promptlib:maxTokens",
} as const;

const FALLBACK: Settings = {
  apiKey: "",
  model: DEFAULT_MODEL,
  maxTokens: DEFAULT_MAX_TOKENS,
};

function isKnownModel(id: string): boolean {
  return MODELS.some((model) => model.id === id);
}

function clampMaxTokens(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_TOKENS;
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(n)));
}

/** Human-friendly model name for display (falls back to the raw id). */
export function modelLabel(id: string): string {
  return MODELS.find((model) => model.id === id)?.label ?? id;
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return FALLBACK;
  try {
    const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
    const storedModel = localStorage.getItem(STORAGE_KEYS.model) ?? DEFAULT_MODEL;
    const model = isKnownModel(storedModel) ? storedModel : DEFAULT_MODEL;
    const rawMax = localStorage.getItem(STORAGE_KEYS.maxTokens);
    const maxTokens = rawMax !== null ? clampMaxTokens(Number(rawMax)) : DEFAULT_MAX_TOKENS;
    return { apiKey, model, maxTokens };
  } catch {
    return FALLBACK;
  }
}

export function saveSettings(settings: Settings): void {
  // Route through writeRaw so write failures (private mode / quota) fire the
  // onStorageWriteFailure handler set by HomeClient — same storage-warning
  // banner path as library writes. Stop on first failure (no point writing
  // model/maxTokens if the api-key slot already failed).
  const r1 = writeRaw(STORAGE_KEYS.apiKey, settings.apiKey);
  if (!r1.ok) return;
  const r2 = writeRaw(STORAGE_KEYS.model, settings.model);
  if (!r2.ok) return;
  writeRaw(STORAGE_KEYS.maxTokens, String(settings.maxTokens));
}
