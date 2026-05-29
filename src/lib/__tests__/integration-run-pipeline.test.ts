/**
 * Integration test: variable substitution → run storage → retrieval pipeline.
 *
 * WHY THIS FILE EXISTS
 * ─────────────────────
 * Every unit test in this project tests one module in isolation. This file
 * tests the cross-module chain that is the app's core user flow:
 *
 *   1. A prompt body has {{variable}} tokens.
 *   2. The user fills values. substituteBody() produces the final sent prompt.
 *   3. That sent prompt + values + response are stored as a StoredRun via appendRun().
 *   4. loadRuns() retrieves the run; the sentPrompt and values round-trip correctly.
 *   5. loadAllRunCounts() reflects the new run in its cross-prompt index.
 *   6. Stacking additional runs enforces the RUNS_PER_PROMPT_CAP ceiling.
 *   7. removeRun() removes exactly the targeted run, leaving others intact.
 *   8. clearRuns() wipes all runs for a prompt without affecting other prompts.
 *
 * If any step is broken in isolation (a unit bug), the unit tests catch it.
 * If the *seam* between modules is broken — e.g. the shape appendRun stores
 * doesn't match what loadRuns expects — only an integration test catches it.
 *
 * WHAT IS MOCKED
 * ──────────────
 * localStorage — replaced with a Map-backed stub, matching the pattern used
 * across all tests in this suite (runs.test.ts, library-storage.test.ts, etc.)
 * so the test is jsdom-agnostic and fast.
 *
 * The Anthropic API, network, and UI are NOT mocked — they're not in scope for
 * this pipeline. The integration boundary tested here is variables.ts ↔ runs.ts
 * ↔ localStorage, which is entirely deterministic.
 *
 * Sam (Integration Test Specialist) — 2026-05-25
 * Branch: test/auto-2026-05-25-sam-integration
 */

import { substituteBody, extractVariables } from "../variables";
import {
  appendRun,
  loadRuns,
  loadAllRunCounts,
  removeRun,
  clearRuns,
  generateRunId,
  RUNS_PER_PROMPT_CAP,
  type StoredRun,
} from "../runs";
import type { Prompt } from "../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: "prompt-a",
    title: "Cover Letter",
    description: "Writes a cover letter",
    body: "Write a cover letter for {{role}} at {{company}}. Tone: {{tone}}.",
    variables: [],
    category: "writing",
    tags: [],
    createdAt: "2026-05-25T00:00:00.000Z",
    isSeed: false,
    ...overrides,
  };
}

