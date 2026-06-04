/**
 * Component tests for F-r2: rate-limit retry UI in <PromptDetail />.
 *
 * Covered:
 *   1. With retryAfterSeconds:30  → shows "Retry in 30s" + an opacity-dimmed
 *      "Retry now" button (not visually disabled, but countdown is live).
 *   2. Countdown advances         → after 1 s fake-tick, text changes to
 *      "Retry in 29s".
 *   3. No retryAfterSeconds       → shows an enabled "Retry" button immediately.
 *   4. Click Retry                → streamClaude is re-called with same args.
 *   5. Unmount cleanup            → interval is cleared; no setState after unmount.
 *
 * Environment: jsdom (matched by *.test.tsx glob in vitest.config.ts).
 *
 * Mock strategy:
 *   - vi.mock("@/lib/anthropic") — keeps streamClaude fully controllable.
 *   - vi.mock("@/lib/runs")      — stops localStorage access.
 *   - vi.mock("@/lib/library")   — stops localStorage access.
 *   - All other heavy deps (Markdown, RunHistory) are mocked via vi.mock too.
 */

import { render, screen, act, fireEvent } from "@testing-library/react";
import { ClaudeError } from "@/lib/anthropic";
import type { Prompt } from "@/lib/types";
import type { Settings } from "@/lib/settings";

// ---- Module mocks (must come before dynamic imports) -------------------------

// streamClaude mock: by default resolves immediately (no stream chunks).
// Individual tests override via mockImplementation / mockRejectedValueOnce.
vi.mock("@/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/anthropic")>();
  return {
    ...actual, // re-export ClaudeError, parseRetryAfter, etc.
    streamClaude: vi.fn().mockResolvedValue(undefined),
  };
});

// Stop runs / library from touching localStorage.
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

// Markdown renders nothing fancy — just the source text.
vi.mock("@/components/Markdown", () => ({
  Markdown: ({ source }: { source: string }) => <span>{source}</span>,
}));

// RunHistory renders nothing — keeps the DOM simple.
vi.mock("@/components/RunHistory", () => ({
  RunHistory: () => null,
}));

// ---- Test helpers ------------------------------------------------------------

import { PromptDetail } from "@/components/PromptDetail";
import { streamClaude } from "@/lib/anthropic";

const mockedStreamClaude = streamClaude as ReturnType<typeof vi.fn>;

/** Minimal Prompt fixture with no variables. */
const PROMPT: Prompt = {
  id: "test-prompt-1",
  title: "Test Prompt",
  description: "A test prompt.",
  body: "Say hello.",
  variables: [],
  category: "Testing",
  tags: [],
  createdAt: "2026-05-28T00:00:00Z",
  isSeed: false,
};

/** Minimal Settings fixture — non-empty apiKey so run won't redirect to Settings. */
const SETTINGS: Settings = {
  apiKey: "sk-test-key",
  model: "claude-sonnet-4-6",
  maxTokens: 512,
};

/** Default noop prop callbacks. */
const DEFAULT_CALLBACKS = {
  isFavorite: false,
  onClose: vi.fn(),
  onOpenSettings: vi.fn(),
  onToggleFavorite: vi.fn(),
  onEdit: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
};

/**
 * Build a rate-limit ClaudeError, optionally with retryAfterSeconds.
 */
function makeRateLimitError(retryAfterSeconds?: number): ClaudeError {
  const err = new ClaudeError(
    "rate-limit",
    "Rate limit reached. Wait a moment, or switch to a faster model in Settings.",
  );
  if (retryAfterSeconds !== undefined) {
    err.retryAfterSeconds = retryAfterSeconds;
  }
  return err;
}

/**
 * Render PromptDetail, click "Run with Claude", and let the mocked
 * streamClaude settle so the error state is committed.
 *
 * The caller should set up mockedStreamClaude.mockRejectedValueOnce(err)
 * before calling this helper.
 */
async function renderAndTriggerError() {
  render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
  const runButton = screen.getByRole("button", { name: "Run with Claude" });
  await act(async () => {
    fireEvent.click(runButton);
  });
}

// ---- Tests -------------------------------------------------------------------

