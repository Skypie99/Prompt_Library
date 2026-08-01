/**
 * F7 · SC 4.1.2 + SC 2.4.3 — the command palette was modal in look only.
 *
 * It rendered a fullscreen scrim that swallowed clicks, but had no
 * role="dialog", no aria-modal, no focus trap and no focus restore. The audit
 * confirmed the consequence with a trusted Tab: from the last result row focus
 * left the panel entirely and landed on "Skip to content" — a link BEHIND the
 * scrim, on the obscured page, with the palette still open. Screen-reader
 * virtual cursors could browse the covered page just as freely.
 *
 * S3's combobox/listbox internals are ledger-CLOSED and were deliberately not
 * touched; the last test here pins that they still work, so this fix can't
 * regress them.
 *
 * jsdom note: the trap filters candidates by `getClientRects().length > 0` to
 * skip invisible controls. jsdom has no layout and returns an empty list for
 * everything, which would make the trap a silent no-op under test. It is
 * stubbed below so the trap is exercised for real rather than vacuously.
 */
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CommandPalette } from "@/components/CommandPalette";
import type { Prompt } from "@/lib/types";

const PROMPTS: Prompt[] = [
  {
    id: "a",
    title: "Debug This Error",
    description: "Walk a stack trace.",
    body: "Debug {{lang}}",
    variables: [],
    category: "Engineering",
    tags: ["code"],
    createdAt: "2026-05-28T00:00:00Z",
    isSeed: true,
  },
  {
    id: "b",
    title: "Write Unit Tests",
    description: "Generate tests.",
    body: "Test {{lang}}",
    variables: [],
    category: "Engineering",
    tags: ["code"],
    createdAt: "2026-05-28T00:00:00Z",
    isSeed: true,
  },
];

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

let restoreDom: (() => void) | undefined;

beforeEach(() => {
  const originalRects = Element.prototype.getClientRects;
  const originalScroll = Element.prototype.scrollIntoView;
  // Pretend everything is laid out, so the trap's visibility filter keeps
  // candidates instead of discarding all of them.
  Element.prototype.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
  // jsdom has no layout, so scrollIntoView (used by S3's roving selection)
  // simply doesn't exist. Not under test here — stubbed so it can't throw.
  Element.prototype.scrollIntoView = function () {};
  restoreDom = () => {
    Element.prototype.getClientRects = originalRects;
    Element.prototype.scrollIntoView = originalScroll;
  };
});

afterEach(() => {
  restoreDom?.();
  cleanup();
});

function focusablesIn(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
}

describe("F7 — the command palette is a real modal dialog", () => {
  it("exposes dialog semantics with a name", () => {
    render(<CommandPalette open prompts={PROMPTS} onClose={() => {}} onSelect={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Search prompts");
  });

  it("wraps Tab from the last control back to the first", () => {
    render(<CommandPalette open prompts={PROMPTS} onClose={() => {}} onSelect={() => {}} />);
    const dialog = screen.getByRole("dialog");
    const items = focusablesIn(dialog);
    expect(items.length).toBeGreaterThan(1);

    const first = items[0];
    const last = items[items.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: "Tab" });
    // Without the trap this would have escaped the panel entirely.
    expect(document.activeElement).toBe(first);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("wraps Shift+Tab from the first control back to the last", () => {
    render(<CommandPalette open prompts={PROMPTS} onClose={() => {}} onSelect={() => {}} />);
    const dialog = screen.getByRole("dialog");
    const items = focusablesIn(dialog);
    const first = items[0];
    const last = items[items.length - 1];

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("restores focus to whatever opened it", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open palette";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { rerender } = render(
      <CommandPalette open prompts={PROMPTS} onClose={() => {}} onSelect={() => {}} />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(
      <CommandPalette open={false} prompts={PROMPTS} onClose={() => {}} onSelect={() => {}} />,
    );
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("closes on Escape from a result row, not only from the search input", () => {
    const onClose = vi.fn();
    render(<CommandPalette open prompts={PROMPTS} onClose={onClose} onSelect={() => {}} />);
    const dialog = screen.getByRole("dialog");
    const row = focusablesIn(dialog).find((el) => el.tagName === "BUTTON");
    expect(row).toBeDefined();

    row!.focus();
    fireEvent.keyDown(row!, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves S3's combobox/listbox internals intact", () => {
    render(<CommandPalette open prompts={PROMPTS} onClose={() => {}} onSelect={() => {}} />);
    const input = screen.getByRole("combobox", { name: "Search prompts" });
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-activedescendant");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option").length).toBe(PROMPTS.length);
  });
});
