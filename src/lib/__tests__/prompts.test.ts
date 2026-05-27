/**
 * Tests for src/lib/prompts.ts — the seed-prompt loader and the
 * category-derivation helper.
 *
 * Two pieces of behavior to lock in:
 *  - seedPrompts is non-empty, well-typed, and every entry has a category
 *    (otherwise the CategoryChips component renders an empty/anonymous chip).
 *  - getCategories returns sorted, unique category names. The Chips bar
 *    relies on this — duplicates would render twice, and an unsorted list
 *    means the chip order would flip every render that re-derives.
 */

import {
  seedPrompts,
  getCategories,
  getCategoriesWithCounts,
  getTags,
  getTagsWithCounts,
} from "../prompts";
import type { Prompt } from "../types";

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: "test-1",
    title: "Test",
    description: "",
    body: "",
    variables: [],
    category: "general",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    isSeed: false,
    ...overrides,
  };
}

describe("seedPrompts", () => {
  it("is a non-empty array (the app ships with starter content)", () => {
    expect(Array.isArray(seedPrompts)).toBe(true);
    expect(seedPrompts.length).toBeGreaterThan(0);
  });

  it("every seed has id, title, body, and category", () => {
    for (const p of seedPrompts) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.title).toBe("string");
      expect(p.title.length).toBeGreaterThan(0);
      expect(typeof p.body).toBe("string");
      expect(p.body.length).toBeGreaterThan(0);
      expect(typeof p.category).toBe("string");
      expect(p.category.length).toBeGreaterThan(0);
    }
  });

  it("seed ids are unique (the id→prompt map is keyed by id)", () => {
    const ids = seedPrompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getCategories", () => {
  it("returns [] for an empty list of prompts", () => {
    expect(getCategories([])).toEqual([]);
  });

  it("returns the single category for one prompt", () => {
    expect(getCategories([makePrompt({ category: "writing" })])).toEqual(["writing"]);
  });

  it("de-duplicates repeated categories", () => {
    const prompts = [
      makePrompt({ id: "1", category: "writing" }),
      makePrompt({ id: "2", category: "writing" }),
      makePrompt({ id: "3", category: "code" }),
    ];
    expect(getCategories(prompts)).toEqual(["code", "writing"]);
  });

  it("returns categories in alphabetical order (stable chip order)", () => {
    const prompts = [
      makePrompt({ id: "1", category: "writing" }),
      makePrompt({ id: "2", category: "analysis" }),
      makePrompt({ id: "3", category: "marketing" }),
    ];
    expect(getCategories(prompts)).toEqual(["analysis", "marketing", "writing"]);
  });

  it("works on the real seedPrompts array (no surprises with real data)", () => {
    const cats = getCategories(seedPrompts);
    expect(new Set(cats).size).toBe(cats.length);
    expect([...cats].sort()).toEqual(cats);
  });
});

describe("getTags (F3)", () => {
  it("returns [] for an empty list", () => {
    expect(getTags([])).toEqual([]);
  });

  it("returns [] when no prompt has any tag", () => {
    expect(getTags([makePrompt({ tags: [] })])).toEqual([]);
  });

  it("sorts by frequency (most-used first)", () => {
    const prompts = [
      makePrompt({ id: "a", tags: ["alpha", "beta"] }),
      makePrompt({ id: "b", tags: ["alpha"] }),
      makePrompt({ id: "c", tags: ["beta"] }),
      makePrompt({ id: "d", tags: ["alpha"] }),
    ];
    expect(getTags(prompts)).toEqual(["alpha", "beta"]);
  });

  it("breaks ties alphabetically (stable order between renders)", () => {
    const prompts = [
      makePrompt({ id: "a", tags: ["zebra"] }),
      makePrompt({ id: "b", tags: ["apple"] }),
      makePrompt({ id: "c", tags: ["mango"] }),
    ];
    expect(getTags(prompts)).toEqual(["apple", "mango", "zebra"]);
  });

  it("drops empty / whitespace-only tags (data hygiene)", () => {
    const prompts = [makePrompt({ id: "a", tags: ["good", "", "   "] })];
    expect(getTags(prompts)).toEqual(["good"]);
  });

  it("dedupes across prompts (each unique tag appears once)", () => {
    const prompts = [
      makePrompt({ id: "a", tags: ["one", "two"] }),
      makePrompt({ id: "b", tags: ["one", "two"] }),
    ];
    const result = getTags(prompts);
    expect(new Set(result).size).toBe(result.length);
    expect(result).toEqual(["one", "two"]);
  });

  it("trims whitespace before counting", () => {
    const prompts = [
      makePrompt({ id: "a", tags: ["work"] }),
      makePrompt({ id: "b", tags: [" work "] }),
    ];
    expect(getTags(prompts)).toEqual(["work"]);
  });
});

