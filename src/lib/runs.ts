// Per-prompt run history. Each prompt id maps to an array of past runs
// (newest first, capped at RUNS_PER_PROMPT_CAP), persisted to localStorage
// under `promptlib:runs:<promptId>`.
//
// The per-prompt key shape (set up in library.ts under PER_PROMPT_PREFIXES)
// means deleting a prompt wipes its history in one removeItem call via
// `purgePromptStorage` — we never have to walk a global blob to clean up.
//
// Writes go through library.ts's `writeJSON` so quota / private-mode failures
// surface to the same top-of-page banner as the rest of the app, rather than
// silently dropping a run.

import { writeJSON } from "./library";

export type RunStatus = "completed" | "aborted" | "errored";

export interface StoredRun {
  /** Local-only id. Used to identify entries for delete / view-details. */
  id: string;
  /** ISO timestamp the run was finalized (success, abort, or error). */
  ranAt: string;
  /** Model id used for the run (e.g. "claude-opus-4-7"). */
  model: string;
  /** Variable values as the user had them at run time. */
  values: Record<string, string>;
  /** The substituted prompt body — what was actually sent to Claude. */
  sentPrompt: string;
  /** Whatever Claude returned. Possibly partial if the user hit Stop. */
  response: string;
  status: RunStatus;
  /** Human-facing error message; populated only when status === "errored". */
  errorMessage?: string;
  /** F-n2-11 — optional user label for the run ("first draft", "with brand voice"). */
  label?: string;
}

export const RUNS_PER_PROMPT_CAP = 10;
// Hard guard against a single runaway response blowing localStorage quota.
// 32k chars ≈ 32KB; ten of these per prompt is still well below typical
// per-origin caps even with dozens of prompts.
export const MAX_RESPONSE_CHARS_PERSISTED = 32_000;

const KEY_PREFIX = "promptlib:runs:";

function key(promptId: string): string {
  return `${KEY_PREFIX}${promptId}`;
}

// ---- shape validation ------------------------------------------------------

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const v of Object.values(value)) {
    if (typeof v !== "string") return false;
  }
  return true;
}

function isStoredRun(value: unknown): value is StoredRun {
  const r = value as Partial<StoredRun> | null;
  if (!r) return false;
  if (typeof r.id !== "string" || r.id.length === 0) return false;
  if (typeof r.ranAt !== "string") return false;
  if (typeof r.model !== "string") return false;
  if (!isStringRecord(r.values)) return false;
  if (typeof r.sentPrompt !== "string") return false;
  if (typeof r.response !== "string") return false;
  if (r.status !== "completed" && r.status !== "aborted" && r.status !== "errored") return false;
  if (r.errorMessage !== undefined && typeof r.errorMessage !== "string") return false;
  return true;
}

// ---- read / write ----------------------------------------------------------

/**
 * Load this prompt's run history. Returns [] for any of:
 *  - SSR (no window)
 *  - missing key
 *  - JSON parse failure
 *  - stored value isn't an array or contains no valid entries
 * Corrupt entries are dropped; valid ones are kept (best-effort recovery).
 */
export function loadRuns(promptId: string): StoredRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(promptId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredRun);
  } catch {
    return [];
  }
}

/**
 * Persist this prompt's run history. Routes through `writeJSON` so quota /
 * private-mode failures surface to the storage write-failure handler in
 * HomeClient (which shows the top-of-page banner). Returning void keeps
 * the caller API simple — callers don't have to plumb the result anywhere
 * because the banner handles user-facing recovery already.
 */
export function saveRuns(promptId: string, runs: StoredRun[]): void {
  writeJSON(key(promptId), runs);
}

/**
 * Append a new run to the front, enforce the cap, persist, and return the
 * new list. The returned list is what the caller should put into state — no
 * need to call loadRuns again.
 */
