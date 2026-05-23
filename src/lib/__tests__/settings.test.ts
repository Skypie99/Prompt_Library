/**
 * Tests for src/lib/settings.ts — the user-settings layer.
 *
 * Uses Jest/Vitest-compatible globals (describe/it/expect). They will run
 * unchanged once a runner is installed; see
 * qa-reports/proposal-testing-2026-05-23.md.
 *
 * Behaviour locked in:
 *  - MODELS catalog: every entry is well-formed and the DEFAULT_MODEL exists
 *    in it (otherwise loadSettings silently falls back to it but matches
 *    nothing, and the model dropdown will show a blank state).
 *  - modelLabel: known id → human label; unknown id → raw id (so a future
 *    model rolled out before this catalog is updated still renders).
 *  - loadSettings: applies the documented defaults, falls back gracefully
 *    when localStorage is missing/disabled, and validates the stored model.
 *  - saveSettings: round-trips through loadSettings.
 *  - **Known issue documented as a test**: loadSettings does NOT clamp the
 *    upper bound of maxTokens, only the "must be finite" rule. A stored
 *    `Infinity`-coerced or absurdly large value flows through. Once the
 *    fix lands (proposed in the existing QA report), flip this test from
 *    `toBe(1e9)` to the clamped value.
 */

import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  MODELS,
  loadSettings,
  modelLabel,
  saveSettings,
} from "../settings";

// In-memory localStorage stub. The real DOM `Storage` interface is wide but
// settings.ts only uses get/set; that's all we need to emulate.
function installLocalStorage(): Record<string, string> {
  const store: Record<string, string> = {};
  const storage: Pick<Storage, "getItem" | "setItem" | "removeItem" | "clear" | "length" | "key"> = {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    length: 0,
    key: () => null,
  };
  (globalThis as unknown as { window: { localStorage: Storage } }).window = {
    localStorage: storage as Storage,
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    storage as Storage;
  return store;
}

function uninstallLocalStorage(): void {
  delete (globalThis as unknown as { window?: unknown }).window;
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
}

afterEach(() => {
  uninstallLocalStorage();
});

describe("MODELS catalog", () => {
  it("is non-empty", () => {
    expect(MODELS.length).toBeGreaterThan(0);
  });

  it("every entry has id, label, hint as non-empty strings", () => {
    for (const m of MODELS) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
      expect(typeof m.label).toBe("string");
      expect(m.label.length).toBeGreaterThan(0);
      expect(typeof m.hint).toBe("string");
      expect(m.hint.length).toBeGreaterThan(0);
    }
  });

  it("DEFAULT_MODEL refers to a model that exists in the catalog", () => {
    expect(MODELS.some((m) => m.id === DEFAULT_MODEL)).toBe(true);
  });

  it("ids are unique", () => {
    const ids = MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("modelLabel", () => {
  it("returns the human label for a known model id", () => {
    const m = MODELS[0]!;
    expect(modelLabel(m.id)).toBe(m.label);
  });

  it("falls back to the raw id for an unknown model (forward-compatible)", () => {
    expect(modelLabel("some-future-model-id")).toBe("some-future-model-id");
  });
});

describe("loadSettings (SSR / no window)", () => {
  it("returns the documented fallback when window is undefined", () => {
    // No window installed.
    const s = loadSettings();
    expect(s.apiKey).toBe("");
    expect(s.model).toBe(DEFAULT_MODEL);
    expect(s.maxTokens).toBe(DEFAULT_MAX_TOKENS);
  });
});

describe("loadSettings + saveSettings (client)", () => {
  it("uses defaults on a fresh storage", () => {
    installLocalStorage();
    const s = loadSettings();
    expect(s.apiKey).toBe("");
    expect(s.model).toBe(DEFAULT_MODEL);
    expect(s.maxTokens).toBe(DEFAULT_MAX_TOKENS);
  });

  it("round-trips through save/load", () => {
    installLocalStorage();
    const m = MODELS[MODELS.length - 1]!;
    saveSettings({ apiKey: "sk-test-123", model: m.id, maxTokens: 512 });
    const s = loadSettings();
    expect(s).toEqual({ apiKey: "sk-test-123", model: m.id, maxTokens: 512 });
  });

  it("falls back to DEFAULT_MODEL if storage holds an unknown model id", () => {
    const store = installLocalStorage();
    store["promptlib:model"] = "vendor-x-gpt-99";
    expect(loadSettings().model).toBe(DEFAULT_MODEL);
  });

  it("falls back to DEFAULT_MAX_TOKENS when storage holds a non-numeric value", () => {
    const store = installLocalStorage();
    store["promptlib:maxTokens"] = "not-a-number";
    expect(loadSettings().maxTokens).toBe(DEFAULT_MAX_TOKENS);
  });

  it("preserves a stored apiKey (the only stateful, sensitive field)", () => {
    const store = installLocalStorage();
    store["promptlib:apiKey"] = "sk-keep-me";
    expect(loadSettings().apiKey).toBe("sk-keep-me");
  });
});

describe("loadSettings — known upper-bound gap (documented, not fixed)", () => {
  // loadSettings only enforces Number.isFinite, so an absurdly large stored
  // value passes through. The SettingsModal clamps on the save path, but if
  // someone hand-edits localStorage (or migrates from an older settings
  // schema) the unclamped value will load. This test pins the *current*
  // behaviour so the day someone adds upper-bound clamping, the test will
  // fail loudly and remind them to also remove this comment.
  it("currently does not clamp absurdly-large stored maxTokens (gap to close)", () => {
    const store = installLocalStorage();
    store["promptlib:maxTokens"] = "1000000000";
    expect(loadSettings().maxTokens).toBe(1_000_000_000);
  });
});
