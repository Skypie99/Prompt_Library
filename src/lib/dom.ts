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

/**
 * True when the user has asked the OS to minimize motion. Needed for
 * JS-driven motion — e.g. the `behavior` option of `scrollIntoView`, which
 * the CSS `scroll-behavior: auto !important` reduced-motion override in
 * globals.css cannot reach. SSR-safe (returns false when matchMedia is
 * unavailable, so the default path stays "smooth" on the server).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
