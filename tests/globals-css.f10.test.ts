/**
 * F10 · SC 2.4.11 Focus Not Obscured (Minimum) — guard.
 *
 * The a11y audit (design-reviews/a11y-qa/2026-08-01) measured focusable
 * controls scrolling ENTIRELY beneath the 73px sticky header during ordinary
 * Shift+Tab navigation: a 26px tag chip and a 32px favorite star both landed
 * at top:0 with the header bottom at 73px. axe ran clean over it — 2.4.11 is
 * one of the six criteria new in WCAG 2.2 that automation largely misses.
 *
 * The fix is a single zero-specificity base rule in globals.css giving every
 * focusable a scroll margin taller than the header. This test pins that rule
 * down, and — importantly — pins down the FACT THAT MAKES IT NECESSARY (the
 * sticky header), so the two can't drift apart silently.
 *
 * jsdom does no layout and does not apply globals.css, so a rendered assertion
 * is impossible here; the rendered/measured leg lives in the audit bundle and
 * the device script. This guard is a source contract.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const header = readFileSync(path.join(root, "src/components/Header.tsx"), "utf8");

/** Measured height of the sticky header on the audited build, in px. */
const HEADER_HEIGHT_PX = 73;

/**
 * Pull every `scroll-margin-top` declaration out of the stylesheet along with
 * the selector block it belongs to. Deliberately hand-rolled rather than
 * regex-per-rule so a reformat (prettier line-wrapping the selector list)
 * can't make the guard silently stop matching.
 */
function scrollMarginRules(source: string): { selector: string; value: string }[] {
  const out: { selector: string; value: string }[] = [];
  const declaration = /scroll-margin-top:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = declaration.exec(source)) !== null) {
    // Walk back to the `{` that opens this declaration's block, then back
    // again to the start of the selector that precedes it.
    const openBrace = source.lastIndexOf("{", match.index);
    const commentEnd = source.lastIndexOf("*/", openBrace);
    const priorBoundary = Math.max(
      source.lastIndexOf("}", openBrace),
      source.lastIndexOf("{", openBrace - 1),
      // `*/` is two characters — skip both, or the selector picks up a stray `/`.
      commentEnd === -1 ? -1 : commentEnd + 1,
    );
    const selector = source
      .slice(priorBoundary + 1, openBrace)
      .replace(/\s+/g, " ")
      .trim();
    out.push({ selector, value: match[1].trim() });
  }
  return out;
}

function toPx(value: string): number {
  // Unitless zero is legal CSS and is what the nested-scrollport reset uses.
  if (/^0(\.0+)?$/.test(value)) return 0;
  const rem = /^([\d.]+)rem$/.exec(value);
  if (rem) return Number(rem[1]) * 16;
  const px = /^([\d.]+)px$/.exec(value);
  if (px) return Number(px[1]);
  return Number.NaN;
}

describe("F10 — SC 2.4.11 focus not obscured by the sticky header", () => {
  it("the header this rule exists for is still sticky and still pinned to the top", () => {
    // If this ever fails, the header stopped being sticky — re-derive whether
    // the scroll-margin rule below is still needed before deleting it.
    expect(header).toMatch(/sticky\s+top-0/);
  });

  it("declares a scroll-margin-top floor for focusable elements", () => {
    const rules = scrollMarginRules(css);
    expect(rules.length).toBeGreaterThan(0);

    const floor = rules.find((r) => toPx(r.value) > 0);
    expect(floor, "no positive scroll-margin-top rule found in globals.css").toBeDefined();

    // The rule has to actually cover the things a keyboard user tabs to.
    // These four are the element types the audit measured failing.
    for (const selector of ["button", "input", "select", "textarea"]) {
      expect(
        floor!.selector.includes(selector),
        `scroll-margin-top rule does not cover <${selector}>`,
      ).toBe(true);
    }
    // ...and elements made focusable by tabindex (the prompt cards' pattern),
    // while excluding tabindex="-1" (programmatic-only focus targets).
    expect(floor!.selector).toMatch(/\[tabindex\]/);
    expect(floor!.selector).toMatch(/tabindex\^?=?"?-/);
  });

  it("clears the sticky header — margin exceeds the measured header height", () => {
    const floor = scrollMarginRules(css).find((r) => toPx(r.value) > 0)!;
    const px = toPx(floor.value);

    expect(Number.isNaN(px), `unparseable scroll-margin-top: ${floor.value}`).toBe(false);
    // Strictly greater: equal to the header height would leave the control
    // flush against it with no breathing room, which reads as obscured.
    expect(px).toBeGreaterThan(HEADER_HEIGHT_PX);
  });

  it("does not impose the page-level margin inside nested scroll containers", () => {
    // Every .scrollbar-soft scrollport lives inside a fixed sheet/modal with
    // the page scroll-locked behind it, so the sticky header can't obscure
    // anything there — and an 88px margin would over-scroll short lists.
    const reset = scrollMarginRules(css).find(
      (r) => r.selector.includes(".scrollbar-soft") && toPx(r.value) === 0,
    );
    expect(reset, "expected a scroll-margin-top:0 reset scoped to .scrollbar-soft").toBeDefined();
  });
});
