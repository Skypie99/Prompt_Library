"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Prompt } from "@/lib/types";
import { getCategoriesWithCounts, getTagsWithCounts } from "@/lib/prompts";
import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/settings";
import {
  RECENT_CAP,
  generateId,
  loadFavorites,
  loadOnboarded,
  loadRecent,
  loadUserPrompts,
  mergePrompts,
  purgePromptStorage,
  runStorageMigrations,
  saveFavorites,
  saveOnboarded,
  saveRecent,
  saveUserPrompts,
  setStorageWriteFailureHandler,
} from "@/lib/library";
import { loadAllLastRunIsos, loadAllRunCounts } from "@/lib/runs";
import { DEFAULT_DENSITY, loadDensity, saveDensity, type Density } from "@/lib/density";
import {
  DEFAULT_SORT,
  SORT_LABELS,
  loadSort,
  saveSort,
  sortPrompts,
  type SortMode,
} from "@/lib/sort";
import { Header } from "./Header";
import { PromptGrid } from "./PromptGrid";
import { CategoryChips } from "./CategoryChips";
import { TagChips } from "./TagChips";
import { CommandPalette } from "./CommandPalette";
import { PromptDetail } from "./PromptDetail";
import { SettingsModal } from "./SettingsModal";
import { EmptyHint } from "./EmptyHint";
import { OnboardingHint } from "./OnboardingHint";
import { ApiKeyNudge } from "./ApiKeyNudge";
import { PromptForm, type PromptFormValues } from "./PromptForm";
import { ShortcutsModal } from "./ShortcutsModal";
import { ClockIcon, PlusIcon, SearchIcon, SparkleIcon, StarIcon } from "./icons";

