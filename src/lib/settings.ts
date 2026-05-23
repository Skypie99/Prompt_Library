// User settings, persisted to localStorage. Nothing here ever leaves the
// browser except the API key, and only when the user runs a prompt.

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
export const MODELS: ModelOption[] = [
  { id: "claude-opus-4-7", label: "Claude Opus 4.7", hint: "Most capable" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Balanced" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", hint: "Fastest" },
];

export const DEFAULT_MODEL = "claude-opus-4-7";
export const DEFAULT_MAX_TOKENS = 2048;

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
    const parsedMax = rawMax ? Number(rawMax) : NaN;
    const maxTokens = Number.isFinite(parsedMax) ? parsedMax : DEFAULT_MAX_TOKENS;
    return { apiKey, model, maxTokens };
  } catch {
    return FALLBACK;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.apiKey, settings.apiKey);
    localStorage.setItem(STORAGE_KEYS.model, settings.model);
    localStorage.setItem(STORAGE_KEYS.maxTokens, String(settings.maxTokens));
  } catch {
    /* localStorage unavailable (private mode / disabled) — settings just won't persist. */
  }
}
