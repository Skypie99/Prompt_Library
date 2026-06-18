"use client";

import { Sheet } from "./ui/Sheet";
import { CloseIcon } from "./icons";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

// One canonical list of shortcuts — adding a new shortcut elsewhere should
// add a row here too. The KEY column is one or more visual `<kbd>` chips;
// the DESCRIPTION column is a plain string for screen readers.
//
// Multiple keystrokes for the same action are separated by " or " in the UI
// but each spelled out separately for screen readers via the aria-label.
const SHORTCUTS: ReadonlyArray<{
  keys: ReadonlyArray<ReadonlyArray<string>>;
  description: string;
}> = [
  { keys: [["?"]], description: "Show this help" },
  {
    keys: [
      ["⌘", "K"],
      ["Ctrl", "K"],
    ],
    description: "Open the search palette",
  },
  { keys: [["/"]], description: "Open the search palette" },
  { keys: [["Esc"]], description: "Close any open overlay (palette, prompt, modal, form)" },
  {
    keys: [
      ["⌘", "↵"],
      ["Ctrl", "↵"],
    ],
    description: "Run the current prompt (inside a prompt)",
  },
  { keys: [["s"]], description: "Star / unstar the open prompt" },
  {
    keys: [
      ["⌘", "1-9"],
      ["Ctrl", "1-9"],
    ],
    description: "Open the Nth result in the search palette",
  },
  { keys: [["n"]], description: "Create a new prompt" },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  return (
    <Sheet open={open} onClose={onClose} size="md" labelledById="shortcuts-modal-title">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 dark:border-night-border">
        <h2
          id="shortcuts-modal-title"
          className="font-display text-lg font-semibold text-ink dark:text-paper"
        >
          Keyboard shortcuts
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close keyboard shortcuts"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-teal-300 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <ul className="scrollbar-soft min-h-0 flex-1 divide-y divide-border overflow-y-auto dark:divide-night-border">
        {SHORTCUTS.map((row, rowIndex) => {
          // Build the aria-label so a screen reader reads, e.g.
          // "Command K or Control K: Open the search palette".
          const ariaLabel =
            row.keys.map((combo) => combo.map((k) => prettyForA11y(k)).join(" ")).join(" or ") +
            ": " +
            row.description;

          return (
            <li
              key={rowIndex}
              aria-label={ariaLabel}
              className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
            >
              <span className="text-ink dark:text-paper">{row.description}</span>
              <span aria-hidden className="flex shrink-0 items-center gap-2">
                {row.keys.map((combo, comboIndex) => (
                  <span key={comboIndex} className="flex items-center gap-1">
                    {combo.map((k, i) => (
                      <kbd
                        key={i}
                        className="rounded-md border border-border bg-cream px-1.5 py-0.5 font-sans text-xs font-medium text-ink-muted dark:border-night-border dark:bg-night dark:text-paper-muted"
                      >
                        {k}
                      </kbd>
                    ))}
                    {comboIndex < row.keys.length - 1 && (
                      <span className="text-xs text-ink-soft">or</span>
                    )}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

// Turn key symbols into screen-reader-friendly words. Used only for the
// aria-label string, never for the visible <kbd>.
function prettyForA11y(key: string): string {
  switch (key) {
    case "⌘":
      return "Command";
    case "↵":
      return "Enter";
    case "Ctrl":
      return "Control";
    case "Esc":
      return "Escape";
    case "/":
      return "Slash";
    case "?":
      return "Question mark";
    default:
      return key;
  }
}
