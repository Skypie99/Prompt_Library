"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_MAX_TOKENS, MODELS, type Settings } from "@/lib/settings";
import {
  applyImport,
  defaultExportFilename,
  exportToJson,
  parseImport,
  type ApplyImportResult,
  type ImportPreview,
} from "@/lib/transfer";
import {
  formatBytes,
  getStorageUsage,
  loadUserPrompts,
  wipeAllUserData,
  type StorageUsage,
} from "@/lib/library";
import { CloseIcon } from "./icons";

interface SettingsModalProps {
  open: boolean;
  settings: Settings;
  /** Optional inline message, e.g. when opened because a key was missing. */
  notice: string | null;
  onClose: () => void;
  onSave: (next: Settings) => void;
  /** Called after a successful import so HomeClient re-reads from storage. */
  onLibraryImported?: () => void;
}

type ImportState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | {
      kind: "preview";
      preview: ImportPreview;
      /** Parsed (validated, normalized) data — kept here so applyImport
       *  has it on hand without re-parsing the raw file. */
      data: ReturnType<typeof parseImport> extends infer R
        ? R extends { ok: true; data: infer D }
          ? D
          : never
        : never;
      /** True once the user clicked Replace and we're awaiting confirm. */
      confirmingReplace: boolean;
    }
  | { kind: "success"; result: ApplyImportResult };

