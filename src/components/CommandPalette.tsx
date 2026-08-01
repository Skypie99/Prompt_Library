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

// F7 — same focusable set Sheet's trap uses, so the two overlays agree on what
// "inside the dialog" means.
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Renders a field value with matched substrings wrapped in <mark>.
function Highlighted({
  value,
  matches,
  fieldKey,
  isActive,
}: {
  value: string;
  matches: PromptSearchResult["matches"];
  fieldKey: string;
  isActive: boolean;
}) {
  const segments = getHighlightSegments(value, matches, fieldKey);
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={index}
            className={clsx(
              "rounded-sm bg-teal-200/70 text-ink dark:bg-teal-500/30 dark:text-paper",
              // S7 — on the SELECTED row the mark fill vs the active-row tint is
              // only ~1.08:1 light / 1.74:1 dark (SC 1.4.11 fail), so the "which
              // words matched" cue vanishes exactly where the user is deciding.
              // Add a darker-teal underline — a non-color graphical distinction
              // measuring 4.79:1 light / 10.13:1 dark against the active-row
              // tint (both ≥ 3:1). Teal identity kept (existing scale steps, no
              // new hue); inactive rows and the AA text-over-mark pairs unchanged.
              isActive &&
                "underline decoration-teal-700 decoration-2 underline-offset-2 dark:decoration-teal-300",
            )}
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
    <kbd className="rounded border border-border bg-cream px-1.5 py-0.5 font-sans text-2xs font-medium text-ink-soft dark:border-night-border dark:bg-night dark:text-paper-muted">
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
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

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

  // F7 — return focus to whatever opened the palette. Mirrors Sheet's contract:
  // the restore lives in the cleanup so it fires however the palette closes
  // (Escape, scrim click, or picking a result).
  //
  // Declared BEFORE the open-reset effect below on purpose: effects run in
  // declaration order, and that one moves focus into the search input. Capture
  // the trigger first or `document.activeElement` is already the input, and
  // closing would restore focus to an element that is being unmounted.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;
    return () => {
      const t = triggerRef.current;
      if (t instanceof HTMLElement && document.body.contains(t)) t.focus();
    };
  }, [open]);

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

  // F7 — confine Tab to the panel. The palette LOOKED modal (fullscreen scrim,
  // click-blocking) but wasn't: a trusted Tab from the last result walked out
  // to the "Skip to content" link on the obscured page behind the scrim, with
  // the palette still open. Same trap grammar as Sheet.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // The search input owns Escape (S3's combobox handler, untouched).
        // This covers focus anywhere ELSE in the panel — e.g. a result row
        // reached by Tab — without double-firing onClose.
        if (!(e.target instanceof HTMLInputElement)) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          el.getClientRects().length > 0 &&
          !el.closest('[aria-hidden="true"]'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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

      {/* F7 — real dialog semantics. `aria-modal` is what confines a screen
          reader's virtual cursor to the panel; before this, the covered page
          could be browsed freely while the palette was open. Same approach as
          Sheet (which likewise relies on aria-modal rather than inert). */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search prompts"
        className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 dark:border-night-border">
          <SearchIcon className="h-5 w-5 shrink-0 text-ink-soft dark:text-paper-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search prompts by title, tag, or content…"
            className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft dark:text-paper"
            aria-label="Search prompts"
            // S3 — combobox/listbox pattern. Focus stays on the input; the
            // roving selection is carried by aria-activedescendant, not by
            // moving DOM focus. The popup attributes are applied only when a
            // listbox is actually rendered (results.length > 0) so aria-controls
            // never dangles and aria-expanded reflects real visibility.
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={results.length > 0}
            aria-controls={results.length > 0 ? "cmdk-listbox" : undefined}
            aria-activedescendant={
              results.length > 0 && results[activeIndex]
                ? `cmdk-option-${results[activeIndex].prompt.id}`
                : undefined
            }
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
                <p className="mt-1 text-xs text-ink-soft dark:text-paper-muted">
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
                  <span className="font-medium text-ink dark:text-paper">
                    &ldquo;{query}&rdquo;
                  </span>
                </p>
                <p className="mt-1 text-xs text-ink-soft dark:text-paper-muted">
                  Try a different word or a tag.
                </p>
              </>
            )}
          </div>
        ) : (
          <ul
            ref={listRef}
            id="cmdk-listbox"
            role="listbox"
            aria-label="Prompt search results"
            className="scrollbar-soft max-h-[50vh] overflow-y-auto p-2"
          >
            {results.map((result, index) => {
              const isActive = index === activeIndex;
              return (
                <li key={result.prompt.id} role="presentation">
                  <button
                    id={`cmdk-option-${result.prompt.id}`}
                    role="option"
                    aria-selected={isActive}
                    // Options are not tab stops in the activedescendant model —
                    // focus stays on the input, arrows drive the selection.
                    tabIndex={-1}
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
                          isActive={isActive}
                        />
                      </div>
                      <div className="truncate text-xs text-ink-muted dark:text-paper-muted">
                        <Highlighted
                          value={result.prompt.description}
                          matches={result.matches}
                          fieldKey="description"
                          isActive={isActive}
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
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-2xs font-medium text-ink-muted dark:bg-night dark:text-paper-muted">
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
          {/* S3 — the single polite live region for the palette. Scoped to the
              count text ONLY (never the option names) so screen readers hear
              "13 results" / "0 results" as the query changes, while the focused
              option is announced via aria-activedescendant. */}
          <span aria-live="polite" aria-atomic="true">
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
