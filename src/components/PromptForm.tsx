"use client";

import { useMemo, useState } from "react";
import type { Prompt } from "@/lib/types";
import { parseBody } from "@/lib/variables";
import { CloseIcon } from "./icons";

export interface PromptFormValues {
  title: string;
  description: string;
  body: string;
  category: string;
  tags: string[];
}

interface PromptFormProps {
  mode: "create" | "edit";
  /** Prefilled values (editing, or duplicating a prompt). */
  initial: Prompt | null;
  /** Existing category names, offered in the combobox. */
  categories: string[];
  /** F-night-6 — existing tag names from the user's library, offered as
   *  one-click suggestions beneath the tag input. Already-added tags
   *  are filtered out. Optional so the form still renders without a
   *  suggestion source. */
  suggestedTags?: string[];
  onCancel: () => void;
  onSubmit: (values: PromptFormValues) => void;
}

const fieldClass =
  "w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30";

// F-night-9 — small inline preview that mirrors PromptDetail's preview
// pane (filled-variable / unfilled-variable chip treatment) but renders
// every variable as "unfilled" since the form has no fill state. Memoized
// on body so the parser doesn't re-run on unrelated state changes
// (e.g. typing into the tags input).
function PromptBodyPreview({ body }: { body: string }) {
  const segments = useMemo(() => parseBody(body), [body]);
  return (
    <div className="mt-3">
      <span className="text-[10px] uppercase tracking-wider text-ink-soft">
        Preview
      </span>
      <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-cream/40 px-3 py-2 font-sans text-xs leading-relaxed text-ink dark:border-night-border dark:bg-night/40 dark:text-paper">
        {segments.map((segment, index) =>
          segment.type === "text" ? (
            <span key={index}>{segment.value}</span>
          ) : (
            <span
              key={index}
              className="rounded border border-dashed border-coral-300 px-1 text-coral-600 dark:border-coral-500/50 dark:text-coral-300"
            >
              {segment.raw}
            </span>
          ),
        )}
      </pre>
    </div>
  );
}

export function PromptForm({
  mode,
  initial,
  categories,
  suggestedTags,
  onCancel,
  onSubmit,
}: PromptFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const canSave = title.trim() !== "" && body.trim() !== "";

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, "");
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setTagInput("");
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
    } else if (event.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function handleSubmit() {
    if (!canSave) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      body,
      category: category.trim() || "Uncategorized",
      tags,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative flex max-h-[88vh] w-full max-w-2xl animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-night-border">
          <h2 className="font-display text-xl font-semibold text-ink dark:text-paper">
            {mode === "edit" ? "Edit prompt" : "New prompt"}
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="scrollbar-soft space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label htmlFor="pf-title" className="mb-1 block text-sm font-medium text-ink dark:text-paper">
              Title <span className="text-coral-500">*</span>
            </label>
            <input
              id="pf-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Weekly Status Update"
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="pf-description"
              className="mb-1 block text-sm font-medium text-ink dark:text-paper"
            >
              Description
            </label>
            <input
              id="pf-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="One line shown on the card and in search"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="pf-body" className="mb-1 block text-sm font-medium text-ink dark:text-paper">
              Prompt body <span className="text-coral-500">*</span>
            </label>
            <textarea
              id="pf-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your prompt. Use {{variableName}} for fill-in-the-blanks."
              rows={8}
              className={`${fieldClass} resize-y font-mono text-xs leading-relaxed`}
            />
            <div className="mt-1.5 flex items-baseline justify-between gap-3">
              <p className="text-xs text-ink-soft dark:text-paper-muted">
                Wrap fill-ins in double braces, like{" "}
                <code className="rounded bg-cream px-1 dark:bg-night">{"{{topic}}"}</code> — they
                become input fields automatically.
              </p>
              {/* F-night-8 — live word/char count for the body. Helps
                  prompt authors keep things tight without leaving the form. */}
              {(() => {
                const trimmed = body.trim();
                const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
                const chars = body.length;
                return (
                  <span
                    aria-label={`Prompt body length: ${words} ${words === 1 ? "word" : "words"}, ${chars} ${chars === 1 ? "character" : "characters"}`}
                    className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-ink-soft dark:text-paper-muted"
                  >
                    {words.toLocaleString()} {words === 1 ? "word" : "words"} ·{" "}
                    {chars.toLocaleString()} chars
                  </span>
                );
              })()}
            </div>

            {/* F-night-9 — live preview of the body with {{variables}}
                highlighted as dashed coral chips. Mirrors the same chip
                treatment PromptDetail uses for the preview pane, so the
                author sees during writing what the eventual reader will
                see during run. Hidden when body is empty so the form
                doesn't open with a "preview of nothing" box. */}
            {body.trim() !== "" && <PromptBodyPreview body={body} />}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pf-category"
                className="mb-1 block text-sm font-medium text-ink dark:text-paper"
              >
                Category
              </label>
              <input
                id="pf-category"
                list="pf-category-options"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Pick or type a new one"
                className={fieldClass}
              />
              <datalist id="pf-category-options">
                {categories.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="pf-tags" className="mb-1 block text-sm font-medium text-ink dark:text-paper">
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-cream/50 px-2 py-1.5 focus-within:border-coral-400 focus-within:ring-2 focus-within:ring-coral-200 dark:border-night-border dark:bg-night dark:focus-within:ring-coral-500/30">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded bg-coral-50 px-1.5 py-0.5 text-xs text-coral-700 dark:bg-coral-500/15 dark:text-coral-300"
                  >
                    #{tag}
                    <button
                      type="button"
                      aria-label={`Remove ${tag}`}
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="text-coral-500 hover:text-coral-700"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="pf-tags"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={tags.length ? "" : "Type and press Enter"}
                  className="min-w-[6rem] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft dark:text-paper"
                />
              </div>
              {/* F-night-6 — suggested tags from the rest of the user's
                  library, shown as one-click chips. Hidden when none
                  remain to suggest (all already added). */}
              {(() => {
                const remaining = (suggestedTags ?? []).filter(
                  (t) => !tags.includes(t),
                );
                if (remaining.length === 0) return null;
                // Cap at 8 to keep the form compact.
                const visible = remaining.slice(0, 8);
                return (
                  <div className="mt-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-ink-soft">
                      Suggested
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {visible.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          aria-label={`Add tag #${tag}`}
                          className="rounded bg-cream px-1.5 py-0.5 text-[11px] text-ink-muted transition hover:bg-coral-50 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 dark:bg-night dark:text-paper-muted dark:hover:bg-coral-500/15 dark:hover:text-coral-300"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4 dark:border-night-border">
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-muted transition hover:text-ink dark:border-night-border dark:text-paper-muted dark:hover:text-paper"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="rounded-md bg-coral-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "edit" ? "Save changes" : "Create prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
