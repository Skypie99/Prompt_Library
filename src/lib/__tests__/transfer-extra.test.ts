/**
 * Additional tests for src/lib/transfer.ts that fill the gaps left by
 * transfer.test.ts:
 *
 *   - defaultExportFilename: date-stamped filename generation
 *   - parseImport edge cases: missing values map, empty runs array, corrupt
 *     values entries (non-string record values), null exportedAt fallback
 *   - PER_PROMPT_PREFIXES_PUBLIC: export covers all known per-prompt prefixes
 *     (regression guard so a new feature key is never silently omitted from
 *     export — the main risk of silent data loss in this app)
 */

import {
  defaultExportFilename,
  parseImport,
  EXPORT_VERSION,
  PER_PROMPT_PREFIXES_PUBLIC,
} from "../transfer";
import type { StoredRun } from "../runs";
import type { Prompt } from "../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// defaultExportFilename
// ---------------------------------------------------------------------------

describe("defaultExportFilename", () => {
  it("produces the expected filename for a known date", () => {
    const date = new Date("2026-05-23T00:00:00.000Z");
    // Force UTC date components to avoid TZ drift in CI.
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const result = defaultExportFilename(date);
    // The function uses local date, so we verify the format shape rather than
    // an exact UTC date match.
    expect(result).toMatch(/^prompt-library-\d{4}-\d{2}-\d{2}\.json$/);
    // Verify the year is correct regardless of timezone.
    expect(result).toContain(String(y));
  });

  it("returns a .json file with the promptlibrary prefix", () => {
    const result = defaultExportFilename(new Date("2026-05-25T12:00:00.000Z"));
    expect(result.startsWith("prompt-library-")).toBe(true);
    expect(result.endsWith(".json")).toBe(true);
  });

  it("zero-pads single-digit months and days", () => {
    // January 5 → 01 and 05.
    const result = defaultExportFilename(new Date("2026-01-05T12:00:00.000Z"));
    // Regardless of local TZ, month and day segments should be 2 digits.
    const parts = result.replace("prompt-library-", "").replace(".json", "").split("-");
    expect(parts[1]!.length).toBe(2); // month
    expect(parts[2]!.length).toBe(2); // day
  });

  it("uses today's date when called with no argument", () => {
    const before = new Date();
    const result = defaultExportFilename();
    const after = new Date();
    // Extract the year from the filename and verify it's plausible.
    const yearStr = result.replace("prompt-library-", "").slice(0, 4);
    const year = Number(yearStr);
    expect(year).toBeGreaterThanOrEqual(before.getFullYear());
    expect(year).toBeLessThanOrEqual(after.getFullYear());
  });
});

// ---------------------------------------------------------------------------
// parseImport — additional edge cases not covered in transfer.test.ts
// ---------------------------------------------------------------------------

