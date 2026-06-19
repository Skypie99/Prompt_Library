// Small DOM helpers shared across components.

/**
 * True when a keyboard event originated from a text-entry element (an
 * `<input>`, `<textarea>`, or any contenteditable node). Used by global
 * keyboard shortcuts to avoid firing while the user is typing into a field.
 */
export function isTypingTarget(event: KeyboardEvent): boolean {
  const el = event.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}
