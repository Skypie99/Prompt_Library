/**
 * S12 — copy-confirmation flourish (Fork 4 = B2, the `>_` blink).
 *
 * Locks the signature decision + the (previously untested) copy path:
 *   1. Clicking "Copy filled" copies (aria-label flips to "Filled prompt
 *      copied") AND the ownable `>_` signature glyph appears in the confirmed
 *      state — it is the B2 pick, aria-hidden decoration.
 *   2. The flat secondary "Copy template" gains the same considered
 *      confirmation ("Template copied" with the checkmark) — closes L4-1.
 *
 * The blink itself is CSS (motion-safe:animate-blink-once) and verified in-rig;
 * jsdom can't run keyframes, so these tests assert the copied-state STRUCTURE.
 *
 * Environment: jsdom (*.test.tsx glob). Mock strategy mirrors
 * PromptDetail.f3acd.test.tsx; clipboard is stubbed so copyToClipboard()'s
 * modern path (navigator.clipboard + isSecureContext) resolves true.
 */

import { render, screen, act, fireEvent, within, cleanup } from "@testing-library/react";
import type { Prompt } from "@/lib/types";
import type { Settings } from "@/lib/settings";

// ---- Module mocks (mirror PromptDetail.f3acd.test.tsx) -----------------------

vi.mock("@/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/anthropic")>();
  return { ...actual, streamClaude: vi.fn().mockResolvedValue(undefined) };
});

vi.mock("@/lib/runs", () => ({
  loadRuns: vi.fn().mockReturnValue([]),
  appendRun: vi.fn().mockReturnValue([]),
  generateRunId: vi.fn().mockReturnValue("run-id-mock"),
}));

vi.mock("@/lib/library", () => ({
  loadValues: vi.fn().mockReturnValue({}),
  saveValues: vi.fn(),
  clearValues: vi.fn(),
  writeJSON: vi.fn(),
  loadPromptModel: vi.fn().mockReturnValue(null),
  savePromptModel: vi.fn(),
}));

vi.mock("@/components/Markdown", () => ({
  Markdown: ({ source }: { source: string }) => <span>{source}</span>,
}));

vi.mock("@/components/RunHistory", () => ({ RunHistory: () => null }));

import { PromptDetail } from "@/components/PromptDetail";

const PROMPT: Prompt = {
  id: "s12-prompt",
  title: "S12 Prompt",
  description: "A prompt for the copy-confirmation test.",
  body: "Say hello.",
  variables: [],
  category: "Testing",
  tags: [],
  createdAt: "2026-05-29T00:00:00Z",
  isSeed: false,
};

const SETTINGS: Settings = { apiKey: "sk-test-key", model: "claude-sonnet-4-6", maxTokens: 512 };

const CALLBACKS = {
  isFavorite: false,
  onClose: vi.fn(),
  onOpenSettings: vi.fn(),
  onToggleFavorite: vi.fn(),
  onEdit: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
};

beforeEach(() => {
  // Make copyToClipboard()'s modern path succeed under jsdom.
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PromptDetail — S12: copy-confirmation flourish (B2)", () => {
  it("primary Copy filled copies and confirms with the `>_` signature glyph", async () => {
    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy filled prompt" }));
    });

    // Copy succeeded → the two-tier confirm flipped the label.
    const copied = screen.getByRole("button", { name: "Filled prompt copied" });
    expect(copied).toBeInTheDocument();
    // The ownable B2 beat: the `>_` glyph lives in the confirmed state.
    expect(within(copied).getByText(">_")).toBeInTheDocument();
    expect(within(copied).getByText("Copied")).toBeInTheDocument();
  });

  it("secondary Copy template gains the same confirmation (L4-1)", async () => {
    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "Copy the prompt template with unfilled variables",
        }),
      );
    });

    // The flat secondary now confirms like the primary — no `>_` here (the
    // ownable beat lives only on the primary), just the unified checkmark+label.
    const copied = screen.getByRole("button", { name: "Template copied" });
    expect(copied).toBeInTheDocument();
    expect(within(copied).queryByText(">_")).toBeNull();
  });
});