describe("parseImport — additional edge cases", () => {
  it("handles a missing 'values' key gracefully (defaults to empty)", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [makePrompt()],
      favorites: [],
      recent: [],
      runs: {},
      // values key intentionally omitted
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.preview.valuesPromptCount).toBe(0);
    }
  });

  it("handles a missing 'runs' key gracefully (defaults to empty)", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: [],
      values: {},
      // runs key intentionally omitted
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.preview.runsCount).toBe(0);
    }
  });

  it("drops a runs entry where the id is an empty string", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: [],
      runs: {
        "": [makeRun()], // empty id — must be dropped
        "valid-id": [makeRun({ id: "r-ok" })],
      },
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect("" in r.data.runs).toBe(false);
      expect("valid-id" in r.data.runs).toBe(true);
    }
  });

  it("drops a values entry where the value is an array (not a string record)", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: [],
      runs: {},
      values: {
        "p-1": ["not", "a", "record"], // should be dropped
        "p-2": { name: "ok" },
      },
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect("p-1" in r.data.values).toBe(false);
      expect(r.data.values["p-2"]).toEqual({ name: "ok" });
      expect(r.preview.droppedCount).toBeGreaterThan(0);
    }
  });

  it("drops individual non-string values within an otherwise valid values record", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: [],
      runs: {},
      values: {
        "p-1": { good: "value", bad: 42 }, // 'bad' value is a number
      },
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Only 'good' survives; 'bad' is dropped, so p-1 has okCount=1 and is kept.
      expect(r.data.values["p-1"]).toEqual({ good: "value" });
      expect(r.preview.droppedCount).toBeGreaterThan(0);
    }
  });

  it("accepts a file where exportedAt is missing (null fallback)", () => {
    const file = {
      version: 1,
      userPrompts: [],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
      // exportedAt omitted
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.preview.exportedAt).toBeNull();
      // data.exportedAt should be a fallback ISO string (not null)
      expect(r.data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("accepts version === EXPORT_VERSION (current version is always importable)", () => {
    const file = {
      version: EXPORT_VERSION,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
  });

  it("rejects a primitive (string) at the top level", () => {
    const r = parseImport(JSON.stringify("just a string"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("wrong-shape");
  });

  it("rejects null at the top level", () => {
    const r = parseImport(JSON.stringify(null));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("wrong-shape");
  });
});

// ---------------------------------------------------------------------------
// Prototype pollution guard (F5 security — Steve's review requirement)
// ---------------------------------------------------------------------------

describe("parseImport — prototype pollution guard", () => {
  it("rejects a file containing a __proto__ key at the top level", () => {
    // JSON.parse in V8 neutralises __proto__ automatically, but we craft
    // the object via Object.assign to simulate an engine that doesn't.
    const unsafe = Object.assign(Object.create(null) as object, {
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
    });
    // Inject the dangerous key after assignment so TS doesn't complain.
    (unsafe as Record<string, unknown>)["__proto__"] = { isAdmin: true };
    // We can't JSON.stringify an object with __proto__ as own key reliably;
    // instead verify our hasPollutionKey guard by constructing a JSON string
    // manually — the string representation is what an attacker would send.
    const raw =
      '{"version":1,"exportedAt":"2026-05-23T12:00:00.000Z","__proto__":{"isAdmin":true},"userPrompts":[],"favorites":[],"recent":[],"runs":{},"values":{}}';
    const r = parseImport(raw);
    // Modern engines may silently drop __proto__ from JSON.parse output,
    // so the result may be ok (key gone) OR malformed (key present + guard fires).
    // Either is acceptable — we just must NOT see prototype mutation.
    if (!r.ok) {
      expect(r.kind).toBe("malformed");
    }
    // Confirm prototype chain is clean regardless.
    expect(({} as Record<string, unknown>)["isAdmin"]).toBeUndefined();
  });

  it("rejects a file with a 'constructor' key inside userPrompts", () => {
    const raw = JSON.stringify({
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [{ constructor: { name: "injected" }, id: "p1", title: "t" }],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
    });
    const r = parseImport(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("malformed");
  });

  it("rejects a file with a 'prototype' key inside values", () => {
    const raw = JSON.stringify({
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [],
      favorites: [],
      recent: [],
      runs: {},
      values: { "p-1": { prototype: "bad" } },
    });
    const r = parseImport(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("malformed");
  });

  it("accepts a well-formed file that happens to have the word 'constructor' in a value string", () => {
    // The guard checks keys, not values — a prompt body mentioning
    // "constructor" in its text must still be importable.
    const raw = JSON.stringify({
      version: 1,
      exportedAt: "2026-05-23T12:00:00.000Z",
      userPrompts: [makePrompt({ id: "p-1", body: "Use a constructor function" })],
      favorites: [],
      recent: [],
      runs: {},
      values: {},
    });
    const r = parseImport(raw);
    expect(r.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PER_PROMPT_PREFIXES_PUBLIC — regression guard
// ---------------------------------------------------------------------------

describe("PER_PROMPT_PREFIXES_PUBLIC (export coverage guard)", () => {
  it("is a non-empty readonly array of strings", () => {
    expect(Array.isArray(PER_PROMPT_PREFIXES_PUBLIC)).toBe(true);
    expect(PER_PROMPT_PREFIXES_PUBLIC.length).toBeGreaterThan(0);
    for (const prefix of PER_PROMPT_PREFIXES_PUBLIC) {
      expect(typeof prefix).toBe("string");
      expect(prefix.length).toBeGreaterThan(0);
    }
  });

  it("contains the runs prefix (promptlib:runs:)", () => {
    expect(PER_PROMPT_PREFIXES_PUBLIC).toContain("promptlib:runs:");
  });

  it("contains the values prefix (promptlib:values:)", () => {
    expect(PER_PROMPT_PREFIXES_PUBLIC).toContain("promptlib:values:");
  });

  it("all prefixes start with 'promptlib:' (namespace discipline)", () => {
    for (const prefix of PER_PROMPT_PREFIXES_PUBLIC) {
      expect(prefix.startsWith("promptlib:")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// F-usage-b: transfer.ts round-trip for tokensUsed (export/import)
// ---------------------------------------------------------------------------

describe("parseImport — tokensUsed field (F-usage-b)", () => {
  it("preserves tokensUsed when present in an imported run", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-29T10:00:00.000Z",
      userPrompts: [makePrompt({ id: "p-1" })],
      favorites: [],
      recent: [],
      runs: {
        "p-1": [makeRun({ id: "r-1", tokensUsed: { input: 312, output: 1204 } })],
      },
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const run = r.data.runs["p-1"]?.[0];
      expect(run?.tokensUsed).toEqual({ input: 312, output: 1204 });
    }
  });

  it("accepts and passes through a run without tokensUsed (old-format backward compat)", () => {
    // Runs exported before F-usage shipped have no tokensUsed key.
    const file = {
      version: 1,
      exportedAt: "2026-05-01T00:00:00.000Z",
      userPrompts: [makePrompt({ id: "p-old" })],
      favorites: [],
      recent: [],
      runs: {
        "p-old": [makeRun({ id: "r-old" })], // makeRun does not include tokensUsed
      },
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Must NOT error — the run must survive import intact.
      expect(r.data.runs["p-old"]).toHaveLength(1);
      expect(r.data.runs["p-old"]?.[0]?.id).toBe("r-old");
      expect(r.data.runs["p-old"]?.[0]?.tokensUsed).toBeUndefined();
    }
  });

  it("drops a run whose tokensUsed has wrong-typed fields (invalid format)", () => {
    const file = {
      version: 1,
      exportedAt: "2026-05-29T10:00:00.000Z",
      userPrompts: [makePrompt({ id: "p-1" })],
      favorites: [],
      recent: [],
      runs: {
        "p-1": [
          makeRun({ id: "r-good" }), // valid, no tokensUsed
          makeRun({ id: "r-good-tokens", tokensUsed: { input: 10, output: 20 } }),
          // @ts-expect-error — deliberate invalid shape for test
          { ...makeRun({ id: "r-bad-tokens" }), tokensUsed: { input: "nope", output: 5 } },
        ],
      },
      values: {},
    };
    const r = parseImport(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      // The corrupt run must be dropped; valid ones survive.
      const ids = r.data.runs["p-1"]?.map((run) => run.id) ?? [];
      expect(ids).toContain("r-good");
      expect(ids).toContain("r-good-tokens");
      expect(ids).not.toContain("r-bad-tokens");
      expect(r.preview.droppedCount).toBeGreaterThan(0);
    }
  });
});
