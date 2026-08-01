/**
 * F4 · SC 2.1.1 Keyboard — scrollable regions must be reachable — guard.
 *
 * axe's `scrollable-region-focusable` caught two instances, and a third of the
 * same shape turned up while fixing them:
 *
 *   1. The shortcuts modal's 17-row list — a scroll container with ZERO
 *      focusable children. Keyboard-only users could not scroll it at all;
 *      every row below the fold was unreachable. Worst instance.
 *   2. The prompt detail's left preview column — scrolls, all non-interactive
 *      text, no focus stop inside it.
 *   3. The "Claude response" panel — already named as a region, but with no
 *      tabindex, so a long answer scrolled past the fold unreachably.
 *
 * Rather than assert three specific attributes, this pins the INVARIANT:
 * any scroll container must be keyboard-operable — it either takes focus
 * itself, or it holds something focusable that tabbing can scroll to. That
 * catches scroll containers added later, which is how this recurs.
 */
import { render, screen } from "@testing-library/react";
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

import { ShortcutsModal } from "@/components/ShortcutsModal";
import { PromptDetail } from "@/components/PromptDetail";

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Every scroll container the app styles with the house scrollbar. */
function scrollContainers(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".overflow-y-auto"));
}

function describeEl(el: HTMLElement): string {
  return `<${el.tagName.toLowerCase()} class="${(el.getAttribute("class") ?? "").slice(0, 60)}…">`;
}

/**
 * SC 2.1.1 for a scroll container: a keyboard user must be able to get the
 * scrollbar moving. Either the container is itself a tab stop, or tabbing to
 * something inside it scrolls it.
 */
function assertKeyboardOperable(containers: HTMLElement[]) {
  expect(containers.length).toBeGreaterThan(0);
  for (const el of containers) {
    const tabindex = el.getAttribute("tabindex");
    const selfFocusable = tabindex !== null && Number(tabindex) >= 0;
    const focusableInside = el.querySelectorAll(FOCUSABLE).length;
    expect(
      selfFocusable || focusableInside > 0,
      `${describeEl(el)} scrolls but is unreachable by keyboard: no tabindex and no focusable descendant`,
    ).toBe(true);
  }
}

const PROMPT: Prompt = {
  id: "test-prompt-f4",
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

describe("F4 — scrollable regions are keyboard reachable", () => {
  describe("shortcuts modal", () => {
    it("makes the shortcut list a labelled, tabbable region", () => {
      render(<ShortcutsModal open onClose={() => {}} />);
      const region = screen.getByRole("region", { name: "Keyboard shortcuts" });
      expect(region).toHaveAttribute("tabindex", "0");
      expect(region.className).toContain("overflow-y-auto");
    });

    it("keeps the list semantics — the region wraps the <ul>, it is not the <ul>", () => {
      render(<ShortcutsModal open onClose={() => {}} />);
      const list = screen.getByRole("list");
      expect(list.tagName).toBe("UL");
      // Regression guard: putting role="region" ON the <ul> would silently cost
      // the "list, N items" announcement.
      expect(list).not.toHaveAttribute("role");
      expect(screen.getAllByRole("listitem").length).toBeGreaterThan(5);
      expect(list.closest('[role="region"]')).not.toBeNull();
    });

    it("every scroll container in the modal is keyboard operable", () => {
      const { container } = render(<ShortcutsModal open onClose={() => {}} />);
      assertKeyboardOperable(scrollContainers(container));
    });
  });

  describe("prompt detail", () => {
    it("names the preview column as a tabbable region", () => {
      render(<PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />);
      const preview = screen.getByRole("region", { name: "Prompt preview" });
      expect(preview).toHaveAttribute("tabindex", "0");
    });

    it("every scroll container in the detail sheet is keyboard operable", () => {
      const { container } = render(
        <PromptDetail prompt={PROMPT} settings={SETTINGS} {...CALLBACKS} />,
      );
      assertKeyboardOperable(scrollContainers(container));
    });
  });
});
