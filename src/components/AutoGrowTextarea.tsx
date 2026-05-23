"use client";

import { useEffect, useRef, type TextareaHTMLAttributes } from "react";

// F-night-5 — textarea that grows with its content.
//
// Sets `height: auto` then snaps to `scrollHeight` on every value change,
// up to maxHeightPx. Manual user-resize still works via the native handle
// (resize-y) — once the user drags, our measurement stops being authoritative
// for THAT keystroke but resumes on the next one. Acceptable tradeoff
// for ~30 lines of code vs ResizeObserver + drag tracking.
interface AutoGrowTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  value: string;
  /** Minimum rows-equivalent height — used for the initial render before
   *  the ref attaches. Falls back to 5 (matches the previous fixed-rows). */
  minRows?: number;
  /** Hard cap so a runaway paste doesn't push the whole panel off-screen. */
  maxHeightPx?: number;
}

export function AutoGrowTextarea({
  value,
  minRows = 5,
  maxHeightPx = 480,
  className,
  ...rest
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Re-measure whenever the value changes. RAF so the layout has the
  // latest characters before we read scrollHeight.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.style.height = "auto";
      const next = Math.min(el.scrollHeight, maxHeightPx);
      el.style.height = `${next}px`;
    });
    return () => cancelAnimationFrame(id);
  }, [value, maxHeightPx]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      className={className}
      {...rest}
    />
  );
}
