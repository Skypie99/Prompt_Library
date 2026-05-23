import type { Prompt } from "./types";

// Everything the user creates or curates, persisted to localStorage. Seed
// prompts stay in prompts.json and are never written here.

const STORAGE_KEYS = {
  userPrompts: "promptlib:userPrompts",
  favorites: "promptlib:favorites",
  recent: "promptlib:recent",
  onboarded: "promptlib:onboarded",
} as const;

export const RECENT_CAP = 10;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage unavailable — silently skip persistence */
  }
}

function isValidPrompt(value: unknown): value is Prompt {
  const p = value as Partial<Prompt> | null;
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    typeof p.body === "string"
  );
}

// ---- User prompts ----
export function loadUserPrompts(): Prompt[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.userPrompts, []);
  return Array.isArray(data) ? data.filter(isValidPrompt) : [];
}

export function saveUserPrompts(prompts: Prompt[]): void {
  writeJSON(STORAGE_KEYS.userPrompts, prompts);
}

// ---- Favorites (array of prompt ids) ----
export function loadFavorites(): string[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.favorites, []);
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}

export function saveFavorites(ids: string[]): void {
  writeJSON(STORAGE_KEYS.favorites, ids);
}

// ---- Recent (array of prompt ids, most-recent first, capped) ----
export function loadRecent(): string[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.recent, []);
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}

export function saveRecent(ids: string[]): void {
  writeJSON(STORAGE_KEYS.recent, ids);
}

// ---- Onboarding flag ----
export function loadOnboarded(): boolean {
  return readJSON<boolean>(STORAGE_KEYS.onboarded, false) === true;
}

export function saveOnboarded(): void {
  writeJSON(STORAGE_KEYS.onboarded, true);
}

// ---- Helpers ----

// Merge user prompts with seeds and sort newest-first (ISO dates sort
// lexicographically, which is also chronological).
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

// Slug + short random suffix keeps ids readable but collision-resistant.
export function generateId(title: string): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slugify(title)}-${suffix}`;
}