function makeRun(overrides: Partial<StoredRun> = {}): StoredRun {
  return {
    id: generateRunId(),
    ranAt: "2026-05-25T10:00:00.000Z",
    model: "claude-sonnet-4-6",
    values: {},
    sentPrompt: "",
    response: "",
    status: "completed",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// localStorage stub (Map-backed, jsdom-free — matches project-wide pattern)
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("variable substitution → run storage pipeline", () => {
  let store: FakeStore;

  beforeEach(() => { store = installFakeStorage(); });
  afterEach(() => { uninstallFakeStorage(); store.clear(); });

  // ── Core round-trip ───────────────────────────────────────────────────────

  it("stores sentPrompt as the fully-substituted body (no {{tokens}} remain)", () => {
    // This is the critical seam: what substituteBody produces must be what
    // gets stored in sentPrompt. If the UI ever computes one and stores the
    // other, history shows the wrong text.
    const prompt = makePrompt();
    const values = { role: "Senior Engineer", company: "Anthropic", tone: "direct" };

    const sentPrompt = substituteBody(prompt.body, values);
    const run = makeRun({ values, sentPrompt });
    appendRun(prompt.id, run);

    const [saved] = loadRuns(prompt.id);
    expect(saved.sentPrompt).toBe("Write a cover letter for Senior Engineer at Anthropic. Tone: direct.");
    expect(saved.sentPrompt).not.toMatch(/\{\{/); // no unresolved tokens
  });

  it("preserves the original values map on retrieval so history can show what the user typed", () => {
    // If values are mangled (stringified twice, keys dropped), the "Restore
    // inputs" feature would pre-fill wrong data. This tests the round-trip.
    const prompt = makePrompt();
    const values = { role: "Data Scientist", company: "Acme", tone: "friendly" };

    const sentPrompt = substituteBody(prompt.body, values);
    appendRun(prompt.id, makeRun({ values, sentPrompt }));

    const [saved] = loadRuns(prompt.id);
    expect(saved.values).toEqual(values);
  });

  it("preserves the response string faithfully (response is what Claude returned)", () => {
    const prompt = makePrompt();
    const response = "Dear Hiring Manager,\n\nI am thrilled to apply…";
    const values = { role: "Engineer", company: "ACME", tone: "formal" };
    const sentPrompt = substituteBody(prompt.body, values);

    appendRun(prompt.id, makeRun({ values, sentPrompt, response }));

    const [saved] = loadRuns(prompt.id);
    expect(saved.response).toBe(response);
  });

  // ── extractVariables ↔ substituteBody coherence ───────────────────────────

  it("extractVariables detects the same token names that substituteBody resolves", () => {
    // If these two helpers ever disagree on which tokens exist, the UI would
    // show inputs for tokens that don't get substituted (or vice-versa).
    const prompt = makePrompt();
    const variables = extractVariables(prompt);
    const names = variables.map((v) => v.name);

    expect(names).toEqual(["role", "company", "tone"]);

    // Confirm substituteBody uses exactly those names (unresolved tokens stay
    // as-is, so a mismatch shows up as a remaining {{…}} in the output).
    const values = Object.fromEntries(names.map((n) => [n, `VALUE_${n}`]));
    const result = substituteBody(prompt.body, values);
    expect(result).not.toMatch(/\{\{/);
  });

  it("substituteBody leaves unresolved tokens when a value is missing (partial fill)", () => {
    // This mirrors the 'not all variables filled' UX state — the app allows
    // running with partial fills; the stored sentPrompt reflects exactly what
    // was sent, including unresolved tokens.
    const prompt = makePrompt();
    const partialValues = { role: "Designer" }; // company and tone missing
    const sentPrompt = substituteBody(prompt.body, partialValues);

    appendRun(prompt.id, makeRun({ values: partialValues, sentPrompt }));

    const [saved] = loadRuns(prompt.id);
    expect(saved.sentPrompt).toContain("Designer");
    expect(saved.sentPrompt).toContain("{{company}}"); // unresolved
    expect(saved.sentPrompt).toContain("{{tone}}");    // unresolved
  });

  // ── Cross-prompt isolation ─────────────────────────────────────────────────

  it("runs for different prompts are stored and loaded independently", () => {
    // If the storage key scheme ever changes, runs could bleed across prompts.
    // loadAllRunCounts() is the cross-prompt surface most likely to expose leakage.
    const promptA = makePrompt({ id: "prompt-a" });
    const promptB = makePrompt({ id: "prompt-b", body: "Summarize: {{topic}}" });

    appendRun(promptA.id, makeRun({ values: { role: "x", company: "y", tone: "z" }, sentPrompt: "a" }));
    appendRun(promptA.id, makeRun({ values: { role: "x", company: "y", tone: "z" }, sentPrompt: "a2" }));
    appendRun(promptB.id, makeRun({ values: { topic: "climate" }, sentPrompt: "Summarize: climate" }));

    expect(loadRuns(promptA.id)).toHaveLength(2);
    expect(loadRuns(promptB.id)).toHaveLength(1);

    // Cross-prompt count index reflects both
    const counts = loadAllRunCounts();
    expect(counts.get(promptA.id)).toBe(2);
    expect(counts.get(promptB.id)).toBe(1);
  });

  // ── Run count index ────────────────────────────────────────────────────────

  it("loadAllRunCounts reflects each appendRun incrementally", () => {
    // The count index is used in the UI to show how many times a prompt has
    // been run without loading every run. If it lags behind appendRun, the
    // badge count would be wrong.
    const prompt = makePrompt();
    const values = { role: "r", company: "c", tone: "t" };

    expect(loadAllRunCounts().get(prompt.id)).toBeUndefined();

    appendRun(prompt.id, makeRun({ values, sentPrompt: "s1" }));
    expect(loadAllRunCounts().get(prompt.id)).toBe(1);

    appendRun(prompt.id, makeRun({ values, sentPrompt: "s2" }));
    expect(loadAllRunCounts().get(prompt.id)).toBe(2);
  });

  // ── Cap enforcement ────────────────────────────────────────────────────────

  it(`caps stored runs at RUNS_PER_PROMPT_CAP (${RUNS_PER_PROMPT_CAP}) and evicts the oldest`, () => {
    // Without the cap, power users accumulate unbounded localStorage usage.
    // Without evicting the oldest, users lose recent history when the cap is hit.
    const prompt = makePrompt();
    const values = { role: "r", company: "c", tone: "t" };

    // Seed one run that should be evicted (earliest ranAt)
    appendRun(prompt.id, makeRun({ id: "evicted", ranAt: "2026-01-01T00:00:00.000Z", values, sentPrompt: "old" }));

    // Fill to cap with later timestamps
    for (let i = 1; i < RUNS_PER_PROMPT_CAP; i++) {
      appendRun(
        prompt.id,
        makeRun({ ranAt: `2026-05-25T${String(i).padStart(2, "0")}:00:00.000Z`, values, sentPrompt: `run-${i}` }),
      );
    }

    // One more — should evict "evicted"
    appendRun(prompt.id, makeRun({ id: "newest", ranAt: "2026-12-31T00:00:00.000Z", values, sentPrompt: "newest" }));

    const runs = loadRuns(prompt.id);
    expect(runs).toHaveLength(RUNS_PER_PROMPT_CAP);
    expect(runs.find((r) => r.id === "evicted")).toBeUndefined();
    expect(runs.find((r) => r.id === "newest")).toBeDefined();
  });

  // ── removeRun ─────────────────────────────────────────────────────────────

  it("removeRun removes exactly the targeted run and leaves siblings intact", () => {
    // If removeRun accidentally uses a prefix match or clears the whole array,
    // users lose run history they didn't ask to delete.
    const prompt = makePrompt();
    const values = { role: "r", company: "c", tone: "t" };

    const r1 = makeRun({ id: "run-1", values, sentPrompt: "s1" });
    const r2 = makeRun({ id: "run-2", values, sentPrompt: "s2" });
    const r3 = makeRun({ id: "run-3", values, sentPrompt: "s3" });

    appendRun(prompt.id, r1);
    appendRun(prompt.id, r2);
    appendRun(prompt.id, r3);

    removeRun(prompt.id, "run-2");

    const remaining = loadRuns(prompt.id);
    expect(remaining).toHaveLength(2);
    expect(remaining.find((r) => r.id === "run-2")).toBeUndefined();
    expect(remaining.find((r) => r.id === "run-1")).toBeDefined();
    expect(remaining.find((r) => r.id === "run-3")).toBeDefined();
  });

  // ── clearRuns ─────────────────────────────────────────────────────────────

  it("clearRuns wipes all runs for the target prompt without affecting other prompts", () => {
    // clearRuns is called when a user deletes all history for one prompt.
    // If it's too broad, it would clear runs across prompts. If it's too narrow,
    // it would silently fail. This integration test covers both failure modes.
    const promptA = makePrompt({ id: "prompt-a" });
    const promptB = makePrompt({ id: "prompt-b", body: "Summarize: {{topic}}" });
    const values = { role: "r", company: "c", tone: "t" };

    appendRun(promptA.id, makeRun({ values, sentPrompt: "sa1" }));
    appendRun(promptA.id, makeRun({ values, sentPrompt: "sa2" }));
    appendRun(promptB.id, makeRun({ values: { topic: "AI" }, sentPrompt: "sb1" }));

    clearRuns(promptA.id);

    expect(loadRuns(promptA.id)).toHaveLength(0);
    expect(loadRuns(promptB.id)).toHaveLength(1); // untouched
    expect(loadAllRunCounts().get(promptA.id)).toBeUndefined();
    expect(loadAllRunCounts().get(promptB.id)).toBe(1);
  });

  // ── Status preservation ────────────────────────────────────────────────────

  it("preserves status='errored' and errorMessage through the storage round-trip", () => {
    // Errored runs are shown differently in history (different icon, error text).
    // If status or errorMessage are dropped on write/read, the UI renders them
    // as 'completed' — a misleading history entry.
    const prompt = makePrompt();
    const errorRun = makeRun({
      status: "errored",
      errorMessage: "Rate limit exceeded",
      sentPrompt: "Write a cover letter for x at y. Tone: z.",
      values: { role: "x", company: "y", tone: "z" },
    });

    appendRun(prompt.id, errorRun);

    const [saved] = loadRuns(prompt.id);
    expect(saved.status).toBe("errored");
    expect(saved.errorMessage).toBe("Rate limit exceeded");
  });

  it("preserves status='aborted' (user hit Stop) through the storage round-trip", () => {
    const prompt = makePrompt();
    const abortedRun = makeRun({
      status: "aborted",
      response: "Dear Hiring Mana", // partial response
      sentPrompt: "Write a cover letter…",
      values: { role: "x", company: "y", tone: "z" },
    });

    appendRun(prompt.id, abortedRun);

    const [saved] = loadRuns(prompt.id);
    expect(saved.status).toBe("aborted");
    expect(saved.response).toBe("Dear Hiring Mana");
  });
});
