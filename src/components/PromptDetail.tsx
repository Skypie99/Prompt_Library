"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { Prompt } from "@/lib/types";
import { ClaudeError, streamClaude } from "@/lib/anthropic";
import { modelLabel, type Settings } from "@/lib/settings";
import {
  appendRun,
  generateRunId,
  loadRuns,
  type StoredRun,
} from "@/lib/runs";
import { clearValues, loadValues, saveValues } from "@/lib/library";
import {
  countFilled,
  extractVariables,
  parseBody,
  substituteBody,
} from "@/lib/variables";
import { Markdown } from "./Markdown";
import { RunHistory } from "./RunHistory";
import {
  CheckIcon,
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
        "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:hover:text-coral-300 " +
        (active ? "text-coral-500" : "text-ink-muted dark:text-paper-muted")
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Run state
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<ClaudeError | null>(null);
  const [responseCopied, setResponseCopied] = useState(false);

  // History state — hydrated from localStorage when a prompt opens.
  const [runs, setRuns] = useState<StoredRun[]>([]);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const variables = useMemo(() => (prompt ? extractVariables(prompt) : []), [prompt]);
  const segments = useMemo(() => (prompt ? parseBody(prompt.body) : []), [prompt]);

  // Reset everything whenever a different prompt opens; abort any in-flight run;
  // hydrate persisted variable values + run history; then focus the first field.
  useEffect(() => {
    abortRef.current?.abort();
    setValues(prompt ? loadValues(prompt.id) : {});
    setCopied(false);
    setConfirmingDelete(false);
    setRunning(false);
    setResponse("");
    setError(null);
    setRuns(prompt ? loadRuns(prompt.id) : []);
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
      if (responseCopyTimer.current) clearTimeout(responseCopyTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  if (!prompt) return null;

  const filledCount = countFilled(variables, values);
  const hasValues = filledCount > 0;
  const finalText = substituteBody(prompt.body, values);
  const showResponsePanel = running || response.length > 0 || error !== null;

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

  async function handleCopyResponse() {
    const ok = await copyToClipboard(response);
    if (!ok) return;
    setResponseCopied(true);
    if (responseCopyTimer.current) clearTimeout(responseCopyTimer.current);
    responseCopyTimer.current = setTimeout(() => setResponseCopied(false), 1500);
  }

  async function handleRun() {
    // No key yet → send the user to Settings with a helpful nudge.
    if (!settings.apiKey) {
      onOpenSettings("Add your Anthropic API key to run prompts live.");
      return;
    }
    if (!prompt) return;

    setError(null);
    setResponse("");
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Capture-the-moment so the persisted run reflects what was sent even if
    // the user edits values mid-stream (they shouldn't, but the cost of being
    // defensive is one local const).
    const sentPrompt = finalText;
    const sentModel = settings.model;
    const sentValues = { ...values };

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
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        // User pressed Stop — keep whatever streamed in, show no error.
        status = "aborted";
      } else if (err instanceof ClaudeError) {
        setError(err);
        status = "errored";
        errorMessage = err.message;
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
      const entry: StoredRun = {
        id: generateRunId(),
        ranAt: new Date().toISOString(),
        model: sentModel,
        values: sentValues,
        sentPrompt,
        response: buffered,
        status,
        ...(errorMessage ? { errorMessage } : {}),
      };
      const nextRuns = appendRun(prompt.id, entry);
      setRuns(nextRuns);
      // F-fast-2 — let the grid refresh its "Run N×" badge for this prompt.
      onRunCompleted?.();
    }
  }

  // Called from the history panel — drop a past run's values straight into
  // the live form. Does NOT auto-run; user decides whether to re-run.
  // Persists too — restored values become the new in-flight draft, so the
  // next reopen sees them (matches the user's mental model: "I picked this
  // run; these are my values now").
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

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleModalKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!running) handleRun();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        onKeyDown={handleModalKeyDown}
        className="relative flex max-h-[85vh] w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 dark:border-night-border">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700 dark:bg-coral-500/15 dark:text-coral-300">
                {prompt.category}
              </span>
              {prompt.tags.map((tag) =>
                onSelectTag ? (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onSelectTag(tag)}
                    aria-label={`Filter by #${tag}`}
                    className="rounded-md bg-cream px-2 py-0.5 text-xs text-ink-muted transition hover:bg-coral-50 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 dark:bg-night dark:text-paper-muted dark:hover:bg-coral-500/15 dark:hover:text-coral-300"
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
              label={isFavorite ? "Remove from favorites" : "Add to favorites"}
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
          <div className="flex items-center justify-between gap-3 border-b border-coral-200 bg-coral-50 px-6 py-3 dark:border-coral-500/30 dark:bg-coral-500/10">
            <span className="text-sm text-coral-900 dark:text-coral-100">
              Delete this prompt? This can&apos;t be undone.
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md border border-coral-300 px-3 py-1.5 text-sm font-medium text-coral-800 transition hover:bg-coral-100 dark:border-coral-500/40 dark:text-coral-100 dark:hover:bg-coral-500/20"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="rounded-md bg-coral-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-coral-700 active:scale-95"
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
                    className="rounded bg-coral-100/70 px-1 text-ink dark:bg-coral-500/20 dark:text-paper"
                  >
                    {value}
                  </span>
                ) : (
                  <span
                    key={index}
                    className="rounded border border-dashed border-coral-300 px-1 text-coral-600 dark:border-coral-500/50 dark:text-coral-300"
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
                      className="font-medium text-coral-600 hover:text-coral-700 dark:text-coral-400"
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
                    <label
                      htmlFor={`var-${variable.name}`}
                      className="mb-1 block text-sm font-medium text-ink dark:text-paper"
                    >
                      {variable.label}
                    </label>
                    {variable.multiline ? (
                      <textarea
                        id={`var-${variable.name}`}
                        value={values[variable.name] ?? ""}
                        onChange={(event) => setValue(variable.name, event.target.value)}
                        placeholder={variable.placeholder}
                        rows={5}
                        className="w-full resize-y rounded-md border border-border bg-cream/50 px-3 py-2 font-mono text-xs leading-relaxed text-ink outline-none transition placeholder:text-ink-soft focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
                      />
                    ) : (
                      <input
                        id={`var-${variable.name}`}
                        value={values[variable.name] ?? ""}
                        onChange={(event) => setValue(variable.name, event.target.value)}
                        placeholder={variable.placeholder}
                        className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCopy}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95",
                  copied
                    ? "border-coral-500 bg-coral-500 text-white"
                    : "border-border text-ink hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:text-paper dark:hover:text-coral-300",
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
                    Copy
                  </>
                )}
              </button>

              {running ? (
                <button
                  onClick={handleStop}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition active:scale-95 dark:border-night-border dark:text-paper"
                >
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-coral-300 border-t-coral-600" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleRun}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-coral-500 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-coral-600 active:scale-95"
                >
                  Run with Claude
                </button>
              )}
            </div>

            {/* F-fast-1 — at-a-glance size estimate of what we're about to send.
                Token count is a rough rule-of-thumb (≈4 chars/token for English)
                so callers see SHAPE not certainty; labelled "~" so nobody mistakes
                it for the exact billable count from the API. */}
            <p className="mt-2 text-center text-xs text-ink-soft dark:text-paper-muted">
              <span aria-label={`Estimated length: ${finalText.length} characters, about ${Math.max(1, Math.ceil(finalText.length / 4))} tokens`}>
                ~{finalText.length.toLocaleString()} chars · ~{Math.max(1, Math.ceil(finalText.length / 4)).toLocaleString()} tokens
              </span>
              <span className="mx-2 text-ink-soft/60">·</span>
              {modelLabel(settings.model)} · <kbd className="font-sans">⌘↵</kbd> to run
            </p>

            {/* Response / error */}
            {showResponsePanel && (
              <div className="mt-5 border-t border-border pt-4 dark:border-night-border">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                    Response
                  </span>
                  {running && (
                    <span className="flex items-center gap-1.5 text-xs text-coral-600 dark:text-coral-400">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-coral-300 border-t-coral-600" />
                      Streaming…
                    </span>
                  )}
                  {!running && response.length > 0 && !error && (
                    <button
                      onClick={handleCopyResponse}
                      className="text-xs font-medium text-coral-600 hover:text-coral-700 dark:text-coral-400"
                    >
                      {responseCopied ? "Copied" : "Copy response"}
                    </button>
                  )}
                </div>

                {error ? (
                  <div className="rounded-md border border-coral-300 bg-coral-50 px-3 py-2.5 text-sm text-coral-800 dark:border-coral-500/40 dark:bg-coral-500/10 dark:text-coral-200">
                    <p>{error.message}</p>
                    {error.kind === "auth" && (
                      <button
                        onClick={() => onOpenSettings("Paste a fresh API key and try again.")}
                        className="mt-2 font-medium underline underline-offset-2"
                      >
                        Open Settings
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="scrollbar-soft max-h-72 overflow-y-auto break-words rounded-md border border-border bg-cream/40 px-3 py-2.5 text-sm leading-relaxed text-ink dark:border-night-border dark:bg-night dark:text-paper">
                    <Markdown source={response} />
                    {running && (
                      <span className="ml-0.5 inline-block animate-pulse font-semibold text-coral-500">
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
