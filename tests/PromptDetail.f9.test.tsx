/**
 * F9 · SC 4.1.3 — the rate-limit countdown must not announce once per second.
 *
 * "Retry in {n}s" sat inside aria-live="polite" aria-atomic="true" and updated
 * every second, so a 30-second rate limit produced THIRTY spoken
 * interruptions; the Retry button's accessible name churned in step
 * ("Retry — available in 29 seconds", "…28 seconds", …). The in-code comment
 * believed ticking once per second avoided spam — announcing once per second
 * IS the spam.
 *
 * The contract now: the seconds tick silently for sighted users, and exactly
 * two things get announced — the wait on entry, and retry becoming available.
 */
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { ClaudeError } from "@/lib/anthropic";
import type { Prompt } from "@/lib/types";
import type { Settings } from "@/lib/settings";

vi.mock("@/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/anthropic")>();
  return { ...actual, streamClaude: vi.fn() };
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
import { streamClaude } from "@/lib/anthropic";

const mockedStreamClaude = streamClaude as ReturnType<typeof vi.fn>;

const PROMPT: Prompt = {
  id: "test-prompt-f9",
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

function rateLimitError(seconds: number) {
  const err = new ClaudeError("rate-limit", "Rate limited. Please wait.");
  (err as ClaudeError & { retryAfterSeconds?: number }).retryAfterSeconds = seconds;
  return err;
}

/** Elements that will actually SPEAK on change. */
function liveRegions(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]',
    ),
  );
}

async function triggerRateLimit(seconds: number) {
  mockedStreamClaude.mockRejectedValueOnce(rateLimitError(seconds));
  render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />);
  fireEvent.click(screen.getByRole("button", { name: /run with claude/i }));
  await waitFor(() => expect(screen.getByText(`Retry in ${seconds}s`)).toBeInTheDocument());
}

describe("F9 — rate-limit countdown announces twice, not once per second", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedStreamClaude.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces the wait ONCE on entry, with the whole duration", async () => {
    await triggerRateLimit(30);
    const spoken = liveRegions()
      .map((r) => r.textContent ?? "")
      .join(" | ");
    expect(spoken).toMatch(/retry available in 30 seconds/i);
  });

  it("does not put the ticking counter inside a live region", async () => {
    await triggerRateLimit(30);
    const counter = screen.getByText("Retry in 30s");

    // The counter itself must not be live...
    expect(counter).not.toHaveAttribute("aria-live");
    expect(counter).not.toHaveAttribute("aria-atomic");
    // ...nor sit inside one, which would announce it just the same.
    expect(
      counter.closest('[aria-live], [role="status"], [role="alert"]'),
      "the ticking countdown is inside a live region — it will be spoken every second",
    ).toBeNull();
  });

  it("keeps the Retry button's name stable while the countdown ticks", async () => {
    await triggerRateLimit(30);
    const button = screen.getByRole("button", { name: "Retry now" });
    const nameBefore = button.textContent;

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Retry in 27s")).toBeInTheDocument(); // still ticking visually
    expect(screen.getByRole("button", { name: "Retry now" })).toBeInTheDocument();
    expect(button.textContent).toBe(nameBefore);
    expect(button).not.toHaveAttribute("aria-label");
  });

  it("the live text does not change on every tick", async () => {
    await triggerRateLimit(30);
    const snapshot = () =>
      liveRegions()
        .map((r) => r.textContent ?? "")
        .join(" | ");

    const first = snapshot();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    const second = snapshot();
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    const third = snapshot();

    // Three seconds in, nothing new has been said.
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("announces once more when retry actually becomes available", async () => {
    await triggerRateLimit(3);
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    const spoken = liveRegions()
      .map((r) => r.textContent ?? "")
      .join(" | ");
    expect(spoken).toMatch(/retry is now available/i);
  });
});
