"use client";

import clsx from "clsx";
import { useState } from "react";

interface TagChipsProps {
  tags: string[];
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
    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
      {visible.map((tag) => {
        const isActive = tag === active;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(isActive ? null : tag)}
            aria-pressed={isActive}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:focus-visible:ring-offset-night",
              isActive
                ? "border-coral-500 bg-coral-500 text-white shadow-sm"
                : "border-border bg-cream text-ink-muted hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-coral-300",
            )}
          >
            #{tag}
          </button>
        );
      })}

      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full px-3 py-1 text-xs font-medium text-ink-muted underline-offset-4 hover:text-coral-600 hover:underline dark:text-paper-muted dark:hover:text-coral-300"
        >
          +{hiddenCount} more
        </button>
      )}

      {expanded && tags.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-full px-3 py-1 text-xs font-medium text-ink-muted underline-offset-4 hover:text-coral-600 hover:underline dark:text-paper-muted dark:hover:text-coral-300"
        >
          Show fewer
        </button>
      )}
    </div>
  );
}
