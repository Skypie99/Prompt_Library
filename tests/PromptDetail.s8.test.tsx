/**
 * Component tests for S8 (BP3): reduced-motion-safe run feedback + a calmer
 * streaming announce in <PromptDetail />.
 *
 * What this pins (the in-rig arbiter — live RM + real screen-reader = D3 device):
 *   1. The SINGLE sr-only role=status region announces a start cue while running
 *      and one "Response complete" summary after — never the answer token-by-token.
 *   2. The visual #response-content region is NO LONGER a live region: role=region
 *      with no aria-live / aria-atomic (silent + navigable).
 *   3. The run spinner and streaming caret are motion-safe-gated (the animation is
 *      only applied at prefers-reduced-motion: no-preference), so reduced-motion
 *      users get a static-but-legible indicator instead of a frozen half-ring. The
 *      global RM rule (globals.css) is never touched — this is a pure CSS-variant
 *      change, so class presence in jsdom is the correct structural proof.
 *   4. The error path is announced by the scoped role=alert, and the status region
 *      does NOT say "Response complete" on error.
 *
 * Mock strategy mirrors PromptDetail.ratelimit.test.tsx.
 */

import { render, screen, act, fireEvent } from "@testing-library/react";
import { ClaudeError } from "@/lib/anthropic";
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

// Markdown renders just the source text so the caret sits beside it in the region.
vi.mock("@/components/Markdown", () => ({
  Markdown: ({ source }: { source: string }) => <span>{source}</span>,
}));

vi.mock("@/components/RunHistory", () => ({
  RunHistory: () => null,
}));

import { PromptDetail } from "@/components/PromptDetail";
import { streamClaude } from "@/lib/anthropic";

const mockedStreamClaude = streamClaude as ReturnType<typeof vi.fn>;

const PROMPT: Prompt = {
  id: "test-prompt-s8",
  title: "Test Prompt",
  description: "A test prompt.",
  body: "Say hello.",
  variables: [],
  category: "Testing",
  tags: [],
  createdAt: "2026-05-28T00:00:00Z",
  isSeed: false,
};

const SETTINGS: Settings = {
  apiKey: "sk-test-key",
  model: "claude-sonnet-4-6",
  maxTokens: 512,
};

const DEFAULT_CALLBACKS = {
  isFavorite: false,
  onClose: vi.fn(),
  onOpenSettings: vi.fn(),
  onToggleFavorite: vi.fn(),
  onEdit: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
};

function statusText(): string {
  return document.querySelector('[role="status"]')?.textContent ?? "<none>";
}

function classTokens(el: Element | null | undefined): string[] {
  return (el?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

describe("PromptDetail — S8 RM-safe feedback + calmer announce", () => {
  beforeEach(() => {
    mockedStreamClaude.mockReset();
    mockedStreamClaude.mockResolvedValue(undefined);
  });

  it("announces start then completion via the single sr-only role=status region", async () => {
    let resolveStream: (() => void) | undefined;
    mockedStreamClaude.mockImplementation(async ({ onText }: { onText: (c: string) => void }) => {
      onText("Hello ");
      onText("world");
      await new Promise<void>((r) => {
        resolveStream = r;
      });
    });

    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);

    // A persistent status region exists and is silent before any run.
    expect(document.querySelector('[role="status"]')).not.toBeNull();
    expect(statusText()).toBe("");

    // Start the run — streamClaude stays pending, so running === true.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Run with Claude" }));
    });

    // (1) start cue announced
    expect(statusText()).toBe("Claude is responding…");

    // (2) the visual response region is NOT a live region
    const region = document.getElementById("response-content");
    expect(region).not.toBeNull();
    expect(region?.getAttribute("role")).toBe("region");
    expect(region?.getAttribute("aria-live")).toBeNull();
    expect(region?.getAttribute("aria-atomic")).toBeNull();

    // (3a) the run spinner (inside the "Stop" button) is motion-safe-gated
    const stopBtn = screen.getByRole("button", { name: "Stop" });
    const spinner = stopBtn.querySelector('span[aria-hidden="true"]');
    expect(classTokens(spinner)).toContain("motion-safe:animate-spin");
    expect(classTokens(spinner)).not.toContain("animate-spin"); // no un-gated spin
    expect(classTokens(spinner)).toContain("motion-safe:border-t-teal-600");

    // (3b) the streaming caret is motion-safe-gated too
    const caret = region?.querySelector('span[aria-hidden="true"]');
    expect(caret?.textContent).toContain("▋");
    expect(classTokens(caret)).toContain("motion-safe:animate-pulse");
    expect(classTokens(caret)).not.toContain("animate-pulse");

    // Finish the run.
    await act(async () => {
      resolveStream?.();
    });

    // (1) completion summary announced (start → complete differ, so it speaks)
    expect(statusText()).toBe("Response complete");
  });

  it("does not announce 'Response complete' on the error path (role=alert handles it)", async () => {
    mockedStreamClaude.mockRejectedValueOnce(new ClaudeError("unknown", "Something broke."));

    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Run with Claude" }));
    });

    // status region cleared on error — no false "complete"
    expect(statusText()).toBe("");
    // the scoped alert carries the error
    expect(screen.getByRole("alert").textContent).toContain("Something broke.");
  });
});
