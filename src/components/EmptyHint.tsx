"use client";

import type { ComponentType, SVGProps } from "react";

interface EmptyHintProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  heading: string;
  body: string;
}

/**
 * Soft empty-state tile — used for "you haven't favorited anything yet"
 * and "no prompts found here." Visual is intentionally calmer than the
 * OnboardingHint (no coral background) so it doesn't pull attention from
 * the actual prompt grid.
 */
export function EmptyHint({ icon: Icon, heading, body }: EmptyHintProps) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-cream/40 px-5 py-6 text-center dark:border-night-border dark:bg-night/40">
      <Icon
        aria-hidden
        className="mx-auto h-6 w-6 text-ink-soft dark:text-paper-muted"
      />
      <p className="mt-2 text-sm font-medium text-ink dark:text-paper">{heading}</p>
      <p className="mt-1 text-xs text-ink-muted dark:text-paper-muted">{body}</p>
    </div>
  );
}
