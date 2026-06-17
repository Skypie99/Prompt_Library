/**
 * Component tests for F3a/c/d Run-UX improvements in <PromptDetail />.
 *
 * Covered:
 *   F3a — Overloaded retry button (503/529):
 *     1. error.kind === "overloaded" → "Retry" button renders
 *     2. Clicking the Retry button re-invokes streamClaude with same args
 *     3. error.kind === "rate-limit" with countdown is unchanged (no Retry button, only countdown)
 *
 *   F3c — Unfilled variable soft warning:
 *     4. All variables filled → clicking Run proceeds without showing warning
 *     5. One variable empty → clicking Run shows inline role="alert" warning
 *     6. Clicking "Run anyway" dismisses warning and calls runWithValues
 *     7. Clicking "Fill it" dismisses warning (focus behavior)
 *     8. ⌘↵ keyboard shortcut bypasses the unfilled warning
 *
 *   F3d — Response panel expand/collapse toggle:
 *     9.  Expand toggle is NOT visible when there is no response
 *     10. Expand toggle appears after a successful response is received
 *     11. Clicking Expand removes max-h constraint label; clicking Collapse restores
 *
 * Environment: jsdom (matched by *.test.tsx glob in vitest.config.ts).
 *
 * Mock strategy mirrors PromptDetail.ratelimit.test.tsx:
 *   - vi.mock("@/lib/anthropic") — controls streamClaude
 *   - vi.mock("@/lib/runs")      — no localStorage
 *   - vi.mock("@/lib/library")   — no localStorage
 *   - Markdown + RunHistory mocked for DOM simplicity
 */

import { render, screen, act, fireEvent } from "@testing-library/react";
import { ClaudeError } from "@/lib/anthropic";
import type { Prompt } from "@/lib/types";
import type { Settings } from "@/lib/settings";

// ---- Module mocks ------------------------------------------------------------

vi.mock("@/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/anthropic")>();
  return {
    ...actual,
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
  // F3b — per-prompt model switcher
  loadPromptModel: vi.fn().mockReturnValue(null),
  savePromptModel: vi.fn(),
}));

vi.mock("@/components/Markdown", () => ({
  Markdown: ({ source }: { source: string }) => <span>{source}</span>,
}));

vi.mock("@/components/RunHistory", () => ({
  RunHistory: () => null,
}));

// ---- Imports after mocks -----------------------------------------------------

import { PromptDetail } from "@/components/PromptDetail";
import { streamClaude } from "@/lib/anthropic";

const mockedStreamClaude = streamClaude as ReturnType<typeof vi.fn>;

// ---- Fixtures ----------------------------------------------------------------

/** Prompt with no variables — for F3a/F3d tests. */
const PROMPT_NO_VARS: Prompt = {
  id: "test-prompt-no-vars",
  title: "No-var Prompt",
  description: "A test prompt with no variables.",
  body: "Say hello.",
  variables: [],
  category: "Testing",
  tags: [],
  createdAt: "2026-05-29T00:00:00Z",
  isSeed: false,
};

/** Prompt with one variable — for F3c tests. */
const PROMPT_WITH_VAR: Prompt = {
  id: "test-prompt-with-var",
  title: "Var Prompt",
  description: "A test prompt with a variable.",
  body: "Say hello to {{name}}.",
  variables: [{ name: "name", label: "Name", placeholder: "", multiline: false }],
  category: "Testing",
  tags: [],
  createdAt: "2026-05-29T00:00:00Z",
  isSeed: false,
};

/** Settings fixture — non-empty apiKey so run proceeds. */
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

/** Build a ClaudeError with specified kind and optional retryAfterSeconds. */
function makeError(
  kind: "overloaded" | "rate-limit" | "auth" | "unknown",
  retryAfterSeconds?: number,
): ClaudeError {
  const messages: Record<string, string> = {
    overloaded: "Claude is overloaded right now. Give it a few seconds and try again.",
    "rate-limit": "Rate limit reached. Wait a moment, or switch to a faster model in Settings.",
    auth: "Invalid API key.",
    unknown: "Something unexpected happened.",
  };
  const err = new ClaudeError(kind, messages[kind]);
  if (retryAfterSeconds !== undefined) {
    err.retryAfterSeconds = retryAfterSeconds;
  }
  return err;
}

/** Click "Run with Claude" and wait for async settling. */
async function clickRun() {
  const runButton = screen.getByRole("button", { name: "Run with Claude" });
  await act(async () => {
    fireEvent.click(runButton);
  });
}

// ---- F3a tests ---------------------------------------------------------------