describe("PromptDetail — F-r2 rate-limit retry UI", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedStreamClaude.mockReset();
    mockedStreamClaude.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 1. Countdown shown when retryAfterSeconds is present
  // ---------------------------------------------------------------------------
  it("shows countdown text and 'Retry now' button when retryAfterSeconds is 30", async () => {
    const err = makeRateLimitError(30);
    mockedStreamClaude.mockRejectedValueOnce(err);

    await renderAndTriggerError();

    // aria-live span with countdown text
    expect(screen.getByText("Retry in 30s")).toBeInTheDocument();

    // "Retry now" button (not the plain "Retry" button)
    expect(
      screen.getByRole("button", { name: /Retry — available in 30 seconds/ }),
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. Countdown advances after 1 second
  // ---------------------------------------------------------------------------
  it("decrements countdown text to 29s after advancing timers by 1 second", async () => {
    const err = makeRateLimitError(30);
    mockedStreamClaude.mockRejectedValueOnce(err);

    await renderAndTriggerError();

    // Sanity: starts at 30
    expect(screen.getByText("Retry in 30s")).toBeInTheDocument();

    // Advance the fake clock by 1 s. The setInterval callback calls
    // setRetryCountdown, which is a React state update — wrapping in act()
    // ensures React flushes the update synchronously before we assert.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Retry in 29s")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 3. No retryAfterSeconds → immediate "Retry" button (no countdown)
  // ---------------------------------------------------------------------------
  it("shows an enabled 'Retry' button immediately when no retryAfterSeconds", async () => {
    const err = makeRateLimitError(); // no retryAfterSeconds
    mockedStreamClaude.mockRejectedValueOnce(err);

    await renderAndTriggerError();

    // Plain "Retry" button — no countdown text
    const retryBtn = screen.getByRole("button", { name: "Retry" });
    expect(retryBtn).toBeInTheDocument();
    expect(screen.queryByText(/Retry in/)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 4. Clicking Retry invokes streamClaude again with the same prompt/model
  // ---------------------------------------------------------------------------
  it("calls streamClaude again with the same apiKey and prompt when Retry is clicked", async () => {
    const err = makeRateLimitError(); // no countdown → immediate Retry
    mockedStreamClaude.mockRejectedValueOnce(err);
    // Second call succeeds
    mockedStreamClaude.mockResolvedValueOnce(undefined);

    await renderAndTriggerError();

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    // streamClaude should have been called twice total
    expect(mockedStreamClaude).toHaveBeenCalledTimes(2);

    // Second call must carry the same apiKey and prompt
    const calls = mockedStreamClaude.mock.calls as Array<[Parameters<typeof streamClaude>[0]]>;
    const firstCall = calls[0][0];
    const secondCall = calls[1][0];
    expect(secondCall.apiKey).toBe(firstCall.apiKey);
    expect(secondCall.prompt).toBe(firstCall.prompt);
    expect(secondCall.model).toBe(firstCall.model);
  });

  // ---------------------------------------------------------------------------
  // 5. Unmount cleanup: interval is cleared (no post-unmount setState)
  // ---------------------------------------------------------------------------
  it("clears the countdown interval on unmount so no setState fires after unmount", async () => {
    // Spy on console.error — React logs "Can't perform a React state update
    // on an unmounted component" when a stale setInterval fires.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = makeRateLimitError(60);
    mockedStreamClaude.mockRejectedValueOnce(err);

    const { unmount } = render(
      <PromptDetail prompt={PROMPT} settings={SETTINGS} {...DEFAULT_CALLBACKS} />,
    );
    const runButton = screen.getByRole("button", { name: "Run with Claude" });
    await act(async () => {
      fireEvent.click(runButton);
    });

    // Countdown is live (60s)
    expect(screen.getByText("Retry in 60s")).toBeInTheDocument();

    // Unmount — cleanup useEffect should clearInterval
    unmount();

    // Advance time well past the countdown to confirm no interval fires
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // No "Can't perform a React state update on an unmounted component" errors
    const stateUpdateErrors = consoleSpy.mock.calls.filter(
      ([msg]) => typeof msg === "string" && msg.includes("unmounted"),
    );
    expect(stateUpdateErrors).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});
