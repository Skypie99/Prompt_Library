/**
 * Tests for src/lib/density.ts (F-fast-5) — the grid density preference.
 * Same jsdom-agnostic localStorage stub pattern as the other test files.
 */

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

describe("density preference (F-fast-5)", () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => uninstallFakeStorage());

  it("returns DEFAULT_DENSITY when nothing is stored", () => {
    expect(loadDensity()).toBe(DEFAULT_DENSITY);
  });

  it("round-trips through save → load (compact)", () => {
    saveDensity("compact");
    expect(loadDensity()).toBe("compact");
  });

  it("round-trips through save → load (comfortable)", () => {
    saveDensity("comfortable");
    expect(loadDensity()).toBe("comfortable");
  });

  it("returns DEFAULT_DENSITY on an unknown stored value", () => {
    globalThis.localStorage.setItem("promptlib:density", "bogus");
    expect(loadDensity()).toBe(DEFAULT_DENSITY);
  });

  it("DEFAULT_DENSITY is 'comfortable' — keep existing layout for users without a preference", () => {
    // Pinned: the visible-layout-preserving default is a real contract.
    // If a future bump intentionally changes this, update the assertion.
    expect(DEFAULT_DENSITY).toBe("comfortable");
  });
});

describe("density preference — SSR safety", () => {
  it("loadDensity returns DEFAULT_DENSITY when window is undefined", () => {
    expect(loadDensity()).toBe(DEFAULT_DENSITY);
  });

  it("saveDensity is a no-op when window is undefined (no throw)", () => {
    expect(() => saveDensity("compact")).not.toThrow();
  });
});
