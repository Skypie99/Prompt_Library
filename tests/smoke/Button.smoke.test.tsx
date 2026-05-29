/**
 * Smoke test: confirms that jsdom + @testing-library/react + jest-dom matchers
 * are wired correctly in Vitest.
 *
 * This is intentionally self-contained (no app imports) so it acts as an
 * environment canary — if this fails, the issue is in test infrastructure,
 * not application code.
 *
 * AC-7 note: the Retry button component tests (feat/rate-limit-retry-2026-05-28)
 * can now be written using this same pattern: render → click → assert.
 */
import { render, screen, fireEvent } from "@testing-library/react";

describe("Button smoke test — jsdom environment", () => {
  it("renders a button with expected text", () => {
    render(<button type="button">Click me</button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("calls the onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(
      <button type="button" onClick={handleClick}>
        Retry
      </button>,
    );
    const button = screen.getByRole("button", { name: "Retry" });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders a disabled button and reflects disabled state", () => {
    render(
      <button type="button" disabled>
        Loading…
      </button>,
    );
    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });

  it("toHaveTextContent matcher works (jest-dom is wired)", () => {
    render(<p>Hello from jsdom</p>);
    expect(screen.getByText("Hello from jsdom")).toHaveTextContent(
      "Hello from jsdom",
    );
  });
});
