// F-night-11 — deterministic category → color mapping.
//
// Each category name hashes to one of a small palette of muted accent
// colors. The mapping is stable across renders (same category always
// gets the same color) and across sessions (the hash is name-only,
// no storage). Visual purpose only: gives the grid a quick scannable
// "category cluster" signal without users having to read the chip text.

// Electric cyberpunk palette — fully saturated in dark mode, readable in light.
// Each pair passes WCAG AA against their respective card background colors.
const PALETTE: ReadonlyArray<{ light: string; dark: string }> = [
  { light: "#0E7490", dark: "#22D3EE" }, // electric cyan
  { light: "#0369A1", dark: "#38BDF8" }, // sky blue
  { light: "#4338CA", dark: "#818CF8" }, // indigo
  { light: "#7C3AED", dark: "#A78BFA" }, // violet
  { light: "#BE185D", dark: "#F472B6" }, // pink
  { light: "#047857", dark: "#34D399" }, // emerald
  { light: "#B45309", dark: "#FCD34D" }, // amber
  { light: "#0F766E", dark: "#2DD4BF" }, // teal
];

/** Stable djb2-style hash of a string. Tiny and good enough for indexing
 *  into an 8-color palette; not a cryptographic hash. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Pick a stable {light, dark} color pair for a category name. Empty
 * input gets the first palette entry rather than throwing — keeps the
 * caller's render path simple.
 */
export function categoryColor(category: string): { light: string; dark: string } {
  const trimmed = category.trim();
  if (!trimmed) return PALETTE[0];
  return PALETTE[hash(trimmed) % PALETTE.length];
}
