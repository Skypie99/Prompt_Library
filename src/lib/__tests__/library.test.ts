/**
 * Tests for src/lib/library.ts — the pure helpers (slugify, generateId,
 * mergePrompts). The localStorage-backed helpers are covered separately in
 * a future jsdom-equipped test once the runner is installed; see
 * docs/PROPOSAL_TESTING.md.
 */

import { slugify, generateId, mergePrompts, RECENT_CAP } from "../library";
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

describe("slugify", () => {
  it("lowercases and joins with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips punctuation", () => {
    expect(slugify("Hello, World! 2024.")).toBe("hello-world-2024");
  });

  it("collapses runs of non-alphanumerics", () => {
    expect(slugify("a   b___c---d")).toBe("a-b-c-d");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("returns 'prompt' for an empty string", () => {
    expect(slugify("")).toBe("prompt");
  });

  it("returns 'prompt' for a punctuation-only string", () => {
    expect(slugify("!!!")).toBe("prompt");
  });

  it("preserves digits", () => {
    expect(slugify("Top 10 ideas")).toBe("top-10-ideas");
  });
});

describe("generateId", () => {
  it("starts with the slug of the title", () => {
    const id = generateId("My Cool Prompt");
    expect(id.startsWith("my-cool-prompt-")).toBe(true);
  });

  it("appends a short alphanumeric suffix", () => {
    const id = generateId("Test");
    const suffix = id.replace(/^test-/, "");
    expect(suffix).toMatch(/^[a-z0-9]{1,5}$/);
  });

  it("falls back to 'prompt' when the title produces no slug", () => {
    const id = generateId("!!!");
    expect(id.startsWith("prompt-")).toBe(true);
  });

  it("returns different ids on repeated calls (collision-resistant)", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId("same")));
    // 20 random 4-char base36 suffixes will essentially always be unique.
    expect(ids.size).toBeGreaterThan(15);
  });
});

describe("mergePrompts", () => {
  it("returns [] when both lists are empty", () => {
    expect(mergePrompts([], [])).toEqual([]);
  });

  it("sorts merged prompts newest-first by createdAt", () => {
    const seed = makePrompt({
      id: "seed",
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    const user = makePrompt({
      id: "user",
      createdAt: "2026-05-01T00:00:00.000Z",
    });
    const result = mergePrompts([user], [seed]);
    expect(result.map((p) => p.id)).toEqual(["user", "seed"]);
  });

  it("interleaves user and seed prompts purely by date", () => {
    const a = makePrompt({ id: "a", createdAt: "2025-01-01T00:00:00.000Z" });
    const b = makePrompt({ id: "b", createdAt: "2025-06-01T00:00:00.000Z" });
    const c = makePrompt({ id: "c", createdAt: "2025-03-01T00:00:00.000Z" });
    const result = mergePrompts([a, b], [c]);
    expect(result.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate input arrays", () => {
    const user: Prompt[] = [
      makePrompt({ id: "u", createdAt: "2025-01-01T00:00:00.000Z" }),
    ];
    const seed: Prompt[] = [
      makePrompt({ id: "s", createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const userSnapshot = [...user];
    const seedSnapshot = [...seed];
    mergePrompts(user, seed);
    expect(user).toEqual(userSnapshot);
    expect(seed).toEqual(seedSnapshot);
  });
});

describe("RECENT_CAP", () => {
  it("is a positive integer (UI assumes a small fixed cap)", () => {
    expect(Number.isInteger(RECENT_CAP)).toBe(true);
    expect(RECENT_CAP).toBeGreaterThan(0);
  });
});