export function SettingsModal({
  open,
  settings,
  notice,
  onClose,
  onSave,
  onLibraryImported,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(settings.model);
  const [maxTokens, setMaxTokens] = useState(String(settings.maxTokens));
  const [showKey, setShowKey] = useState(false);
  const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
  const [userPromptCount, setUserPromptCount] = useState(0);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  // F-n2-10 — destructive "Reset all data" confirm gate.
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  // F5 — retain reference to the element that triggered the modal so we can
  // restore focus when it closes.
  const triggerRef = useRef<Element | null>(null);

  // Sync the form to the saved settings each time the modal opens, and
  // reset any in-flight import state so a closed-then-reopened modal is
  // a clean slate. State resets are intentional — they respond to the modal
  // opening/closing (prop change), not a reactive side-effect loop.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiKey(settings.apiKey);
      setModel(settings.model);
      setMaxTokens(String(settings.maxTokens));
      setShowKey(false);
      setImportState({ kind: "idle" });
      // One cheap read for the "N custom prompts in this browser" line. Don't
      // call buildExport() — it walks every per-prompt sub-key, which is
      // wasteful for a display string.
      setUserPromptCount(loadUserPrompts().length);
      // F-fast-3 — pull the storage breakdown once per open. Walks every
      // promptlib:* key, which is cheap.
      setStorageUsage(getStorageUsage());
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, settings]);

  // Refresh the count + usage after a successful import — both just changed.
  useEffect(() => {
    if (importState.kind === "success") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserPromptCount(loadUserPrompts().length);
      setStorageUsage(getStorageUsage());
    }
  }, [importState]);

  // F5 — Focus management: move focus into the modal on open, return it on close.
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      const modal = modalRef.current;
      if (modal) {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        focusable[0]?.focus();
      }
    } else {
      (triggerRef.current as HTMLElement | null)?.focus();
    }
  }, [open]);

  // F5 — Keyboard focus trap: Tab/Shift+Tab cycle within the modal.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  function handleSave() {
    const parsed = Number(maxTokens);
    const safeMax = Number.isFinite(parsed)
      ? Math.min(8192, Math.max(256, Math.round(parsed)))
      : DEFAULT_MAX_TOKENS;
    onSave({ apiKey: apiKey.trim(), model, maxTokens: safeMax });
    onClose();
  }

  function handleExport() {
    const json = exportToJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultExportFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Release the blob URL after a tick so the browser has time to start
    // the download. Avoids the "URL.revokeObjectURL too early" gotcha.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      setImportState({
        kind: "error",
        message: "Couldn't read that file. Try again or pick a different one.",
      });
    };
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = parseImport(text);
      if (!result.ok) {
        setImportState({ kind: "error", message: result.message });
      } else {
        setImportState({
          kind: "preview",
          preview: result.preview,
          data: result.data,
          confirmingReplace: false,
        });
      }
    };
    reader.readAsText(file);
  }

  function handleApplyMerge() {
    if (importState.kind !== "preview") return;
    const result = applyImport(importState.data, "merge");
    setImportState({ kind: "success", result });
    onLibraryImported?.();
  }

  function handleApplyReplace() {
    if (importState.kind !== "preview") return;
    const result = applyImport(importState.data, "replace");
    setImportState({ kind: "success", result });
    onLibraryImported?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-night-border">
          <h2
            id="settings-modal-title"
            className="font-display text-xl font-semibold text-ink dark:text-paper"
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-teal-300 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night dark:text-paper-muted dark:focus-visible:ring-offset-night"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="scrollbar-soft max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {notice && (
            <div className="rounded-md border border-teal-300 bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200">
              {notice}
            </div>
          )}

          {/* API key */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="api-key" className="text-sm font-medium text-ink dark:text-paper">
                Anthropic API key
              </label>
              <button
                onClick={() => setShowKey((s) => !s)}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-teal-500/30"
            />
            <p className="mt-1.5 text-xs text-ink-soft dark:text-paper-muted">
              Your key is stored locally in your browser and is only sent to Anthropic when you run
              a prompt.
            </p>
          </div>

          {/* Model */}
          <div>
            <label
              htmlFor="model"
              className="mb-1 block text-sm font-medium text-ink dark:text-paper"
            >
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-teal-500/30"
            >
              {MODELS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </select>
          </div>

          {/* Max tokens */}
          <div>
            <label
              htmlFor="max-tokens"
              className="mb-1 block text-sm font-medium text-ink dark:text-paper"
            >
              Max response length (tokens)
            </label>
            <input
              id="max-tokens"
              type="number"
              min={256}
              max={8192}
              step={256}
              value={maxTokens}
              onChange={(event) => setMaxTokens(event.target.value)}
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-teal-500/30"
            />
            <p className="mt-1.5 text-xs text-ink-soft dark:text-paper-muted">
              The longest a response can be. Default 2048.
            </p>
          </div>

          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            Get an API key from the Anthropic Console →
          </a>

          {/* ---- Backup / Restore ---- */}
          <div className="border-t border-border pt-5 dark:border-night-border">
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-soft">
              Backup &amp; Restore
            </div>
            <p className="mb-3 text-xs text-ink-muted dark:text-paper-muted">
              This file contains your prompts and run history (but never your API key). Keep it as
              private as you&apos;d keep your notes.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="rounded-md bg-teal-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-teal-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:focus-visible:ring-offset-night"
              >
                Export library
              </button>

              <label className="cursor-pointer rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:border-teal-300 hover:text-teal-600 focus-within:ring-2 focus-within:ring-teal-400 dark:border-night-border dark:bg-night dark:text-paper-muted">
                Import library
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileChosen}
                  className="sr-only"
                  aria-label="Choose a library JSON file to import"
                />
              </label>

              <span className="text-xs text-ink-soft dark:text-paper-muted">
                {userPromptCount} custom prompt{userPromptCount === 1 ? "" : "s"} in this browser
              </span>
            </div>

            {/* Import status */}
            {importState.kind === "error" && (
              <div
                role="alert"
                className="mt-3 rounded-md border border-teal-300 bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200"
              >
                {importState.message}
              </div>
            )}

            {importState.kind === "preview" && (
              <div className="mt-3 rounded-md border border-border bg-cream/50 p-3 dark:border-night-border dark:bg-night/40">
                <div className="text-sm font-medium text-ink dark:text-paper">
                  This file contains:
                </div>
                <ul className="mt-1 text-xs text-ink-muted dark:text-paper-muted">
                  <li>• {importState.preview.userPromptCount} custom prompt(s)</li>
                  <li>• {importState.preview.favoritesCount} favorite(s)</li>
                  <li>• {importState.preview.recentCount} recent entry(ies)</li>
                  <li>• {importState.preview.runsCount} run(s) of history</li>
                  <li>
                    • saved variable values for {importState.preview.valuesPromptCount} prompt(s)
                  </li>
                  {importState.preview.exportedAt && (
                    <li className="mt-1 text-ink-soft">
                      Exported {new Date(importState.preview.exportedAt).toLocaleString()}
                    </li>
                  )}
                  {importState.preview.droppedCount > 0 && (
                    <li className="mt-1 text-teal-700 dark:text-teal-300">
                      {importState.preview.droppedCount} corrupt entry(ies) will be skipped.
                    </li>
                  )}
                </ul>

                <p className="mt-3 text-xs text-ink-soft dark:text-paper-muted">
                  Tip: export your current library first if you want to come back to it later.
                </p>

                {!importState.confirmingReplace ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleApplyMerge}
                      className="rounded-md bg-teal-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-teal-600 active:scale-95"
                    >
                      Merge into my library
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportState({ ...importState, confirmingReplace: true })}
                      className="rounded-md border border-teal-300 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500/40 dark:text-teal-300 dark:hover:bg-teal-500/10"
                    >
                      Replace my library
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportState({ kind: "idle" });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-muted transition hover:text-ink dark:text-paper-muted dark:hover:text-paper"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-teal-300 bg-teal-50 p-2.5 dark:border-teal-500/40 dark:bg-teal-500/10">
                    <p className="text-xs text-teal-900 dark:text-teal-100">
                      This will delete your existing prompts, favorites, recent, and run history,
                      then load the file. Settings (API key, model, theme) are kept. This can&apos;t
                      be undone.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setImportState({ ...importState, confirmingReplace: false })}
                        className="rounded-md border border-teal-300 px-2.5 py-1 text-xs font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-500/40 dark:text-teal-100 dark:hover:bg-teal-500/20"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyReplace}
                        className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-teal-700 active:scale-95"
                      >
                        Replace
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {importState.kind === "success" && (
              <div
                role="status"
                className="mt-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
              >
                Imported {importState.result.promptsAdded} prompt(s),{" "}
                {importState.result.favoritesAdded} favorite(s),{" "}
                {importState.result.runsPromptsWritten} prompt(s) of history.
              </div>
            )}

            {/* F-fast-3 — Storage usage readout. Tiny, on-by-default; lets
                users see where their localStorage budget is going. Real
                <section> with aria-labelledby so screen readers announce
                the whole card as one labeled region instead of reading the
                bucket list out of context. */}
            {storageUsage && (
              <section
                aria-labelledby="storage-usage-heading"
                className="mt-4 rounded-md border border-border bg-cream/40 p-3 dark:border-night-border dark:bg-night/40"
              >
                <div className="flex items-center justify-between">
                  <h3
                    id="storage-usage-heading"
                    className="text-xs font-medium uppercase tracking-wider text-ink-soft"
                  >
                    Storage usage
                  </h3>
                  <span
                    className="text-xs font-medium text-ink dark:text-paper"
                    aria-label={`Total storage used: about ${formatBytes(storageUsage.totalBytes)}`}
                  >
                    ~{formatBytes(storageUsage.totalBytes)}
                  </span>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-ink-muted dark:text-paper-muted">
                  {storageUsage.buckets
                    .filter((b) => b.bytes > 0)
                    .map((b) => (
                      <li key={b.label} className="flex items-center justify-between gap-3">
                        <span>{b.label}</span>
                        <span className="font-mono text-[11px] text-ink-soft dark:text-paper-muted">
                          {formatBytes(b.bytes)}
                        </span>
                      </li>
                    ))}
                </ul>
                <p className="mt-2 text-[11px] text-ink-soft dark:text-paper-muted">
                  All stored in this browser. Typical browser quota is ~5–10 MB per site.
                </p>
              </section>
            )}

            {/* F-n2-10 — destructive "Reset all data" with inline confirm.
                Wipes user prompts + every per-prompt sub-key (runs, values).
                Settings (API key, model, theme) are kept — same scope as
                the export's "what's in / what's out" contract. */}
            <section
              aria-labelledby="reset-heading"
              className="mt-4 rounded-md border border-teal-200 bg-teal-50/40 p-3 dark:border-teal-500/30 dark:bg-teal-500/5"
            >
              <h3
                id="reset-heading"
                className="text-xs font-medium uppercase tracking-wider text-teal-700 dark:text-teal-300"
              >
                Danger zone
              </h3>
              {!confirmingReset ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-ink-muted dark:text-paper-muted">
                    Delete every prompt, favorite, recent, run, and saved value. Keeps your API key
                    and theme.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(true)}
                    className="shrink-0 rounded-md border border-teal-300 px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 dark:border-teal-500/40 dark:text-teal-300 dark:hover:bg-teal-500/10"
                  >
                    Reset all data
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-xs text-teal-900 dark:text-teal-100">
                    Permanently delete every prompt, favorite, recent, run, and saved value? This
                    can&apos;t be undone. (Export first if you might want it back.)
                  </p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingReset(false)}
                      className="rounded-md border border-teal-300 px-2 py-1 text-xs font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-500/40 dark:text-teal-100 dark:hover:bg-teal-500/20"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        wipeAllUserData();
                        setConfirmingReset(false);
                        // Refresh the local readout + tell the parent to
                        // re-hydrate the home grid.
                        setUserPromptCount(loadUserPrompts().length);
                        setStorageUsage(getStorageUsage());
                        onLibraryImported?.();
                      }}
                      className="rounded-md bg-teal-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-teal-700 active:scale-95"
                    >
                      Reset all data
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4 dark:border-night-border">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-muted transition hover:text-ink dark:border-night-border dark:text-paper-muted dark:hover:text-paper"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-600 active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