describe("getTagsWithCounts (F-eve-2)", () => {
  it("returns [] for an empty list", () => {
    expect(getTagsWithCounts([])).toEqual([]);
  });

  it("carries the count for each tag", () => {
    const prompts = [
      makePrompt({ id: "a", tags: ["alpha", "beta"] }),
      makePrompt({ id: "b", tags: ["alpha"] }),
      makePrompt({ id: "c", tags: ["alpha"] }),
    ];
    expect(getTagsWithCounts(prompts)).toEqual([
      { tag: "alpha", count: 3 },
      { tag: "beta", count: 1 },
    ]);
  });

  it("orders by count desc, alphabetical tie-break (same as getTags)", () => {
    const prompts = [
      makePrompt({ id: "a", tags: ["zebra"] }),
      makePrompt({ id: "b", tags: ["apple"] }),
      makePrompt({ id: "c", tags: ["mango"] }),
    ];
    expect(getTagsWithCounts(prompts).map((t) => t.tag)).toEqual(["apple", "mango", "zebra"]);
  });

  it("getTags and getTagsWithCounts agree on tag order", () => {
    const prompts = [
      makePrompt({ id: "a", tags: ["one", "two"] }),
      makePrompt({ id: "b", tags: ["one"] }),
      makePrompt({ id: "c", tags: ["three"] }),
    ];
    expect(getTags(prompts)).toEqual(getTagsWithCounts(prompts).map((t) => t.tag));
  });

  it("drops empty tags and trims whitespace consistently with getTags", () => {
    const prompts = [
      makePrompt({ id: "a", tags: ["work", "", "   "] }),
      makePrompt({ id: "b", tags: [" work "] }),
    ];
    expect(getTagsWithCounts(prompts)).toEqual([{ tag: "work", count: 2 }]);
  });
});

describe("getCategoriesWithCounts (F-night-12)", () => {
  it("returns [] for an empty list", () => {
    expect(getCategoriesWithCounts([])).toEqual([]);
  });

  it("carries the count for each category", () => {
    const prompts = [
      makePrompt({ id: "a", category: "writing" }),
      makePrompt({ id: "b", category: "writing" }),
      makePrompt({ id: "c", category: "code" }),
    ];
    expect(getCategoriesWithCounts(prompts)).toEqual([
      { category: "code", count: 1 },
      { category: "writing", count: 2 },
    ]);
  });

  it("orders alphabetically (same order as getCategories)", () => {
    const prompts = [
      makePrompt({ id: "1", category: "zebra" }),
      makePrompt({ id: "2", category: "apple" }),
      makePrompt({ id: "3", category: "mango" }),
    ];
    expect(getCategoriesWithCounts(prompts).map((c) => c.category)).toEqual([
      "apple",
      "mango",
      "zebra",
    ]);
  });

  it("getCategories and getCategoriesWithCounts agree on category order", () => {
    const prompts = [
      makePrompt({ id: "a", category: "writing" }),
      makePrompt({ id: "b", category: "code" }),
    ];
    expect(getCategories(prompts)).toEqual(getCategoriesWithCounts(prompts).map((c) => c.category));
  });

  it("drops empty / whitespace-only categories defensively", () => {
    const prompts = [
      makePrompt({ id: "a", category: "writing" }),
      makePrompt({ id: "b", category: "  " }),
      makePrompt({ id: "c", category: "" }),
    ];
    expect(getCategoriesWithCounts(prompts)).toEqual([{ category: "writing", count: 1 }]);
  });
});
