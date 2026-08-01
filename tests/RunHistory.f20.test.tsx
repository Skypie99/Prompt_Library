/**
 * F20 · SC 1.4.10 Reflow — the run-history filter/action row must wrap.
 *
 * At a 320px viewport the row (Show: filter, "Last 24h", Export, Clear all)
 * did not wrap, so "Export" and "Clear all" sat ~98px past the right edge and
 * could only be reached by scrolling the page sideways — the two-dimensional
 * scrolling 1.4.10 exists to prevent.
 *
 * jsdom performs no layout, so overflow itself cannot be measured here; the
 * rendered/measured leg lives in the audit bundle and the device script. What
 * this pins is the structural cause: the row is a flex container that is
 * allowed to wrap, and every control in it is inside that container. Since
 * `flex-wrap` only engages when the row would overflow, wider viewports are
 * unaffected.
 */
import { render, screen, act, fireEvent } from "@testing-library/react";
import type { StoredRun } from "@/lib/runs";

vi.mock("@/lib/runs", () => ({
  clearRuns: vi.fn(),
  formatRelativeTime: vi.fn().mockReturnValue("just now"),
  removeRun: vi.fn().mockReturnValue([]),
  setRunLabel: vi.fn().mockReturnValue([]),
}));
vi.mock("@/components/Markdown", () => ({
  Markdown: ({ source }: { source: string }) => <span>{source}</span>,
}));
vi.mock("@/lib/settings", () => ({ modelLabel: vi.fn().mockReturnValue("Claude Haiku") }));

import { RunHistory } from "@/components/RunHistory";

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

const NOOP = { onChange: vi.fn(), onRestoreInputs: vi.fn() };

function renderExpanded() {
  const utils = render(<RunHistory promptId="p-1" runs={[makeRun()]} {...NOOP} />);
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: /History/i }));
  });
  return utils;
}

describe("F20 — the run-history filter row wraps instead of overflowing", () => {
  it("puts the filter/action controls in a flex row that is allowed to wrap", () => {
    renderExpanded();

    const exportBtn = screen.getByRole("button", { name: "Export" });
    const row = exportBtn.parentElement!;

    const classes = row.className.split(/\s+/);
    expect(classes).toContain("flex");
    expect(
      classes,
      "the filter/action row must wrap, or Export and Clear all overflow the viewport at 320px",
    ).toContain("flex-wrap");
  });

  it("keeps every control of the row inside the wrapping container", () => {
    renderExpanded();

    const row = screen.getByRole("button", { name: "Export" }).parentElement!;
    // All four controls must share the wrapping row — one escaping it would
    // reintroduce the overflow for that control alone.
    expect(row).toContainElement(screen.getByRole("button", { name: "Export" }));
    expect(row).toContainElement(screen.getByRole("button", { name: "Clear all" }));
    expect(row).toContainElement(screen.getByRole("button", { name: "Last 24h" }));
    expect(row).toContainElement(
      screen.getByRole("combobox", { name: /filter history by status/i }),
    );
  });
});
