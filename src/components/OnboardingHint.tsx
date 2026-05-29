"use client";

import { CloseIcon, SparkleIcon } from "./icons";

// One-time callout shown on first visit; dismissal is persisted by the caller.
export function OnboardingHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-6 flex animate-fade-in items-center gap-3 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 dark:border-coral-500/30 dark:bg-coral-500/10">
      <SparkleIcon className="h-5 w-5 shrink-0 text-coral-500" />
      <p className="flex-1 text-sm text-coral-900 dark:text-coral-100">
        Press{" "}
        <kbd className="rounded border border-coral-300 bg-coral-100 px-1.5 py-0.5 font-sans text-[11px] font-medium dark:border-coral-500/40 dark:bg-coral-500/20">
          ⌘K
        </kbd>{" "}
        to search · Add your Claude key in <span className="font-medium">Settings</span> to run
        prompts live.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-coral-700 transition hover:bg-coral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-1 focus-visible:ring-offset-coral-50 dark:text-coral-200 dark:hover:bg-coral-500/20 dark:focus-visible:ring-offset-night"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
