/**
 * Tests for src/lib/sort.ts (F-eve-1) — prompt sort preference + sorter.
 * Same jsdom-agnostic localStorage stub pattern as the other test files.
 */

import { DEFAULT_SORT, SORT_LABELS, loadSort, saveSort, sortPrompts, type SortMode } from "../sort";
import type { Prompt } from "../types";

function installFakeStorage(): void {
  const store = new Map<string, string>();
  const stub = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  // @ts-expect-error — test stub
  globalThis.window = { localStorage: stub };
  globalThis.localStorage = stub;
}

function uninstallFakeStorage(): void {
  // @ts-expect-error -- globalThis.window is not typed as optional but delete is safe in jsdom test teardown
  delete globalThis.window;
  // @ts-expect-error -- globalThis.localStorage is not typed as optional but delete is safe in jsdom test teardown
  delete globalThis.localStorage;
}

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: "p-1",
    title: "Alpha",
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

// ---- preference round-trip ------------------------------------------------

describe("sort preference (F-eve-1)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns DEFAULT_SORT when nothing is stored", () => {
    expect(loadSort()).toBe(DEFAULT_SORT);
  });

  it("round-trips through save → load for each mode", () => {
    for (const mode of ["newest", "az", "most-run"] as SortMode[]) {
      saveSort(mode);
      expect(loadSort()).toBe(mode);
    }
  });

  it("returns DEFAULT_SORT on an unknown stored value", () => {
    globalThis.localStorage.setItem("promptlib:sort", "bogus");
    expect(loadSort()).toBe(DEFAULT_SORT);
  });

  it("DEFAULT_SORT is 'newest' — preserves the prior chronological order", () => {
    // Pinned: changing the default is a visible behavior change for every
    // existing user. If a future bump intentionally changes this, update
    // the assertion.
    expect(DEFAULT_SORT).toBe("newest");
  });

  it("SORT_LABELS has a label for every mode", () => {
    expect(SORT_LABELS.newest).toBeTruthy();
    expect(SORT_LABELS.az).toBeTruthy();
    expect(SORT_LABELS["most-run"]).toBeTruthy();
  });
});

describe("sort preference — SSR safety", () => {
  it("loadSort returns DEFAULT_SORT when window is undefined", () => {
    expect(loadSort()).toBe(DEFAULT_SORT);
  });

  it("saveSort is a no-op when window is undefined (no throw)", () => {
    expect(() => saveSort("az")).not.toThrow();
  });
});

// ---- sortPrompts -----------------------------------------------------------

describe("sortPrompts", () => {
  it("does not mutate the input array", () => {
    const input = [makePrompt({ id: "a" }), makePrompt({ id: "b" })];
    const snapshot = [...input];
    sortPrompts(input, "az");
    expect(input).toEqual(snapshot);
  });

  it("newest: orders by createdAt desc", () => {
    const sorted = sortPrompts(
      [
        makePrompt({ id: "old", createdAt: "2024-01-01T00:00:00.000Z" }),
        makePrompt({ id: "new", createdAt: "2026-01-01T00:00:00.000Z" }),
        makePrompt({ id: "mid", createdAt: "2025-01-01T00:00:00.000Z" }),
      ],
      "newest",
    );
    expect(sorted.map((p) => p.id)).toEqual(["new", "mid", "old"]);
  });

  it("az: orders alphabetically, case-insensitive", () => {
    const sorted = sortPrompts(
      [
        makePrompt({ id: "1", title: "zebra" }),
        makePrompt({ id: "2", title: "Apple" }),
        makePrompt({ id: "3", title: "banana" }),
      ],
      "az",
    );
    expect(sorted.map((p) => p.title)).toEqual(["Apple", "banana", "zebra"]);
  });

  it("most-run: orders by count desc; missing counts treated as 0", () => {
    const counts = new Map<string, number>([
      ["a", 10],
      ["b", 3],
      // 'c' missing → 0
    ]);
    const sorted = sortPrompts(
      [makePrompt({ id: "c" }), makePrompt({ id: "a" }), makePrompt({ id: "b" })],
      "most-run",
      counts,
    );
    expect(sorted.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("most-run: ties broken by createdAt desc (stable order)", () => {
    const counts = new Map<string, number>([
      ["a", 5],
      ["b", 5],
    ]);
    const sorted = sortPrompts(
      [
        makePrompt({ id: "a", createdAt: "2024-01-01T00:00:00.000Z" }),
        makePrompt({ id: "b", createdAt: "2026-01-01T00:00:00.000Z" }),
      ],
      "most-run",
      counts,
    );
    expect(sorted.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("most-run: works with no counts map (all-zero, fall through to createdAt)", () => {
    const sorted = sortPrompts(
      [
        makePrompt({ id: "old", createdAt: "2024-01-01T00:00:00.000Z" }),
        makePrompt({ id: "new", createdAt: "2026-01-01T00:00:00.000Z" }),
      ],
      "most-run",
    );
    expect(sorted.map((p) => p.id)).toEqual(["new", "old"]);
  });
});
