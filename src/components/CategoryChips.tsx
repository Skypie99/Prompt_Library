"use client";

import clsx from "clsx";

interface CategoryChipsProps {
  categories: string[];
  /** null means "All". */
  active: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryChips({ categories, active, onSelect }: CategoryChipsProps) {
  const chips: { label: string; value: string | null }[] = [
    { label: "All", value: null },
    ...categories.map((c) => ({ label: c, value: c })),
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {chips.map((chip) => {
        const isActive = chip.value === active;
        return (
          <button
            key={chip.label}
            onClick={() => onSelect(chip.value)}
            className={clsx(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              isActive
                ? "border-coral-500 bg-coral-500 text-white shadow-sm"
                : "border-border bg-surface text-ink-muted hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-300",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
