/**
 * F8 · SC 4.1.3 Status Messages — copy confirmations must actually be
 * announced. F12 (silent copy failure) rides the same region.
 *
 * All three copy affordances confirmed VISUALLY (the "Copied" flash plus S12's
 * `>_` blink), but the only screen-reader mechanism was a name swap on the
 * button — "Copy filled prompt" -> "Filled prompt copied". A name change on an
 * already-focused control is announced inconsistently across AT (usually
 * VoiceOver, often not NVDA/TalkBack), and "Copy response" swapped visible
 * text only, so it was never announced at all.
 *
 * F12: a clipboard write that REJECTS produced no feedback of any kind.
 *
 * These assert the announcement REACHES a live region, which is the part that
 * was missing — not the visual flash, which already worked and is covered by
 * the S12 tests.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Prompt } from "@/lib/types";
import type { Settings } from "@/lib/settings";

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
  id: "test-prompt-f8",
  title: "Test Prompt",
  description: "A test prompt.",
  body: "Say hello.",
  variables: [],
  category: "Testing",
  tags: [],
  createdAt: "2026-05-28T00:00:00Z",
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

/** Text carried by any live region on the page. */
function liveRegionText(): string {
  return Array.from(document.querySelectorAll('[role="status"], [role="alert"]'))
    .map((el) => el.textContent ?? "")
    .join(" | ");
}

function setClipboard(impl: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(impl) },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
}

describe("F8/F12 — copy outcomes reach a live region", () => {
  it("announces a successful copy of the filled prompt", async () => {
    setClipboard(() => Promise.resolve());
    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />);

    // Nothing stale sitting in the announcer before the user acts.
    expect(liveRegionText()).not.toMatch(/copied/i);

    fireEvent.click(screen.getByRole("button", { name: /copy filled prompt/i }));

    await waitFor(() => {
      expect(liveRegionText()).toMatch(/filled prompt copied to clipboard/i);
    });
  });

  it("carries the confirmation in a role=status region, not just the button name", async () => {
    setClipboard(() => Promise.resolve());
    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />);
    fireEvent.click(screen.getByRole("button", { name: /copy filled prompt/i }));

    await waitFor(() => {
      const statuses = Array.from(document.querySelectorAll('[role="status"]'));
      const announced = statuses.some((el) => /copied to clipboard/i.test(el.textContent ?? ""));
      expect(
        announced,
        "the confirmation must live in a role=status region — a button name swap alone is not reliably announced",
      ).toBe(true);
    });
  });

  it("keeps the copy announcer separate from the run/stream announcer", async () => {
    setClipboard(() => Promise.resolve());
    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />);
    // Two distinct persistent regions: one owns run state, one owns copy.
    // Folding copy into the run region would clobber "Claude is responding…".
    expect(document.querySelectorAll('[role="status"]').length).toBeGreaterThanOrEqual(2);
  });

  it("F12 — announces a FAILED copy instead of failing silently", async () => {
    setClipboard(() => Promise.reject(new Error("denied")));
    // The legacy execCommand fallback must fail too, or copy would succeed.
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(() => false),
      configurable: true,
      writable: true,
    });

    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />);
    fireEvent.click(screen.getByRole("button", { name: /copy filled prompt/i }));

    await waitFor(() => {
      expect(liveRegionText()).toMatch(/couldn't copy/i);
    });
  });
});
