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
import { isTypingTarget } from "@/lib/dom";
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
import { ClockIcon, LockIcon, PlusIcon, SearchIcon, SparkleIcon, StarIcon } from "./icons";

interface FormState {
  mode: "create" | "edit";
  initial: Prompt | null;
}

// S14 — single source of truth for "should the API key nudge show?": no key
// saved, not dismissed this session, and no completed run yet (a run proves the
// key works). Same semantics as the prior inline check; sessionStorage is only
// read from effects/handlers, never during SSR/render.
function computeKeyNudge(apiKey: string, counts: Map<string, number>): boolean {
  if (apiKey) return false;
  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem("promptlib:keyNudgeDismissed") === "1";
  } catch {
    dismissed = false;
  }
  if (dismissed) return false;
  return !Array.from(counts.values()).some((c) => c > 0);
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
          ? "Your browser blocked saving changes — it may be full or in private browsing mode."
          : "Couldn't save changes to this browser. Your edits may not survive a reload.";
      setStorageWarning(msg);
    });

    // All setters below are one-time client-side hydration from localStorage.
    // useState initializers cannot be used here: SSR renders defaults first to
    // avoid hydration mismatch (localStorage unavailable on server). Intentional.
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    setUserPrompts(loadUserPrompts());
    setFavorites(loadFavorites());
    setRecent(loadRecent());
    const loadedCounts = loadAllRunCounts();
    setRunCounts(loadedCounts);
    setLastRunIsos(loadAllLastRunIsos());

    // F-r1 / S14 — first-run guidance is sequenced, not stacked. On a fresh
    // profile the OnboardingHint shows first (below the search box) and the
    // ApiKeyNudge top banner is held back until the hint is dismissed, so the
    // two notices never bracket the hero at once (see dismissOnboarding). A
    // returning user already onboarded but still without a key sees the nudge
    // immediately, exactly as before.
    const onboarded = loadOnboarded();
    setShowOnboarding(!onboarded);
    if (onboarded) {
      setShowApiKeyNudge(computeKeyNudge(loadedSettings.apiKey, loadedCounts));
    }
    setDensity(loadDensity());
    setSortMode(loadSort());

    return () => {
      setStorageWriteFailureHandler(null);
    };
  }, []);

  // ---- Derived data ----
  const allPrompts = useMemo(
    () => mergePrompts(userPrompts, seedPrompts),
    [userPrompts, seedPrompts],
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
    [categoriesWithCounts],
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
  // grid forever. This responds to derived data (tagsWithCounts), not a loop.
  useEffect(() => {
    if (activeTag && !tagsWithCounts.some((t) => t.tag === activeTag)) setActiveTag(null);
  }, [activeTag, tagsWithCounts]);

  const favoritePrompts = useMemo(
    () => favorites.map((id) => promptById.get(id)).filter((p): p is Prompt => Boolean(p)),
    [favorites, promptById],
  );
  const recentPrompts = useMemo(
    () => recent.map((id) => promptById.get(id)).filter((p): p is Prompt => Boolean(p)),
    [recent, promptById],
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
    [recordRecent],
  );

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    saveOnboarded();
    // S14 — the hint is gone, so surface the key nudge if it's still warranted.
    // ApiKeyNudge is role="status" (aria-live polite), so this fresh conditional
    // mount is announced politely — the same mechanism the nudge already uses
    // when it appears from the mount effect today.
    if (computeKeyNudge(settings.apiKey, runCounts)) setShowApiKeyNudge(true);
  }, [settings.apiKey, runCounts]);

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
    [form, recordRecent],
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
      {/* Skip-to-content: visually hidden until focused, then reveals above the header.
          Targets the main landmark so keyboard users can bypass the nav bar.
          SC 2.4.1 — bypass blocks. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-teal-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-night focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>
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
          className="border-b border-desert-300 bg-desert-50 px-6 py-3 text-sm text-desert-800 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <span>{storageWarning}</span>
            <button
              onClick={() => setStorageWarning(null)}
              className="rounded-md border border-desert-300 px-2 py-1 text-xs font-medium hover:bg-desert-100 dark:border-teal-500/40 dark:hover:bg-teal-500/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showApiKeyNudge && (
        <ApiKeyNudge onOpenSettings={() => openSettings()} onDismiss={dismissApiKeyNudge} />
      )}

      <main id="main-content" className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        {/* S4 — at lg+ the hero becomes a two-column grid so the permanently-
            empty right ~40% at >=1440 gains one restrained element (the
            featured card below). Left track = 36rem = the existing max-w-xl
            content width, so the stack keeps its width and the H1 keeps its
            wrap; the two absolute aria-hidden bg layers are position:absolute
            (not grid items) so they still fill the section. Grid is lg-gated:
            below lg the hero is byte-render-identical. */}
        <section className="relative pb-8 pt-10 sm:pb-12 sm:pt-24 lg:grid lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)] lg:items-center lg:gap-x-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-desert-hero dark:hidden"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden dark:block bg-dot-grid"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded border border-desert-400/30 bg-desert-400/5 px-3 py-1 font-mono text-xs font-medium uppercase tracking-widest text-desert-600 dark:border-teal-400/40 dark:bg-teal-400/10 dark:text-teal-400">
              <span aria-hidden>&gt;_</span>prompt.library<span className="opacity-60">/v2</span>
            </span>

            <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink dark:text-paper sm:text-5xl md:text-6xl">
              Your prompts, one keystroke away.
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted dark:text-paper-muted sm:text-lg">
              Search, customize, and run your best prompts with Claude — in seconds.
            </p>

            {/* Quiet trust line — names the WHAT (a private, on-device,
                bring-your-own-key runner) in the first 5 seconds, the most
                recruiter-legible fact. Restrained per the utility-app bar. */}
            <p className="mt-3 flex max-w-xl items-center gap-2 text-sm text-ink-soft dark:text-paper-muted">
              <LockIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />
              No account, no backend — your key and prompts never leave your browser.
            </p>

            <button
              onClick={() => setPaletteOpen(true)}
              className="group mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 text-left shadow-card transition duration-200 ease-out motion-safe:hover:-translate-y-px hover:border-desert-400/50 hover:shadow-cardHoverWarm dark:hover:shadow-cardHover dark:border-night-border dark:bg-night-surface"
            >
              <SearchIcon
                aria-hidden
                className="h-5 w-5 shrink-0 text-ink-soft transition-colors group-hover:text-desert-500 dark:text-paper-muted dark:group-hover:text-teal-400"
              />
              <span className="flex-1 font-mono text-sm text-ink-soft dark:text-paper-muted">
                search prompts...
              </span>
              <kbd className="rounded-md border border-border bg-cream px-2 py-1 font-mono text-xs font-medium text-ink-soft dark:border-night-border dark:bg-night">
                ⌘K
              </kbd>
            </button>

            {/* F-eve-3 — Resume pill. Only shown when the user has a recent
                prompt; one click opens it. Quiet visual treatment so it
                augments the hero without competing with the headline. */}
            {recentPrompts.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => openPrompt(recentPrompts[0])}
                  aria-label={`Resume the last prompt you opened: ${recentPrompts[0].title}`}
                  className="group flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-cream/60 px-4 py-1.5 text-xs font-medium text-ink-muted transition hover:border-desert-300 hover:text-desert-700 motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:focus-visible:ring-desert-400 dark:border-night-border dark:bg-night/40 dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
                >
                  <ClockIcon className="h-3.5 w-3.5 shrink-0 text-desert-500" aria-hidden />
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

          {/* S4 — featured/recent card. Fills the permanently-empty right ~40%
              of the hero at lg+. A restrained, PromptCard-styled panel of
              AMBIENT browse content: no teal action fill, no shadow, no lift —
              only a border-tint hover — so it never competes with the teal
              hero search box. `relative` lifts it above the two aria-hidden
              gradient/dot-grid layers (position:absolute, not grid items);
              `hidden lg:block` keeps the sub-lg hero byte-identical; as grid
              item 2 it is placed AFTER the search box + Resume pill in DOM, so
              focus order follows. SSR + first client render both show a seed
              (favorites/recent hydrate from localStorage after mount, exactly
              like the Resume pill above), so there is no hydration mismatch —
              only a post-hydration swap to the user's recent/favorite. */}
          <div className="relative hidden min-w-0 lg:block">
            {(() => {
              const fav = favoritePrompts[0];
              const recentTop = recentPrompts[0];
              const featured = fav ?? recentTop ?? seedPrompts[0];
              if (!featured) return null;
              const fromRecent = (!fav || fav.id !== featured.id) && recentTop?.id === featured.id;
              const Kicker = fromRecent ? ClockIcon : SparkleIcon;
              const kickerLabel = fromRecent ? "Recent" : "Featured";
              return (
                <button
                  type="button"
                  onClick={() => openPrompt(featured)}
                  aria-label={`Open ${kickerLabel.toLowerCase()} prompt: ${featured.title}`}
                  className="group flex w-full flex-col rounded-xl border border-border bg-surface p-5 text-left transition duration-200 ease-out hover:border-desert-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night-surface dark:hover:border-teal-400/40 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-night"
                >
                  <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-soft dark:text-paper-muted">
                    <Kicker aria-hidden className="h-3.5 w-3.5 shrink-0" />
                    {kickerLabel}
                  </span>
                  <span className="mt-3 inline-flex w-fit items-center rounded-full bg-desert-100 px-2.5 py-0.5 text-xs font-medium text-desert-700 dark:bg-teal-500/15 dark:text-teal-300">
                    {featured.category}
                  </span>
                  <span className="mt-3 font-display text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-desert-600 dark:text-paper dark:group-hover:text-teal-300">
                    {featured.title}
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted dark:text-paper-muted">
                    {featured.description}
                  </span>
                  {featured.tags.length > 0 && (
                    <span className="mt-4 flex flex-wrap gap-1.5">
                      {featured.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-cream px-2 py-0.5 text-xs text-ink-muted dark:bg-night dark:text-paper-muted"
                        >
                          #{tag}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
        </section>

        {showOnboarding && <OnboardingHint onDismiss={dismissOnboarding} />}

        {/* S11 — polite results announcer. Persistent + aria-atomic so the
            live region is registered before its text mutates; role=status ⇒
            aria-live=polite (the calmer channel; the error path at
            PromptDetail uses role=alert). Announces the zero-result recovery
            line AND the filtered count on every filter change — covering the
            count span, which is hidden below sm and otherwise never spoken
            (SC 4.1.3). The visible recovery banner is NOT a live region, so
            nothing double-announces. */}
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {activeCategory || activeTag
            ? visiblePrompts.length === 0
              ? `No prompts match ${filteredHeading}. Filter still active — clear it or choose another tag.`
              : `${visiblePrompts.length} ${visiblePrompts.length === 1 ? "prompt" : "prompts"} in ${filteredHeading}.`
            : ""}
        </p>
        <CategoryChips
          categories={categoriesWithCounts}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
        {/* S11 (hoist) — when a filter yields zero matches, lift a compact
            recovery banner ABOVE the tag cloud so "nothing matched + clear" is
            reachable without scrolling past the fully-expanded (never trimmed)
            cloud, and it gives keyboard users an early tab stop. The lower
            in-context zero tile stays; this is the top-of-cloud shortcut. Room
            palette only (border/ink/desert) — no teal, no competing CTA. The
            screen-reader announce is handled by the sr-only live region above,
            so this banner is not itself a live region (no double-announce). */}
        {visiblePrompts.length === 0 && (activeCategory || activeTag) && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-border bg-cream/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-night-border dark:bg-night/40">
            <p className="text-sm text-ink-muted dark:text-paper-muted">
              <span className="font-medium text-ink dark:text-paper">
                No prompts match {filteredHeading}
              </span>{" "}
              — pick another tag below, or clear the filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory(null);
                setActiveTag(null);
              }}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 self-start rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-desert-300 hover:text-desert-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-1 focus-visible:ring-offset-cream sm:self-auto dark:border-night-border dark:bg-night dark:text-paper-muted dark:focus-visible:ring-desert-400 dark:focus-visible:ring-offset-night"
            >
              Clear filters
            </button>
          </div>
        )}
        <TagChips tags={tagsWithCounts} active={activeTag} onSelect={setActiveTag} />

        {/* Favorites: either the populated grid, or a soft "you haven't
            favorited anything" hint shown ONLY to users who've already
            engaged with the app (have at least one recent open or one
            user-created prompt). New users see the OnboardingHint
            instead — no point showing two intro tiles at once. */}
        {showCuratedSections && favoritePrompts.length > 0 ? (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <StarIcon filled className="h-5 w-5 text-desert-500" />
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
              <StarIcon filled className="h-5 w-5 text-desert-500" />
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
              <ClockIcon className="h-5 w-5 text-desert-500" />
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
              <ClockIcon className="h-5 w-5 text-desert-500" />
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
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
              {filteredHeading}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition hover:border-desert-300 hover:text-desert-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:focus-visible:ring-desert-400 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-offset-night"
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
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink transition hover:border-desert-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:focus-visible:ring-desert-400 dark:border-night-border dark:bg-night-surface dark:text-paper dark:focus-visible:ring-offset-night"
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
                className="flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-100 active:scale-95 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
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
                  className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-desert-300 hover:text-desert-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-1 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night dark:text-paper-muted dark:focus-visible:ring-desert-400 dark:focus-visible:ring-offset-night"
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
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
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
              <span>
                Built by{" "}
                <a
                  href="https://skypistudio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 underline underline-offset-2 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 dark:text-teal-300 dark:hover:text-teal-200"
                >
                  Sky Halisky
                </a>{" "}
                · All data stays in this browser ·{" "}
                <a
                  href="https://skypistudio.com/contact/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 underline underline-offset-2 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 dark:text-teal-300 dark:hover:text-teal-200"
                >
                  open to thoughtful product collaborations
                </a>
              </span>
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
        onOpenShortcuts={() => {
          setSettingsOpen(false);
          setShortcutsOpen(true);
        }}
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
