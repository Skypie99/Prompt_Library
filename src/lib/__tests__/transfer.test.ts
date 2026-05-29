/**
 * Tests for src/lib/transfer.ts (F5 — Export / Import library).
 *
 * Exercises export shape integrity, the validator for every input variant
 * we expect (good file, missing keys, malformed JSON, future version,
 * non-array userPrompts, corrupt sub-entries), and both apply paths
 * (Merge and Replace). Uses the same in-memory localStorage stub
 * pattern as runs.test.ts / values.test.ts so it runs unchanged under
 * Jest or Vitest once the runner lands.
 */

import {
  applyImport,
  buildExport,
  EXPORT_VERSION,
  exportToJson,
  parseImport,
  type ExportV1,
} from "../transfer";
import {
  saveFavorites,
  saveRecent,
  saveUserPrompts,
  saveValues,
} from "../library";
import { saveRuns } from "../runs";
import type { Prompt } from "../types";
import type { StoredRun } from "../runs";

// ---- in-memory localStorage stub -------------------------------------------

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
  // @ts-expect-error — clean up
  delete globalThis.window;
  // @ts-expect-error — clean up
  delete globalThis.localStorage;
}

// ---- fixtures --------------------------------------------------------------

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

function makeRun(overrides: Partial<StoredRun> = {}): StoredRun {
  return {
    id: "r-1",
    ranAt: "2026-05-23T12:00:00.000Z",
    model: "claude-opus-4-7",
    values: { name: "world" },
    sentPrompt: "Hello world",
    response: "Hi.",
    status: "completed",
    ...overrides,
  };
}

// ---- export ----------------------------------------------------------------

describe("buildExport / exportToJson", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("includes userPrompts, favorites, recent, runs, values", () => {
    saveUserPrompts([makePrompt({ id: "p-1" }), makePrompt({ id: "p-2", title: "Two" })]);
    saveFavorites(["p-1"]);
    saveRecent(["p-2", "p-1"]);
    saveRuns("p-1", [makeRun({ id: "r-1" })]);
    saveValues("p-1", { name: "alice" });

    const exp = buildExport();
    expect(exp.version).toBe(EXPORT_VERSION);
    expect(typeof exp.exportedAt).toBe("string");
    expect(exp.userPrompts.map((p) => p.id)).toEqual(["p-1", "p-2"]);
    expect(exp.favorites).toEqual(["p-1"]);
    expect(exp.recent).toEqual(["p-2", "p-1"]);
    expect(exp.runs["p-1"]).toHaveLength(1);
    expect(exp.values["p-1"]).toEqual({ name: "alice" });
  });

  it("never includes apiKey/model/maxTokens", () => {
    globalThis.localStorage.setItem("promptlib:apiKey", "sk-ant-test");
    globalThis.localStorage.setItem("promptlib:model", "claude-opus-4-7");
    globalThis.localStorage.setItem("promptlib:maxTokens", "2048");

    const json = exportToJson();
    expect(json).not.toMatch(/apiKey/);
    expect(json).not.toMatch(/sk-ant-test/);
    expect(json).not.toMatch(/maxTokens/);
  });

  it("filters out runs/values for prompt ids that aren't in userPrompts (ghost cleanup)", () => {
    saveUserPrompts([makePrompt({ id: "live" })]);
    saveRuns("live", [makeRun({ id: "r-1" })]);
    saveRuns("ghost", [makeRun({ id: "r-ghost" })]);
    saveValues("live", { a: "1" });
    saveValues("ghost", { b: "2" });

    const exp = buildExport();
    expect(Object.keys(exp.runs)).toEqual(["live"]);
    expect(Object.keys(exp.values)).toEqual(["live"]);
  });
});

// ---- parseImport: error paths ----------------------------------------------

describe("parseImport — error variants", () => {
  it("rejects malformed JSON", () => {
    const r = parseImport("{not valid json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("malformed");
  });

  it("rejects an array at the top level (wrong-shape)", () => {
    const r = parseImport(JSON.stringify([1, 2, 3]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("wrong-shape");
  });

  it("rejects an object missing the version key", () => {
    const r = parseImport(JSON.stringify({ userPrompts: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("wrong-shape");
  });

  it("rejects a future version", () => {
    const r = parseImport(JSON.stringify({ version: 99, userPrompts: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("future-version");
  });
});

// ---- parseImport: success + filtering --------------------------------------

describe("parseImport — success and silent drops", () => {
  it("preserves a fully valid v1 file", () => {
    const file: ExportV1 = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [makePrompt({ id: "p-1" })],
      favorites: ["p-1"],
      recent: ["p-1"],
      runs: { "p-1": [makeRun({ id: "r-1" })] },
      values: { "p-1": { name: "alice" } },
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.userPrompts).toHaveLength(1);
      expect(r.preview.userPromptCount).toBe(1);
      expect(r.preview.runsCount).toBe(1);
      expect(r.preview.valuesPromptCount).toBe(1);
      expect(r.preview.droppedCount).toBe(0);
    }
  });

  it("drops a corrupt prompt but keeps the valid one", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [
        makePrompt({ id: "p-good" }),
        { id: 1, title: 2, body: 3 }, // garbage
      ],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.userPrompts.map((p) => p.id)).toEqual(["p-good"]);
      expect(r.preview.droppedCount).toBeGreaterThan(0);
    }
  });

  it("forces isSeed: false on imported prompts (no seed elevation)", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [makePrompt({ id: "p-1", isSeed: true })],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.userPrompts[0].isSeed).toBe(false);
  });

  it("drops corrupt run entries but keeps valid ones", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [makePrompt({ id: "p-1" })],
      favorites: [],
      recent: [],
      runs: {
        "p-1": [makeRun({ id: "ok" }), { id: 1, ranAt: 2 }],
      },
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.runs["p-1"]).toHaveLength(1);
      expect(r.preview.droppedCount).toBeGreaterThan(0);
    }
  });

  it("drops non-string entries from favorites/recent silently", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: ["a", 1, "b"],
      recent: ["c", null, "d"],
      runs: {},
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.favorites).toEqual(["a", "b"]);
      expect(r.data.recent).toEqual(["c", "d"]);
      expect(r.preview.droppedCount).toBeGreaterThan(0);
    }
  });
});

