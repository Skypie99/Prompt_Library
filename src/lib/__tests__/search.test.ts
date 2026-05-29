/**
 * Tests for src/lib/search.ts — the search + highlight layer. searchPrompts
 * is a thin wrapper around Fuse.js; we test the contract (empty query
 * passes through, queries return matching prompts) rather than Fuse's
 * scoring details. getHighlightSegments is pure and gets exhaustive cases.
 */

import { createPromptFuse, searchPrompts, getHighlightSegments } from "../search";
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

describe("searchPrompts", () => {
  const prompts: Prompt[] = [
    makePrompt({
      id: "1",
      title: "Email subject line generator",
      description: "Generate catchy subject lines",
      tags: ["email", "marketing"],
    }),
    makePrompt({
      id: "2",
      title: "Code review checklist",
      description: "Quick reminders before merging",
      tags: ["engineering"],
    }),
    makePrompt({
      id: "3",
      title: "Meeting summary",
      description: "Turn transcripts into action items",
      tags: ["productivity"],
    }),
  ];

  it("returns all prompts (in order) for an empty query", () => {
    const fuse = createPromptFuse(prompts);
    const result = searchPrompts(fuse, prompts, "");
    expect(result.map((r) => r.prompt.id)).toEqual(["1", "2", "3"]);
  });

  it("returns all prompts for a whitespace-only query", () => {
    const fuse = createPromptFuse(prompts);
    const result = searchPrompts(fuse, prompts, "   ");
    expect(result).toHaveLength(3);
  });

  it("returns no matches for unrelated text", () => {
    const fuse = createPromptFuse(prompts);
    const result = searchPrompts(fuse, prompts, "zzzxxxqqq");
    expect(result).toEqual([]);
  });

  it("finds a prompt by title", () => {
    const fuse = createPromptFuse(prompts);
    const result = searchPrompts(fuse, prompts, "email");
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].prompt.id).toBe("1");
  });

  it("attaches match metadata when a query returns results", () => {
    const fuse = createPromptFuse(prompts);
    const result = searchPrompts(fuse, prompts, "email");
    expect(result[0].matches).toBeDefined();
  });

  it("returns no matches for an empty prompt list (with a query)", () => {
    const empty: Prompt[] = [];
    const fuse = createPromptFuse(empty);
    const result = searchPrompts(fuse, empty, "anything");
    expect(result).toEqual([]);
  });
});

describe("getHighlightSegments", () => {
  it("returns a single un-highlighted segment when matches is undefined", () => {
    expect(getHighlightSegments("hello world", undefined, "title")).toEqual([
      { text: "hello world", highlight: false },
    ]);
  });

  it("returns a single un-highlighted segment when no match for the key", () => {
    const matches = [
      { key: "body", value: "hello world", indices: [[0, 4]] as [number, number][] },
    ];
    expect(getHighlightSegments("hello world", matches, "title")).toEqual([
      { text: "hello world", highlight: false },
    ]);
  });

  it("highlights a single matched range in the middle", () => {
    const matches = [
      { key: "title", value: "hello world", indices: [[6, 10]] as [number, number][] },
    ];
    expect(getHighlightSegments("hello world", matches, "title")).toEqual([
      { text: "hello ", highlight: false },
      { text: "world", highlight: true },
    ]);
  });

  it("highlights a match at the start", () => {
    const matches = [
      { key: "title", value: "hello world", indices: [[0, 4]] as [number, number][] },
    ];
    expect(getHighlightSegments("hello world", matches, "title")).toEqual([
      { text: "hello", highlight: true },
      { text: " world", highlight: false },
    ]);
  });

  it("highlights a match at the end", () => {
    const matches = [{ key: "title", value: "abc", indices: [[2, 2]] as [number, number][] }];
    expect(getHighlightSegments("abc", matches, "title")).toEqual([
      { text: "ab", highlight: false },
      { text: "c", highlight: true },
    ]);
  });

  it("handles multiple non-overlapping ranges", () => {
    const matches = [
      {
        key: "title",
        value: "aXbYc",
        indices: [
          [1, 1],
          [3, 3],
        ] as [number, number][],
      },
    ];
    expect(getHighlightSegments("aXbYc", matches, "title")).toEqual([
      { text: "a", highlight: false },
      { text: "X", highlight: true },
      { text: "b", highlight: false },
      { text: "Y", highlight: true },
      { text: "c", highlight: false },
    ]);
  });

  it("merges adjacent ranges without dropping characters", () => {
    const matches = [
      {
        key: "title",
        value: "aabbcc",
        indices: [
          [0, 1],
          [2, 3],
        ] as [number, number][],
      },
    ];
    const segs = getHighlightSegments("aabbcc", matches, "title");
    const joined = segs.map((s) => s.text).join("");
    expect(joined).toBe("aabbcc");
  });

  it("returns the plain segment when match has zero indices", () => {
    const matches = [{ key: "title", value: "hello", indices: [] as [number, number][] }];
    expect(getHighlightSegments("hello", matches, "title")).toEqual([
      { text: "hello", highlight: false },
    ]);
  });
});
