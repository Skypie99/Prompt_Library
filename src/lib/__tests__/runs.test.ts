/**
 * Tests for src/lib/runs.ts — per-prompt run history. Exercises load/save,
 * cap enforcement, per-response size cap, corrupt-entry survival, the
 * formatRelativeTime helper, and the deletion paths. Will run unchanged
 * once the proposed Vitest setup lands; written to be jsdom-agnostic by
 * attaching a tiny localStorage stub to `globalThis.window`.
 */

import {
  RUNS_PER_PROMPT_CAP,
  MAX_RESPONSE_CHARS_PERSISTED,
  appendRun,
  clearRuns,
  formatRelativeTime,
  generateRunId,
  loadAllRunCounts,
  loadRuns,
  removeRun,
  saveRuns,
  type StoredRun,
} from "../runs";

// ---- tiny in-memory localStorage stub --------------------------------------

interface FakeStorage {
  store: Map<string, string>;
}

function installFakeStorage(): FakeStorage {
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
  return { store };
}

function uninstallFakeStorage(): void {
  // @ts-expect-error — clean up
  delete globalThis.window;
  // @ts-expect-error — clean up
  delete globalThis.localStorage;
}

function fixtureRun(overrides: Partial<StoredRun> = {}): StoredRun {
  return {
    id: "run-fixture-1",
    ranAt: "2026-05-23T12:00:00.000Z",
    model: "claude-opus-4-7",
    values: { topic: "demo" },
    sentPrompt: "Write something about demo.",
    response: "OK here's something about demo.",
    status: "completed",
    ...overrides,
  };
}

// ---- generateRunId ---------------------------------------------------------

describe("generateRunId", () => {
  it("returns a non-empty string of [a-z0-9-]", () => {
    const id = generateRunId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(id).toMatch(/^[a-z0-9-]+$/i);
  });

  it("returns a different value on each call", () => {
    const a = generateRunId();
    const b = generateRunId();
    expect(a).not.toBe(b);
  });
});

// ---- load / save / append / remove / clear ---------------------------------

describe("runs storage (load/save/append/remove/clear)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns [] when the key is missing", () => {
    expect(loadRuns("nope")).toEqual([]);
  });

  it("round-trips a single run through save + load", () => {
    const run = fixtureRun();
    saveRuns("p1", [run]);
    expect(loadRuns("p1")).toEqual([run]);
  });

  it("drops corrupt entries on read but keeps valid ones", () => {
    saveRuns("p1", [
      fixtureRun({ id: "good" }),
      // @ts-expect-error — deliberately corrupt to verify defense
      { id: "bad", ranAt: 123, values: "oops" },
    ]);
    const loaded = loadRuns("p1");
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("good");
  });

  it("returns [] when the stored value is not an array", () => {
    // Write directly to bypass the validator.
    globalThis.localStorage.setItem("promptlib:runs:p1", JSON.stringify({ not: "an array" }));
    expect(loadRuns("p1")).toEqual([]);
  });

  it("returns [] when the stored JSON is corrupt", () => {
    globalThis.localStorage.setItem("promptlib:runs:p1", "{not valid json");
    expect(loadRuns("p1")).toEqual([]);
  });

  it("appendRun puts the newest entry first and enforces the cap", () => {
    for (let i = 0; i < RUNS_PER_PROMPT_CAP + 3; i++) {
      appendRun("p1", fixtureRun({ id: `run-${i}` }));
    }
    const loaded = loadRuns("p1");
    expect(loaded).toHaveLength(RUNS_PER_PROMPT_CAP);
    expect(loaded[0].id).toBe(`run-${RUNS_PER_PROMPT_CAP + 2}`);
    expect(loaded[loaded.length - 1].id).toBe(`run-3`); // first three got pushed off
  });

  it("appendRun trims responses larger than MAX_RESPONSE_CHARS_PERSISTED", () => {
    const big = "x".repeat(MAX_RESPONSE_CHARS_PERSISTED + 500);
    const result = appendRun("p1", fixtureRun({ id: "big", response: big }));
    expect(result[0].response.length).toBe(MAX_RESPONSE_CHARS_PERSISTED);
  });

  it("removeRun removes only the matching id", () => {
    appendRun("p1", fixtureRun({ id: "a" }));
    appendRun("p1", fixtureRun({ id: "b" }));
    appendRun("p1", fixtureRun({ id: "c" }));
    const after = removeRun("p1", "b");
    expect(after.map((r) => r.id)).toEqual(["c", "a"]);
  });

  it("clearRuns removes the key entirely", () => {
    appendRun("p1", fixtureRun());
    clearRuns("p1");
    expect(globalThis.localStorage.getItem("promptlib:runs:p1")).toBeNull();
    expect(loadRuns("p1")).toEqual([]);
  });

  it("does NOT touch other prompts' run keys", () => {
    appendRun("p1", fixtureRun({ id: "x" }));
    appendRun("p2", fixtureRun({ id: "y" }));
    clearRuns("p1");
    expect(loadRuns("p1")).toEqual([]);
    expect(loadRuns("p2").map((r) => r.id)).toEqual(["y"]);
  });
});