// ---- applyImport — merge ---------------------------------------------------

describe("applyImport — merge", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("adds only prompts whose id is new", () => {
    saveUserPrompts([makePrompt({ id: "existing" })]);
    const file: ExportV1 = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [makePrompt({ id: "existing" }), makePrompt({ id: "new" })],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
    };
    const result = applyImport(file, "merge");
    expect(result.promptsAdded).toBe(1);
  });

  it("unions favorites without duplicating", () => {
    saveUserPrompts([]);
    saveFavorites(["a"]);
    const file: ExportV1 = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: ["a", "b"],
      recent: [],
      runs: {},
      values: {},
    };
    const result = applyImport(file, "merge");
    expect(result.favoritesAdded).toBe(1); // only 'b' is new
  });

  it("merges recent with existing-after-imported order and caps", () => {
    saveUserPrompts([]);
    saveRecent(["x", "y"]);
    const file: ExportV1 = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: ["new1", "new2"],
      runs: {},
      values: {},
    };
    const result = applyImport(file, "merge");
    // recentMerged counts ids that weren't already in existing; both new1
    // and new2 qualify.
    expect(result.recentMerged).toBe(2);
  });

  it("re-importing the same file is a no-op", () => {
    saveUserPrompts([makePrompt({ id: "p-1" })]);
    saveFavorites(["p-1"]);
    saveRecent(["p-1"]);
    saveRuns("p-1", [makeRun({ id: "r-1" })]);
    saveValues("p-1", { a: "1" });

    const exported = buildExport();
    const r = parseImport(JSON.stringify(exported));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const result = applyImport(r.data, "merge");
      expect(result.promptsAdded).toBe(0);
      expect(result.favoritesAdded).toBe(0);
      expect(result.recentMerged).toBe(0);
    }
  });
});

// ---- applyImport — replace -------------------------------------------------

describe("applyImport — replace", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("wipes existing user prompts AND per-prompt sub-keys, then writes the file", () => {
    saveUserPrompts([makePrompt({ id: "old" })]);
    saveRuns("old", [makeRun({ id: "old-run" })]);
    saveValues("old", { v: "1" });

    const file: ExportV1 = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [makePrompt({ id: "fresh" })],
      favorites: ["fresh"],
      recent: ["fresh"],
      runs: { fresh: [makeRun({ id: "r-fresh" })] },
      values: { fresh: { hello: "world" } },
    };
    const result = applyImport(file, "replace");
    expect(result.promptsAdded).toBe(1);

    // The "old" sub-keys must be gone.
    expect(globalThis.localStorage.getItem("promptlib:runs:old")).toBeNull();
    expect(globalThis.localStorage.getItem("promptlib:values:old")).toBeNull();

    // The "fresh" sub-keys must be present.
    expect(globalThis.localStorage.getItem("promptlib:runs:fresh")).not.toBeNull();
    expect(globalThis.localStorage.getItem("promptlib:values:fresh")).not.toBeNull();
  });

  it("does NOT touch apiKey / model / maxTokens / schemaVersion / onboarded", () => {
    globalThis.localStorage.setItem("promptlib:apiKey", "sk-ant-test");
    globalThis.localStorage.setItem("promptlib:model", "claude-opus-4-7");
    globalThis.localStorage.setItem("promptlib:maxTokens", "2048");
    globalThis.localStorage.setItem("promptlib:schemaVersion", "1");
    globalThis.localStorage.setItem("promptlib:onboarded", "true");

    const file: ExportV1 = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
    };
    applyImport(file, "replace");

    expect(globalThis.localStorage.getItem("promptlib:apiKey")).toBe("sk-ant-test");
    expect(globalThis.localStorage.getItem("promptlib:model")).toBe("claude-opus-4-7");
    expect(globalThis.localStorage.getItem("promptlib:maxTokens")).toBe("2048");
    expect(globalThis.localStorage.getItem("promptlib:schemaVersion")).toBe("1");
    expect(globalThis.localStorage.getItem("promptlib:onboarded")).toBe("true");
  });
});
