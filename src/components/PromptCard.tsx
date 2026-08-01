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
  // F-n2-1 — native hover preview of the first ~240 chars of the body. Lives
  // on the stretched open-button (which covers the card), so hovering
  // anywhere on the card surfaces it.
  const bodyPreview =
    prompt.body.length > 240 ? `${prompt.body.slice(0, 240).trim()}…` : prompt.body;

  return (
    // F1/F6 — the card used to be a `div[role="button"]` that CONTAINED the
    // favorite button and the tag-filter buttons. That is `nested-interactive`
    // (SC 4.1.2): the card's accessible name computed from its entire
    // contents — category + badges + title + description + every tag — and a
    // button-inside-a-button has no defined screen-reader interaction model.
    // The <h3> sat inside the button too, so heading navigation dropped users
    // onto button internals (SC 1.3.1).
    //
    // Now the card is a plain <article> and the open action is a stretched
    // button covering it: one concise name, no nesting, the heading back
    // outside the interactive element. The star and the tag chips are still
    // real, still keyboard-reachable — they just sit ABOVE the overlay
    // (relative z-10) instead of inside it.
    <article
      className={clsx(
        "group relative flex h-full cursor-pointer flex-col rounded-xl border border-border bg-surface text-left shadow-card transition duration-200 ease-out motion-safe:hover:-translate-y-px hover:border-desert-200 hover:shadow-cardHoverWarm dark:hover:shadow-cardHover dark:border-night-border dark:bg-night-surface dark:hover:border-teal-400/40",
        isCompact ? "p-3.5" : "p-5",
      )}
    >
      {/* F-night-11 — 3px left stripe in the category's deterministic
          color. Aria-hidden because the category chip already names the
          category — this is a sighted-user-only scanning signal, not
          new information.

          The clip lives HERE rather than on the card root: the root can no
          longer be `overflow-hidden` or it would clip the open-button's
          focus ring, and the stripes are the only thing that ever needed
          clipping to the rounded corners. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
        <span
          className="absolute inset-y-0 left-0 w-[3px] dark:hidden"
          style={{ backgroundColor: catColor.light }}
        />
        <span
          className="absolute inset-y-0 left-0 hidden w-[3px] dark:block"
          style={{ backgroundColor: catColor.dark }}
        />
      </span>

      {/* The stretched open action. `-inset-px` reaches the border box, so
          the focus ring lands exactly where the old root-level ring did.
          Absolutely-positioned, so it paints above the card's static content
          without needing a z-index of its own. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open prompt: ${prompt.title}`}
        title={bodyPreview}
        className="absolute -inset-px rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-night"
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
              className="inline-flex w-fit items-center rounded-full bg-cream px-2 py-0.5 font-mono text-2xs font-medium text-ink-muted dark:bg-night dark:text-paper-muted"
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
              className="inline-flex w-fit items-center rounded-full bg-cream px-2 py-0.5 text-2xs font-medium text-ink-muted dark:bg-night dark:text-paper-muted"
            >
              {variableCount} {variableCount === 1 ? "field" : "fields"}
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
          className={clsx(
            // relative z-10 lifts it above the stretched open-button, so it
            // stays clickable. (It no longer needs stopPropagation: the open
            // action is a sibling now, not an ancestor.)
            "relative z-10 -mr-1.5 -mt-1.5 flex h-8 w-8 items-center justify-center rounded-md transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-night",
            isFavorite
              ? "text-desert-500"
              : "text-ink-soft dark:text-paper-muted opacity-0 hover:text-desert-500 focus-visible:opacity-100 group-hover:opacity-100",
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
      >
        {prompt.description}
      </p>

      {/* F-n2-13 — quiet "Last 2hr ago" line under the description. */}
      {lastRunIso && (
        <p className="mt-1.5 text-2xs text-ink-soft dark:text-paper-muted">
          Last run <time dateTime={lastRunIso}>{formatRelativeTime(lastRunIso)}</time>
        </p>
      )}

      <div className={clsx("flex flex-wrap gap-1.5", isCompact ? "mt-3" : "mt-4")}>
        {prompt.tags.map((tag) =>
          onSelectTag ? (
            <button
              key={tag}
              type="button"
              onClick={() => onSelectTag(tag)}
              aria-label={`Filter by #${tag}`}
              // relative z-10 keeps the chip above the stretched open-button,
              // so picking a tag filters instead of opening the prompt.
              className="relative z-10 inline-flex min-h-[24px] items-center rounded-md bg-cream px-2 py-0.5 text-xs text-ink-muted transition hover:bg-desert-100 hover:text-desert-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 dark:focus-visible:ring-desert-400 dark:bg-night dark:text-paper-muted dark:hover:bg-teal-500/15 dark:hover:text-teal-300"
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
    </article>
  );
});
