"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MAX_TOKENS, MODELS, type Settings } from "@/lib/settings";
import { CloseIcon } from "./icons";

interface SettingsModalProps {
  open: boolean;
  settings: Settings;
  /** Optional inline message, e.g. when opened because a key was missing. */
  notice: string | null;
  onClose: () => void;
  onSave: (next: Settings) => void;
}

export function SettingsModal({ open, settings, notice, onClose, onSave }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(settings.model);
  const [maxTokens, setMaxTokens] = useState(String(settings.maxTokens));
  const [showKey, setShowKey] = useState(false);

  // Sync the form to the saved settings each time the modal opens.
  useEffect(() => {
    if (open) {
      setApiKey(settings.apiKey);
      setModel(settings.model);
      setMaxTokens(String(settings.maxTokens));
      setShowKey(false);
    }
  }, [open, settings]);

  if (!open) return null;

  function handleSave() {
    const parsed = Number(maxTokens);
    const safeMax = Number.isFinite(parsed)
      ? Math.min(8192, Math.max(256, Math.round(parsed)))
      : DEFAULT_MAX_TOKENS;
    onSave({ apiKey: apiKey.trim(), model, maxTokens: safeMax });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-night-border">
          <h2 className="font-display text-xl font-semibold text-ink dark:text-paper">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {notice && (
            <div className="rounded-md border border-coral-300 bg-coral-50 px-3 py-2 text-sm text-coral-800 dark:border-coral-500/40 dark:bg-coral-500/10 dark:text-coral-200">
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
                className="text-xs font-medium text-coral-600 hover:text-coral-700 dark:text-coral-400"
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
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
            />
            <p className="mt-1.5 text-xs text-ink-soft dark:text-paper-muted">
              Your key is stored locally in your browser and is only sent to Anthropic when you run a
              prompt.
            </p>
          </div>

          {/* Model */}
          <div>
            <label htmlFor="model" className="mb-1 block text-sm font-medium text-ink dark:text-paper">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
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
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
            />
            <p className="mt-1.5 text-xs text-ink-soft dark:text-paper-muted">
              The longest a response can be. Default 2048.
            </p>
          </div>

          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-coral-600 hover:text-coral-700 dark:text-coral-400"
          >
            Get an API key from the Anthropic Console →
          </a>
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
            className="rounded-md bg-coral-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-600 active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
