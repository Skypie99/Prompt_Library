/**
 * Tests for the per-prompt variable values storage in src/lib/library.ts.
 * Same pattern as runs.test.ts — a tiny in-memory localStorage stub keeps
 * the tests jsdom-agnostic so they run unchanged under Jest (jest-environment-jsdom)
 * or Vitest (jsdom).
 */

import { clearValues, loadValues, saveValues } from "../library";

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
  // @ts-expect-error
  delete globalThis.window;
  // @ts-expect-error
  delete globalThis.localStorage;
}

describe("per-prompt values storage (F2)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns {} when no values are saved", () => {
    expect(loadValues("p1")).toEqual({});
  });

  it("round-trips a values record", () => {
    const values = { topic: "shipping", tone: "warm and plain" };
    saveValues("p1", values);
    expect(loadValues("p1")).toEqual(values);
  });

  it("isolates values per prompt id", () => {
    saveValues("p1", { a: "1" });
    saveValues("p2", { b: "2" });
    expect(loadValues("p1")).toEqual({ a: "1" });
    expect(loadValues("p2")).toEqual({ b: "2" });
  });

  it("clearValues removes the key entirely", () => {
    saveValues("p1", { a: "1" });
    clearValues("p1");
    expect(globalThis.localStorage.getItem("promptlib:values:p1")).toBeNull();
    expect(loadValues("p1")).toEqual({});
  });

  it("returns {} when the stored shape is not a string record", () => {
    globalThis.localStorage.setItem("promptlib:values:p1", JSON.stringify([1, 2, 3]));
    expect(loadValues("p1")).toEqual({});
  });

  it("returns {} when a value in the record is not a string", () => {
    globalThis.localStorage.setItem(
      "promptlib:values:p1",
      JSON.stringify({ a: 1 }),
    );
    expect(loadValues("p1")).toEqual({});
  });

  it("returns {} when the stored JSON is corrupt", () => {
    globalThis.localStorage.setItem("promptlib:values:p1", "{nope");
    expect(loadValues("p1")).toEqual({});
  });
});

describe("per-prompt values storage — SSR safety", () => {
  it("loadValues returns {} when window is undefined", () => {
    expect(loadValues("anything")).toEqual({});
  });

  it("clearValues is a no-op when window is undefined", () => {
    expect(() => clearValues("anything")).not.toThrow();
  });
});
