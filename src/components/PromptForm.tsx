"use client";

import { useMemo, useRef, useState } from "react";
import type { Prompt } from "@/lib/types";
import { parseBody } from "@/lib/variables";
import { Sheet } from "./ui/Sheet";
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
  "w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-teal-500/30";

// Character caps. Kept together so they're easy to update and easy to
// reference from both the input `maxLength` attr and any future validation.
const MAX_TITLE_CHARS = 200;
const MAX_DESCRIPTION_CHARS = 500;
const MAX_BODY_CHARS = 50_000;
const MAX_CATEGORY_CHARS = 100;
const MAX_TAG_CHARS = 50;

// F-n2-20 — given a variable name, produce a short readable sample so
// the preview shows what a filled body looks like without the user
// having to mentally substitute. Pulls a few common shapes from the
// name itself (topic → "your topic", date → "May 23", etc.) and falls
// back to "sample <name>".
function sampleFor(name: string): string {
  const lc = name.toLowerCase();
  if (/date/.test(lc)) return "May 23";
  if (/email/.test(lc)) return "you@example.com";
  if (/name/.test(lc)) return "Sky";
  if (/url|link/.test(lc)) return "https://example.com";
  if (/topic|subject/.test(lc)) return "shipping a beta";
  if (/tone/.test(lc)) return "warm and plain";
  if (/length|count|number/.test(lc)) return "200";
  if (/code|snippet/.test(lc)) return "const x = 1;";
  return `sample ${name}`;
}

