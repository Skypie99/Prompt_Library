/**
 * Tests for src/lib/categoryColor.ts (F-night-11).
 * Stability is the whole point: same category, same color, every render
 * and every session.
 */

import { categoryColor } from "../categoryColor";

describe("categoryColor (F-night-11)", () => {
  it("returns the same color for the same input across calls (stable)", () => {
    const a = categoryColor("writing");
    const b = categoryColor("writing");
    expect(a).toEqual(b);
  });

  it("returns a {light, dark} pair with non-empty strings", () => {
    const c = categoryColor("anything");
    expect(typeof c.light).toBe("string");
    expect(typeof c.dark).toBe("string");
    expect(c.light.length).toBeGreaterThan(0);
    expect(c.dark.length).toBeGreaterThan(0);
  });

  it("ignores leading/trailing whitespace (same color for 'X' and ' X ')", () => {
    expect(categoryColor("code")).toEqual(categoryColor("  code  "));
  });

  it("different categories tend to get different colors (not strictly required,\n      but a meaningful failure if all map to the same bucket)", () => {
    const names = ["writing", "code", "analysis", "marketing", "research", "personal"];
    const distinctColors = new Set(names.map((n) => categoryColor(n).light));
    // With 8 palette entries and 6 inputs, expect at least 3 distinct.
    // (Doesn't guarantee uniqueness — that's not the contract — just
    // sanity-checks that the hash isn't degenerate.)
    expect(distinctColors.size).toBeGreaterThanOrEqual(3);
  });

  it("empty input returns a valid color (no throw, deterministic)", () => {
    expect(() => categoryColor("")).not.toThrow();
    expect(categoryColor("")).toEqual(categoryColor(""));
  });
});
