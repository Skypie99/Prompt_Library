"use client";

import { CloseIcon } from "./icons";

interface ApiKeyNudgeProps {
  onOpenSettings: () => void;
  onDismiss: () => void;
}

// F-r1 — shown to first-time visitors who haven't added an API key yet.
// Uses role="status" (not "alert") — informational, not interruptive.
export function ApiKeyNudge({ onOpenSettings, onDismiss }: ApiKeyNudgeProps) {
  return (
    <div
      role="status"
      className="border-b border-desert-200 bg-desert-50 px-6 py-3 text-sm text-desert-900 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-100"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <span>
          Add your Anthropic API key to start running prompts.{" "}
          <button
            type="button"
            onClick={onOpenSettings}
            className="font-medium underline underline-offset-2 hover:text-desert-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-500 focus-visible:ring-offset-2 focus-visible:ring-offset-desert-50 dark:hover:text-teal-200 dark:focus-visible:ring-offset-night"
          >
            Open Settings
          </button>
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss this notice"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-desert-700 transition hover:bg-desert-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-500 focus-visible:ring-offset-1 focus-visible:ring-offset-desert-50 dark:text-teal-200 dark:hover:bg-teal-500/20 dark:focus-visible:ring-offset-night"
        >
          <CloseIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