// F-night-9 — small inline preview that mirrors PromptDetail's preview
// pane (filled-variable / unfilled-variable chip treatment) but renders
// every variable as "unfilled" since the form has no fill state. Memoized
// on body so the parser doesn't re-run on unrelated state changes
// (e.g. typing into the tags input).
//
// F-n2-20 — "Sample fill" mode renders each {{var}} as its sampleFor()
// value with a teal-tinted fill, mirroring PromptDetail's filled-value
// chip treatment. Lets the author see "what does it look like in flight"
// without leaving the form.
function PromptBodyPreview({ body, sampleFill }: { body: string; sampleFill: boolean }) {
  const segments = useMemo(() => parseBody(body), [body]);
  return (
    // Header is now rendered by the parent (so the "Sample fill" toggle
    // can sit next to it). This component is just the body box.
    <div>
      <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-cream/40 px-3 py-2 font-sans text-xs leading-relaxed text-ink dark:border-night-border dark:bg-night/40 dark:text-paper">
        {segments.map((segment, index) =>
          segment.type === "text" ? (
            <span key={index}>{segment.value}</span>
          ) : sampleFill ? (
            <span
              key={index}
              className="rounded bg-teal-100/70 px-1 text-ink dark:bg-teal-500/20 dark:text-paper"
            >
              {sampleFor(segment.name)}
            </span>
          ) : (
            <span
              key={index}
              className="rounded border border-dashed border-teal-300 px-1 text-teal-700 dark:border-teal-500/50 dark:text-teal-300"
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
  // F-n2-20 — toggle for sample-fill in the preview pane.
  const [sampleFill, setSampleFill] = useState(false);
  // F-n2-8 — ref to the body textarea so the "Insert {{}}" helper can
  // place the caret inside the braces after insertion.
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertVariableAtCaret() {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const insertion = "{{}}";
    const next = body.slice(0, start) + insertion + body.slice(end);
    setBody(next);
    // Refocus + place caret between the braces ("{{|}}") on the next tick
    // so the user can immediately type the variable name.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + 2;
      el.setSelectionRange(caret, caret);
    });
  }

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
    <Sheet
      open
      onClose={onCancel}
      size="lg"
      ariaLabel={mode === "edit" ? "Edit prompt" : "New prompt"}
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-night-border">
        <h2 className="font-display text-xl font-semibold text-ink dark:text-paper">
          {mode === "edit" ? "Edit prompt" : "New prompt"}
        </h2>
        <button
          onClick={onCancel}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-teal-300 hover:text-teal-700 dark:border-night-border dark:bg-night dark:text-paper-muted"
        >
          <CloseIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="scrollbar-soft min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div>
          <label
            htmlFor="pf-title"
            className="mb-1 block text-sm font-medium text-ink dark:text-paper"
          >
            Title <span className="text-teal-500">*</span>
          </label>
          <input
            id="pf-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Weekly Status Update"
            maxLength={MAX_TITLE_CHARS}
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
            maxLength={MAX_DESCRIPTION_CHARS}
            className={fieldClass}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label htmlFor="pf-body" className="block text-sm font-medium text-ink dark:text-paper">
              Prompt body <span className="text-teal-500">*</span>
            </label>
            {/* F-n2-8 — one-click insert of {{}} at the caret. Caret
                  lands between the braces so the user immediately types
                  the variable name. */}
            <button
              type="button"
              onClick={insertVariableAtCaret}
              aria-label="Insert a variable placeholder at the cursor"
              className="rounded border border-border bg-cream px-2 py-0.5 font-mono text-2xs text-ink-muted transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-night-border dark:bg-night dark:text-paper-muted dark:hover:text-teal-300"
            >
              {"{{}}"}
            </button>
          </div>
          <textarea
            ref={bodyRef}
            id="pf-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your prompt. Use {{variableName}} for fill-in-the-blanks."
            rows={8}
            maxLength={MAX_BODY_CHARS}
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
                  className="shrink-0 whitespace-nowrap text-2xs tabular-nums text-ink-soft dark:text-paper-muted"
                >
                  {words.toLocaleString()} {words === 1 ? "word" : "words"} ·{" "}
                  {chars.toLocaleString()} chars
                </span>
              );
            })()}
          </div>

          {/* F-night-9 + F-n2-20 — live preview, with optional sample
                fill toggle for "what does this look like filled in?". */}
          {body.trim() !== "" && (
            <>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-2xs uppercase tracking-wider text-ink-soft">Preview</span>
                <label className="flex items-center gap-1 text-2xs text-ink-muted dark:text-paper-muted">
                  <input
                    type="checkbox"
                    checked={sampleFill}
                    onChange={(e) => setSampleFill(e.target.checked)}
                    className="h-3 w-3 accent-teal-500"
                  />
                  Sample fill
                </label>
              </div>
              <PromptBodyPreview body={body} sampleFill={sampleFill} />
            </>
          )}
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
              maxLength={MAX_CATEGORY_CHARS}
              className={fieldClass}
            />
            <datalist id="pf-category-options">
              {categories.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="pf-tags"
              className="mb-1 block text-sm font-medium text-ink dark:text-paper"
            >
              Tags
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-cream/50 px-2 py-1.5 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-200 dark:border-night-border dark:bg-night dark:focus-within:ring-teal-500/30">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                >
                  #{tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    className="text-teal-500 hover:text-teal-700"
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
                maxLength={MAX_TAG_CHARS}
                className="min-w-[6rem] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft dark:text-paper"
              />
            </div>
            {/* F-night-6 — suggested tags from the rest of the user's
                  library, shown as one-click chips. Hidden when none
                  remain to suggest (all already added). */}
            {(() => {
              const remaining = (suggestedTags ?? []).filter((t) => !tags.includes(t));
              if (remaining.length === 0) return null;
              // Cap at 8 to keep the form compact.
              const visible = remaining.slice(0, 8);
              return (
                <div className="mt-1.5">
                  <span className="text-2xs uppercase tracking-wider text-ink-soft">
                    Suggested
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {visible.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        aria-label={`Add tag #${tag}`}
                        className="rounded bg-cream px-1.5 py-0.5 text-2xs text-ink-muted transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-night dark:text-paper-muted dark:hover:bg-teal-500/15 dark:hover:text-teal-300"
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
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-night transition hover:bg-teal-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mode === "edit" ? "Save changes" : "Create prompt"}
        </button>
      </div>
    </Sheet>
  );
}