export function appendRun(promptId: string, run: StoredRun): StoredRun[] {
  // Trim the response to the persistence cap so a runaway response never
  // poisons storage for the whole prompt. The user still SAW the full
  // response in the live UI; we just don't keep more than 32KB on disk.
  const trimmed: StoredRun =
    run.response.length > MAX_RESPONSE_CHARS_PERSISTED
      ? { ...run, response: run.response.slice(0, MAX_RESPONSE_CHARS_PERSISTED) }
      : run;
  const existing = loadRuns(promptId);
  const next = [trimmed, ...existing].slice(0, RUNS_PER_PROMPT_CAP);
  saveRuns(promptId, next);
  return next;
}

/** Remove a single entry by id and return the new list. */
export function removeRun(promptId: string, runId: string): StoredRun[] {
  const next = loadRuns(promptId).filter((r) => r.id !== runId);
  saveRuns(promptId, next);
  return next;
}

/**
 * F-n2-11 — Update a single run's user label. Returns the new list so the
 * caller can put it into state without re-loading from storage. An empty
 * string clears the label.
 */
export function setRunLabel(
  promptId: string,
  runId: string,
  label: string,
): StoredRun[] {
  const next = loadRuns(promptId).map((r) =>
    r.id === runId ? { ...r, label: label.trim() || undefined } : r,
  );
  saveRuns(promptId, next);
  return next;
}

/** Drop the whole history for this prompt. */
export function clearRuns(promptId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key(promptId));
  } catch {
    /* unavailable — no-op. */
  }
}

/**
 * F-n2-13 — companion to loadAllRunCounts: walk every per-prompt runs
 * key once and return a Map of `promptId → ISO of the most recent run`.
 * Returns the empty string for a prompt that has runs but no parseable
 * ranAt (defensive — shouldn't happen but we don't want to crash the
 * grid render). SSR-safe.
 */
export function loadAllLastRunIsos(): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof window === "undefined") return out;
  const prefix = KEY_PREFIX;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) continue;
        // Runs are stored newest-first; the first entry's ranAt is the
        // most recent.
        const first = parsed[0];
        const ranAt = first && typeof first.ranAt === "string" ? first.ranAt : "";
        out.set(key.slice(prefix.length), ranAt);
      } catch {
        // Corrupt entry — skip.
      }
    }
  } catch {
    /* unavailable */
  }
  return out;
}

/**
 * Walk every `promptlib:runs:<id>` key once and return a Map of
 * `promptId → runCount`. Cheaper than calling loadRuns() per prompt
 * when N is large (one localStorage walk vs N JSON.parses), and a
 * single map is a clean prop to pass down the grid for the F-fast-2
 * usage badge. SSR-safe.
 *
 * Caller is responsible for re-reading after a new run lands (we don't
 * try to be reactive — a single re-read on the "run completed" event
 * is simpler than wiring storage events).
 */
export function loadAllRunCounts(): Map<string, number> {
  const out = new Map<string, number>();
  if (typeof window === "undefined") return out;
  const prefix = KEY_PREFIX;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          out.set(key.slice(prefix.length), parsed.length);
        }
      } catch {
        // Corrupt entry — skip; the rest of the readout is still useful.
      }
    }
  } catch {
    /* localStorage unavailable */
  }
  return out;
}

/** Generate a short, collision-safe run id. Not user-facing. */
export function generateRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- presentation helpers --------------------------------------------------

const RELATIVE = typeof Intl !== "undefined" && "RelativeTimeFormat" in Intl
  ? new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  : null;

/**
 * Render a recent ISO timestamp as "just now" / "5 min ago" / "2 hr ago" /
 * "May 23". Updates need to come from the caller (re-render on a timer).
 *
 * Exported so the same formatter is reused by RunHistory and any future
 * "Recent" UI that wants to switch from "10th most-recently-opened" to a
 * timestamp-based display.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diffMs = then.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 45) return "just now";
  if (!RELATIVE) {
    // Fallback path for the unusual environment without Intl.RelativeTimeFormat.
    const mins = Math.round(absSec / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (absSec < 60 * 60) return RELATIVE.format(Math.round(diffSec / 60), "minute");
  if (absSec < 60 * 60 * 24) return RELATIVE.format(Math.round(diffSec / 3600), "hour");
  // For older than a day, show the date — easier to scan than "3 days ago".
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
