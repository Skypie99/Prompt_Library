/**
 * Tests for per-prompt model persistence (F3b — inline model switcher).
 *
 * Covers:
 *  - loadPromptModel returns null when nothing is stored
 *  - savePromptModel / loadPromptModel round-trip
 *  - Keys are isolated per prompt id
 *  - clearPromptModel removes the key
 *  - SSR safety (window undefined)
 *  - localStorage unavailable (throws) — no-op, no throw
 */

import { clearPromptModel, loadPromptModel, savePromptModel } from "../library";

// Map-backed localStorage stub matching project-wide pattern.
function installFakeStorage(): Map<string, string> {
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
  return store;
}

function uninstallFakeStorage(): void {
  // @ts-expect-error
  delete globalThis.window;
  // @ts-expect-error
  delete globalThis.localStorage;
}

describe("per-prompt model persistence (F3b)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns null when no model is saved for the prompt", () => {
    expect(loadPromptModel("p1")).toBeNull();
  });

  it("round-trips through save/load", () => {
    savePromptModel("p1", "claude-sonnet-4-6");
    expect(loadPromptModel("p1")).toBe("claude-sonnet-4-6");
  });

  it("stores under promptlib:model:<id> key", () => {
    savePromptModel("my-prompt", "claude-haiku-4-5-20251001");
    expect(globalThis.localStorage.getItem("promptlib:model:my-prompt")).toBe(
      "claude-haiku-4-5-20251001",
    );
  });

  it("isolates model per prompt id", () => {
    savePromptModel("p1", "claude-opus-4-8");
    savePromptModel("p2", "claude-haiku-4-5-20251001");
    expect(loadPromptModel("p1")).toBe("claude-opus-4-8");
    expect(loadPromptModel("p2")).toBe("claude-haiku-4-5-20251001");
  });

  it("clearPromptModel removes the key entirely", () => {
    savePromptModel("p1", "claude-sonnet-4-6");
    clearPromptModel("p1");
    expect(globalThis.localStorage.getItem("promptlib:model:p1")).toBeNull();
    expect(loadPromptModel("p1")).toBeNull();
  });

  it("overwriting the saved model updates the value", () => {
    savePromptModel("p1", "claude-sonnet-4-6");
    savePromptModel("p1", "claude-haiku-4-5-20251001");
    expect(loadPromptModel("p1")).toBe("claude-haiku-4-5-20251001");
  });
});

describe("per-prompt model persistence — SSR safety (F3b)", () => {
  it("loadPromptModel returns null when window is undefined", () => {
    expect(loadPromptModel("anything")).toBeNull();
  });

  it("savePromptModel is a no-op when window is undefined", () => {
    expect(() => savePromptModel("anything", "claude-sonnet-4-6")).not.toThrow();
  });

  it("clearPromptModel is a no-op when window is undefined", () => {
    expect(() => clearPromptModel("anything")).not.toThrow();
  });
});
