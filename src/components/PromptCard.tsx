"use client";

import { memo, useMemo } from "react";
import clsx from "clsx";
import type { Prompt } from "@/lib/types";
import type { Density } from "@/lib/density";
import { categoryColor } from "@/lib/categoryColor";
import { formatRelativeTime } from "@/lib/runs";
import { countBodyVariables } from "@/lib/variables";
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
  /** F-n2-13 — ISO timestamp of the most recent run; renders as
   *  "Last 2hr ago" beneath the description. */
  lastRunIso?: string;
  /** F-fast-5 — compact mode tightens padding and clamps the description
   *  to one line so more cards fit on screen. Default comfortable. */
  density?: Density;
}

export const PromptCard = memo(function PromptCard({
  prompt,
  onOpen,
  isFavorite,
  onToggleFavorite,
  onSelectTag,
  runCount,
  lastRunIso,
  density = "comfortable",
}: PromptCardProps) {
  const isCompact = density === "compact";
  // F-night-1 — variable count for the small "5 fields" badge.
  // Memoized so the regex walk happens once per prompt change, not per
  // render. Across a 50-prompt grid that's 50 walks once, not on every
  // hover or unrelated state change.
  const variableCount = useMemo(() => countBodyVariables(prompt.body), [prompt.body]);
  // F-night-11 — deterministic per-category color for the 3px left stripe.
  // Pure derived; memo because the categoryColor call hashes the string.
  const catColor = useMemo(() => categoryColor(prompt.category), [prompt.category]);
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
      className={clsx(
        "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-surface text-left shadow-card transition duration-200 ease-out hover:border-desert-200 hover:shadow-cardHoverWarm dark:hover:shadow-cardHover focus:outline-none focus-visible:ring-2 focus-visible:ring-desert-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night-surface dark:hover:border-teal-400/40 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-night",
        isCompact ? "p-3.5" : "p-5",
      )}
    >
      {/* F-night-11 — 3px left stripe in the category's deterministic
          color. Aria-hidden because the category chip already names the
          category — this is a sighted-user-only scanning signal, not
          new information. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] dark:hidden"
        style={{ backgroundColor: catColor.light }}
      />
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 hidden w-[3px] dark:block"
        style={{ backgroundColor: catColor.dark }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex w-fit items-center rounded-full bg-desert-100 px-2.5 py-0.5 text-xs font-medium text-desert-700 dark:bg-teal-500/15 dark:text-teal-300">
            {prompt.category}
          </span>
          {runCount !== undefined && runCount > 0 && (
            // F-fast-2 — quiet usage signal. Same pill shape as the
            // category chip but lighter (ink-soft instead of coral) so
            // it never competes with the category for attention.
            <span
              aria-label={`Run ${runCount} ${runCount === 1 ? "time" : "times"}`}
              className="inline-flex w-fit items-center rounded-full bg-cream px-2 py-0.5 font-mono text-[11px] font-medium text-ink-muted dark:bg-night dark:text-paper-muted"
            >
              &gt;{runCount}
            </span>
          )}
          {variableCount > 0 && (
            // F-night-1 — variable count badge. Same pill family as the
            // run-count badge so the badges visually cluster. Hidden when
            // the prompt has no variables (most card-glanceable signal
            // when it's there, but never noise when it's not).
            <span
              aria-label={`${variableCount} ${variableCount === 1 ? "field" : "fields"} to fill`}
              className="inline-flex w-fit items-center rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-ink-muted dark:bg-night dark:text-paper-muted"
            >
              {variableCount} {variableCount === 1 ? "field" : "fields"}
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
            "-mr-1.5 -mt-1.5 flex h-8 w-8 items-center justify-center rounded-md transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-night",
            isFavorite
              ? "text-desert-500"
              : "text-ink-soft opacity-0 hover:text-desert-500 focus-visible:opacity-100 group-hover:opacity-100",
          )}
        >
          <StarIcon
            filled={isFavorite}
            className={clsx("h-[18px] w-[18px]", isFavorite && "animate-pop")}
          />
        </button>
      </div>

      <h3
        className={clsx(
          "mt-3 font-display font-semibold leading-snug text-ink transition-colors group-hover:text-desert-600 dark:text-paper dark:group-hover:text-teal-300",
          isCompact ? "text-base" : "text-lg",
        )}
      >
        {prompt.title}
      </h3>

      <p
        className={clsx(
          "mt-1.5 text-sm leading-relaxed text-ink-muted dark:text-paper-muted",
          isCompact ? "line-clamp-1" : "line-clamp-2",
        )}
        // F-n2-1 — title attribute gives a native hover preview of the
        // first ~240 chars of the body (browser-native tooltip; respects
        // hover delay; keyboard users get it on focus). No custom popover
        // — the native tooltip is accessible, doesn't add bundle weight,
        // and matches the OS look.
        title={prompt.body.length > 240 ? `${prompt.body.slice(0, 240).trim()}…` : prompt.body}
      >
        {prompt.description}
      </p>

      {/* F-n2-13 — quiet "Last 2hr ago" line under the description. */}
      {lastRunIso && (
        <p className="mt-1.5 text-[11px] text-ink-soft dark:text-paper-muted">
          Last run <time dateTime={lastRunIso}>{formatRelativeTime(lastRunIso)}</time>
        </p>
      )}

      <div className={clsx("flex flex-wrap gap-1.5", isCompact ? "mt-3" : "mt-4")}>
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
              className="inline-flex min-h-[24px] items-center rounded-md bg-cream px-2 py-0.5 text-xs text-ink-muted transition hover:bg-desert-100 hover:text-desert-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-400 dark:bg-night dark:text-paper-muted dark:hover:bg-teal-500/15 dark:hover:text-teal-300"
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
});
