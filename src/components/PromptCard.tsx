"use client";

import clsx from "clsx";
import type { Prompt } from "@/lib/types";
import { StarIcon } from "./icons";

interface PromptCardProps {
  prompt: Prompt;
  onOpen: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  /** Optional: clicking a tag on the card sets it as the active filter
   *  on the home grid, instead of opening the prompt. */
  onSelectTag?: (tag: string) => void;
  /** Optional run count for the F-fast-2 usage badge. Omit / 0 = hide. */
  runCount?: number;
}

export function PromptCard({
  prompt,
  onOpen,
  isFavorite,
  onToggleFavorite,
  onSelectTag,
  runCount,
}: PromptCardProps) {
  // The card itself is the click target; the star is a nested control, so we
  // use a div with button semantics (a real <button> can't contain a button).
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="group relative flex h-full cursor-pointer flex-col rounded-xl border border-border bg-surface p-5 text-left shadow-card transition duration-200 ease-out hover:-translate-y-1 hover:border-coral-200 hover:shadow-cardHover focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-300 dark:border-night-border dark:bg-night-surface dark:hover:border-coral-500/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex w-fit items-center rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700 dark:bg-coral-500/15 dark:text-coral-300">
            {prompt.category}
          </span>
          {runCount !== undefined && runCount > 0 && (
            // F-fast-2 — quiet usage signal. Same pill shape as the
            // category chip but lighter (ink-soft instead of coral) so
            // it never competes with the category for attention.
            <span
              aria-label={`Run ${runCount} ${runCount === 1 ? "time" : "times"}`}
              className="inline-flex w-fit items-center rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-ink-muted dark:bg-night dark:text-paper-muted"
            >
              Run {runCount}×
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          className={clsx(
            "-mr-1.5 -mt-1.5 flex h-8 w-8 items-center justify-center rounded-md transition active:scale-90",
            isFavorite
              ? "text-coral-500"
              : "text-ink-soft opacity-0 hover:text-coral-500 focus-visible:opacity-100 group-hover:opacity-100",
          )}
        >
          <StarIcon
            filled={isFavorite}
            className={clsx("h-[18px] w-[18px]", isFavorite && "animate-pop")}
          />
        </button>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-coral-600 dark:text-paper dark:group-hover:text-coral-300">
        {prompt.title}
      </h3>

      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted dark:text-paper-muted">
        {prompt.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {prompt.tags.map((tag) =>
          onSelectTag ? (
            <button
              key={tag}
              type="button"
              onClick={(event) => {
                // Don't also open the prompt — the user picked the chip, not the card.
                event.stopPropagation();
                onSelectTag(tag);
              }}
              aria-label={`Filter by #${tag}`}
              className="rounded-md bg-cream px-2 py-0.5 text-xs text-ink-muted transition hover:bg-coral-50 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 dark:bg-night dark:text-paper-muted dark:hover:bg-coral-500/15 dark:hover:text-coral-300"
            >
              #{tag}
            </button>
          ) : (
            <span
              key={tag}
              className="rounded-md bg-cream px-2 py-0.5 text-xs text-ink-muted dark:bg-night dark:text-paper-muted"
            >
              #{tag}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
