// F-eve-1 — Prompt sort preference.
//
// One key in localStorage: "promptlib:sort" → "newest" | "az" | "most-run".
// Default is "newest" — the same chronological order the app has always
// shown (createdAt desc via mergePrompts), so existing users see no change
// unless they pick another mode.
//
// Kept in its own tiny module mirroring density.ts: the type and default
// for this preference live in one place.

import type { Prompt } from "./types";

export type SortMode = "newest" | "az" | "most-run";

export const DEFAULT_SORT: SortMode = "newest";

export const SORT_LABELS: Record<SortMode, string> = {
  newest: "Newest first",
  az: "A → Z",
  "most-run": "Most run",
};

const KEY = "promptlib:sort";

/** SSR-safe; falls back to DEFAULT_SORT when no preference is stored. */
export function loadSort(): SortMode {
  if (typeof window === "undefined") return DEFAULT_SORT;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "newest" || raw === "az" || raw === "most-run") return raw;
    return DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

export function saveSort(value: SortMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* unavailable — silent, matches the rest of the app's storage discipline */
  }
}

/**
 * Return a NEW array of prompts sorted according to `mode`. Never mutates
 * the input. "Most run" uses an optional runCounts map (omitted → all 0),
 * with ties broken by createdAt desc so a stable order is preserved across
 * re-renders.
 */
export function sortPrompts(
  prompts: Prompt[],
  mode: SortMode,
  runCounts?: Map<string, number>,
): Prompt[] {
  // Copy first — sort mutates in place.
  const arr = [...prompts];

  switch (mode) {
    case "newest":
      // createdAt is normalized ISO at load time; localeCompare is chronological.
      arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return arr;
    case "az":
      // Locale-aware case-insensitive sort so "Alpha" / "alpha" don't swap.
      arr.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
      return arr;
    case "most-run":
      arr.sort((a, b) => {
        const countA = runCounts?.get(a.id) ?? 0;
        const countB = runCounts?.get(b.id) ?? 0;
        if (countB !== countA) return countB - countA; // higher first
        // Tie-break by recency so the order is stable.
        return b.createdAt.localeCompare(a.createdAt);
      });
      return arr;
  }
}
