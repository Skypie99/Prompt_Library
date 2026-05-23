"use client";

import { GridCompactIcon, GridLargeIcon } from "./icons";
import type { Density } from "@/lib/density";

interface DensityToggleProps {
  density: Density;
  onChange: (next: Density) => void;
}

// Header button that flips the prompt grid between compact and comfortable
// layouts. Mirrors the ThemeToggle button visually so the Header looks
// composed, not piled. Label changes with the current state (announces the
// ACTION the next click will perform, matching the ThemeToggle convention).
export function DensityToggle({ density, onChange }: DensityToggleProps) {
  const next: Density = density === "compact" ? "comfortable" : "compact";
  const label =
    density === "compact" ? "Switch to comfortable view" : "Switch to compact view";

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-400 dark:focus-visible:ring-offset-night"
    >
      {density === "compact" ? (
        <GridCompactIcon className="h-[18px] w-[18px]" />
      ) : (
        <GridLargeIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
