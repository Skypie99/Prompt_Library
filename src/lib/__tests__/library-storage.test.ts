/**
 * Tests for the storage-backed helpers in src/lib/library.ts that were not
 * covered in library.test.ts:
 *
 *   - isIsoDate / normalizeIsoDate (validators)
 *   - writeJSON (quota / unavailable error paths + write-failure handler)
 *   - loadUserPrompts / saveUserPrompts (round-trip + corrupt-entry defence)
 *   - loadFavorites / saveFavorites
 *   - loadRecent / saveRecent
 *   - loadOnboarded / saveOnboarded
 *   - purgePromptStorage (wipes per-prompt sub-keys only)
 *   - wipeAllUserData (wipes user list + all per-prompt sub-keys; spares settings)
 *   - runStorageMigrations (idempotent, stamps schemaVersion)
 *
 * All tests are jsdom-agnostic — a tiny Map-backed stub is installed before
 * each test and removed after, mirroring the pattern in runs.test.ts.
 */

import {
  isIsoDate,
  normalizeIsoDate,
  writeJSON,
  loadUserPrompts,
  saveUserPrompts,
  loadFavorites,
  saveFavorites,
  loadRecent,
  saveRecent,
  loadOnboarded,
  saveOnboarded,
  purgePromptStorage,
  wipeAllUserData,
  runStorageMigrations,
  setStorageWriteFailureHandler,
  SCHEMA_VERSION,
} from "../library";
import type { Prompt } from "../types";

// ---------------------------------------------------------------------------
// Fake storage helpers
// ---------------------------------------------------------------------------

type FakeStore = Map<string, string>;

function installFakeStorage(): FakeStore {
  const store: FakeStore = new Map();
  const stub = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  // @ts-expect-error — test stub
  globalThis.window = { localStorage: stub };
  // @ts-expect-error — test stub
  globalThis.localStorage = stub;
  return store;
}

function uninstallFakeStorage(): void {
  // @ts-expect-error
  delete globalThis.window;
  // @ts-expect-error
  delete globalThis.localStorage;
}

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: "p-1",
    title: "Test Prompt",
    description: "desc",
    body: "Hello {{name}}",
    variables: [],
    category: "writing",
    tags: ["draft"],
    createdAt: "2026-05-23T12:00:00.000Z",
    isSeed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isIsoDate
// ---------------------------------------------------------------------------

