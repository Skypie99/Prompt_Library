/**
 * Tests for src/lib/library.ts — the pure helpers (slugify, generateId,
 * mergePrompts). The localStorage-backed helpers are covered separately in
 * a future jsdom-equipped test once the runner is installed; see
 * docs/PROPOSAL_TESTING.md.
 */

import {
  formatBytes,
  generateId,
  getStorageUsage,
  mergePrompts,
  RECENT_CAP,
  slugify,
} from "../library";
import type { Prompt } from "../types";

// In-memory localStorage stub used by the storage-usage tests below.
// Identical to the pattern in runs.test.ts / values.test.ts so the whole
// pure-logic suite is jsdom-agnostic.
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
  // @ts-expect-error — test stub
  globalThis.localStorage = stub;
}

function uninstallFakeStorage(): void {
  // @ts-expect-error
  delete globalThis.window;
  // @ts-expect-error
  delete globalThis.localStorage;
}

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

  it("appends a collision-safe suffix (UUID or long base36)", () => {
    const id = generateId("Test");
    const suffix = id.replace(/^test-/, "");
    // crypto.randomUUID() → 36 chars with 4 hyphens; fallback → 16 base-36
    // chars. Either way: at least 16 chars and only [a-z0-9-].
    expect(suffix.length).toBeGreaterThanOrEqual(16);
    expect(suffix).toMatch(/^[a-z0-9-]+$/);
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
    const user: Prompt[] = [makePrompt({ id: "u", createdAt: "2025-01-01T00:00:00.000Z" })];
    const seed: Prompt[] = [makePrompt({ id: "s", createdAt: "2026-01-01T00:00:00.000Z" })];
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

// ---- getStorageUsage + formatBytes (F-fast-3) ------------------------------

describe("getStorageUsage (F-fast-3)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns zero-bucket totals when nothing is stored", () => {
    const usage = getStorageUsage();
    expect(usage.totalBytes).toBe(0);
    expect(usage.promptsWithSubKeys).toBe(0);
    expect(usage.buckets.every((b) => b.bytes === 0)).toBe(true);
  });

  it("buckets userPrompts, runs, values, favorites, settings correctly", () => {
    globalThis.localStorage.setItem("promptlib:userPrompts", "[]");
    globalThis.localStorage.setItem("promptlib:favorites", "[]");
    globalThis.localStorage.setItem("promptlib:recent", "[]");
    globalThis.localStorage.setItem("promptlib:runs:p1", "[]");
    globalThis.localStorage.setItem("promptlib:values:p1", "{}");
    globalThis.localStorage.setItem("promptlib:apiKey", "sk-test");
    globalThis.localStorage.setItem("promptlib:model", "claude-opus-4-7");
    globalThis.localStorage.setItem("promptlib:maxTokens", "2048");
    globalThis.localStorage.setItem("promptlib:theme", "dark");
    globalThis.localStorage.setItem("promptlib:schemaVersion", "1");

    const usage = getStorageUsage();
    expect(usage.totalBytes).toBeGreaterThan(0);
    expect(usage.promptsWithSubKeys).toBe(1);

    const byLabel = new Map(usage.buckets.map((b) => [b.label, b.bytes]));
    expect(byLabel.get("Prompts (custom)")! > 0).toBe(true);
    expect(byLabel.get("Run history")! > 0).toBe(true);
    expect(byLabel.get("Saved variable values")! > 0).toBe(true);
    expect(byLabel.get("Favorites + Recent")! > 0).toBe(true);
    expect(byLabel.get("Settings (API key, model, tokens)")! > 0).toBe(true);
    expect(byLabel.get("App state (theme, schema, onboarding)")! > 0).toBe(true);
  });

  it("ignores keys outside the promptlib: namespace", () => {
    globalThis.localStorage.setItem("foreign:key", "X".repeat(1000));
    expect(getStorageUsage().totalBytes).toBe(0);
  });

  it("returns zero buckets when window is undefined (SSR-safe)", () => {
    uninstallFakeStorage();
    const usage = getStorageUsage();
    expect(usage.totalBytes).toBe(0);
    expect(usage.buckets.length).toBeGreaterThan(0); // shape preserved
  });
});

describe("formatBytes (F-fast-3)", () => {
  it("formats sub-1KB as bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats sub-10KB with one decimal", () => {
    expect(formatBytes(2 * 1024)).toBe("2.0 KB");
    expect(formatBytes(3500)).toMatch(/3\.4 KB/);
  });

  it("formats 10KB+ as integer KB", () => {
    expect(formatBytes(15 * 1024)).toBe("15 KB");
  });

  it("formats sub-10MB with one decimal", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("formats 10MB+ as integer MB", () => {
    expect(formatBytes(12 * 1024 * 1024)).toBe("12 MB");
  });
});
