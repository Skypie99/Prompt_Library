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
 *    when localStorage is missing/disabled, validates the stored model,
 *    and clamps stored maxTokens into [MIN_MAX_TOKENS, MAX_MAX_TOKENS]
 *    (closed 2026-05-25 — load-time and save-time now share one range).
 *  - saveSettings: round-trips through loadSettings.
 */

import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  MAX_MAX_TOKENS,
  MIN_MAX_TOKENS,
  MODELS,
  loadSettings,
  modelLabel,
  saveSettings,
} from "../settings";
import { setStorageWriteFailureHandler } from "../library";

// In-memory localStorage stub. The real DOM `Storage` interface is wide but
// settings.ts only uses get/set; that's all we need to emulate.
function installLocalStorage(): Record<string, string> {
  const store: Record<string, string> = {};
  const storage: Pick<Storage, "getItem" | "setItem" | "removeItem" | "clear" | "length" | "key"> =
    {
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
  (globalThis as unknown as { localStorage: Storage }).localStorage = storage as Storage;
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

describe("saveSettings — write failure surfacing (B2)", () => {
  // Verifies that saveSettings routes write failures through the
  // onStorageWriteFailure handler (same path as library writes) so the
  // HomeClient storage-warning banner fires in private mode / quota situations.
  it("calls the onStorageWriteFailure handler when localStorage.setItem throws (private-mode simulation)", () => {
    // Install a throwing localStorage stub (simulates Safari private mode
    // where quota = 0 and every setItem throws QuotaExceededError).
    const err = Object.assign(new Error("QuotaExceededError"), {
      name: "QuotaExceededError",
    });
    const throwingStorage = {
      getItem: (_k: string) => null,
      setItem: (_k: string, _v: string) => {
        throw err;
      },
      removeItem: (_k: string) => {},
      clear: () => {},
      key: (_i: number) => null,
      length: 0,
    };
    // @ts-expect-error -- test stub
    globalThis.window = { localStorage: throwingStorage };
    // @ts-expect-error -- test stub
    globalThis.localStorage = throwingStorage;

    const failures: unknown[] = [];
    setStorageWriteFailureHandler((result) => failures.push(result));

    saveSettings({ apiKey: "sk-test", model: DEFAULT_MODEL, maxTokens: DEFAULT_MAX_TOKENS });

    // At least one failure should have been surfaced.
    expect(failures.length).toBeGreaterThan(0);
    const first = failures[0] as { ok: boolean; reason: string };
    expect(first.ok).toBe(false);
    expect(first.reason).toBe("quota");

    // Clean up.
    setStorageWriteFailureHandler(null);
    // @ts-expect-error -- test stub
    delete globalThis.window;
    // @ts-expect-error -- test stub
    delete globalThis.localStorage;
  });

  it("does NOT call the handler on a successful write", () => {
    installLocalStorage();
    const failures: unknown[] = [];
    setStorageWriteFailureHandler((result) => failures.push(result));

    saveSettings({ apiKey: "sk-ok", model: DEFAULT_MODEL, maxTokens: DEFAULT_MAX_TOKENS });
    expect(failures).toHaveLength(0);

    setStorageWriteFailureHandler(null);
  });
});

describe("loadSettings — maxTokens clamp (load-time and save-time share one range)", () => {
  // Closed 2026-05-25 (Dana data/auto-2026-05-25-dana-clamp-maxtokens):
  // loadSettings now applies the same [MIN_MAX_TOKENS, MAX_MAX_TOKENS]
  // clamp that SettingsModal.handleSave already enforces on the save path,
  // so a hand-edited or pre-clamp localStorage value can never reach the
  // Anthropic API as an absurd number.
  it("clamps an absurdly-large stored maxTokens down to MAX_MAX_TOKENS", () => {
    const store = installLocalStorage();
    store["promptlib:maxTokens"] = "1000000000";
    expect(loadSettings().maxTokens).toBe(MAX_MAX_TOKENS);
  });

  it("clamps a stored maxTokens below MIN_MAX_TOKENS up to MIN_MAX_TOKENS", () => {
    const store = installLocalStorage();
    store["promptlib:maxTokens"] = "10";
    expect(loadSettings().maxTokens).toBe(MIN_MAX_TOKENS);
  });

  it("rounds a fractional stored maxTokens to the nearest integer inside the range", () => {
    const store = installLocalStorage();
    store["promptlib:maxTokens"] = "512.7";
    expect(loadSettings().maxTokens).toBe(513);
  });
});
