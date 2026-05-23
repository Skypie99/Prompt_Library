// F-night-11 — deterministic category → color mapping.
//
// Each category name hashes to one of a small palette of muted accent
// colors. The mapping is stable across renders (same category always
// gets the same color) and across sessions (the hash is name-only,
// no storage). Visual purpose only: gives the grid a quick scannable
// "category cluster" signal without users having to read the chip text.

// Palette intentionally avoids coral (the primary accent) so the stripes
// don't compete with stars / CTAs. All shades are mid-saturation so the
// 3px stripe reads at a glance but doesn't shout.
const PALETTE: ReadonlyArray<{ light: string; dark: string }> = [
  { light: "#7C9EB2", dark: "#A6C4D8" }, // dusty blue
  { light: "#8FA982", dark: "#B3CDA6" }, // sage
  { light: "#C29A66", dark: "#DDB789" }, // ochre
  { light: "#A07AB4", dark: "#C6A1D7" }, // muted plum
  { light: "#B4847A", dark: "#D2A89E" }, // terracotta
  { light: "#6E9B91", dark: "#94BFB5" }, // jade
  { light: "#B59F58", dark: "#D6BF7F" }, // mustard
  { light: "#8889AB", dark: "#AEAFD0" }, // periwinkle
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