describe("isIsoDate", () => {
  it("accepts a valid ISO 8601 timestamp with Z", () => {
    expect(isIsoDate("2026-05-23T12:00:00.000Z")).toBe(true);
  });

  it("accepts a valid ISO timestamp without timezone", () => {
    expect(isIsoDate("2026-05-23T12:00:00")).toBe(true);
  });

  it("accepts a valid ISO timestamp with +HH:MM offset", () => {
    expect(isIsoDate("2026-05-23T12:00:00+05:30")).toBe(true);
  });

  it("accepts a valid ISO timestamp with milliseconds and Z", () => {
    expect(isIsoDate("2026-01-01T00:00:00.123Z")).toBe(true);
  });

  it("rejects a plain date (no time component)", () => {
    expect(isIsoDate("2026-05-23")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isIsoDate("")).toBe(false);
  });

  it("rejects a number", () => {
    expect(isIsoDate(1234567890)).toBe(false);
  });

  it("rejects null", () => {
    expect(isIsoDate(null)).toBe(false);
  });

  it("rejects a human-readable date string", () => {
    expect(isIsoDate("May 23, 2026")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeIsoDate
// ---------------------------------------------------------------------------

describe("normalizeIsoDate", () => {
  it("passes through a valid ISO timestamp unchanged", () => {
    const iso = "2026-05-23T12:00:00.000Z";
    expect(normalizeIsoDate(iso)).toBe(iso);
  });

  it("converts a parseable non-ISO string to ISO", () => {
    const result = normalizeIsoDate("2026-05-23");
    // Should be parseable as a date and end in Z or +.
    expect(() => new Date(result)).not.toThrow();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("converts a Unix timestamp (number) to ISO", () => {
    const ts = 1_716_462_000_000; // some ms epoch
    const result = normalizeIsoDate(ts);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("falls back to 'now' for an unparseable string", () => {
    const before = Date.now();
    const result = normalizeIsoDate("not a date at all !!!");
    const after = Date.now();
    const ts = new Date(result).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 5); // tiny clock wiggle
  });

  it("falls back to 'now' for null", () => {
    const before = Date.now();
    const result = normalizeIsoDate(null);
    const ts = new Date(result).getTime();
    expect(ts).toBeGreaterThanOrEqual(before - 5);
  });
});

// ---------------------------------------------------------------------------
// writeJSON — failure handler
// ---------------------------------------------------------------------------

describe("writeJSON + setStorageWriteFailureHandler", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => {
    uninstallFakeStorage();
    setStorageWriteFailureHandler(null);
  });

  it("returns { ok: true } on a successful write", () => {
    const result = writeJSON("promptlib:test-key", { hello: "world" });
    expect(result.ok).toBe(true);
  });

  it("the written value is retrievable via localStorage", () => {
    writeJSON("promptlib:test-key", { x: 1 });
    const raw = globalThis.localStorage.getItem("promptlib:test-key");
    expect(JSON.parse(raw!)).toEqual({ x: 1 });
  });

  it("returns { ok: false, reason: 'unavailable' } when window is undefined", () => {
    uninstallFakeStorage();
    const result = writeJSON("promptlib:test-key", "value");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
  });

  it("calls the write-failure handler when a write fails", () => {
    // Simulate quota error by making setItem throw a QuotaExceededError.
    const failures: unknown[] = [];
    setStorageWriteFailureHandler((r) => failures.push(r));

    const erroringStorage = {
      getItem: () => null,
      setItem: () => {
        const e = new Error("quota");
        (e as { name: string }).name = "QuotaExceededError";
        throw e;
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    // @ts-expect-error — test stub
    globalThis.window = { localStorage: erroringStorage };
    // @ts-expect-error — test stub
    globalThis.localStorage = erroringStorage;

    const result = writeJSON("promptlib:x", "y");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("quota");
    expect(failures).toHaveLength(1);

    setStorageWriteFailureHandler(null);
  });
});

// ---------------------------------------------------------------------------
// loadUserPrompts / saveUserPrompts
// ---------------------------------------------------------------------------

describe("loadUserPrompts / saveUserPrompts", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns [] when nothing is stored", () => {
    expect(loadUserPrompts()).toEqual([]);
  });

  it("round-trips a valid prompt array", () => {
    const prompts = [makePrompt({ id: "a" }), makePrompt({ id: "b", title: "B" })];
    saveUserPrompts(prompts);
    const loaded = loadUserPrompts();
    expect(loaded.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("drops corrupt entries but keeps valid ones", () => {
    const raw = JSON.stringify([
      makePrompt({ id: "good" }),
      { id: 99, title: 123 }, // corrupt
    ]);
    globalThis.localStorage.setItem("promptlib:userPrompts", raw);
    const loaded = loadUserPrompts();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("good");
  });

  it("normalizes createdAt to ISO on load (coercion)", () => {
    // Write a prompt with a non-standard but parseable date.
    const p = makePrompt({ createdAt: "2026-01-01" });
    // Manually bypass our writeJSON to plant the non-ISO date.
    globalThis.localStorage.setItem(
      "promptlib:userPrompts",
      JSON.stringify([{ ...p, isSeed: false }]),
    );
    const loaded = loadUserPrompts();
    // normalizeIsoDate should have been called → createdAt is now full ISO.
    expect(loaded[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("returns [] when stored JSON is not an array", () => {
    globalThis.localStorage.setItem("promptlib:userPrompts", JSON.stringify({ not: "array" }));
    expect(loadUserPrompts()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// loadFavorites / saveFavorites
// ---------------------------------------------------------------------------

describe("loadFavorites / saveFavorites", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns [] when nothing is stored", () => {
    expect(loadFavorites()).toEqual([]);
  });

  it("round-trips a list of ids", () => {
    saveFavorites(["p-1", "p-2", "p-3"]);
    expect(loadFavorites()).toEqual(["p-1", "p-2", "p-3"]);
  });

  it("filters out non-string entries on load", () => {
    globalThis.localStorage.setItem(
      "promptlib:favorites",
      JSON.stringify(["ok", 123, null, "also-ok"]),
    );
    expect(loadFavorites()).toEqual(["ok", "also-ok"]);
  });

  it("returns [] when stored value is not an array", () => {
    globalThis.localStorage.setItem("promptlib:favorites", JSON.stringify({ oops: true }));
    expect(loadFavorites()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// loadRecent / saveRecent
// ---------------------------------------------------------------------------

describe("loadRecent / saveRecent", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns [] when nothing is stored", () => {
    expect(loadRecent()).toEqual([]);
  });

  it("round-trips a list of ids", () => {
    saveRecent(["x", "y", "z"]);
    expect(loadRecent()).toEqual(["x", "y", "z"]);
  });

  it("filters out non-string entries on load", () => {
    globalThis.localStorage.setItem(
      "promptlib:recent",
      JSON.stringify(["a", 42, "b"]),
    );
    expect(loadRecent()).toEqual(["a", "b"]);
  });
});

// ---------------------------------------------------------------------------
// loadOnboarded / saveOnboarded
// ---------------------------------------------------------------------------

describe("loadOnboarded / saveOnboarded", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns false when nothing is stored", () => {
    expect(loadOnboarded()).toBe(false);
  });

  it("returns true after saveOnboarded() is called", () => {
    saveOnboarded();
    expect(loadOnboarded()).toBe(true);
  });

  it("returns false when stored value is not exactly true", () => {
    globalThis.localStorage.setItem("promptlib:onboarded", JSON.stringify("yes"));
    expect(loadOnboarded()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// purgePromptStorage
// ---------------------------------------------------------------------------

describe("purgePromptStorage", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("removes all per-prompt sub-keys for the given id", () => {
    globalThis.localStorage.setItem("promptlib:runs:p-1", "[]");
    globalThis.localStorage.setItem("promptlib:values:p-1", "{}");
    purgePromptStorage("p-1");
    expect(globalThis.localStorage.getItem("promptlib:runs:p-1")).toBeNull();
    expect(globalThis.localStorage.getItem("promptlib:values:p-1")).toBeNull();
  });

  it("does NOT touch sub-keys belonging to a different prompt id", () => {
    globalThis.localStorage.setItem("promptlib:runs:p-1", "[]");
    globalThis.localStorage.setItem("promptlib:runs:p-2", "[1]");
    purgePromptStorage("p-1");
    expect(globalThis.localStorage.getItem("promptlib:runs:p-2")).toBe("[1]");
  });

  it("does NOT touch top-level list keys (userPrompts, favorites, recent)", () => {
    globalThis.localStorage.setItem("promptlib:userPrompts", "[]");
    globalThis.localStorage.setItem("promptlib:favorites", "[]");
    purgePromptStorage("p-1");
    expect(globalThis.localStorage.getItem("promptlib:userPrompts")).toBe("[]");
    expect(globalThis.localStorage.getItem("promptlib:favorites")).toBe("[]");
  });

  it("is a no-op when window is undefined (SSR-safe)", () => {
    uninstallFakeStorage();
    expect(() => purgePromptStorage("p-1")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// wipeAllUserData
// ---------------------------------------------------------------------------

describe("wipeAllUserData", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("clears userPrompts, favorites, and recent", () => {
    globalThis.localStorage.setItem("promptlib:userPrompts", "[1]");
    globalThis.localStorage.setItem("promptlib:favorites", '["a"]');
    globalThis.localStorage.setItem("promptlib:recent", '["b"]');
    wipeAllUserData();
    expect(globalThis.localStorage.getItem("promptlib:userPrompts")).toBeNull();
    expect(globalThis.localStorage.getItem("promptlib:favorites")).toBeNull();
    expect(globalThis.localStorage.getItem("promptlib:recent")).toBeNull();
  });

  it("clears per-prompt runs and values sub-keys", () => {
    globalThis.localStorage.setItem("promptlib:runs:p-1", "[]");
    globalThis.localStorage.setItem("promptlib:values:p-1", "{}");
    globalThis.localStorage.setItem("promptlib:runs:p-2", "[]");
    wipeAllUserData();
    expect(globalThis.localStorage.getItem("promptlib:runs:p-1")).toBeNull();
    expect(globalThis.localStorage.getItem("promptlib:values:p-1")).toBeNull();
    expect(globalThis.localStorage.getItem("promptlib:runs:p-2")).toBeNull();
  });

  it("does NOT touch apiKey, model, maxTokens, schemaVersion, or onboarded", () => {
    globalThis.localStorage.setItem("promptlib:apiKey", "sk-test");
    globalThis.localStorage.setItem("promptlib:model", "claude-opus-4-7");
    globalThis.localStorage.setItem("promptlib:maxTokens", "2048");
    globalThis.localStorage.setItem("promptlib:schemaVersion", "1");
    globalThis.localStorage.setItem("promptlib:onboarded", "true");
    wipeAllUserData();
    expect(globalThis.localStorage.getItem("promptlib:apiKey")).toBe("sk-test");
    expect(globalThis.localStorage.getItem("promptlib:model")).toBe("claude-opus-4-7");
    expect(globalThis.localStorage.getItem("promptlib:maxTokens")).toBe("2048");
    expect(globalThis.localStorage.getItem("promptlib:schemaVersion")).toBe("1");
    expect(globalThis.localStorage.getItem("promptlib:onboarded")).toBe("true");
  });

  it("is a no-op when window is undefined (SSR-safe)", () => {
    uninstallFakeStorage();
    expect(() => wipeAllUserData()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// runStorageMigrations
// ---------------------------------------------------------------------------

describe("runStorageMigrations", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("stamps the schemaVersion key on first run", () => {
    runStorageMigrations();
    const raw = globalThis.localStorage.getItem("promptlib:schemaVersion");
    expect(raw).not.toBeNull();
    expect(Number(raw)).toBe(SCHEMA_VERSION);
  });

  it("is idempotent — running twice does not change schemaVersion", () => {
    runStorageMigrations();
    runStorageMigrations();
    const raw = globalThis.localStorage.getItem("promptlib:schemaVersion");
    expect(Number(raw)).toBe(SCHEMA_VERSION);
  });

  it("upgrades a stored v0 schema to the current version", () => {
    // v0 = key not present, which is the default for readJSON(0).
    expect(globalThis.localStorage.getItem("promptlib:schemaVersion")).toBeNull();
    runStorageMigrations();
    expect(Number(globalThis.localStorage.getItem("promptlib:schemaVersion"))).toBe(SCHEMA_VERSION);
  });

  it("is a no-op when window is undefined (SSR-safe)", () => {
    uninstallFakeStorage();
    expect(() => runStorageMigrations()).not.toThrow();
  });
});
