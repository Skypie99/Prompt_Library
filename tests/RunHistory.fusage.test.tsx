/**
 * Component tests for F-usage-c: token count display in RunHistory.
 *
 * Covered:
 *   1. Token count line renders for a run with tokensUsed.
 *   2. Token count line is absent for a run without tokensUsed.
 *   3. Numbers are formatted with toLocaleString ("en") — comma separators.
 *   4. The aria-label uses the unabbreviated form of the count.
 *   5. Runs with and without tokensUsed coexist correctly in the same list.
 *
 * Environment: jsdom (matched by *.test.tsx glob in vitest.config.ts).
 *
 * Mock strategy:
 *   - vi.mock("@/lib/runs") — stops localStorage access.
 *   - vi.mock("@/components/Markdown") — keeps test output simple.
 *   - vi.mock("@/lib/settings") — stable modelLabel string.
 */

import { render, screen, act, fireEvent } from "@testing-library/react";
import type { StoredRun } from "@/lib/runs";

// ---- Module mocks (must come before dynamic imports) -------------------------

vi.mock("@/lib/runs", () => ({
  clearRuns: vi.fn(),
  formatRelativeTime: vi.fn().mockReturnValue("just now"),
  removeRun: vi.fn().mockReturnValue([]),
  setRunLabel: vi.fn().mockReturnValue([]),
}));

vi.mock("@/components/Markdown", () => ({
  Markdown: ({ source }: { source: string }) => <span>{source}</span>,
}));

vi.mock("@/lib/settings", () => ({
  modelLabel: vi.fn().mockReturnValue("Claude Haiku"),
}));

// ---- Test helpers ------------------------------------------------------------

import { RunHistory } from "@/components/RunHistory";

/** Build a minimal completed StoredRun. */
function makeRun(overrides: Partial<StoredRun> = {}): StoredRun {
  return {
    id: "r-test-1",
    ranAt: "2026-05-29T10:00:00.000Z",
    model: "claude-haiku",
    values: {},
    sentPrompt: "Say hello.",
    response: "Hello!",
    status: "completed",
    ...overrides,
  };
}

/** Default noop callbacks for RunHistory. */
const NOOP = {
  onChange: vi.fn(),
  onRestoreInputs: vi.fn(),
};

/**
 * Expand the RunHistory list by clicking the toggle button.
 * The button name is "History · N" where N is the run count.
 */
function expandHistory() {
  // The toggle button contains "History ·" in its text.
  const toggle = screen.getByRole("button", { name: /History/i });
  act(() => {
    fireEvent.click(toggle);
  });
}

// ---- Tests -------------------------------------------------------------------

describe("RunHistory — F-usage-c token count display", () => {
  // -------------------------------------------------------------------------
  // 1. Token count line renders when tokensUsed is set
  // -------------------------------------------------------------------------
  it("shows the token count line for a run with tokensUsed", () => {
    const run = makeRun({ tokensUsed: { input: 128, output: 64 } });
    render(<RunHistory promptId="p-1" runs={[run]} {...NOOP} />);

    expandHistory();

    // Token count text should be visible in the expanded list.
    // The format is "{input} in · {output} out"
    expect(screen.getByText(/128 in · 64 out/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 2. Token count line is absent for a run without tokensUsed
  // -------------------------------------------------------------------------
  it("does NOT show a token count line when tokensUsed is absent", () => {
    const run = makeRun(); // no tokensUsed
    render(<RunHistory promptId="p-1" runs={[run]} {...NOOP} />);

    expandHistory();

    // No "in ·" pattern should be present in the output.
    expect(screen.queryByText(/ in · /)).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Numbers formatted with toLocaleString("en") — thousands separator
  // -------------------------------------------------------------------------
  it("formats large token counts with comma separators", () => {
    const run = makeRun({
      id: "r-large",
      tokensUsed: { input: 1_234, output: 9_876 },
    });
    render(<RunHistory promptId="p-1" runs={[run]} {...NOOP} />);

    expandHistory();

    // toLocaleString("en") turns 1234 → "1,234" and 9876 → "9,876"
    expect(screen.getByText(/1,234 in · 9,876 out/)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 4. aria-label carries the unabbreviated form
  // -------------------------------------------------------------------------
  it("sets aria-label with 'input tokens' and 'output tokens' wording", () => {
    const run = makeRun({ id: "r-aria", tokensUsed: { input: 50, output: 200 } });
    render(<RunHistory promptId="p-1" runs={[run]} {...NOOP} />);

    expandHistory();

    // Look for an element whose aria-label matches the long-form pattern.
    const el = screen.getByLabelText(/50 input tokens.*200 output tokens/i);
    expect(el).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 5. Mixed list: only runs with tokensUsed show token counts
  // -------------------------------------------------------------------------
  it("shows token counts only for runs that have tokensUsed", () => {
    const withTokens = makeRun({ id: "r-with", tokensUsed: { input: 10, output: 20 } });
    const withoutTokens = makeRun({ id: "r-without" });
    render(<RunHistory promptId="p-1" runs={[withTokens, withoutTokens]} {...NOOP} />);

    expandHistory();

    // Exactly one token count line present.
    const lines = screen.getAllByText(/ in · /);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveTextContent("10 in · 20 out");
  });
});
