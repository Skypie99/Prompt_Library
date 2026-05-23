"use client";

import { GearIcon, SearchIcon, SparkleIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

export function Header({ onOpenSearch, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-cream/80 backdrop-blur dark:border-night-border/70 dark:bg-night/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-500 text-white shadow-sm">
            <SparkleIcon className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink dark:text-paper">
            Prompt Library
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:border-coral-300 hover:text-coral-600 sm:flex dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-400"
          >
            <SearchIcon className="h-4 w-4" />
            Search
            <kbd className="rounded border border-border bg-cream px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-soft dark:border-night-border dark:bg-night">
              ⌘K
            </kbd>
          </button>

          <ThemeToggle />

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-400"
          >
            <GearIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
