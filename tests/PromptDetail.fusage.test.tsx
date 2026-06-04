/**
 * Component tests for F-usage-c: token count display in <PromptDetail />.
 *
 * Covered:
 *   1. Token count line renders after a run completes with usage data.
 *   2. Token count line is NOT visible while streaming is in progress.
 *   3. Token count line is NOT visible when there is an error (no usage).
 *   4. Numbers are formatted with toLocaleString("en") — comma separators.
 *   5. Token count clears (resets to null) when a new run starts.
 *
 * Environment: jsdom (matched by *.test.tsx glob in vitest.config.ts).
 *
 * Mock strategy:
 *   - vi.mock("@/lib/anthropic") — streamClaude fully controllable.
 *   - vi.mock("@/lib/runs")      — stops localStorage access.
 *   - vi.mock("@/lib/library")   — stops localStorage access.
 *   - vi.mock("@/components/Markdown", "@/components/RunHistory") — simplify DOM.
 *
 * Key invariant:
 *   showResponsePanel = running || response.length > 0 || error !== null
 *   The token count line only renders inside showResponsePanel, so every mock
 *   that tests token display must also call onText to produce a non-empty
 *   response — otherwise the panel (and therefore the token count) won't show.
 */

import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { ClaudeError } from "@/lib/anthropic";
import type { TokenUsage } from "@/lib/anthropic";
import type { Prompt } from "@/lib/types";
import type { Settings } from "@/lib/settings";

// ---- Module mocks -----------------------------------------------------------

vi.mock("@/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/anthropic")>();
  return {
    ...actual, // re-export ClaudeError, TokenUsage type, etc.
    streamClaude: vi.fn().mockResolvedValue(undefined),
  };
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
}));

vi.mock("@/components/Markdown", () => ({
  Markdown: ({ source }: { source: string }) => <span>{source}</span>,
}));

vi.mock("@/components/RunHistory", () => ({
  RunHistory: () => null,
}));

// ---- Test helpers -----------------------------------------------------------

import { PromptDetail } from "@/components/PromptDetail";
import { streamClaude } from "@/lib/anthropic";

const mockedStreamClaude = streamClaude as ReturnType<typeof vi.fn>;

const PROMPT: Prompt = {
  id: "test-prompt-1",
  title: "Test Prompt",
  description: "A test prompt.",
  body: "Say hello.",
  variables: [],
  category: "Testing",
  tags: [],
  createdAt: "2026-05-29T00:00:00Z",
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

type StreamClaudeParams = Parameters<typeof streamClaude>[0];

/**
 * Build a streamClaude mock implementation that:
 *  - calls onText("Hello!") so showResponsePanel becomes true (response.length > 0)
 *  - calls onUsage with the given token counts
 *  - then resolves
 */
function mockStreamWithUsage(input: number, output: number) {
  mockedStreamClaude.mockImplementationOnce(
    async (params: StreamClaudeParams) => {
      params.onText("Hello!");
      if (params.onUsage) {
        params.onUsage({ inputTokens: input, outputTokens: output });
      }
    },
  );
}

/** Click "Run with Claude" and let the mocked streamClaude settle. */
async function clickRun() {
  const runButton = screen.getByRole("button", { name: "Run with Claude" });
  await act(async () => {
    fireEvent.click(runButton);
  });
}

// ---- Tests ------------------------------------------------------------------

describe("PromptDetail — F-usage-c token count display", () => {
  beforeEach(() => {
    mockedStreamClaude.mockReset();
    mockedStreamClaude.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // 1. Token count line renders after run completes with usage data
  // -------------------------------------------------------------------------
  it("shows the token count line after a run completes with onUsage data", async () => {
    mockStreamWithUsage(128, 512);

    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    // The token count should now be visible in the response panel header.
    await waitFor(() => {
      expect(screen.getByLabelText(/128 input tokens.*512 output tokens/i)).toBeInTheDocument();
    });
    // Also verify the abbreviated display text.
    expect(screen.getByText(/128 in · 512 out/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 2. Token count line is NOT visible while streaming
  // -------------------------------------------------------------------------
  it("does NOT show the token count line while streaming is in progress", async () => {
    // streamClaude never resolves during this test — stream stays open.
    let resolveStream!: () => void;
    mockedStreamClaude.mockImplementationOnce(
      async (params: StreamClaudeParams) => {
        // Send text so showResponsePanel becomes true, but DON'T call onUsage.
        params.onText("partial...");
        return new Promise<void>((resolve) => { resolveStream = resolve; });
      },
    );

    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    // Start the run (don't await — stream is open).
    const runButton = screen.getByRole("button", { name: "Run with Claude" });
    fireEvent.click(runButton);

    // While streaming, the "Streaming…" indicator should appear but NOT the token line.
    await waitFor(() => {
      expect(screen.getByText(/Streaming/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/input tokens/i)).not.toBeInTheDocument();

    // Clean up: resolve the stream so the component can unmount cleanly.
    await act(async () => { resolveStream(); });
  });

  // -------------------------------------------------------------------------
  // 3. Token count line is NOT visible when the run errors
  // -------------------------------------------------------------------------
  it("does NOT show the token count line when the run errors (no usage)", async () => {
    mockedStreamClaude.mockRejectedValueOnce(
      new ClaudeError("network", "Connection dropped."),
    );

    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    // Error message should appear, but NOT the token line.
    await waitFor(() => {
      expect(screen.getByText(/Connection dropped/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/input tokens/i)).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 4. Numbers formatted with toLocaleString("en") — comma separators
  // -------------------------------------------------------------------------
  it("formats large token counts with comma separators (toLocaleString)", async () => {
    mockStreamWithUsage(1_234, 9_876);

    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    await waitFor(() => {
      // aria-label uses the full formatted form
      expect(screen.getByLabelText(/1,234 input tokens.*9,876 output tokens/i)).toBeInTheDocument();
    });
    // Abbreviated display text uses the same formatter
    expect(screen.getByText(/1,234 in · 9,876 out/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. A second completed run with different token counts replaces the first
  // -------------------------------------------------------------------------
  it("replaces the previous token count with new counts from a second run", async () => {
    // First run: 50 in, 100 out.
    mockStreamWithUsage(50, 100);

    render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    // Sanity: first run's token counts visible.
    await waitFor(() => {
      expect(screen.getByLabelText(/50 input tokens/i)).toBeInTheDocument();
    });

    // Second run: 200 in, 400 out — different counts.
    mockStreamWithUsage(200, 400);

    const runAgainButton = screen.getByRole("button", { name: "Run with Claude" });
    await act(async () => {
      fireEvent.click(runAgainButton);
    });

    // After the second run, the new token counts should appear and the old
    // ones must be gone.
    await waitFor(() => {
      expect(screen.getByLabelText(/200 input tokens.*400 output tokens/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/50 input tokens/i)).not.toBeInTheDocument();
  });
});