// Returns true if the keystroke happened inside a text field, so global
// single-key shortcuts (like "/") don't hijack normal typing.
function isTypingTarget(event: KeyboardEvent): boolean {
  const el = event.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

interface FormState {
  mode: "create" | "edit";
  initial: Prompt | null;
}

export function HomeClient({ prompts: seedPrompts }: { prompts: Prompt[] }) {
  // Overlay state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  // Settings (defaults first to match SSR, then hydrated from localStorage)
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    model: DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
  });

  // Library state (all hydrated from localStorage after mount)
  const [userPrompts, setUserPrompts] = useState<Prompt[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  // F-fast-2 — promptId → run count, for the usage badge on cards.
  // Hydrated on mount and after each run completion (callback from PromptDetail).
  const [runCounts, setRunCounts] = useState<Map<string, number>>(() => new Map());
  // F-n2-13 — promptId → most-recent-run ISO, for the "Last 2hr ago" line.
  const [lastRunIsos, setLastRunIsos] = useState<Map<string, string>>(() => new Map());
  // F-fast-5 — grid density. Defaults to comfortable to match prior layout.
  const [density, setDensity] = useState<Density>(DEFAULT_DENSITY);
  // F-eve-1 — sort mode for the All prompts grid. Defaults to "newest"
  // (the same createdAt-desc order the app has always used).
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT);
  // F-r1 — first-run API key nudge. False initially to avoid SSR hydration
  // mismatch; set on mount if no key + no prior runs + not session-dismissed.
  const [showApiKeyNudge, setShowApiKeyNudge] = useState(false);

  useEffect(() => {
    // Migrate the on-disk shape BEFORE any reader runs, so v0 -> v1 keys are
    // in place when loadUserPrompts() etc. start looking for them. Idempotent
    // and synchronous — fine to run inline.
    runStorageMigrations();

    // Surface write failures (quota exceeded, private mode, disabled storage)
    // as a top-of-page banner instead of silently dropping the user's edit.
    setStorageWriteFailureHandler((result) => {
      const msg =
        result.reason === "quota"
          ? "Your browser ran out of room to save changes. Delete some prompts or favorites to make space."
          : "Couldn't save changes to this browser. Your edits may not survive a reload.";
      setStorageWarning(msg);
    });

    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    setUserPrompts(loadUserPrompts());
    setFavorites(loadFavorites());
    setRecent(loadRecent());
    const loadedCounts = loadAllRunCounts();
    setRunCounts(loadedCounts);
    setLastRunIsos(loadAllLastRunIsos());

    // F-r1 — show nudge only when: no API key stored, not session-dismissed,
    // and no prior runs (a completed run is proof the key works).
    if (!loadedSettings.apiKey) {
      const nudgeDismissed = (() => {
        try {
          return sessionStorage.getItem("promptlib:keyNudgeDismissed") === "1";
        } catch {
          return false;
        }
      })();
      const hasAnyRun = Array.from(loadedCounts.values()).some((c) => c > 0);
      setShowApiKeyNudge(!nudgeDismissed && !hasAnyRun);
    }
    setDensity(loadDensity());
    setSortMode(loadSort());
    setShowOnboarding(!loadOnboarded());

    return () => {
      setStorageWriteFailureHandler(null);
    };
  }, []);

  // ---- Derived data ----
  const allPrompts = useMemo(
    () => mergePrompts(userPrompts, seedPrompts),
    [userPrompts, seedPrompts]
  );
  const promptById = useMemo(() => {
    const map = new Map<string, Prompt>();
    for (const p of allPrompts) map.set(p.id, p);
    return map;
  }, [allPrompts]);

  // F-night-12 — counts come along for the CategoryChips badge.
  const categoriesWithCounts = useMemo(() => getCategoriesWithCounts(allPrompts), [allPrompts]);
  // String-only list is what the PromptForm category combobox needs.
  const categories = useMemo(
    () => categoriesWithCounts.map((c) => c.category),
    [categoriesWithCounts]
  );
  // F-eve-2 — each entry carries its count for the TagChips badge. Named
  // `tagsWithCounts` (not just `tags`) so every call site below reads
  // unambiguously as "this is the {tag, count}[] shape," not a string[].
  const tagsWithCounts = useMemo(() => getTagsWithCounts(allPrompts), [allPrompts]);

  // Intersection of category + tag filters. Either, both, or neither can be
  // active. When neither is set, we show everything. After filtering, sort
  // by the user's chosen mode (F-eve-1). Stable: filter first (small set)
  // then sort the small set, so the sort cost scales with the visible grid,
  // not the full library.
  const visiblePrompts = useMemo(() => {
    const filtered = allPrompts.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (activeTag && !p.tags.includes(activeTag)) return false;
      return true;
    });
    return sortPrompts(filtered, sortMode, runCounts);
  }, [allPrompts, activeCategory, activeTag, sortMode, runCounts]);

  // If the active tag stops existing (e.g. last prompt with it was deleted),
  // silently clear the filter so the user doesn't end up stuck on an empty
  // grid forever.
  useEffect(() => {
    if (activeTag && !tagsWithCounts.some((t) => t.tag === activeTag)) setActiveTag(null);
  }, [activeTag, tagsWithCounts]);

  const favoritePrompts = useMemo(
    () => favorites.map((id) => promptById.get(id)).filter((p): p is Prompt => Boolean(p)),
    [favorites, promptById]
  );
  const recentPrompts = useMemo(
    () => recent.map((id) => promptById.get(id)).filter((p): p is Prompt => Boolean(p)),
    [recent, promptById]
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  // ---- Actions ----
  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
    // F-r1 — once a key is saved, suppress the nudge for this session.
    if (next.apiKey) {
      setShowApiKeyNudge(false);
      try {
        sessionStorage.setItem("promptlib:keyNudgeDismissed", "1");
      } catch {}
    }
  }, []);

  const dismissApiKeyNudge = useCallback(() => {
    setShowApiKeyNudge(false);
    try {
      sessionStorage.setItem("promptlib:keyNudgeDismissed", "1");
    } catch {}
  }, []);

  const openSettings = useCallback((notice?: string) => {
    setSettingsNotice(notice ?? null);
    setSettingsOpen(true);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      saveFavorites(next);
      return next;
    });
  }, []);

  const recordRecent = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_CAP);
      saveRecent(next);
      return next;
    });
  }, []);

  const openPrompt = useCallback(
    (prompt: Prompt) => {
      setPaletteOpen(false);
      setActivePrompt(prompt);
      recordRecent(prompt.id);
    },
    [recordRecent]
  );

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    saveOnboarded();
  }, []);

  // Called by SettingsModal after a successful F5 import. Re-reads every
  // library-side keyspace from localStorage so the home grid reflects the
  // imported data immediately (no refresh needed). Settings stay as-is —
  // import never touches apiKey / model / maxTokens.
  const refreshLibraryFromStorage = useCallback(() => {
    setUserPrompts(loadUserPrompts());
    setFavorites(loadFavorites());
    setRecent(loadRecent());
    setRunCounts(loadAllRunCounts());
    // Close any open prompt — its id may have been overwritten by Replace mode.
    setActivePrompt(null);
  }, []);

  // F-fast-2 — called by PromptDetail after a run terminates so the
  // home grid's usage badges reflect the new count without a refresh.
  const refreshRunCounts = useCallback(() => {
    setRunCounts(loadAllRunCounts());
    setLastRunIsos(loadAllLastRunIsos());
  }, []);

  // F-fast-5 — flip density and persist. Wrapped in useCallback so the
  // Header button's prop identity is stable across re-renders.
  const handleChangeDensity = useCallback((next: Density) => {
    setDensity(next);
    saveDensity(next);
  }, []);

  // F-eve-1 — flip sort mode and persist. Stable callback for the dropdown.
  const handleChangeSort = useCallback((next: SortMode) => {
    setSortMode(next);
    saveSort(next);
  }, []);

  const deletePrompt = useCallback((id: string) => {
    setUserPrompts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveUserPrompts(next);
      return next;
    });
    setFavorites((prev) => {
      const next = prev.filter((x) => x !== id);
      saveFavorites(next);
      return next;
    });
    setRecent((prev) => {
      const next = prev.filter((x) => x !== id);
      saveRecent(next);
      return next;
    });
    // Wipe any per-prompt storage (future: run history, saved variable
    // values) so deleted prompts don't leave orphaned localStorage entries
    // accumulating forever.
    purgePromptStorage(id);
    // F-fast-2 — drop this id's badge count from the in-memory map.
    setRunCounts((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setActivePrompt(null);
  }, []);

  const submitForm = useCallback(
    (values: PromptFormValues) => {
      if (form?.mode === "edit" && form.initial) {
        const updated: Prompt = {
          ...form.initial,
          ...values,
          isSeed: false,
        };
        setUserPrompts((prev) => {
          const next = prev.map((p) => (p.id === updated.id ? updated : p));
          saveUserPrompts(next);
          return next;
        });
        setActivePrompt(updated);
      } else {
        const created: Prompt = {
          id: generateId(values.title),
          title: values.title,
          description: values.description,
          body: values.body,
          variables: [],
          category: values.category,
          tags: values.tags,
          createdAt: new Date().toISOString(),
          isSeed: false,
        };
        setUserPrompts((prev) => {
          const next = [created, ...prev];
          saveUserPrompts(next);
          return next;
        });
        setActivePrompt(created);
        recordRecent(created.id);
      }
      setForm(null);
    },
    [form, recordRecent]
  );

  // Global shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.key === "/" && !isTypingTarget(event)) {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === "?" && !isTypingTarget(event)) {
        // "?" only fires when the user is NOT typing — otherwise typing a
        // question mark into a prompt field would steal focus into the modal.
        event.preventDefault();
        setShortcutsOpen((open) => !open);
      } else if (event.key === "n" && !isTypingTarget(event)) {
        // F-n2-17 — "n" opens the New prompt form. Same typing-target
        // guard as "?" / "/" so typing the letter into a field doesn't
        // pop the modal.
        event.preventDefault();
        setForm({ mode: "create", initial: null });
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
        setSettingsOpen(false);
        setShortcutsOpen(false);
        setActivePrompt(null);
        setForm(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Hide Favorites/Recent rails whenever ANY filter is active — the user is
  // narrowing, not browsing.
  const showCuratedSections = activeCategory === null && activeTag === null;
  // The header reflects whichever filter(s) are active.
  const filteredHeading =
    activeCategory && activeTag
      ? `${activeCategory} · #${activeTag}`
      : (activeCategory ?? (activeTag ? `#${activeTag}` : "All prompts"));

  return (
    <div className="min-h-screen">
      <Header
        onOpenSearch={() => setPaletteOpen(true)}
        onOpenSettings={() => openSettings()}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        density={density}
        onChangeDensity={handleChangeDensity}
      />

      {storageWarning && (
        <div
          role="alert"
          className="border-b border-teal-300 bg-teal-50 px-6 py-3 text-sm text-teal-800 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <span>{storageWarning}</span>
            <button
              onClick={() => setStorageWarning(null)}
              className="rounded-md border border-teal-300 px-2 py-1 text-xs font-medium hover:bg-teal-100 dark:border-teal-500/40 dark:hover:bg-teal-500/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showApiKeyNudge && (
        <ApiKeyNudge onOpenSettings={() => openSettings()} onDismiss={dismissApiKeyNudge} />
      )}

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="relative pb-12 pt-16 sm:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-12 mx-auto h-64 max-w-3xl rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-500/10"
          />
          <div className="relative text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium uppercase tracking-wider text-ink-muted dark:border-night-border dark:bg-night-surface dark:text-paper-muted">
              <SparkleIcon className="h-3.5 w-3.5 text-teal-500" />
              Prompt Library
            </span>

            <h1 className="mx-auto mt-6 max-w-2xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink dark:text-paper sm:text-6xl">
              Your prompts, one keystroke away.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-muted dark:text-paper-muted">
              Search, customize, and run your best prompts with Claude — in seconds.
            </p>

            <button
              onClick={() => setPaletteOpen(true)}
              className="group mx-auto mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 text-left shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-cardHover dark:border-night-border dark:bg-night-surface"
            >
              <SearchIcon className="h-5 w-5 text-ink-soft transition-colors group-hover:text-teal-500" />
              <span className="flex-1 text-ink-soft dark:text-paper-muted">
                Search prompts by title, tag, or content…
              </span>
              <kbd className="rounded-md border border-border bg-cream px-2 py-1 font-sans text-xs font-medium text-ink-soft dark:border-night-border dark:bg-night">
                ⌘K
              </kbd>
            </button>

            {/* F-eve-3 — Resume pill. Only shown when the user has a recent
                prompt; one click opens it. Quiet visual treatment so it
                augments the hero without competing with the headline. */}
            {recentPrompts.length > 0 && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => openPrompt(recentPrompts[0])}
                  aria-label={`Resume the last prompt you opened: ${recentPrompts[0].title}`}
                  className="group flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-cream/60 px-4 py-1.5 text-xs font-medium text-ink-muted transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night/40 dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
                >
                  <ClockIcon className="h-3.5 w-3.5 shrink-0 text-teal-500" aria-hidden />
                  <span aria-hidden className="shrink-0">
                    Resume
                  </span>
                  <span aria-hidden className="shrink-0 text-ink-soft/60">
                    →
                  </span>
                  {/* flex-1 + min-w-0 are the magic that lets `truncate`
                      actually clip — without min-w-0 a flex child stays
                      at its content's intrinsic width and overflows. */}
                  <span className="min-w-0 flex-1 truncate text-left text-ink dark:text-paper">
                    {recentPrompts[0].title}
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>

        {showOnboarding && <OnboardingHint onDismiss={dismissOnboarding} />}

        <CategoryChips
          categories={categoriesWithCounts}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
        <TagChips tags={tagsWithCounts} active={activeTag} onSelect={setActiveTag} />

        {/* Favorites: either the populated grid, or a soft "you haven't
            favorited anything" hint shown ONLY to users who've already
            engaged with the app (have at least one recent open or one
            user-created prompt). New users see the OnboardingHint
            instead — no point showing two intro tiles at once. */}
        {showCuratedSections && favoritePrompts.length > 0 ? (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <StarIcon filled className="h-5 w-5 text-teal-500" />
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
                Favorites
              </h2>
            </div>
            <PromptGrid
              prompts={favoritePrompts}
              onOpen={openPrompt}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              onSelectTag={setActiveTag}
              runCounts={runCounts}
              lastRunIsos={lastRunIsos}
              density={density}
            />
          </section>
        ) : showCuratedSections &&
          favoritePrompts.length === 0 &&
          (recent.length > 0 || userPrompts.length > 0) ? (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <StarIcon filled className="h-5 w-5 text-teal-500" />
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
                Favorites
              </h2>
            </div>
            <EmptyHint
              icon={StarIcon}
              heading="No favorites yet"
              body="Click the ⭐ on any prompt to keep it at hand here."
            />
          </section>
        ) : null}

        {/* Recent: populated grid, or a soft hint after the user has
            favorited something but hasn't opened anything yet (rare —
            the typical path is "open → favorite", not the reverse).
            Pre-engagement: hide entirely, OnboardingHint covers it. */}
        {showCuratedSections && recentPrompts.length > 0 ? (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-teal-500" />
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
                Recent
              </h2>
            </div>
            <PromptGrid
              prompts={recentPrompts}
              onOpen={openPrompt}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              onSelectTag={setActiveTag}
              runCounts={runCounts}
              lastRunIsos={lastRunIsos}
              density={density}
            />
          </section>
        ) : showCuratedSections && recentPrompts.length === 0 && favorites.length > 0 ? (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-teal-500" />
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
                Recent
              </h2>
            </div>
            <EmptyHint
              icon={ClockIcon}
              heading="Nothing here yet"
              body="Prompts you open will show up here so they're easy to find again."
            />
          </section>
        ) : null}

        {/* All prompts */}
        <section className="pb-24 pt-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
              {filteredHeading}
            </h2>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-ink-muted sm:inline dark:text-paper-muted">
                {visiblePrompts.length} {visiblePrompts.length === 1 ? "prompt" : "prompts"}
              </span>
              {/* F-night-2 — Clear filters button. Visible only when at
                  least one filter is active, so it sits invisible during
                  the default browse view. One click clears both filters
                  at once (the empty-state "Clear filters" already exists
                  for the zero-result case; this puts the same affordance
                  in the header for the non-empty-but-filtered case). */}
              {(activeCategory || activeTag) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(null);
                    setActiveTag(null);
                  }}
                  aria-label="Clear active category and tag filters"
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition hover:border-teal-300 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
                >
                  Clear filters
                </button>
              )}
              {/* F-eve-1 — sort dropdown. Native <select> for full keyboard
                  + screen-reader support; the visible "Sort:" prefix is
                  aria-hidden because the select itself carries the
                  accessible name via aria-label. */}
              <div className="flex items-center gap-1.5 text-xs text-ink-soft dark:text-paper-muted">
                <span aria-hidden>Sort:</span>
                <select
                  value={sortMode}
                  onChange={(event) => handleChangeSort(event.target.value as SortMode)}
                  aria-label="Sort prompts"
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink transition hover:border-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night-surface dark:text-paper dark:focus-visible:ring-offset-night"
                >
                  {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                      {SORT_LABELS[mode]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setForm({ mode: "create", initial: null })}
                className="flex items-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-100 active:scale-95 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
              >
                <PlusIcon className="h-4 w-4" />
                New prompt
              </button>
            </div>
          </div>

          {visiblePrompts.length === 0 ? (
            activeCategory || activeTag ? (
              <div className="rounded-xl border border-dashed border-border bg-cream/40 px-6 py-10 text-center text-sm text-ink-muted dark:border-night-border dark:bg-night/40 dark:text-paper-muted">
                <p>No prompts match this filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(null);
                    setActiveTag(null);
                  }}
                  className="mt-3 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-teal-300 hover:text-teal-600 dark:border-night-border dark:bg-night dark:text-paper-muted"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              // F8 — truly-empty library (no filters active, no prompts at
              // all). Edge case: seeds ship with the app, so reaching here
              // means a user deleted every custom prompt AND the seeds are
              // somehow absent. Give them the same visual language as the
              // filtered case (dashed tile) but a forward-looking CTA that
              // matches the header's "New prompt" affordance — no dead end.
              <div className="rounded-xl border border-dashed border-border bg-cream/40 px-6 py-10 text-center text-sm text-ink-muted dark:border-night-border dark:bg-night/40 dark:text-paper-muted">
                <SparkleIcon
                  aria-hidden
                  className="mx-auto h-6 w-6 text-ink-soft dark:text-paper-muted"
                />
                <p className="mt-2 font-medium text-ink dark:text-paper">Your library is empty</p>
                <p className="mt-1 text-xs">Create your first prompt to get started.</p>
                <button
                  type="button"
                  onClick={() => setForm({ mode: "create", initial: null })}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Create your first prompt
                </button>
              </div>
            )
          ) : (
            <PromptGrid
              prompts={visiblePrompts}
              onOpen={openPrompt}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              onSelectTag={setActiveTag}
              runCounts={runCounts}
              lastRunIsos={lastRunIsos}
              density={density}
            />
          )}
        </section>

        {/* F-n2-2 — quiet stats line + F-n2-16 — version + privacy note. */}
        {(() => {
          const totalRuns = Array.from(runCounts.values()).reduce((a, b) => a + b, 0);
          return (
            <footer className="border-t border-border/50 py-6 text-center text-xs text-ink-soft dark:border-night-border/50 dark:text-paper-muted">
              <span
                aria-label={`Library stats: ${allPrompts.length} prompts, ${favorites.length} favorites, ${totalRuns} total runs`}
              >
                {allPrompts.length} prompts · {favorites.length} favorites · {totalRuns} total runs
              </span>
              <span aria-hidden className="mx-2">
                ·
              </span>
              <span>Prompt Library v0.1 · All data stays in this browser</span>
            </footer>
          );
        })()}
      </main>

      <CommandPalette
        open={paletteOpen}
        prompts={allPrompts}
        recentIds={recent}
        onClose={() => setPaletteOpen(false)}
        onSelect={openPrompt}
      />

      <PromptDetail
        prompt={activePrompt}
        settings={settings}
        isFavorite={activePrompt ? favorites.includes(activePrompt.id) : false}
        onClose={() => setActivePrompt(null)}
        onOpenSettings={openSettings}
        onToggleFavorite={() => activePrompt && toggleFavorite(activePrompt.id)}
        onEdit={() => activePrompt && setForm({ mode: "edit", initial: activePrompt })}
        onDuplicate={() =>
          activePrompt &&
          setForm({
            mode: "create",
            initial: { ...activePrompt, title: `${activePrompt.title} (copy)` },
          })
        }
        onCustomize={() =>
          activePrompt &&
          setForm({
            mode: "create",
            initial: { ...activePrompt, title: `${activePrompt.title} (custom)` },
          })
        }
        onDelete={() => activePrompt && deletePrompt(activePrompt.id)}
        onSelectTag={(tag) => {
          setActiveTag(tag);
          setActivePrompt(null);
        }}
        onRunCompleted={refreshRunCounts}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        notice={settingsNotice}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
        onLibraryImported={refreshLibraryFromStorage}
      />

      {form && (
        <PromptForm
          key={form.initial?.id ?? "new"}
          mode={form.mode}
          initial={form.initial}
          categories={categories}
          suggestedTags={tagsWithCounts.map((t) => t.tag)}
          onCancel={() => setForm(null)}
          onSubmit={submitForm}
        />
      )}

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
