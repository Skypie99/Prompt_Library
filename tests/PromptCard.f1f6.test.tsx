/**
 * F1 + F6 · SC 4.1.2 (nested interactive / name computation) + SC 1.3.1
 * (heading inside a button) — guard.
 *
 * The card used to be `<div role="button" tabindex="0">` CONTAINING the
 * favorite button and one button per tag. axe flagged `nested-interactive`
 * on 16 instances; the accessible name computed from the card's entire
 * contents (category + badges + title + full description + every tag label);
 * and the <h3> sat inside the button, so heading navigation landed on button
 * internals.
 *
 * The fix makes the card a plain <article> with a single stretched open
 * button. These tests pin all three halves of that — and, deliberately, pin
 * that the star and tag chips are STILL keyboard-reachable, so a future
 * "simplification" can't close the 4.1.2 finding by deleting real
 * functionality (which would trade it for a 2.1.1 failure).
 */
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PromptCard } from "@/components/PromptCard";
import type { Prompt } from "@/lib/types";

const prompt: Prompt = {
  id: "debug-the-error",
  title: "Debug This Error",
  description: "Paste a stack trace and get a walked-through diagnosis.",
  category: "Engineering",
  tags: ["code", "debugging"],
  body: "You are a senior engineer. Debug {{language}} error:\n{{stacktrace}}",
};

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

function renderCard(overrides: Partial<React.ComponentProps<typeof PromptCard>> = {}) {
  const props = {
    prompt,
    onOpen: vi.fn(),
    isFavorite: false,
    onToggleFavorite: vi.fn(),
    onSelectTag: vi.fn(),
    ...overrides,
  };
  const utils = render(<PromptCard {...props} />);
  return { ...utils, props };
}

describe("F1/F6 — prompt card semantics", () => {
  it("exposes one concise open action, not a name mashed from the whole card", () => {
    renderCard();
    const open = screen.getByRole("button", { name: `Open prompt: ${prompt.title}` });
    expect(open).toBeInTheDocument();

    // The old name swallowed the description and every tag. Guard against a
    // regression to name-from-contents.
    const name = open.getAttribute("aria-label")!;
    expect(name).not.toContain(prompt.description);
    expect(name).not.toContain(prompt.category);
    for (const tag of prompt.tags) expect(name).not.toContain(tag);
  });

  it("has no nested interactive controls anywhere in the card", () => {
    const { container } = renderCard();
    const interactive = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    expect(interactive.length).toBeGreaterThan(1); // star + tags + open

    for (const el of interactive) {
      const nestedFocusable = el.querySelectorAll(FOCUSABLE);
      expect(
        nestedFocusable.length,
        `<${el.tagName.toLowerCase()}> "${el.getAttribute("aria-label") ?? el.textContent}" contains ${nestedFocusable.length} focusable descendant(s)`,
      ).toBe(0);
    }
  });

  it("does not put the card's heading inside a button", () => {
    renderCard();
    const heading = screen.getByRole("heading", { level: 3, name: prompt.title });
    expect(heading.closest("button")).toBeNull();
    expect(heading.closest('[role="button"]')).toBeNull();
  });

  it("no longer marks a container as role=button", () => {
    const { container } = renderCard();
    expect(container.querySelector('div[role="button"]')).toBeNull();
  });

  it("opens the prompt when the stretched action is activated", () => {
    const { props } = renderCard();
    fireEvent.click(screen.getByRole("button", { name: `Open prompt: ${prompt.title}` }));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it("keeps the favorite control reachable and independent of opening", () => {
    const { props } = renderCard();
    const star = screen.getByRole("button", { name: "Add to favorites" });
    expect(star).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(star);
    expect(props.onToggleFavorite).toHaveBeenCalledTimes(1);
    // Sibling, not descendant — activating it must not also open the prompt.
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it("keeps every tag filter reachable and independent of opening", () => {
    const { props, container } = renderCard();
    const tagRow = container.querySelectorAll('button[aria-label^="Filter by #"]');
    expect(tagRow).toHaveLength(prompt.tags.length);

    fireEvent.click(screen.getByRole("button", { name: "Filter by #code" }));
    expect(props.onSelectTag).toHaveBeenCalledWith("code");
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it("still renders the card as a single article landmark", () => {
    const { container } = renderCard();
    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    // Title, description and badges all live inside it — the card is intact,
    // it just isn't a button any more.
    expect(within(article!).getByRole("heading", { level: 3 })).toHaveTextContent(prompt.title);
    expect(within(article!).getByText(prompt.description)).toBeInTheDocument();
  });
});
