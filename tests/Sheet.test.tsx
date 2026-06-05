/**
 * Sheet primitive — behavior tests. Sheet is the shared overlay used by the
 * modals (bottom-sheet on mobile, centered dialog on desktop), so its
 * open/close + a11y contract is worth pinning down.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { Sheet } from "@/components/ui/Sheet";

describe("Sheet", () => {
  it("renders nothing when closed", () => {
    render(
      <Sheet open={false} onClose={() => {}} ariaLabel="Test">
        <p>Body content</p>
      </Sheet>,
    );
    expect(screen.queryByText("Body content")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders children inside a labelled dialog when open", () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="Test sheet">
        <p>Body content</p>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Test sheet");
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("names the dialog via labelledById when provided", () => {
    render(
      <Sheet open onClose={() => {}} labelledById="t">
        <h2 id="t">My Title</h2>
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("My Title");
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="Test">
        <p>Body</p>
      </Sheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sheet open onClose={onClose} ariaLabel="Test">
        <p>Body</p>
      </Sheet>,
    );
    const backdrop = container.querySelector(".bg-ink\\/40");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
