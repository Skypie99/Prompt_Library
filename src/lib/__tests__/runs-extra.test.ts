/**
 * Additional tests for src/lib/runs.ts that fill the gaps left by runs.test.ts:
 *
 *   - setRunLabel (F-n2-11): update or clear a run's user label
 *   - loadAllLastRunIsos (F-n2-13): walk storage and map promptId → most-recent ranAt
 *
 * Same jsdom-agnostic localStorage stub pattern as the rest of the suite.
 */

import {
  appendRun,
  clearRuns,
  loadAllLastRunIsos,
  loadRuns,
  setRunLabel,
  type StoredRun,
} from "../runs";

// ---------------------------------------------------------------------------
// Fake storage
// ---------------------------------------------------------------------------

function installFakeStorage(): void {
  const store = new Map<string, string>();
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
}

function uninstallFakeStorage(): void {
  // @ts-expect-error
  delete globalThis.window;
  // @ts-expect-error
  delete globalThis.localStorage;
}

function fixtureRun(overrides: Partial<StoredRun> = {}): StoredRun {
  return {
    id: "run-1",
    ranAt: "2026-05-23T12:00:00.000Z",
    model: "claude-opus-4-7",
    values: { topic: "demo" },
    sentPrompt: "Write about demo.",
    response: "Here it is.",
    status: "completed",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// setRunLabel (F-n2-11)
// ---------------------------------------------------------------------------

describe("setRunLabel (F-n2-11)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("sets a label on the matching run and returns the updated list", () => {
    appendRun("p1", fixtureRun({ id: "r1" }));
    appendRun("p1", fixtureRun({ id: "r2" }));

    const updated = setRunLabel("p1", "r1", "first draft");
    const r1 = updated.find((r) => r.id === "r1");
    expect(r1?.label).toBe("first draft");
  });

  it("trims whitespace from the label before saving", () => {
    appendRun("p1", fixtureRun({ id: "r1" }));
    const updated = setRunLabel("p1", "r1", "  trimmed  ");
    expect(updated.find((r) => r.id === "r1")?.label).toBe("trimmed");
  });

  it("sets label to undefined when an empty string is passed (clearing the label)", () => {
    appendRun("p1", fixtureRun({ id: "r1", label: "old label" }));
    const updated = setRunLabel("p1", "r1", "");
    expect(updated.find((r) => r.id === "r1")?.label).toBeUndefined();
  });

  it("sets label to undefined when a whitespace-only string is passed", () => {
    appendRun("p1", fixtureRun({ id: "r1", label: "old" }));
    const updated = setRunLabel("p1", "r1", "   ");
    expect(updated.find((r) => r.id === "r1")?.label).toBeUndefined();
  });

  it("does NOT affect other runs in the same list", () => {
    appendRun("p1", fixtureRun({ id: "r1" }));
    appendRun("p1", fixtureRun({ id: "r2" }));
    const updated = setRunLabel("p1", "r1", "labeled");
    const r2 = updated.find((r) => r.id === "r2");
    expect(r2?.label).toBeUndefined();
  });

  it("returns an unchanged list when the runId does not exist", () => {
    appendRun("p1", fixtureRun({ id: "r1" }));
    const updated = setRunLabel("p1", "ghost-id", "nope");
    expect(updated).toHaveLength(1);
    expect(updated[0].label).toBeUndefined();
  });

  it("persists the label so a subsequent loadRuns reflects it", () => {
    appendRun("p1", fixtureRun({ id: "r1" }));
    setRunLabel("p1", "r1", "persisted label");
    const reloaded = loadRuns("p1");
    expect(reloaded.find((r: StoredRun) => r.id === "r1")?.label).toBe("persisted label");
  });
});

// ---------------------------------------------------------------------------
// loadAllLastRunIsos (F-n2-13)
// ---------------------------------------------------------------------------

describe("loadAllLastRunIsos (F-n2-13)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns an empty Map when nothing is stored", () => {
    expect(loadAllLastRunIsos().size).toBe(0);
  });

  it("returns the ranAt of the first (newest) run for each prompt", () => {
    // appendRun prepends newest-first, so the last appended is at index 0.
    appendRun("p-1", fixtureRun({ id: "old", ranAt: "2026-01-01T00:00:00.000Z" }));
    appendRun("p-1", fixtureRun({ id: "new", ranAt: "2026-05-23T12:00:00.000Z" }));
    const isos = loadAllLastRunIsos();
    expect(isos.get("p-1")).toBe("2026-05-23T12:00:00.000Z");
  });

  it("returns a separate entry per prompt id", () => {
    appendRun("p-1", fixtureRun({ id: "r1", ranAt: "2026-01-01T00:00:00.000Z" }));
    appendRun("p-2", fixtureRun({ id: "r2", ranAt: "2026-06-01T00:00:00.000Z" }));
    const isos = loadAllLastRunIsos();
    expect(isos.get("p-1")).toBe("2026-01-01T00:00:00.000Z");
    expect(isos.get("p-2")).toBe("2026-06-01T00:00:00.000Z");
    expect(isos.size).toBe(2);
  });

  it("ignores keys that are not under promptlib:runs:", () => {
    globalThis.localStorage.setItem("promptlib:favorites", '["x"]');
    globalThis.localStorage.setItem("other:runs:p-99", "[]");
    appendRun("p-1", fixtureRun({ id: "r1" }));
    const isos = loadAllLastRunIsos();
    expect(isos.has("p-99")).toBe(false);
    expect(isos.size).toBe(1);
  });

  it("returns empty string for a prompt whose run list is an empty array", () => {
    clearRuns("p-empty"); // ensures the key doesn't exist
    // Write an empty array directly so the key exists but has no runs.
    globalThis.localStorage.setItem("promptlib:runs:p-empty", "[]");
    const isos = loadAllLastRunIsos();
    // An empty array → no entry (the implementation skips length 0 arrays).
    expect(isos.has("p-empty")).toBe(false);
  });

  it("skips corrupt JSON without throwing", () => {
    globalThis.localStorage.setItem("promptlib:runs:corrupt", "{bad json");
    appendRun("p-good", fixtureRun({ id: "r1" }));
    const isos = loadAllLastRunIsos();
    expect(isos.has("corrupt")).toBe(false);
    expect(isos.has("p-good")).toBe(true);
  });

  it("returns empty Map when window is undefined (SSR-safe)", () => {
    uninstallFakeStorage();
    expect(loadAllLastRunIsos().size).toBe(0);
  });
});
