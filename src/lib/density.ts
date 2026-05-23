// F-fast-5 — Grid density preference.
//
// One key in localStorage: "promptlib:density" → "compact" | "comfortable".
// Default is "comfortable" — the same layout the app has always shown, so
// existing users see no change unless they opt in.
//
// Kept in its own tiny module to avoid bloating library.ts further and so
// the type / default story for this preference is in one place.

export type Density = "compact" | "comfortable";

export const DEFAULT_DENSITY: Density = "comfortable";

const KEY = "promptlib:density";

/** SSR-safe; falls back to DEFAULT_DENSITY when no preference is stored. */
export function loadDensity(): Density {
  if (typeof window === "undefined") return DEFAULT_DENSITY;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "compact" || raw === "comfortable") return raw;
    return DEFAULT_DENSITY;
  } catch {
    return DEFAULT_DENSITY;
  }
}

export function saveDensity(value: Density): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* unavailable — silent, matches the rest of the app's storage discipline */
  }
}
