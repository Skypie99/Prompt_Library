/**
 * Tests for the fastloop-2026-05-23 additions (Gary, end-of-session sweep).
 *
 * Covers:
 *   - loadAllRunCounts        (F-fast-2)
 *   - getStorageUsage + formatBytes (F-fast-3)
 *   - loadDensity / saveDensity (F-fast-5)
 *
 * F-fast-1 (char/token estimate) and F-fast-4 (Copy template) are
 * pure presentational additions in PromptDetail.tsx — no new pure-
 * logic surface to test at this layer; their behavior is exercised
 * by inspection / component tests in a future RTL pass.
 *
 * Uses the same jsdom-agnostic in-memory localStorage stub as the
 * other test files so this runs unchanged under Jest or Vitest once
 * the runner lands.
 */

import { formatBytes, getStorageUsage } from "../library";
import { loadAllRunCounts } from "../runs";
import { DEFAULT_DENSITY, loadDensity, saveDensity } from "../density";

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

// ---- F-fast-2: loadAllRunCounts -------------------------------------------

describe("loadAllRunCounts (F-fast-2)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns an empty Map when nothing is stored", () => {
    expect(loadAllRunCounts().size).toBe(0);
  });

  it("returns count per prompt for stored runs", () => {
    globalThis.localStorage.setItem(
      "promptlib:runs:p-1",
      JSON.stringify([{ id: "r1" }, { id: "r2" }, { id: "r3" }]),
    );
    globalThis.localStorage.setItem(
      "promptlib:runs:p-2",
      JSON.stringify([{ id: "r4" }]),
    );
    const counts = loadAllRunCounts();
    expect(counts.get("p-1")).toBe(3);
    expect(counts.get("p-2")).toBe(1);
    expect(counts.size).toBe(2);
  });

  it("ignores corrupt entries silently", () => {
    globalThis.localStorage.setItem("promptlib:runs:bad", "{not valid json");
    globalThis.localStorage.setItem(
      "promptlib:runs:good",
      JSON.stringify([{ id: "ok" }]),
    );
    const counts = loadAllRunCounts();
    expect(counts.get("good")).toBe(1);
    expect(counts.has("bad")).toBe(false);
  });

  it("returns empty when window is undefined (SSR-safe)", () => {
    uninstallFakeStorage();
    expect(loadAllRunCounts().size).toBe(0);
  });

  it("ignores non-promptlib:runs:* keys", () => {
    globalThis.localStorage.setItem("other:key", JSON.stringify([1, 2]));
    globalThis.localStorage.setItem("promptlib:favorites", JSON.stringify(["x"]));
    expect(loadAllRunCounts().size).toBe(0);
  });
});

// ---- F-fast-3: getStorageUsage + formatBytes ------------------------------

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

// ---- F-fast-5: loadDensity / saveDensity ----------------------------------

describe("density preference (F-fast-5)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns DEFAULT_DENSITY when nothing is stored", () => {
    expect(loadDensity()).toBe(DEFAULT_DENSITY);
  });

  it("round-trips through save → load", () => {
    saveDensity("compact");
    expect(loadDensity()).toBe("compact");
    saveDensity("comfortable");
    expect(loadDensity()).toBe("comfortable");
  });

  it("returns DEFAULT_DENSITY on an unknown stored value", () => {
    globalThis.localStorage.setItem("promptlib:density", "bogus");
    expect(loadDensity()).toBe(DEFAULT_DENSITY);
  });

  it("returns DEFAULT_DENSITY when window is undefined (SSR-safe)", () => {
    uninstallFakeStorage();
    expect(loadDensity()).toBe(DEFAULT_DENSITY);
  });

  it("save is a no-op when window is undefined (no throw)", () => {
    uninstallFakeStorage();
    expect(() => saveDensity("compact")).not.toThrow();
  });
});
