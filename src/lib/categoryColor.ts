// F-night-11 — deterministic category → color mapping.
//
// Each category name hashes to one of a small palette of muted accent
// colors. The mapping is stable across renders (same category always
// gets the same color) and across sessions (the hash is name-only,
// no storage). Visual purpose only: gives the grid a quick scannable
// "category cluster" signal without users having to read the chip text.

// Palette intentionally stays in teal-to-mauve cool range so stripes
// don't compete with the primary teal accent on chips / CTAs.
const PALETTE: ReadonlyArray<{ light: string; dark: string }> = [
  { light: "#6FA09A", dark: "#93C1BB" }, // seafoam
  { light: "#5E9E97", dark: "#84BFB9" }, // lagoon
  { light: "#6292AA", dark: "#88B5CC" }, // steel
  { light: "#6880AE", dark: "#8FA4CE" }, // cornflower
  { light: "#7880B8", dark: "#9FA8D5" }, // periwinkle
  { light: "#8A82B8", dark: "#ADA7D4" }, // violet slate
  { light: "#9680B0", dark: "#BAA8CE" }, // soft plum
  { light: "#9E80A4", dark: "#C0A8C4" }, // dusty mauve
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
