"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { Prompt } from "@/lib/types";
import { ClaudeError, streamClaude, type TokenUsage } from "@/lib/anthropic";
import { modelLabel, MODELS, type Settings } from "@/lib/settings";
import { appendRun, generateRunId, loadRuns, type StoredRun } from "@/lib/runs";
import {
  clearValues,
  loadValues,
  saveValues,
  loadPromptModel,
  savePromptModel,
} from "@/lib/library";
import { countFilled, extractVariables, parseBody, substituteBody } from "@/lib/variables";
import { isTypingTarget, prefersReducedMotion } from "@/lib/dom";
import { Sheet } from "./ui/Sheet";
import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { Markdown } from "./Markdown";
import { RunHistory } from "./RunHistory";
import {
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  CopyIcon,
  DuplicateIcon,
  PencilIcon,
  StarIcon,
  TrashIcon,
  WandIcon,
} from "./icons";

interface PromptDetailProps {
  /** When null the modal is closed. */
  prompt: Prompt | null;
  settings: Settings;
  isFavorite: boolean;
  onClose: () => void;
  /** Open Settings, optionally with an inline notice (e.g. missing key). */
  onOpenSettings: (notice?: string) => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  /** Seed prompts get this explicit "make your own version" affordance.
   *  Implementation-wise it's just a Duplicate with a different title
   *  suffix and label, but for beginners the explicit "Customize" verb
   *  is the difference between "I see what this does" and "...what does
   *  Duplicate mean?". */
  onCustomize?: () => void;
  onDelete: () => void;
  /** Clicking a tag in the header sets it as the active filter on the
   *  home grid and closes the detail modal. Optional so PromptDetail can
   *  still be rendered without a tag-filter consumer. */
  onSelectTag?: (tag: string) => void;
  /** F-fast-2 — fires after every run termination (completed / aborted /
   *  errored) so the parent can refresh per-prompt run counts shown on
   *  PromptCards. Optional. */
  onRunCompleted?: () => void;
}

// Small square icon button used in the detail header action row.
function HeaderButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface transition hover:border-teal-300 hover:text-teal-700 dark:border-night-border dark:bg-night dark:hover:text-teal-300 " +
        (active ? "text-teal-500" : "text-ink-muted dark:text-paper-muted")
      }
    >
      {children}
    </button>
  );
}

// Copy with a graceful fallback for older / non-secure contexts. localhost and
// https are secure, so the modern API is used in practice.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// F-usage — format a token count with thousands separators.
// Uses Intl.NumberFormat ("en") with a fallback for unusual environments.
function formatTokens(n: number): string {
  try {
    return n.toLocaleString("en");
  } catch {
    return String(n);
  }
}

