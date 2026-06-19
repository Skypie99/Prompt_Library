"use client";

import { CloseIcon, SparkleIcon } from "./icons";

// One-time callout shown on first visit; dismissal is persisted by the caller.
export function OnboardingHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-6 flex animate-fade-in items-center gap-3 rounded-xl border border-desert-200 bg-desert-50 px-4 py-3 dark:border-teal-500/30 dark:bg-teal-500/10">
      <SparkleIcon className="h-5 w-5 shrink-0 text-desert-500" />
      <p className="flex-1 text-sm text-desert-900 dark:text-teal-100">
        Press{" "}
        <kbd className="rounded border border-desert-300 bg-desert-100 px-1.5 py-0.5 font-sans text-[11px] font-medium dark:border-teal-500/40 dark:bg-teal-500/20">
          ⌘K
        </kbd>{" "}
        to search · Add your Claude key in <span className="font-medium">Settings</span> to run a
        prompt and stream Claude&rsquo;s answer inline.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-desert-700 transition hover:bg-desert-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-500 focus-visible:ring-offset-1 focus-visible:ring-offset-desert-50 dark:text-teal-200 dark:hover:bg-teal-500/20 dark:focus-visible:ring-offset-night"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
