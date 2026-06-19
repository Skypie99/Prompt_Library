"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { Prompt } from "@/lib/types";
import {
  createPromptFuse,
  searchPrompts,
  getHighlightSegments,
  type PromptSearchResult,
} from "@/lib/search";
import { categoryColor } from "@/lib/categoryColor";
import { SearchIcon, SparkleIcon } from "./icons";

interface CommandPaletteProps {
  open: boolean;
  prompts: Prompt[];
  /** F-n2-6 — recent-prompt-ids in most-recent-first order. When the
   *  search query is empty, these float to the top of the results. */
  recentIds?: string[];
  onClose: () => void;
  onSelect: (prompt: Prompt) => void;
}

// Renders a field value with matched substrings wrapped in <mark>.
function Highlighted({
  value,
  matches,
  fieldKey,
}: {
  value: string;
  matches: PromptSearchResult["matches"];
  fieldKey: string;
}) {
  const segments = getHighlightSegments(value, matches, fieldKey);
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={index}
            className="rounded-sm bg-teal-200/70 text-ink dark:bg-teal-500/30 dark:text-paper"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

// A tiny keycap used in the footer hints.
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-cream px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-soft dark:border-night-border dark:bg-night dark:text-paper-muted">
      {children}
    </kbd>
  );
}

export function CommandPalette({
  open,
  prompts,
  recentIds,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Index is built once per prompt list. Search runs on every keystroke — the
  // dataset is small, so this is instant with no debounce needed.
  const fuse = useMemo(() => createPromptFuse(prompts), [prompts]);
  const results = useMemo(() => {
    const raw = searchPrompts(fuse, prompts, query);
    // F-n2-6 — when there's no query, surface recent prompts at the top
    // (in most-recent-first order). Once the user types, Fuse's relevance
    // takes over. Reordering uses the same array — no new prompt objects
    // — so reference equality for the existing memos downstream still holds.
    if (query.trim() === "" && recentIds && recentIds.length > 0) {
      const recentSet = new Set(recentIds);
      const inRecent = recentIds
        .map((id) => raw.find((r) => r.prompt.id === id))
        .filter((r): r is PromptSearchResult => Boolean(r));
      const rest = raw.filter((r) => !recentSet.has(r.prompt.id));
      return [...inRecent, ...rest];
    }
    return raw;
  }, [fuse, prompts, query, recentIds]);

  // Fresh start each time the palette opens. State resets are intentional
  // here — they respond to the `open` prop toggling, not to reactive state
  // changes, so the "cascading render" concern does not apply.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  // Reset the selection to the top whenever the query changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlighted row visible as you arrow through the list.
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  if (!open) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) onSelect(result.prompt);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (
      // F-n2-5 — Cmd/Ctrl + 1..9 opens the Nth visible result. Doesn't
      // conflict with typing digits because we require the meta/ctrl
      // modifier; the bare digit still types normally into the search input.
      (event.metaKey || event.ctrlKey) &&
      /^[1-9]$/.test(event.key)
    ) {
      const index = Number(event.key) - 1;
      const result = results[index];
      if (result) {
        event.preventDefault();
        onSelect(result.prompt);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] sm:pt-[12vh]">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 dark:border-night-border">
          <SearchIcon className="h-5 w-5 shrink-0 text-ink-soft" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search prompts by title, tag, or content…"
            className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft dark:text-paper"
            aria-label="Search prompts"
          />
          <Kbd>esc</Kbd>
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <div className="px-4 py-12 text-center">
            {prompts.length === 0 && query.trim() === "" ? (
              <>
                <SparkleIcon
                  aria-hidden
                  className="mx-auto h-6 w-6 text-ink-soft dark:text-paper-muted"
                />
                <p className="mt-2 text-sm text-ink-muted dark:text-paper-muted">
                  No prompts in your library yet.
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Create a custom prompt to get started.
                </p>
              </>
            ) : (
              <>
                <SearchIcon
                  aria-hidden
                  className="mx-auto h-6 w-6 text-ink-soft dark:text-paper-muted"
                />
                <p className="mt-2 text-sm text-ink-muted dark:text-paper-muted">
                  No prompts match{" "}
                  <span className="font-medium text-ink dark:text-paper">&ldquo;{query}&rdquo;</span>
                </p>
                <p className="mt-1 text-xs text-ink-soft">Try a different word or a tag.</p>
              </>
            )}
          </div>
        ) : (
          <ul ref={listRef} className="scrollbar-soft max-h-[50vh] overflow-y-auto p-2">
            {results.map((result, index) => {
              const isActive = index === activeIndex;
              return (
                <li key={result.prompt.id}>
                  <button
                    data-active={isActive}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => onSelect(result.prompt)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-teal-100 dark:bg-teal-500/20"
                        : "hover:bg-teal-50/70 dark:hover:bg-night-border/40",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={clsx(
                          "truncate text-sm font-medium",
                          isActive
                            ? "text-teal-800 dark:text-teal-200"
                            : "text-ink dark:text-paper",
                        )}
                      >
                        <Highlighted
                          value={result.prompt.title}
                          matches={result.matches}
                          fieldKey="title"
                        />
                      </div>
                      <div className="truncate text-xs text-ink-muted dark:text-paper-muted">
                        <Highlighted
                          value={result.prompt.description}
                          matches={result.matches}
                          fieldKey="description"
                        />
                      </div>
                    </div>
                    {/* F-n2-19 — category chip in the palette now uses
                        the same color hash as F-night-11's card stripe,
                        so the visual category language is consistent
                        across the home grid and the search results. */}
                    {(() => {
                      const c = categoryColor(result.prompt.category);
                      return (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-ink-muted dark:bg-night dark:text-paper-muted">
                          <span
                            aria-hidden
                            className="h-2 w-2 rounded-full dark:hidden"
                            style={{ backgroundColor: c.light }}
                          />
                          <span
                            aria-hidden
                            className="hidden h-2 w-2 rounded-full dark:block"
                            style={{ backgroundColor: c.dark }}
                          />
                          {result.prompt.category}
                        </span>
                      );
                    })()}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-ink-soft dark:border-night-border dark:text-paper-muted">
          <span>
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
          <span className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              open
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
