/**
 * Tests for src/lib/variables.ts — the pure token-parsing layer.
 *
 * Uses Jest/Vitest-compatible globals (describe/it/expect). These tests do not
 * run until a test runner is installed; see docs/PROPOSAL_TESTING.md for the
 * one-command setup that wires them up.
 *
 * Tests document the INTENDED behavior of these helpers (whitespace tolerance,
 * de-duplication, multiline detection, etc.), so when the runner lands they
 * become a regression net immediately.
 */

import {
  countBodyVariables,
  countFilled,
  extractVariables,
  parseBody,
  substituteBody,
} from "../variables";
import type { Prompt } from "../types";

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: "test-1",
    title: "Test",
    description: "",
    body: "",
    variables: [],
    category: "general",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    isSeed: false,
    ...overrides,
  };
}

describe("extractVariables", () => {
  it("returns [] for a prompt with no tokens", () => {
    const result = extractVariables(makePrompt({ body: "Just plain text." }));
    expect(result).toEqual([]);
  });

  it("returns [] for an empty body", () => {
    const result = extractVariables(makePrompt({ body: "" }));
    expect(result).toEqual([]);
  });

  it("extracts a single token", () => {
    const result = extractVariables(makePrompt({ body: "Hello {{name}}" }));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("name");
    expect(result[0].label).toBe("Name");
  });

  it("tolerates whitespace inside the token braces", () => {
    const result = extractVariables(
      makePrompt({ body: "Hello {{  name  }} and {{ city }}" }),
    );
    expect(result.map((v) => v.name)).toEqual(["name", "city"]);
  });

  it("de-duplicates tokens (first-appearance order)", () => {
    const result = extractVariables(
      makePrompt({ body: "{{a}} {{b}} {{a}} {{c}} {{b}}" }),
    );
    expect(result.map((v) => v.name)).toEqual(["a", "b", "c"]);
  });

  it("uses the declared label when present", () => {
    const result = extractVariables(
      makePrompt({
        body: "Hi {{user}}",
        variables: [{ name: "user", label: "Your name" }],
      }),
    );
    expect(result[0].label).toBe("Your name");
  });

  it("humanizes snake_case and kebab-case names", () => {
    const result = extractVariables(
      makePrompt({ body: "{{first_name}} {{last-name}}" }),
    );
    expect(result[0].label).toBe("First Name");
    expect(result[1].label).toBe("Last Name");
  });

  it("humanizes camelCase names", () => {
    const result = extractVariables(makePrompt({ body: "{{userEmail}}" }));
    expect(result[0].label).toBe("User Email");
  });

  it("marks long-form fields as multiline (by name heuristic)", () => {
    const result = extractVariables(
      makePrompt({
        body: "{{title}} {{body}} {{code}} {{notes}} {{transcript}}",
      }),
    );
    const map = Object.fromEntries(result.map((v) => [v.name, v.multiline]));
    expect(map.title).toBe(false);
    expect(map.body).toBe(true);
    expect(map.code).toBe(true);
    expect(map.notes).toBe(true);
    expect(map.transcript).toBe(true);
  });

  it("marks multiline based on a 'paste'-style placeholder", () => {
    const result = extractVariables(
      makePrompt({
        body: "{{x}}",
        variables: [{ name: "x", label: "X", placeholder: "Paste here" }],
      }),
    );
    expect(result[0].multiline).toBe(true);
  });

  it("passes the declared placeholder through", () => {
    const result = extractVariables(
      makePrompt({
        body: "{{x}}",
        variables: [{ name: "x", label: "X", placeholder: "e.g. foo" }],
      }),
    );
    expect(result[0].placeholder).toBe("e.g. foo");
  });
});

