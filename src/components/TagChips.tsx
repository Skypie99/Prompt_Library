"use client";

import clsx from "clsx";
import { useState } from "react";

// F-eve-2 — each entry carries its count so the chip can show "#tag · N".
// The count is also surfaced to screen readers via aria-label.
export interface TagChipEntry {
  tag: string;
  count: number;
}

interface TagChipsProps {
  tags: TagChipEntry[];
  /** null means "no tag selected". */
  active: string | null;
  onSelect: (tag: string | null) => void;
}

// Tags shown by default; user can expand to see all if there are more.
// Twelve is enough for most libraries and keeps the visual weight in check.
const INITIAL_VISIBLE = 12;

export function TagChips({ tags, active, onSelect }: TagChipsProps) {
  const [expanded, setExpanded] = useState(false);
  if (tags.length === 0) return null;

  const visible = expanded ? tags : tags.slice(0, INITIAL_VISIBLE);
  const hiddenCount = tags.length - visible.length;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-start gap-1.5 sm:justify-center">
      {visible.map(({ tag, count }) => {
        const isActive = tag === active;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(isActive ? null : tag)}
            aria-pressed={isActive}
            aria-label={`Filter by #${tag}, ${count} ${count === 1 ? "prompt" : "prompts"}`}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:py-1 dark:focus-visible:ring-offset-night",
              isActive
                ? "border-desert-500 bg-desert-50 text-desert-700 shadow-sm dark:border-teal-400/60 dark:bg-teal-400/10 dark:text-teal-300 dark:shadow-none"
                : "border-border bg-cream text-ink-muted hover:border-desert-300 hover:text-desert-600 dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-teal-300",
            )}
          >
            <span>#{tag}</span>
            {/* Count displayed via CSS content:attr(data-count) so the DOM
                text node stays empty. This keeps innerText = just "#tag",
                satisfying WCAG 2.5.3 (accessible name contains visible label).
                Inactive count uses ink-muted (not ink-soft) so rendered text
                clears AA contrast on bg-cream / dark on bg-night. */}
            <span
              aria-hidden="true"
              data-count={count}
              className={clsx(
                "ml-1.5 text-[10px] font-normal tabular-nums before:content-[attr(data-count)]",
                isActive
                  ? "text-desert-600/60 dark:text-teal-300/70"
                  : "text-ink-muted dark:text-paper-muted",
              )}
            />
          </button>
        );
      })}

      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full px-3 py-1 text-xs font-medium text-ink-muted underline-offset-4 hover:text-desert-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
        >
          +{hiddenCount} more
        </button>
      )}

      {expanded && tags.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-full px-3 py-1 text-xs font-medium text-ink-muted underline-offset-4 hover:text-desert-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
        >
          Show fewer
        </button>
      )}
    </div>
  );
}
