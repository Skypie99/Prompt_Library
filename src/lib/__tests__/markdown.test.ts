/**
 * Tests for src/lib/markdown.ts (F6 — Markdown rendering).
 *
 * Locks in the safe-subset contract: every supported construct produces
 * the right AST node, raw HTML never becomes a node tag (only text),
 * links from unsafe protocols drop their href, and streaming partials
 * degrade gracefully to literal text.
 */

import { isSafeUrl, parseInline, parseMarkdown } from "../markdown";

describe("isSafeUrl", () => {
  it("accepts https / http / mailto", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
    expect(isSafeUrl("http://example.com")).toBe(true);
    expect(isSafeUrl("mailto:a@b.c")).toBe(true);
    expect(isSafeUrl("  https://example.com  ")).toBe(true);
  });

  it("rejects javascript:, data:, vbscript:", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,evil")).toBe(false);
    expect(isSafeUrl("vbscript:msgbox")).toBe(false);
  });

  it("rejects relative or scheme-less URLs", () => {
    expect(isSafeUrl("/foo")).toBe(false);
    expect(isSafeUrl("example.com")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
  });
});

describe("parseInline", () => {
  it("plain text → single text node", () => {
    expect(parseInline("hello world")).toEqual([{ type: "text", value: "hello world" }]);
  });

  it("**bold** → strong", () => {
    const result = parseInline("a **b** c");
    expect(result).toHaveLength(3);
    expect(result[1]).toMatchObject({ type: "strong" });
  });

  it("*em* → em when at word boundary", () => {
    const result = parseInline("a *b* c");
    expect(result).toHaveLength(3);
    expect(result[1]).toMatchObject({ type: "em" });
  });

  it("does NOT em-wrap inside a word (snake_case stays literal)", () => {
    const result = parseInline("snake_case_word");
    // The whole thing should be one text run, no em nodes.
    expect(result.some((n) => n.type === "em")).toBe(false);
  });

  it("`inline code` → code node", () => {
    const result = parseInline("a `let x = 1` b");
    expect(result[1]).toMatchObject({ type: "code", value: "let x = 1" });
  });

  it("[text](https://x) → link with safe href", () => {
    const result = parseInline("[click](https://example.com)");
    expect(result[0]).toMatchObject({ type: "link", href: "https://example.com" });
  });

  it("[text](javascript:...) → drops href, renders as text", () => {
    const result = parseInline("[bad](javascript:alert(1))");
    expect(result.some((n) => n.type === "link")).toBe(false);
    expect(result[0]).toMatchObject({ type: "text", value: "bad" });
  });

  it("unterminated **foo renders as literal text", () => {
    const result = parseInline("a **foo b");
    expect(result.some((n) => n.type === "strong")).toBe(false);
  });

  it("unterminated `code renders as literal text", () => {
    const result = parseInline("a `foo b");
    expect(result.some((n) => n.type === "code")).toBe(false);
  });
});

describe("parseMarkdown — blocks", () => {
  it("h1 / h2 / h3 → heading nodes with right level", () => {
    const blocks = parseMarkdown("# H1\n\n## H2\n\n### H3");
    expect(blocks.map((b) => (b.type === "heading" ? b.level : null))).toEqual([1, 2, 3]);
  });

  it("h4+ falls back to h3 (we cap the scale)", () => {
    const blocks = parseMarkdown("#### H4");
    // #### is 4 hashes; our regex still matches with level capped to 3.
    expect(blocks[0].type).toBe("heading");
    if (blocks[0].type === "heading") expect(blocks[0].level).toBe(3);
  });

  it("paragraphs separated by blank lines", () => {
    const blocks = parseMarkdown("para one\n\npara two");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1].type).toBe("paragraph");
  });

  it("fenced code block", () => {
    const blocks = parseMarkdown("```js\nconst x = 1;\n```");
    expect(blocks[0].type).toBe("code-block");
    if (blocks[0].type === "code-block") {
      expect(blocks[0].value).toBe("const x = 1;");
      expect(blocks[0].lang).toBe("js");
    }
  });

  it("unclosed fenced code block consumes to EOF (graceful for streaming partials)", () => {
    const blocks = parseMarkdown("```\nstill streaming");
    expect(blocks[0].type).toBe("code-block");
    if (blocks[0].type === "code-block") {
      expect(blocks[0].value).toBe("still streaming");
    }
  });

  it("unordered list (-) → list, ordered:false", () => {
    const blocks = parseMarkdown("- one\n- two");
    expect(blocks[0].type).toBe("list");
    if (blocks[0].type === "list") {
      expect(blocks[0].ordered).toBe(false);
      expect(blocks[0].items).toHaveLength(2);
    }
  });

  it("ordered list (1.) → list, ordered:true", () => {
    const blocks = parseMarkdown("1. one\n2. two");
    expect(blocks[0].type).toBe("list");
    if (blocks[0].type === "list") {
      expect(blocks[0].ordered).toBe(true);
    }
  });

  it("raw HTML is NOT parsed as HTML — survives as literal text in a paragraph", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>");
    expect(blocks[0].type).toBe("paragraph");
    if (blocks[0].type === "paragraph") {
      // First inline child should be a text node containing the literal source.
      const first = blocks[0].children[0];
      expect(first.type).toBe("text");
      if (first.type === "text") expect(first.value).toContain("<script>");
    }
  });

  it("idempotent on plain text (no markdown → just paragraph)", () => {
    const blocks = parseMarkdown("just a sentence.");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
  });
});
