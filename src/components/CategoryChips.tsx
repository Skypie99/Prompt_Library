"use client";

import clsx from "clsx";

// F-night-12 — each entry carries its count so the chip can show "writing (5)".
// `null` value for the "All" chip means "no category filter".
export interface CategoryChipEntry {
  category: string;
  count: number;
}

interface CategoryChipsProps {
  categories: CategoryChipEntry[];
  /** null means "All". */
  active: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryChips({ categories, active, onSelect }: CategoryChipsProps) {
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-center">
      {/* "All" chip — count is the sum of all categories. */}
      <CategoryChip
        label="All"
        count={totalCount}
        isActive={active === null}
        onClick={() => onSelect(null)}
      />
      {categories.map((c) => (
        <CategoryChip
          key={c.category}
          label={c.category}
          count={c.count}
          isActive={active === c.category}
          onClick={() => onSelect(c.category)}
        />
      ))}
    </div>
  );
}

function CategoryChip({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`Filter by ${label}, ${count} ${count === 1 ? "prompt" : "prompts"}`}
      className={clsx(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:focus-visible:ring-offset-night",
        isActive
          ? "border-desert-500 bg-desert-50 text-desert-700 shadow-sm dark:border-teal-400/60 dark:bg-teal-400/10 dark:text-teal-300 dark:shadow-none"
          : "border-border bg-surface text-ink-muted hover:border-desert-300 hover:text-desert-600 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-300",
      )}
    >
      <span>{label}</span>
      {/* aria-hidden because the aria-label above already spells out the
          count for screen readers; this is the sighted visual. */}
      <span
        aria-hidden
        className={clsx(
          "ml-1.5 text-xs font-normal tabular-nums",
          isActive
            ? "text-desert-600/60 dark:text-teal-300/70"
            : "text-ink-soft dark:text-paper-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}
