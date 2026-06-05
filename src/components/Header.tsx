"use client";

import { DensityToggle } from "./DensityToggle";
import { GearIcon, SearchIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import type { Density } from "@/lib/density";

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  density: Density;
  onChangeDensity: (next: Density) => void;
}

export function Header({
  onOpenSearch,
  onOpenSettings,
  onOpenShortcuts,
  density,
  onChangeDensity,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-cream/80 backdrop-blur dark:border-teal-400/30 dark:bg-night/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="font-mono text-base font-bold text-desert-600 dark:text-teal-400">
            &gt;_
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink dark:text-paper">
            Prompt Library
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile-only search: the desktop "Search ⌘K" pill is hidden on
              phones (no keyboard for ⌘K), so give touch users a search icon. */}
          <button
            onClick={onOpenSearch}
            aria-label="Search prompts"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-desert-300 hover:text-desert-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:hidden dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-400 dark:focus-visible:ring-offset-night"
          >
            <SearchIcon className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onOpenSearch}
            aria-label="Search prompts"
            className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:border-desert-300 hover:text-desert-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:flex dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-400 dark:focus-visible:ring-offset-night"
          >
            <SearchIcon className="h-4 w-4" />
            Search
            <kbd className="rounded border border-border bg-cream px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-soft dark:border-night-border dark:bg-night">
              ⌘K
            </kbd>
          </button>

          {/* F-n2-3 — discoverable help button that opens the shortcuts
              modal. Same icon-button shape as the others; just a "?" glyph. */}
          <button
            onClick={onOpenShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-desert-300 hover:text-desert-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream sm:flex dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-400 dark:focus-visible:ring-offset-night"
          >
            <span aria-hidden className="text-base font-semibold">
              ?
            </span>
          </button>
          <span className="hidden sm:block">
            <DensityToggle density={density} onChange={onChangeDensity} />
          </span>
          <ThemeToggle />

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-desert-300 hover:text-desert-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-400 dark:focus-visible:ring-offset-night"
          >
            <GearIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