describe("PromptDetail — F3a: overloaded error Retry button", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedStreamClaude.mockReset();
    mockedStreamClaude.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders a Retry button when error kind is 'overloaded'", async () => {
    mockedStreamClaude.mockRejectedValueOnce(makeError("overloaded"));
    render(<PromptDetail prompt={PROMPT_NO_VARS} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    // Should show the overloaded error message
    expect(
      screen.getByText("Claude is overloaded right now. Give it a few seconds and try again."),
    ).toBeInTheDocument();
    // Should show a Retry button
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("clicking Retry calls streamClaude again with same apiKey and prompt", async () => {
    mockedStreamClaude.mockRejectedValueOnce(makeError("overloaded"));
    mockedStreamClaude.mockResolvedValueOnce(undefined);

    render(<PromptDetail prompt={PROMPT_NO_VARS} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    const retryBtn = screen.getByRole("button", { name: "Retry" });
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    expect(mockedStreamClaude).toHaveBeenCalledTimes(2);
    const calls = mockedStreamClaude.mock.calls as Array<[Parameters<typeof streamClaude>[0]]>;
    expect(calls[1][0].apiKey).toBe(calls[0][0].apiKey);
    expect(calls[1][0].prompt).toBe(calls[0][0].prompt);
    expect(calls[1][0].model).toBe(calls[0][0].model);
  });

  it("rate-limit error with countdown shows countdown text, not plain Retry", async () => {
    mockedStreamClaude.mockRejectedValueOnce(makeError("rate-limit", 30));
    render(<PromptDetail prompt={PROMPT_NO_VARS} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    // Countdown text should be present
    expect(screen.getByText("Retry in 30s")).toBeInTheDocument();
    // The dimmed "Retry now" button (with aria-label carrying the seconds)
    expect(
      screen.getByRole("button", { name: /Retry — available in 30 seconds/ }),
    ).toBeInTheDocument();
    // There must NOT be a plain accessible "Retry" button (that's the overloaded path)
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});

// ---- F3c tests ---------------------------------------------------------------

describe("PromptDetail — F3c: unfilled variable soft warning", () => {
  beforeEach(() => {
    mockedStreamClaude.mockReset();
    mockedStreamClaude.mockResolvedValue(undefined);
  });

  it("proceeds without warning when all variables are filled", async () => {
    render(<PromptDetail prompt={PROMPT_WITH_VAR} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);

    // Fill the variable input
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "World" } });

    await clickRun();

    // Warning should not appear
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // streamClaude should have been called
    expect(mockedStreamClaude).toHaveBeenCalledTimes(1);
  });

  it("shows inline warning when a variable is empty and Run is clicked", async () => {
    render(<PromptDetail prompt={PROMPT_WITH_VAR} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);

    // Do NOT fill the variable — click Run immediately
    const runButton = screen.getByRole("button", { name: "Run with Claude" });
    fireEvent.click(runButton);

    // Warning role="alert" should appear
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("1 variable is empty — run anyway?");

    // streamClaude should NOT have been called yet
    expect(mockedStreamClaude).not.toHaveBeenCalled();
  });

  it("clicking 'Run anyway' dismisses warning and calls streamClaude", async () => {
    render(<PromptDetail prompt={PROMPT_WITH_VAR} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);

    // Trigger warning
    fireEvent.click(screen.getByRole("button", { name: "Run with Claude" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Click "Run anyway"
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Run anyway" }));
    });

    // Warning dismissed
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // streamClaude was called
    expect(mockedStreamClaude).toHaveBeenCalledTimes(1);
  });

  it("clicking 'Fill it' dismisses warning without calling streamClaude", async () => {
    render(<PromptDetail prompt={PROMPT_WITH_VAR} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);

    // Trigger warning
    fireEvent.click(screen.getByRole("button", { name: "Run with Claude" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Click "Fill it"
    // accessible name changed to "Fill empty variables" (P2 a11y polish)
    fireEvent.click(screen.getByRole("button", { name: "Fill empty variables" }));

    // Warning dismissed
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // streamClaude was NOT called
    expect(mockedStreamClaude).not.toHaveBeenCalled();
  });

  it("⌘↵ keyboard shortcut bypasses the unfilled variable warning", async () => {
    render(
      <div onKeyDown={() => {}}>
        <PromptDetail prompt={PROMPT_WITH_VAR} settings={SETTINGS} {...DEFAULT_CALLBACKS} />
      </div>,
    );

    // Don't fill the variable; fire ⌘↵ on the modal container
    const modal = screen.getByRole("button", { name: "Run with Claude" }).closest("div[class]")!;
    await act(async () => {
      fireEvent.keyDown(modal, { key: "Enter", metaKey: true });
    });

    // No warning alert — shortcut skips the gate
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // streamClaude was called directly
    expect(mockedStreamClaude).toHaveBeenCalledTimes(1);
  });
});

// ---- F3d tests ---------------------------------------------------------------

describe("PromptDetail — F3d: response panel expand/collapse toggle", () => {
  beforeEach(() => {
    mockedStreamClaude.mockReset();
    mockedStreamClaude.mockResolvedValue(undefined);
  });

  it("expand toggle is not visible before any run", () => {
    render(<PromptDetail prompt={PROMPT_NO_VARS} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);

    expect(screen.queryByRole("button", { name: "Expand response" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse response" })).not.toBeInTheDocument();
  });

  it("expand toggle appears after a successful response is received", async () => {
    // streamClaude streams a chunk via onText, then resolves
    mockedStreamClaude.mockImplementation(
      async ({ onText }: { onText: (chunk: string) => void }) => {
        onText("Hello from Claude!");
      },
    );

    render(<PromptDetail prompt={PROMPT_NO_VARS} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    expect(screen.getByRole("button", { name: "Expand response" })).toBeInTheDocument();
  });

  it("clicking Expand shows 'Collapse response'; clicking Collapse reverts", async () => {
    mockedStreamClaude.mockImplementation(
      async ({ onText }: { onText: (chunk: string) => void }) => {
        onText("Hello from Claude!");
      },
    );

    render(<PromptDetail prompt={PROMPT_NO_VARS} settings={SETTINGS} {...DEFAULT_CALLBACKS} />);
    await clickRun();

    // Initial state: "Expand response"
    const expandBtn = screen.getByRole("button", { name: "Expand response" });
    expect(expandBtn).toBeInTheDocument();

    // Click Expand
    fireEvent.click(expandBtn);
    expect(screen.getByRole("button", { name: "Collapse response" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand response" })).not.toBeInTheDocument();

    // Click Collapse
    fireEvent.click(screen.getByRole("button", { name: "Collapse response" }));
    expect(screen.getByRole("button", { name: "Expand response" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse response" })).not.toBeInTheDocument();
  });
});