export function PromptDetail({
  prompt,
  settings,
  isFavorite,
  onClose,
  onOpenSettings,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onCustomize,
  onDelete,
  onSelectTag,
  onRunCompleted,
}: PromptDetailProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  // F-fast-4 — separate confirm flash for the "Copy template" link so the
  // two copy actions don't share a single toast.
  const [templateCopied, setTemplateCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // F3b — per-prompt model selection. Initialised from localStorage on prompt
  // open; falls back to the global settings model if nothing is stored.
  const [selectedModel, setSelectedModel] = useState<string>(settings.model);

  // Run state
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<ClaudeError | null>(null);
  const [responseCopied, setResponseCopied] = useState(false);
  // F-r2 — countdown seconds remaining until "Retry" is enabled after a
  // rate-limit error. null when no countdown is active.
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  // F3c — true when user clicked Run with unfilled variables; shows inline
  // warning. Cleared on prompt change, dismiss, or when the user proceeds.
  const [showUnfilledWarning, setShowUnfilledWarning] = useState(false);
  // F3d — true when the response panel is expanded past max-h-72.
  const [responseExpanded, setResponseExpanded] = useState(false);

  // History state — hydrated from localStorage when a prompt opens.
  const [runs, setRuns] = useState<StoredRun[]>([]);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // F-r2 — interval that ticks the rate-limit countdown; cleared on unmount,
  // dismiss, or when the countdown reaches zero.
  const retryCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // F-eve-4 — used to scroll the response panel into view when "Run again"
  // is triggered from the history panel below it; otherwise the user stays
  // looking at History and doesn't see the new stream above.
  const responsePanelRef = useRef<HTMLDivElement>(null);
  // F-usage — captured token counts from the API for the current/last run.
  // null until a completed run reports usage via onUsage callback.
  const [currentTokensUsed, setCurrentTokensUsed] = useState<{
    input: number;
    output: number;
  } | null>(null);
  // Ref so onUsage callback can write the value without triggering a re-render
  // mid-stream; the state is set once at run completion alongside appendRun.
  const pendingUsageRef = useRef<TokenUsage | null>(null);

  const variables = useMemo(() => (prompt ? extractVariables(prompt) : []), [prompt]);
  const segments = useMemo(() => (prompt ? parseBody(prompt.body) : []), [prompt]);

  // Reset everything whenever a different prompt opens; abort any in-flight run;
  // hydrate persisted variable values + run history; then focus the first field.
  // Resetting state here is intentional: it responds to the user navigating
  // to a different prompt, not to a reactive side-effect loop.
  useEffect(() => {
    abortRef.current?.abort();
    // F-r2 — clear any active rate-limit countdown.
    if (retryCountdownRef.current) {
      clearInterval(retryCountdownRef.current);
      retryCountdownRef.current = null;
    }
    setValues(prompt ? loadValues(prompt.id) : {});
    setCopied(false);
    setConfirmingDelete(false);
    setRunning(false);
    setResponse("");
    setError(null);
    setRetryCountdown(null);
    setShowUnfilledWarning(false);
    setResponseExpanded(false);
    setRuns(prompt ? loadRuns(prompt.id) : []);
    setCurrentTokensUsed(null);
    pendingUsageRef.current = null;
    // F3b — restore the per-prompt model, falling back to the global default.
    if (prompt) {
      const saved = loadPromptModel(prompt.id);
      const validSaved = saved && MODELS.some((m) => m.id === saved) ? saved : null;
      setSelectedModel(validSaved ?? settings.model);
    } else {
      setSelectedModel(settings.model);
    }
    if (prompt) {
      requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
      });
    }
  }, [prompt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tidy up timers and any running stream on unmount.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (templateCopyTimer.current) clearTimeout(templateCopyTimer.current);
      if (responseCopyTimer.current) clearTimeout(responseCopyTimer.current);
      // F-r2 — clear countdown interval to avoid a state update after unmount.
      if (retryCountdownRef.current) clearInterval(retryCountdownRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // Called from the history panel — drop a past run's values straight into
  // the live form. Does NOT auto-run; user decides whether to re-run.
  // Persists too — restored values become the new in-flight draft, so the
  // next reopen sees them (matches the user's mental model: "I picked this
  // run; these are my values now").
  // NOTE: must be declared before the `if (!prompt) return null` early-exit
  // so that hooks are called unconditionally on every render (rules-of-hooks).
  const handleRestoreInputs = useCallback(
    (restored: Record<string, string>) => {
      const next = { ...restored };
      setValues(next);
      if (prompt) saveValues(prompt.id, next);
      // Move focus back to the variable area so the user can see what changed.
      requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
      });
    },
    [prompt],
  );

  if (!prompt) return null;

  const filledCount = countFilled(variables, values);
  const hasValues = filledCount > 0;
  const finalText = substituteBody(prompt.body, values);
  const showResponsePanel = running || response.length > 0 || error !== null;
  // F-fast-1 — token estimate computed once per render so the value the
  // visible text shows and the value the aria-label announces can't drift
  // and so Math.ceil isn't called twice on every keystroke into a variable.
  const tokenEstimate = Math.max(1, Math.ceil(finalText.length / 4));

  function setValue(name: string, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      // Persist immediately so closing the modal mid-edit never loses input.
      // Values are tiny; no debounce needed.
      if (prompt) saveValues(prompt.id, next);
      return next;
    });
  }

  async function handleCopy() {
    const ok = await copyToClipboard(finalText);
    if (!ok) return;
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  // F-fast-4 — copy the RAW body (still containing {{tokens}}) so the user
  // can paste the unfilled template elsewhere (a doc, another tool, a
  // colleague) without having to retype it. Independent confirm flash so
  // the two copy actions don't fight over the same toast.
  async function handleCopyTemplate() {
    if (!prompt) return;
    const ok = await copyToClipboard(prompt.body);
    if (!ok) return;
    setTemplateCopied(true);
    if (templateCopyTimer.current) clearTimeout(templateCopyTimer.current);
    templateCopyTimer.current = setTimeout(() => setTemplateCopied(false), 1500);
  }

  async function handleCopyResponse() {
    const ok = await copyToClipboard(response);
    if (!ok) return;
    setResponseCopied(true);
    if (responseCopyTimer.current) clearTimeout(responseCopyTimer.current);
    responseCopyTimer.current = setTimeout(() => setResponseCopied(false), 1500);
  }

  // Core run logic, parameterized on the values to use. Extracted so that
  // "Run again" from the history panel (F-eve-4) can call the run with a
  // restored values set without waiting for the React re-render that would
  // otherwise leave handleRun's closure on stale state.
  async function runWithValues(valuesToUse: Record<string, string>) {
    // No key yet → send the user to Settings with a helpful nudge.
    if (!settings.apiKey) {
      onOpenSettings("Add your Anthropic API key to run prompts live.");
      return;
    }
    if (!prompt) return;

    setError(null);
    // F-r2 — clear any stale rate-limit countdown when a new run starts.
    if (retryCountdownRef.current) {
      clearInterval(retryCountdownRef.current);
      retryCountdownRef.current = null;
    }
    setRetryCountdown(null);
    setResponse("");
    setCurrentTokensUsed(null);
    pendingUsageRef.current = null;
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Capture-the-moment so the persisted run reflects what was sent even if
    // the user edits values mid-stream (they shouldn't, but the cost of being
    // defensive is one local const).
    // finalText computed FROM valuesToUse — not the stale closure value —
    // so callers can pass a different set (e.g. from history) and have the
    // sent prompt match.
    const sentPrompt = substituteBody(prompt.body, valuesToUse);
    // F3b — use the per-prompt model switcher value (selectedModel), not the
    // global settings model. selectedModel is always in sync with the <select>
    // so ⌘↵ runs with whatever is currently chosen.
    const sentModel = selectedModel;
    const sentValues = { ...valuesToUse };

    // Buffer chunks here so we can persist the partial even if the component
    // unmounts before our finally runs (e.g. user closes the modal).
    let buffered = "";
    let status: StoredRun["status"] = "completed";
    let errorMessage: string | undefined;

    try {
      await streamClaude({
        apiKey: settings.apiKey,
        model: sentModel,
        maxTokens: settings.maxTokens,
        prompt: sentPrompt,
        signal: controller.signal,
        onText: (chunk) => {
          buffered += chunk;
          setResponse((prev) => prev + chunk);
        },
        onUsage: (usage) => {
          // Capture in a ref — no re-render needed mid-stream.
          pendingUsageRef.current = usage;
        },
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        // User pressed Stop — keep whatever streamed in, show no error.
        status = "aborted";
      } else if (err instanceof ClaudeError) {
        setError(err);
        status = "errored";
        errorMessage = err.message;
        // F-r2 — start a countdown when the Anthropic API told us how long to
        // wait. Clear any stale interval first (defensive; shouldn't overlap).
        if (err.kind === "rate-limit" && err.retryAfterSeconds !== undefined) {
          if (retryCountdownRef.current) clearInterval(retryCountdownRef.current);
          let remaining = err.retryAfterSeconds;
          setRetryCountdown(remaining);
          retryCountdownRef.current = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
              clearInterval(retryCountdownRef.current!);
              retryCountdownRef.current = null;
              setRetryCountdown(null);
            } else {
              setRetryCountdown(remaining);
            }
          }, 1000);
        }
      } else {
        const fallback = new ClaudeError(
          "unknown",
          "Something unexpected happened. Please try again.",
        );
        setError(fallback);
        status = "errored";
        errorMessage = fallback.message;
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
      // Persist regardless of outcome — completed, aborted, and errored runs
      // are all useful in history (the errored ones tell you what went wrong
      // and let you re-run the same inputs once the cause is fixed).
      // Capture usage from the ref (set by onUsage callback) and write
      // to state so the response panel header can display it.
      const capturedUsage = pendingUsageRef.current as TokenUsage | null;
      const tokensUsed =
        capturedUsage !== null
          ? { input: capturedUsage.inputTokens, output: capturedUsage.outputTokens }
          : undefined;
      if (tokensUsed) setCurrentTokensUsed(tokensUsed);

      const entry: StoredRun = {
        id: generateRunId(),
        ranAt: new Date().toISOString(),
        model: sentModel,
        values: sentValues,
        sentPrompt,
        response: buffered,
        status,
        ...(errorMessage ? { errorMessage } : {}),
        ...(tokensUsed ? { tokensUsed } : {}),
      };
      const nextRuns = appendRun(prompt.id, entry);
      setRuns(nextRuns);
      // F-fast-2 — let the grid refresh its "Run N×" badge for this prompt.
      onRunCompleted?.();
    }
  }

  // Public wrapper for the button binding — uses current state.
  // F3c: if any variables are unfilled, gate on a soft warning first.
  // The ⌘↵ shortcut bypasses this (power-user path via handleModalKeyDown).
  function handleRun() {
    if (variables.length > 0 && filledCount < variables.length) {
      setShowUnfilledWarning(true);
      return;
    }
    void runWithValues(values);
  }

  // F-eve-4 — "Run again" from history: restore values into the form AND
  // immediately trigger the run with those exact values (no waiting on
  // React state to flush). Persists too, like handleRestoreInputs, so the
  // restored set IS the new draft. Then scroll the response panel into
  // view — the trigger was inside History (below the response), so without
  // a scroll the user wouldn't see the new stream.
  // Not memoized: runWithValues closes over per-render state (settings,
  // prompt, etc.) and we want each invocation to use the latest values.
  function handleRunAgain(restored: Record<string, string>) {
    const next = { ...restored };
    setValues(next);
    if (prompt) saveValues(prompt.id, next);
    void runWithValues(next);
    // Defer the scroll until the response panel has rendered (it's gated
    // on `showResponsePanel`, which becomes true the moment setRunning(true)
    // commits inside runWithValues).
    requestAnimationFrame(() => {
      responsePanelRef.current?.scrollIntoView({
        // Honor reduced-motion for this JS-driven scroll — the CSS
        // scroll-behavior override in globals.css can't reach the `behavior`
        // option passed here, so a reduced-motion user would otherwise still
        // get an animated scroll the rest of the app promised them it wouldn't.
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  // F-r2 — retry after a rate-limit error. Clears the countdown interval,
  // dismisses the error, and re-invokes the run with the same variable values
  // (no form re-fill, no lost state). Only callable when no countdown is active
  // (or when the user clicks "Retry now" to override regardless).
  function handleRetry() {
    if (retryCountdownRef.current) {
      clearInterval(retryCountdownRef.current);
      retryCountdownRef.current = null;
    }
    setRetryCountdown(null);
    setError(null);
    void runWithValues(values);
  }

  function handleModalKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      // F3c — ⌘↵ is the power-user bypass path: skip the unfilled variable
      // warning and run immediately with whatever values are present.
      if (!running) void runWithValues(values);
      return;
    }
    // F-night-7 — "s" toggles favorite on the active prompt. Only when
    // NOT typing in a field, so writing "stuff" into a variable doesn't
    // accidentally star/unstar the prompt.
    if (event.key === "s" && !isTypingTarget(event.nativeEvent)) {
      event.preventDefault();
      onToggleFavorite();
    }
  }

  return (
    <Sheet open onClose={onClose} size="xl" ariaLabel={prompt.title || "Prompt details"}>
      <div onKeyDown={handleModalKeyDown} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 dark:border-night-border">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                {prompt.category}
              </span>
              {prompt.tags.map((tag) =>
                onSelectTag ? (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onSelectTag(tag)}
                    aria-label={`Filter by #${tag}`}
                    className="inline-flex min-h-[24px] items-center rounded-md bg-cream px-2 py-0.5 text-xs text-ink-muted transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-night dark:text-paper-muted dark:hover:bg-teal-500/15 dark:hover:text-teal-300"
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
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink dark:text-paper">
              {prompt.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted dark:text-paper-muted">
              {prompt.description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <HeaderButton
              label={isFavorite ? "Remove from favorites (s)" : "Add to favorites (s)"}
              active={isFavorite}
              onClick={onToggleFavorite}
            >
              <StarIcon
                filled={isFavorite}
                className={clsx("h-[18px] w-[18px]", isFavorite && "animate-pop")}
              />
            </HeaderButton>
            {prompt.isSeed ? (
              // Seeds get the explicit "Customize" affordance instead of
              // the generic Duplicate — the verb tells a first-time user
              // exactly what's about to happen (open a pre-filled form to
              // save as your own custom prompt). Falls back to onDuplicate
              // if no customize handler is wired (defensive — keeps the
              // header usable in any composition).
              <HeaderButton
                label="Customize — save as your own"
                onClick={onCustomize ?? onDuplicate}
              >
                <WandIcon className="h-[18px] w-[18px]" />
              </HeaderButton>
            ) : (
              <HeaderButton label="Duplicate" onClick={onDuplicate}>
                <DuplicateIcon className="h-[18px] w-[18px]" />
              </HeaderButton>
            )}
            {!prompt.isSeed && (
              <HeaderButton label="Edit" onClick={onEdit}>
                <PencilIcon className="h-[18px] w-[18px]" />
              </HeaderButton>
            )}
            {!prompt.isSeed && (
              <HeaderButton label="Delete" onClick={() => setConfirmingDelete(true)}>
                <TrashIcon className="h-[18px] w-[18px]" />
              </HeaderButton>
            )}
            <HeaderButton label="Close" onClick={onClose}>
              <CloseIcon className="h-[18px] w-[18px]" />
            </HeaderButton>
          </div>
        </div>

        {/* Inline delete confirmation */}
        {confirmingDelete && (
          <div className="flex items-center justify-between gap-3 border-b border-danger-200 bg-danger-50 px-6 py-3 dark:border-danger-300/30 dark:bg-danger-300/5">
            <span className="text-sm text-danger-900 dark:text-danger-300">
              Delete this prompt? This can&apos;t be undone.
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md border border-danger-700 px-3 py-1.5 text-sm font-medium text-danger-700 transition hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-600 dark:border-danger-300/40 dark:text-danger-300 dark:hover:bg-danger-300/20"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="rounded-md bg-danger-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-danger-700 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Split body */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          {/* Left: live preview of the final prompt */}
          <div className="scrollbar-soft overflow-y-auto border-b border-border p-6 md:border-b-0 md:border-r dark:border-night-border">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-soft">
              Preview
            </div>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink dark:text-paper">
              {segments.map((segment, index) => {
                if (segment.type === "text") {
                  return <span key={index}>{segment.value}</span>;
                }
                const value = values[segment.name];
                const isFilled = value !== undefined && value.trim() !== "";
                return isFilled ? (
                  <span
                    key={index}
                    className="rounded bg-teal-100/70 px-1 text-ink dark:bg-teal-500/20 dark:text-paper"
                  >
                    {value}
                  </span>
                ) : (
                  <span
                    key={index}
                    className="rounded border border-dashed border-teal-300 px-1 text-teal-700 dark:border-teal-500/50 dark:text-teal-300"
                  >
                    {segment.raw}
                  </span>
                );
              })}
            </pre>
          </div>

          {/* Right: variable inputs + actions + response */}
          <div ref={panelRef} className="scrollbar-soft flex flex-col overflow-y-auto p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                Variables
              </span>
              {variables.length > 0 && (
                <span className="flex items-center gap-2 text-xs text-ink-soft">
                  <span>
                    {filledCount}/{variables.length} filled
                  </span>
                  {hasValues && (
                    <button
                      onClick={() => {
                        setValues({});
                        if (prompt) clearValues(prompt.id);
                      }}
                      className="rounded font-medium text-teal-700 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:text-teal-400 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-night"
                    >
                      Clear
                    </button>
                  )}
                </span>
              )}
            </div>

            {variables.length === 0 ? (
              <p className="text-sm text-ink-muted dark:text-paper-muted">
                This prompt has no variables — it&apos;s ready to copy or run as-is.
              </p>
            ) : (
              <div className="space-y-3">
                {variables.map((variable) => (
                  <div key={variable.name}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <label
                        htmlFor={`var-${variable.name}`}
                        className="block text-sm font-medium text-ink dark:text-paper"
                      >
                        {variable.label}
                      </label>
                      {/* F-n2-14 — "Use last" chip: if the most recent
                          run had a value for this variable, offer it as
                          one-click fill. Hidden when current value already
                          matches or when there's no history. */}
                      {(() => {
                        const lastRun = runs[0];
                        const lastValue = lastRun?.values[variable.name];
                        const currentValue = values[variable.name] ?? "";
                        if (!lastValue || lastValue === currentValue) return null;
                        const display =
                          lastValue.length > 30 ? `${lastValue.slice(0, 30)}…` : lastValue;
                        return (
                          <button
                            type="button"
                            onClick={() => setValue(variable.name, lastValue)}
                            aria-label={`Use last value for ${variable.label}: ${lastValue}`}
                            title={lastValue}
                            className="shrink-0 rounded bg-cream px-1.5 py-0.5 text-2xs text-ink-muted transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-night dark:text-paper-muted dark:hover:bg-teal-500/15 dark:hover:text-teal-300"
                          >
                            Use last: <span className="font-mono">{display}</span>
                          </button>
                        );
                      })()}
                    </div>
                    {variable.multiline ? (
                      // F-night-5 — multiline inputs auto-grow with content
                      // up to ~480px (then the textarea takes over scroll).
                      // Manual resize handle still works.
                      <AutoGrowTextarea
                        id={`var-${variable.name}`}
                        value={values[variable.name] ?? ""}
                        onChange={(event) => setValue(variable.name, event.target.value)}
                        placeholder={variable.placeholder}
                        minRows={5}
                        maxHeightPx={480}
                        className="w-full resize-y rounded-md border border-border bg-cream/50 px-3 py-2 font-mono text-xs leading-relaxed text-ink outline-none transition placeholder:text-ink-soft focus:border-teal-400 focus:ring-2 focus:ring-teal-500 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-teal-400/60"
                      />
                    ) : (
                      // F-n2-4 — single-line input with an inline × clear
                      // button that appears once there's a value. Saves a
                      // triple-click + delete for users iterating on a
                      // value.
                      <div className="relative">
                        <input
                          id={`var-${variable.name}`}
                          value={values[variable.name] ?? ""}
                          onChange={(event) => setValue(variable.name, event.target.value)}
                          placeholder={variable.placeholder}
                          className={clsx(
                            "w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-teal-400 focus:ring-2 focus:ring-teal-500 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-teal-400/60",
                            (values[variable.name] ?? "") !== "" && "pr-8",
                          )}
                        />
                        {(values[variable.name] ?? "") !== "" && (
                          <button
                            type="button"
                            onClick={() => setValue(variable.name, "")}
                            aria-label={`Clear ${variable.label}`}
                            tabIndex={-1}
                            className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-ink-soft transition hover:bg-cream hover:text-ink dark:hover:bg-night-border dark:hover:text-paper"
                          >
                            <span aria-hidden className="text-base leading-none">
                              ×
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCopy}
                aria-label={copied ? "Filled prompt copied" : "Copy filled prompt"}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95",
                  copied
                    ? "border-teal-500 bg-teal-500 text-night"
                    : "border-border text-ink hover:border-teal-300 hover:text-teal-700 dark:border-night-border dark:text-paper dark:hover:text-teal-300",
                )}
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4" />
                    Copy filled
                  </>
                )}
              </button>

              {running ? (
                <button
                  onClick={handleStop}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition active:scale-95 dark:border-night-border dark:text-paper"
                >
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-300 border-t-teal-600" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleRun}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-night transition-all duration-150 hover:bg-teal-600 active:scale-95"
                >
                  Run with Claude
                </button>
              )}
            </div>

            {/* F3c — Unfilled variable soft warning. Shown only when the user
                clicked Run with at least one variable still empty. Non-blocking:
                "Fill it" focuses the first empty field; "Run anyway" proceeds.
                Dismissed automatically when the prompt changes or run starts. */}
            {showUnfilledWarning && (
              <div
                role="alert"
                className="mt-3 flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <span>
                  {variables.length - filledCount === 1
                    ? "1 variable is empty — run anyway?"
                    : `${variables.length - filledCount} variables are empty — run anyway?`}
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    aria-label="Fill empty variables"
                    onClick={() => {
                      setShowUnfilledWarning(false);
                      const firstEmpty = variables.find(
                        (v) => (values[v.name] ?? "").trim() === "",
                      );
                      if (firstEmpty) {
                        requestAnimationFrame(() => {
                          try {
                            panelRef.current
                              ?.querySelector<HTMLElement>(`#var-${firstEmpty.name}`)
                              ?.focus();
                          } catch {
                            panelRef.current
                              ?.querySelector<HTMLElement>("input, textarea")
                              ?.focus();
                          }
                        });
                      }
                    }}
                    className="font-medium underline underline-offset-2"
                  >
                    Fill it
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUnfilledWarning(false);
                      responsePanelRef.current?.focus();
                      void runWithValues(values);
                    }}
                    className="font-medium underline underline-offset-2"
                  >
                    Run anyway
                  </button>
                </div>
              </div>
            )}

            {/* F-fast-1 — at-a-glance size estimate of what we're about to send.
                Token count is a rough rule-of-thumb (≈4 chars/token for English)
                so callers see SHAPE not certainty; labelled "~" so nobody mistakes
                it for the exact billable count from the API. */}
            <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1 text-center text-xs text-ink-soft dark:text-paper-muted">
              <span
                aria-label={`Estimated length: ${finalText.length.toLocaleString()} characters, about ${tokenEstimate.toLocaleString()} tokens`}
              >
                ~{finalText.length.toLocaleString()} chars · ~{tokenEstimate.toLocaleString()}{" "}
                tokens
              </span>
              <span className="text-ink-soft/60">·</span>
              {/* F3b — inline per-prompt model switcher. Native <select> so
                  it doesn't intercept ⌘+Enter — the panel-level keydown handler
                  fires first and runs with whatever selectedModel is set to. */}
              <select
                aria-label="Model for this run"
                value={selectedModel}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedModel(next);
                  if (prompt) savePromptModel(prompt.id, next);
                }}
                className="min-h-[1.5rem] rounded border border-transparent bg-transparent px-0.5 py-px font-sans text-xs text-ink-soft transition hover:border-border focus-visible:border-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-paper-muted dark:hover:border-night-border dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-1 dark:focus-visible:ring-offset-night"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="text-ink-soft/60">·</span>
              <kbd className="font-sans">⌘↵</kbd> to run
            </p>

            {/* F-fast-4 — secondary "copy the unfilled template" affordance.
                Lives below the primary action row so it doesn't compete with
                Copy-filled / Run, but is reachable in one tab and one click. */}
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={handleCopyTemplate}
                aria-label={
                  templateCopied
                    ? "Template copied"
                    : "Copy the prompt template with unfilled variables"
                }
                className="inline-flex items-center justify-center gap-1 rounded text-xs font-medium text-teal-700 transition hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:text-teal-400 dark:focus-visible:ring-offset-night"
              >
                {templateCopied ? (
                  <>
                    <CheckIcon className="h-3.5 w-3.5" />
                    Template copied
                  </>
                ) : (
                  "Copy template (with {{variables}})"
                )}
              </button>
            </div>

            {/* Response / error */}
            {showResponsePanel && (
              <div
                ref={responsePanelRef}
                id="response-panel"
                tabIndex={-1}
                className="mt-5 border-t border-border pt-4 focus:outline-none dark:border-night-border"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                    Response
                  </span>
                  {running && (
                    <span className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-300 border-t-teal-600" />
                      Streaming…
                    </span>
                  )}
                  {!running && response.length > 0 && !error && (
                    <div className="flex items-center gap-3">
                      {/* F3d — expand/collapse toggle for the response panel. */}
                      <button
                        type="button"
                        onClick={() => setResponseExpanded((prev) => !prev)}
                        aria-label={responseExpanded ? "Collapse response" : "Expand response"}
                        aria-expanded={responseExpanded}
                        aria-controls="response-content"
                        title={responseExpanded ? "Collapse response" : "Expand response"}
                        className="flex items-center gap-0.5 text-xs font-medium text-teal-700 hover:text-teal-700 dark:text-teal-400"
                      >
                        <ChevronIcon
                          className={clsx(
                            "h-3.5 w-3.5 transition-transform duration-150",
                            responseExpanded ? "rotate-180" : "",
                          )}
                        />
                        {responseExpanded ? "Collapse" : "Expand"}
                      </button>
                      <button
                        onClick={handleCopyResponse}
                        className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-700 dark:text-teal-400"
                      >
                        {responseCopied ? (
                          <>
                            <CheckIcon className="h-3.5 w-3.5" />
                            Copied
                          </>
                        ) : (
                          "Copy response"
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {/* F-usage-c — token count line. Only shown after a run
                    completes with usage data (not during streaming, not on
                    error or abort). */}
                {!running && !error && currentTokensUsed && (
                  <p
                    className="mb-1 text-xs text-ink-muted dark:text-paper-muted"
                    aria-label={`Token usage: ${formatTokens(currentTokensUsed.input)} input tokens, ${formatTokens(currentTokensUsed.output)} output tokens`}
                  >
                    Tokens: {formatTokens(currentTokensUsed.input)} in ·{" "}
                    {formatTokens(currentTokensUsed.output)} out
                  </p>
                )}

                {error ? (
                  <div className="rounded-md border border-danger-300 bg-danger-50 px-3 py-2.5 text-sm text-danger-800 dark:border-danger-300/40 dark:bg-danger-300/10 dark:text-danger-300">
                    {/* role="alert" on the message only (not the whole container)
                        so a failed run is announced assertively to screen
                        readers, WITHOUT re-announcing every time the live
                        rate-limit countdown below ticks. The error messages
                        themselves name the recovery ("…in Settings"), and the
                        Open Settings / Retry buttons follow in DOM + tab order.
                        Presentation/a11y only — no streaming/key-logic change. */}
                    <p role="alert">{error.message}</p>
                    {error.kind === "auth" && (
                      <button
                        onClick={() => onOpenSettings("Paste a fresh API key and try again.")}
                        className="mt-2 font-medium underline underline-offset-2"
                      >
                        Open Settings
                      </button>
                    )}
                    {/* F-r2 — rate-limit retry. When the API gives us a
                        retry-after value, show a countdown; otherwise just
                        an immediate "Retry now" button. The live region
                        announces the countdown update to screen readers but
                        only when the value changes (aria-live="polite"). We
                        update once per second so SR isn't spammed; the
                        aria-label on the button carries the remaining time. */}
                    {error.kind === "rate-limit" && (
                      <div className="mt-2 flex items-center gap-3">
                        {retryCountdown !== null ? (
                          <>
                            <span
                              aria-live="polite"
                              aria-atomic="true"
                              className="text-xs tabular-nums text-danger-700 dark:text-danger-300"
                            >
                              Retry in {retryCountdown}s
                            </span>
                            <button
                              onClick={handleRetry}
                              disabled={running}
                              aria-label={`Retry — available in ${retryCountdown} seconds`}
                              className="font-medium underline underline-offset-2 opacity-60 disabled:opacity-50"
                            >
                              Retry now
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleRetry}
                            disabled={running}
                            aria-label="Retry"
                            className="font-medium underline underline-offset-2 disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                    {/* F3a — overloaded retry. 503/529 errors are transient;
                        no retry-after header, so just a plain Retry button.
                        Same handleRetry path as rate-limit — clears the error
                        and re-invokes streamClaude with the same values.
                        disabled={running} prevents stacking concurrent requests
                        (Steve hardening 1). */}
                    {error.kind === "overloaded" && (
                      <div className="mt-2">
                        <button
                          onClick={handleRetry}
                          disabled={running}
                          aria-label="Retry"
                          className="font-medium underline underline-offset-2 disabled:opacity-50"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {/* network + unknown are transient and their messages
                        invite a retry ("check your connection and try again" /
                        "Please try again"), but previously offered no button —
                        the user had to re-click Run and risk losing input. Same
                        input-preserving handleRetry path as overloaded.
                        (bad-request is excluded: the request itself is the
                        problem, so a blind retry won't help.) */}
                    {(error.kind === "network" || error.kind === "unknown") && (
                      <div className="mt-2">
                        <button
                          onClick={handleRetry}
                          disabled={running}
                          aria-label="Retry"
                          className="font-medium underline underline-offset-2 disabled:opacity-50"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    id="response-content"
                    aria-live="polite"
                    aria-atomic="false"
                    aria-label="Claude response"
                    className={clsx(
                      "scrollbar-soft overflow-y-auto break-words rounded-md border border-border bg-cream/40 px-3 py-2.5 text-sm leading-relaxed text-ink dark:border-night-border dark:bg-night dark:text-paper",
                      // F3d — collapse to max-h-72 by default; remove cap when expanded.
                      responseExpanded ? "" : "max-h-72",
                    )}
                  >
                    <Markdown source={response} />
                    {running && (
                      <span className="ml-0.5 inline-block animate-pulse font-semibold text-teal-500">
                        ▋
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <RunHistory
              promptId={prompt.id}
              runs={runs}
              onChange={setRuns}
              onRestoreInputs={handleRestoreInputs}
              onRunAgain={running ? undefined : handleRunAgain}
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