// ---- formatRelativeTime ----------------------------------------------------

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-05-23T12:00:00.000Z");

  it("returns 'just now' for sub-45s deltas in either direction", () => {
    expect(formatRelativeTime("2026-05-23T11:59:30.000Z", NOW)).toBe("just now");
    expect(formatRelativeTime("2026-05-23T12:00:10.000Z", NOW)).toBe("just now");
  });

  it("returns a minutes-ago form for sub-hour deltas", () => {
    const out = formatRelativeTime("2026-05-23T11:55:00.000Z", NOW);
    // Either "5 minutes ago" (Intl.RelativeTimeFormat) or "5 min ago" fallback.
    expect(out).toMatch(/5 (minutes? ago|min ago)/);
  });

  it("returns an hours form for sub-day deltas", () => {
    const out = formatRelativeTime("2026-05-23T09:00:00.000Z", NOW);
    expect(out).toMatch(/3 (hours? ago|hr ago)/);
  });

  it("falls back to a date for older-than-a-day deltas", () => {
    const out = formatRelativeTime("2026-05-20T12:00:00.000Z", NOW);
    // Locale-dependent, but always contains the month abbrev (May) and day (20).
    expect(out).toMatch(/May/);
    expect(out).toMatch(/20/);
  });

  it("returns empty string for an unparseable input", () => {
    expect(formatRelativeTime("not a date", NOW)).toBe("");
  });
});

// ---- SSR safety ------------------------------------------------------------

describe("runs storage — SSR safety", () => {
  it("returns [] from loadRuns when window is undefined", () => {
    // No window installed at all.
    expect(loadRuns("anything")).toEqual([]);
  });

  it("clearRuns is a no-op when window is undefined", () => {
    // Should not throw.
    expect(() => clearRuns("anything")).not.toThrow();
  });
});

// ---- loadAllRunCounts (F-fast-2) -------------------------------------------

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
    globalThis.localStorage.setItem("promptlib:runs:p-2", JSON.stringify([{ id: "r4" }]));
    const counts = loadAllRunCounts();
    expect(counts.get("p-1")).toBe(3);
    expect(counts.get("p-2")).toBe(1);
    expect(counts.size).toBe(2);
  });

  it("ignores corrupt entries silently", () => {
    globalThis.localStorage.setItem("promptlib:runs:bad", "{not valid json");
    globalThis.localStorage.setItem("promptlib:runs:good", JSON.stringify([{ id: "ok" }]));
    const counts = loadAllRunCounts();
    expect(counts.get("good")).toBe(1);
    expect(counts.has("bad")).toBe(false);
  });

  it("ignores non-promptlib:runs:* keys", () => {
    installFakeStorage(); // ensure fresh storage so the other keys exist
    globalThis.localStorage.setItem("other:key", JSON.stringify([1, 2]));
    globalThis.localStorage.setItem("promptlib:favorites", JSON.stringify(["x"]));
    expect(loadAllRunCounts().size).toBe(0);
  });

  it("returns empty when window is undefined (SSR-safe)", () => {
    uninstallFakeStorage();
    expect(loadAllRunCounts().size).toBe(0);
  });
});
