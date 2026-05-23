"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  clearRuns,
  formatRelativeTime,
  removeRun,
  type StoredRun,
} from "@/lib/runs";
import { modelLabel } from "@/lib/settings";
import {
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  CopyIcon,
  RotateCcwIcon,
  TrashIcon,
} from "./icons";

interface RunHistoryProps {
  promptId: string;
  runs: StoredRun[];
  /** Called after a row-level mutation (delete/clear) so the parent can
   *  update its in-memory list without reloading from storage. */
  onChange: (next: StoredRun[]) => void;
  /** Hydrate the live variable form with this run's values. Does NOT run. */
  onRestoreInputs: (values: Record<string, string>) => void;
}

// Same "tick on a timer so relative times stay fresh" pattern you'd reach
// for in a chat list. 30s is more than enough granularity for "2 min ago".
function useNowEvery(intervalMs: number, active: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}

const STATUS_LABEL: Record<StoredRun["status"], string> = {
  completed: "Completed",
  aborted: "Stopped",
  errored: "Errored",
};

const STATUS_DOT_CLASS: Record<StoredRun["status"], string> = {
  completed: "bg-emerald-500",
  aborted: "bg-ink-soft dark:bg-paper-muted",
  errored: "bg-coral-600",
};

export function RunHistory({
  promptId,
  runs,
  onChange,
  onRestoreInputs,
}: RunHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();

  // Tick relative times only while the panel is open — saves render churn
  // when the history exists but the user hasn't expanded it.
  const now = useNowEvery(30_000, expanded);

  // Cleanup any pending "Copied" timer on unmount or prompt switch.
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  // If the active prompt or its history changes, drop transient row state.
  useEffect(() => {
    setOpenRunId(null);
    setConfirmingClear(false);
    setCopiedRunId(null);
  }, [promptId]);

  const handleDeleteOne = useCallback(
    (runId: string) => {
      const next = removeRun(promptId, runId);
      onChange(next);
      if (openRunId === runId) setOpenRunId(null);
    },
    [onChange, openRunId, promptId],
  );

  const handleClearAll = useCallback(() => {
    clearRuns(promptId);
    onChange([]);
    setConfirmingClear(false);
    // With 0 entries the parent will pass runs=[] and we return null,
    // so the expand state becomes moot — no need to reset it.
  }, [onChange, promptId]);

  const handleCopyResponse = useCallback(async (run: StoredRun) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(run.response);
      } else {
        const ta = document.createElement("textarea");
        ta.value = run.response;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedRunId(run.id);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedRunId(null), 1500);
    } catch {
      /* If clipboard is blocked, just don't show the toast — nothing else
         meaningful we can do without a heavier UI. */
    }
  }, []);

  // Memoize one parsed Date per entry so we're not parsing on every tick.
  const entries = useMemo(
    () =>
      runs.map((run) => ({
        run,
        relative: formatRelativeTime(run.ranAt, now),
      })),
    [runs, now],
  );

  // Empty history → render nothing. The cue to run is the existing Run button.
  if (runs.length === 0) return null;

  const headerLabel = `History · ${runs.length}`;

  return (
    <section
      aria-label="Run history"
      className="mt-5 border-t border-border pt-4 dark:border-night-border"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="group flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-soft transition hover:text-ink dark:hover:text-paper"
        >
          <ClockIcon className="h-3.5 w-3.5" />
          <span>{headerLabel}</span>
          <ChevronIcon
            className={clsx(
              "h-3.5 w-3.5 transition-transform",
              expanded ? "rotate-180" : "rotate-0",
            )}
          />
        </button>

        {expanded && !confirmingClear && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="text-xs font-medium text-coral-600 transition hover:text-coral-700 dark:text-coral-400"
          >
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <p className="mb-3 text-xs text-ink-soft dark:text-paper-muted">
          Stored only in this browser.
        </p>
      )}

      {expanded && confirmingClear && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-coral-200 bg-coral-50 px-3 py-2 dark:border-coral-500/30 dark:bg-coral-500/10">
          <span className="text-xs text-coral-900 dark:text-coral-100">
            Delete all {runs.length} {runs.length === 1 ? "entry" : "entries"} for this prompt?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="rounded-md border border-coral-300 px-2 py-1 text-xs font-medium text-coral-800 transition hover:bg-coral-100 dark:border-coral-500/40 dark:text-coral-100 dark:hover:bg-coral-500/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-md bg-coral-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-coral-700 active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <ul
          id={listId}
          aria-label="Past runs"
          className="divide-y divide-border rounded-md border border-border bg-cream/30 dark:divide-night-border dark:border-night-border dark:bg-night/40"
        >
          {entries.map(({ run, relative }) => {
            const isOpen = openRunId === run.id;
            const isCopied = copiedRunId === run.id;
            return (
              <li key={run.id} className="px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={clsx(
                      "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
                      STATUS_DOT_CLASS[run.status],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="sr-only">{STATUS_LABEL[run.status]}, </span>
                        <time
                          dateTime={run.ranAt}
                          title={new Date(run.ranAt).toLocaleString()}
                          className="text-xs font-medium text-ink dark:text-paper"
                        >
                          {relative}
                        </time>
                        <span className="text-xs text-ink-soft dark:text-paper-muted">
                          {" · "}
                          {modelLabel(run.model)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onRestoreInputs(run.values)}
                          aria-label="Restore inputs from this run"
                          title="Restore inputs"
                          className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-coral-300"
                        >
                          <RotateCcwIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyResponse(run)}
                          aria-label={isCopied ? "Response copied" : "Copy this response"}
                          title={isCopied ? "Copied" : "Copy response"}
                          className={clsx(
                            "flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-coral-300",
                            isCopied && "border-coral-500 text-coral-600",
                          )}
                        >
                          {isCopied ? (
                            <CheckIcon className="h-3.5 w-3.5" />
                          ) : (
                            <CopyIcon className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOne(run.id)}
                          aria-label="Delete this run"
                          title="Delete this run"
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-coral-300"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenRunId(isOpen ? null : run.id)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Hide full response" : "Show full response"}
                          title={isOpen ? "Collapse" : "Show details"}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-coral-300"
                        >
                          <ChevronIcon
                            className={clsx(
                              "h-3.5 w-3.5 transition-transform",
                              isOpen ? "rotate-180" : "rotate-0",
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Single-line preview when collapsed; full detail when open. */}
                    {!isOpen && run.response && (
                      <p className="mt-1 truncate text-xs text-ink-muted dark:text-paper-muted">
                        {run.response.split("\n")[0]}
                      </p>
                    )}
                    {!isOpen && run.status === "errored" && run.errorMessage && (
                      <p className="mt-1 truncate text-xs text-coral-700 dark:text-coral-300">
                        {run.errorMessage}
                      </p>
                    )}

                    {isOpen && (
                      <div className="mt-2 space-y-3 animate-fade-in">
                        {Object.keys(run.values).length > 0 && (
                          <div>
                            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-ink-soft">
                              Inputs
                            </div>
                            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                              {Object.entries(run.values).map(([name, value]) => (
                                <div key={name} className="contents">
                                  <dt className="font-medium text-ink-muted dark:text-paper-muted">
                                    {name}
                                  </dt>
                                  <dd className="break-words text-ink dark:text-paper">
                                    {value || (
                                      <span className="italic text-ink-soft">(empty)</span>
                                    )}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}

                        <div>
                          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-ink-soft">
                            Response
                          </div>
                          {run.status === "errored" ? (
                            <div className="rounded-md border border-coral-300 bg-coral-50 px-2.5 py-2 text-xs text-coral-800 dark:border-coral-500/40 dark:bg-coral-500/10 dark:text-coral-200">
                              {run.errorMessage ?? "Run failed."}
                            </div>
                          ) : (
                            <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-surface px-2.5 py-2 font-sans text-xs leading-relaxed text-ink dark:border-night-border dark:bg-night dark:text-paper">
                              {run.response || (
                                <span className="italic text-ink-soft">
                                  (no response received)
                                </span>
                              )}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
