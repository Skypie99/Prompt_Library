"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { clearRuns, formatRelativeTime, removeRun, setRunLabel, type StoredRun } from "@/lib/runs";
import { modelLabel } from "@/lib/settings";
import { Markdown } from "./Markdown";
import {
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  CopyIcon,
  PlayIcon,
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
  /** F-eve-4 — restore THIS run's values AND immediately re-run with them.
   *  Optional: parent passes `undefined` while a run is already in flight
   *  so the button auto-disables. */
  onRunAgain?: (values: Record<string, string>) => void;
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
  // danger-600 (#DC2626) meets ≥4.5:1 on cream (light) and night (dark).
  errored: "bg-danger-600",
};

// F-night-4 — status filter values used by the history-panel dropdown.
type StatusFilter = "all" | StoredRun["status"];

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: "All",
  completed: "Completed",
  aborted: "Stopped",
  errored: "Errored",
};

// F-usage — format a token count with thousands separators.
function formatTokens(n: number): string {
  try {
    return n.toLocaleString("en");
  } catch {
    return String(n);
  }
}

export function RunHistory({
  promptId,
  runs,
  onChange,
  onRestoreInputs,
  onRunAgain,
}: RunHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null);
  // F-night-4 — status filter. Per-prompt-session local state only (not
  // persisted) — power-user feature for triage; resetting it on prompt
  // switch is the right default so opening a different prompt doesn't
  // surprise you with a stale filter.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // F-n2-18 — "Last 24h" toggle. Per-session state; resets on prompt switch.
  const [last24Only, setLast24Only] = useState(false);
  // F-n2-11 — inline-editing state for a single row's label.
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();
  // A11y: live-region announcement for new run entries (SC 4.1.3).
  // Tracks previous run count so we only announce when a new entry arrives,
  // not on initial hydration or on filter/sort changes.
  const [runAnnouncement, setRunAnnouncement] = useState("");
  const prevRunCountRef = useRef(runs.length);

  // Announce a newly-completed run to screen readers (SC 4.1.3).
  // Fires only when run count grows (new entry prepended), not on deletion,
  // filter toggle, or initial render. The first run has status at index 0.
  useEffect(() => {
    const prev = prevRunCountRef.current;
    prevRunCountRef.current = runs.length;
    if (runs.length > prev && runs[0]) {
      const newest = runs[0];
      const label = STATUS_LABEL[newest.status];
      setRunAnnouncement(`Run ${label.toLowerCase()}.`);
    }
  }, [runs]);

  // Tick relative times only while the panel is open — saves render churn
  // when the history exists but the user hasn't expanded it.
  const now = useNowEvery(30_000, expanded);

  // Cleanup any pending "Copied" timer on unmount or prompt switch.
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  // If the active prompt or its history changes, drop transient row state.
  // Resetting state here is intentional — it responds to a prop change (promptId)
  // that represents a user navigation action, not a reactive side-effect loop.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenRunId(null);
    setConfirmingClear(false);
    setCopiedRunId(null);
    setStatusFilter("all");
    setLast24Only(false);
    setEditingLabelId(null);
  }, [promptId]);

  function startEditingLabel(run: StoredRun) {
    setEditingLabelId(run.id);
    setLabelDraft(run.label ?? "");
  }
  function commitLabel() {
    if (editingLabelId === null) return;
    const next = setRunLabel(promptId, editingLabelId, labelDraft);
    onChange(next);
    setEditingLabelId(null);
  }

  const handleDeleteOne = useCallback(
    (runId: string) => {
      const next = removeRun(promptId, runId);
      onChange(next);
      if (openRunId === runId) setOpenRunId(null);
    },
    [onChange, openRunId, promptId]
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

  // F-night-4 + F-n2-18 — apply status AND "last 24h" filters before
  // relative-time decoration so the 30s tick doesn't format hidden entries.
  // Use now.getTime() (from the stable useNowEvery tick) instead of Date.now()
  // to keep the memo pure (Date.now() is impure — result varies per render).
  const filteredRuns = useMemo(() => {
    const cutoff = last24Only ? now.getTime() - 24 * 60 * 60 * 1000 : null;
    return runs.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (cutoff !== null) {
        const t = new Date(r.ranAt).getTime();
        if (!Number.isFinite(t) || t < cutoff) return false;
      }
      return true;
    });
  }, [runs, statusFilter, last24Only, now]);

  // Memoize one parsed Date per entry so we're not parsing on every tick.
  const entries = useMemo(
    () =>
      filteredRuns.map((run) => ({
        run,
        relative: formatRelativeTime(run.ranAt, now),
      })),
    [filteredRuns, now]
  );

  // Header label reflects total, not filtered, count — the filter is a
  // local triage tool, not a fact about how much history exists.
  const headerLabel = `History · ${runs.length}`;

  // Empty history → render only the live-region sentinel (invisible), so SR
  // can still announce the first completed run. The visible UI stays absent.
  if (runs.length === 0) {
    return (
      <span
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {runAnnouncement}
      </span>
    );
  }

  return (
    <>
      {/* Screen-reader live region: announces newly-completed runs (SC 4.1.3). */}
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {runAnnouncement}
      </span>
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
          className="group flex items-center gap-1.5 rounded text-xs font-medium uppercase tracking-wider text-ink-soft transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:hover:text-paper dark:focus-visible:ring-offset-night"
        >
          <ClockIcon className="h-3.5 w-3.5" />
          <span>{headerLabel}</span>
          <ChevronIcon
            className={clsx(
              "h-3.5 w-3.5 transition-transform",
              expanded ? "rotate-180" : "rotate-0"
            )}
          />
        </button>

        {expanded && !confirmingClear && (
          <div className="flex items-center gap-2">
            {/* F-night-4 — status filter. */}
            <div className="flex items-center gap-1 text-xs text-ink-soft dark:text-paper-muted">
              <span aria-hidden>Show:</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                aria-label="Filter history by status"
                className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-ink transition hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night dark:text-paper dark:focus-visible:ring-offset-night"
              >
                {(Object.keys(STATUS_FILTER_LABELS) as StatusFilter[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_FILTER_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            {/* F-n2-18 — "Last 24h" toggle. Compact aria-pressed button. */}
            <button
              type="button"
              onClick={() => setLast24Only((v) => !v)}
              aria-pressed={last24Only}
              className={clsx(
                "rounded-md border px-1.5 py-0.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                last24Only
                  ? "border-teal-500 bg-teal-500 text-white"
                  : "border-border bg-surface text-ink-muted hover:border-teal-300 hover:text-teal-600 dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-teal-300"
              )}
            >
              Last 24h
            </button>
            {/* F-n2-12 — export this prompt's run history as JSON.
                Independent of the library-wide export — useful for sharing
                "look at how this prompt evolved" with someone. */}
            <button
              type="button"
              onClick={() => {
                const json = JSON.stringify(
                  { version: 1, exportedAt: new Date().toISOString(), promptId, runs },
                  null,
                  2
                );
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `prompt-history-${promptId}-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
              className="text-xs font-medium text-teal-600 transition hover:text-teal-700 dark:text-teal-400"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="text-xs font-medium text-teal-600 transition hover:text-teal-700 dark:text-teal-400"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <p className="mb-3 text-xs text-ink-muted dark:text-paper-muted">
          Stored only in this browser.
        </p>
      )}

      {expanded && confirmingClear && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 dark:border-danger-300/30 dark:bg-danger-300/5">
          <span className="text-xs text-danger-900 dark:text-danger-300">
            Delete all {runs.length} {runs.length === 1 ? "entry" : "entries"} for this prompt?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="rounded-md border border-danger-700 px-2 py-1 text-xs font-medium text-danger-700 transition hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600 dark:border-danger-300/40 dark:text-danger-300 dark:hover:bg-danger-300/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-md bg-danger-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-danger-700 active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {expanded && entries.length === 0 && (
        <p
          id={listId}
          role="status"
          className="rounded-md border border-dashed border-border bg-cream/30 px-3 py-3 text-center text-xs text-ink-muted dark:border-night-border dark:bg-night/40 dark:text-paper-muted"
        >
          No {STATUS_FILTER_LABELS[statusFilter].toLowerCase()} runs in history.
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className="ml-2 font-medium text-teal-600 underline-offset-2 hover:underline dark:text-teal-400"
          >
            Show all
          </button>
        </p>
      )}

      {expanded && entries.length > 0 && (
        <ul
          id={listId}
          aria-label="Past runs"
          className="divide-y divide-border rounded-md border border-border bg-cream/30 dark:divide-night-border dark:border-night-border dark:bg-night/40"
        >
          {entries.map(({ run, relative }) => {
            const isOpen = openRunId === run.id;
            const isCopied = copiedRunId === run.id;
            return (
              <li key={run.id} className="group/row px-3 py-2.5">
                <div className="flex items-start gap-2">
                  {/* Status indicator: dot for completed/aborted, × for errored.
                      Shape + color so colorblind sighted users are not relying
                      on color alone (SC 1.4.1). aria-hidden because the sr-only
                      span below carries the text label. */}
                  {run.status === "errored" ? (
                    <span
                      aria-hidden
                      className="mt-0.5 inline-block shrink-0 text-[11px] font-bold leading-none text-danger-600"
                    >
                      ✕
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className={clsx(
                        "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
                        STATUS_DOT_CLASS[run.status]
                      )}
                    />
                  )}
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
                        {/* F-n2-11 — inline label edit. Click the label
                            (or "+ label" placeholder) to edit; Enter/blur
                            commits, Esc cancels. */}
                        {editingLabelId === run.id ? (
                          <input
                            autoFocus
                            value={labelDraft}
                            onChange={(e) => setLabelDraft(e.target.value)}
                            onBlur={commitLabel}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitLabel();
                              } else if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingLabelId(null);
                              }
                            }}
                            aria-label="Run label"
                            placeholder="e.g. first draft"
                            className="ml-2 inline-block w-32 rounded border border-teal-300 bg-surface px-1 text-xs text-ink outline-none focus:border-teal-400 dark:border-teal-500/40 dark:bg-night dark:text-paper"
                          />
                        ) : run.label ? (
                          <button
                            type="button"
                            onClick={() => startEditingLabel(run)}
                            aria-label={`Edit label "${run.label}"`}
                            className="ml-2 rounded bg-teal-50 px-1.5 py-0.5 text-[11px] text-teal-700 hover:bg-teal-100 dark:bg-teal-500/15 dark:text-teal-300 dark:hover:bg-teal-500/25"
                          >
                            {run.label}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingLabel(run)}
                            aria-label="Add a label to this run"
                            className="ml-2 text-[11px] text-ink-soft underline-offset-2 opacity-0 transition hover:text-teal-600 hover:underline focus:opacity-100 group-hover/row:opacity-100 dark:text-paper-muted dark:hover:text-teal-300"
                          >
                            + label
                          </button>
                        )}
                      </div>
                      {/* F-usage-c — token count for this history entry.
                          Only rendered when tokensUsed is present. */}
                      {run.tokensUsed && (
                        <p
                          className="text-[11px] text-ink-muted dark:text-paper-muted"
                          aria-label={`Token usage: ${formatTokens(run.tokensUsed.input)} input tokens, ${formatTokens(run.tokensUsed.output)} output tokens`}
                        >
                          {formatTokens(run.tokensUsed.input)} in · {formatTokens(run.tokensUsed.output)} out
                        </p>
                      )}
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onRestoreInputs(run.values)}
                          aria-label="Restore inputs from this run"
                          title="Restore inputs"
                          className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition hover:border-teal-300 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
                        >
                          <RotateCcwIcon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Restore</span>
                        </button>
                        {/* F-eve-4 — Restore + Run in one click. Hidden
                            when onRunAgain isn't provided (e.g. another
                            run is already in flight). */}
                        {onRunAgain && (
                          <button
                            type="button"
                            onClick={() => onRunAgain(run.values)}
                            aria-label="Restore these inputs and run again"
                            title="Run again with these inputs"
                            className="flex items-center gap-1 rounded-md border border-teal-300 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20 dark:focus-visible:ring-offset-night"
                          >
                            <PlayIcon className="h-3 w-3" aria-hidden />
                            <span className="hidden sm:inline">Run again</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyResponse(run)}
                          aria-label={isCopied ? "Response copied" : "Copy this response"}
                          title={isCopied ? "Copied" : "Copy response"}
                          className={clsx(
                            "flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-teal-300 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night",
                            isCopied && "border-teal-500 text-teal-600"
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
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-teal-300 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenRunId(isOpen ? null : run.id)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Hide full response" : "Show full response"}
                          title={isOpen ? "Collapse" : "Show details"}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-teal-300 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
                        >
                          <ChevronIcon
                            className={clsx(
                              "h-3.5 w-3.5 transition-transform",
                              isOpen ? "rotate-180" : "rotate-0"
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
                      <p className="mt-1 truncate text-xs text-danger-700 dark:text-danger-300">
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
                                    {value || <span className="italic text-ink-soft">(empty)</span>}
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
                            <div className="rounded-md border border-danger-300 bg-danger-50 px-2.5 py-2 text-xs text-danger-800 dark:border-danger-300/40 dark:bg-danger-300/10 dark:text-danger-300">
                              {run.errorMessage ?? "Run failed."}
                            </div>
                          ) : run.response ? (
                            <div className="break-words rounded-md border border-border bg-surface px-2.5 py-2 text-xs leading-relaxed text-ink dark:border-night-border dark:bg-night dark:text-paper">
                              <Markdown source={run.response} />
                            </div>
                          ) : (
                            <div className="rounded-md border border-border bg-surface px-2.5 py-2 text-xs italic leading-relaxed text-ink-soft dark:border-night-border dark:bg-night">
                              (no response received)
                            </div>
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
    </>
  );
}
