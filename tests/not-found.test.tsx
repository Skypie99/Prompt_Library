import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import NotFound from "@/app/not-found";

// S5 — the themed 404 (BP6). NotFound is a server component but uses no async /
// server-only APIs, so it renders synchronously under jsdom. jsdom can't compute
// colors, so contrast (AA both themes) is verified in-rig, not here; these tests
// lock the STRUCTURE + a11y contract that must survive under either theme class.
afterEach(() => {
  cleanup();
  document.documentElement.className = "";
});

describe("not-found (S5)", () => {
  it("renders exactly one h1 with the headline", () => {
    const { container, getByRole } = render(<NotFound />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(getByRole("heading", { level: 1 })).toHaveTextContent("This prompt got away.");
  });

  it("has a real Back-to-the-library link pointing home", () => {
    const { getByRole } = render(<NotFound />);
    // The arrow is aria-hidden, so the accessible name is exactly the label.
    const link = getByRole("link", { name: /^back to the library$/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("carries the >_ terminal glyph as aria-hidden", () => {
    const { getByText } = render(<NotFound />);
    const glyph = getByText(">_");
    expect(glyph).toHaveAttribute("aria-hidden");
  });

  it("shows the 404 eyebrow and exactly one affordance (no second control)", () => {
    const { getByText, queryAllByRole } = render(<NotFound />);
    expect(getByText("404")).toBeInTheDocument();
    // Locks the single-path-home decision: no search button, no duplicate link.
    expect(queryAllByRole("link")).toHaveLength(1);
    expect(queryAllByRole("button")).toHaveLength(0);
  });

  it("keeps its structure intact under the light theme", () => {
    const { getByRole } = render(<NotFound />);
    expect(getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(getByRole("link", { name: /back to the library/i })).toBeInTheDocument();
  });

  it("keeps its structure intact under the dark theme", () => {
    document.documentElement.classList.add("dark");
    const { getByRole } = render(<NotFound />);
    expect(getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(getByRole("link", { name: /back to the library/i })).toBeInTheDocument();
  });
});
