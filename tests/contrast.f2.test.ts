/**
 * F2-EXPANDED · SC 1.4.3 Contrast (Minimum) — dark theme — guard.
 *
 * `ink.soft` (#826D58) was deliberately darkened for LIGHT-mode AA (4.55:1 on
 * cream, documented in tailwind.config.ts). It was never given a dark-mode
 * counterpart, so the same token rendered warm-brown on near-black: the a11y
 * audit measured 22 source sites between 3.82:1 and 4.25:1 against a 4.5
 * requirement — the "VARIABLES" label, the "1/3 filled" counter, the History
 * toggle, "STORAGE USAGE", the hero ⌘K keycap.
 *
 * This is the classic shared-token regression class, so the guard has two
 * halves — both must hold:
 *
 *   1. THE MATH — the token values themselves still clear 4.5:1 on the dark
 *      surfaces (and ink-soft still clears it on the light ones, so a future
 *      "fix" to one theme can't silently break the other).
 *   2. THE SWEEP — no standalone `text-ink-soft` anywhere in src/ lacks a
 *      `dark:text-*` override. This catches sites added AFTER this fix, which
 *      is the failure mode that actually recurs.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import tailwindConfig from "../tailwind.config";

const root = path.resolve(__dirname, "..");

/* ---------------------------------------------------------------- the math */

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/../g)!
    .map((h) => parseInt(h, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Read a token straight out of the real Tailwind config, not a copy of it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const colors = (tailwindConfig.theme as any).extend.colors;
const INK_SOFT: string = colors.ink.soft;
const PAPER_MUTED: string = colors.paper.muted;
const NIGHT: string = colors.night.DEFAULT;
const NIGHT_SURFACE: string = colors.night.surface;
const CREAM: string = colors.cream;
const SURFACE: string = colors.surface;

/** AA body text. None of the affected sites are large-scale (11–14px). */
const AA_NORMAL = 4.5;

/* --------------------------------------------------------------- the sweep */

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(full) : /\.tsx?$/.test(full) ? [full] : [];
  });
}

/**
 * Every double-quoted string literal in src/ that uses `text-ink-soft` as a
 * standalone utility. Deliberately excludes `text-ink-soft/60` (decorative
 * separators, exempt) and `placeholder:text-ink-soft` (placeholder contrast
 * was settled separately by S15).
 */
function inkSoftClassStrings(): { file: string; value: string }[] {
  const out: { file: string; value: string }[] = [];
  for (const file of sourceFiles(path.join(root, "src"))) {
    const source = readFileSync(file, "utf8");
    const literal = /"((?:[^"\\]|\\.)*)"/g;
    let match: RegExpExecArray | null;
    while ((match = literal.exec(source)) !== null) {
      if (/(^|\s)text-ink-soft($|\s)/.test(match[1])) {
        out.push({ file: path.relative(root, file), value: match[1] });
      }
    }
  }
  return out;
}

describe("F2-EXPANDED — ink-soft needs a dark-mode counterpart", () => {
  it("proves the defect is real: ink-soft fails AA on both dark surfaces", () => {
    // If this ever starts passing, the ink.soft token itself was changed —
    // re-derive whether the dark overrides below are still the right fix
    // before deleting them.
    expect(contrastRatio(INK_SOFT, NIGHT)).toBeLessThan(AA_NORMAL);
    expect(contrastRatio(INK_SOFT, NIGHT_SURFACE)).toBeLessThan(AA_NORMAL);
  });

  it("the replacement token clears AA on every dark surface it lands on", () => {
    expect(contrastRatio(PAPER_MUTED, NIGHT)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(PAPER_MUTED, NIGHT_SURFACE)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("the light theme is unchanged and still clears AA", () => {
    // The fix only ever ADDS `dark:` variants, so light must be untouched.
    // This is the half of a shared-token fix that silently breaks.
    expect(contrastRatio(INK_SOFT, CREAM)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrastRatio(INK_SOFT, SURFACE)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it("no text-ink-soft site in src/ is left without a dark override", () => {
    const sites = inkSoftClassStrings();
    // Sanity: the sweep must actually be looking at something.
    expect(sites.length).toBeGreaterThan(15);

    const bare = sites.filter((s) => !/dark:text-/.test(s.value));
    expect(
      bare.map((b) => `${b.file}: ${b.value.slice(0, 80)}`),
      "text-ink-soft with no dark:text-* override renders 3.82–4.25:1 in dark mode",
    ).toEqual([]);
  });
});