describe("parseBody", () => {
  it("returns a single text segment for plain text", () => {
    expect(parseBody("just text")).toEqual([
      { type: "text", value: "just text" },
    ]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseBody("")).toEqual([]);
  });

  it("splits a body into text + var segments", () => {
    const segments = parseBody("Hello {{name}}, you are {{age}} years old");
    expect(segments).toEqual([
      { type: "text", value: "Hello " },
      { type: "var", name: "name", raw: "{{name}}" },
      { type: "text", value: ", you are " },
      { type: "var", name: "age", raw: "{{age}}" },
      { type: "text", value: " years old" },
    ]);
  });

  it("handles a body that starts with a variable", () => {
    expect(parseBody("{{x}} rest")).toEqual([
      { type: "var", name: "x", raw: "{{x}}" },
      { type: "text", value: " rest" },
    ]);
  });

  it("handles a body that ends with a variable", () => {
    expect(parseBody("rest {{x}}")).toEqual([
      { type: "text", value: "rest " },
      { type: "var", name: "x", raw: "{{x}}" },
    ]);
  });

  it("handles adjacent variables", () => {
    expect(parseBody("{{a}}{{b}}")).toEqual([
      { type: "var", name: "a", raw: "{{a}}" },
      { type: "var", name: "b", raw: "{{b}}" },
    ]);
  });

  it("preserves the raw token (whitespace and all)", () => {
    const segments = parseBody("hi {{  name  }}!");
    const varSeg = segments.find((s) => s.type === "var");
    expect(varSeg).toBeDefined();
    if (varSeg && varSeg.type === "var") {
      expect(varSeg.name).toBe("name"); // trimmed
      expect(varSeg.raw).toBe("{{  name  }}"); // original spacing
    }
  });
});

describe("substituteBody", () => {
  it("replaces a filled token with its value", () => {
    expect(substituteBody("Hello {{name}}", { name: "Sky" })).toBe("Hello Sky");
  });

  it("leaves unfilled tokens intact", () => {
    expect(substituteBody("Hello {{name}}", {})).toBe("Hello {{name}}");
  });

  it("treats empty-string values as unfilled (keeps the token visible)", () => {
    expect(substituteBody("Hi {{name}}", { name: "" })).toBe("Hi {{name}}");
  });

  it("treats whitespace-only values as unfilled", () => {
    expect(substituteBody("Hi {{name}}", { name: "   " })).toBe("Hi {{name}}");
  });

  it("substitutes multiple instances of the same token", () => {
    expect(substituteBody("{{x}} and {{x}}", { x: "yes" })).toBe(
      "yes and yes",
    );
  });

  it("tolerates whitespace inside braces when matching values", () => {
    expect(substituteBody("Hello {{  name  }}", { name: "Sky" })).toBe(
      "Hello Sky",
    );
  });

  it("returns the body unchanged when there are no tokens", () => {
    expect(substituteBody("plain text", { name: "ignored" })).toBe("plain text");
  });
});

describe("countFilled", () => {
  const variables = [
    { name: "a", label: "A", multiline: false },
    { name: "b", label: "B", multiline: false },
    { name: "c", label: "C", multiline: false },
  ];

  it("returns 0 when nothing is filled", () => {
    expect(countFilled(variables, {})).toBe(0);
  });

  it("counts only non-empty trimmed values", () => {
    expect(
      countFilled(variables, { a: "x", b: "", c: "   " }),
    ).toBe(1);
  });

  it("counts all when all are filled", () => {
    expect(countFilled(variables, { a: "x", b: "y", c: "z" })).toBe(3);
  });

  it("ignores extra keys not in variables[]", () => {
    expect(countFilled(variables, { a: "x", extra: "noise" })).toBe(1);
  });
});

describe("countBodyVariables (F-night-1)", () => {
  it("returns 0 for a body with no variables", () => {
    expect(countBodyVariables("Plain text with no tokens.")).toBe(0);
  });

  it("counts unique variables", () => {
    expect(countBodyVariables("Hello {{name}}, today is {{day}}.")).toBe(2);
  });

  it("dedupes repeated variables (same name counts once)", () => {
    expect(countBodyVariables("{{name}} {{name}} {{name}}")).toBe(1);
  });

  it("trims whitespace inside braces so {{ name }} and {{name}} match", () => {
    expect(countBodyVariables("Hi {{ name }} and {{name}}")).toBe(1);
  });

  it("handles many distinct variables", () => {
    expect(countBodyVariables("{{a}} {{b}} {{c}} {{d}} {{e}}")).toBe(5);
  });
});
