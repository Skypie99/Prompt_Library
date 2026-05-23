"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Prompt } from "@/lib/types";
import { getCategories } from "@/lib/prompts";
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
import { Header } from "./Header";
import { PromptGrid } from "./PromptGrid";
import { CategoryChips } from "./CategoryChips";
import { CommandPalette } from "./CommandPalette";
import { PromptDetail } from "./PromptDetail";
import { SettingsModal } from "./SettingsModal";
import { OnboardingHint } from "./OnboardingHint";
import { PromptForm, type PromptFormValues } from "./PromptForm";
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
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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

    setSettings(loadSettings());
    setUserPrompts(loadUserPrompts());
    setFavorites(loadFavorites());
    setRecent(loadRecent());
    setShowOnboarding(!loadOnboarded());

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

  const categories = useMemo(() => getCategories(allPrompts), [allPrompts]);

  const visiblePrompts = useMemo(
    () => (activeCategory ? allPrompts.filter((p) => p.category === activeCategory) : allPrompts),
    [allPrompts, activeCategory],
  );

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
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
        setSettingsOpen(false);
        setActivePrompt(null);
        setForm(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showCuratedSections = activeCategory === null;

  return (
    <div className="min-h-screen">
      <Header onOpenSearch={() => setPaletteOpen(true)} onOpenSettings={() => openSettings()} />

      {storageWarning && (
        <div
          role="alert"
          className="border-b border-coral-300 bg-coral-50 px-6 py-3 text-sm text-coral-800 dark:border-coral-500/40 dark:bg-coral-500/10 dark:text-coral-200"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <span>{storageWarning}</span>
            <button
              onClick={() => setStorageWarning(null)}
              className="rounded-md border border-coral-300 px-2 py-1 text-xs font-medium hover:bg-coral-100 dark:border-coral-500/40 dark:hover:bg-coral-500/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="relative pb-12 pt-16 sm:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-12 mx-auto h-64 max-w-3xl rounded-full bg-coral-200/40 blur-3xl dark:bg-coral-500/10"
          />
          <div className="relative text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium uppercase tracking-wider text-ink-muted dark:border-night-border dark:bg-night-surface dark:text-paper-muted">
              <SparkleIcon className="h-3.5 w-3.5 text-coral-500" />
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
              className="group mx-auto mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 text-left shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:border-coral-200 hover:shadow-cardHover dark:border-night-border dark:bg-night-surface"
            >
              <SearchIcon className="h-5 w-5 text-ink-soft transition-colors group-hover:text-coral-500" />
              <span className="flex-1 text-ink-soft dark:text-paper-muted">
                Search prompts by title, tag, or content…
              </span>
              <kbd className="rounded-md border border-border bg-cream px-2 py-1 font-sans text-xs font-medium text-ink-soft dark:border-night-border dark:bg-night">
                ⌘K
              </kbd>
            </button>
          </div>
        </section>

        {showOnboarding && <OnboardingHint onDismiss={dismissOnboarding} />}

        <CategoryChips categories={categories} active={activeCategory} onSelect={setActiveCategory} />

        {/* Favorites */}
        {showCuratedSections && favoritePrompts.length > 0 && (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <StarIcon filled className="h-5 w-5 text-coral-500" />
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
                Favorites
              </h2>
            </div>
            <PromptGrid
              prompts={favoritePrompts}
              onOpen={openPrompt}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </section>
        )}

        {/* Recent */}
        {showCuratedSections && recentPrompts.length > 0 && (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-coral-500" />
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">Recent</h2>
            </div>
            <PromptGrid
              prompts={recentPrompts}
              onOpen={openPrompt}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </section>
        )}

        {/* All prompts */}
        <section className="pb-24 pt-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
              {activeCategory ?? "All prompts"}
            </h2>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-ink-muted sm:inline dark:text-paper-muted">
                {visiblePrompts.length} {visiblePrompts.length === 1 ? "prompt" : "prompts"}
              </span>
              <button
                onClick={() => setForm({ mode: "create", initial: null })}
                className="flex items-center gap-1.5 rounded-md border border-coral-300 bg-coral-50 px-3 py-1.5 text-sm font-medium text-coral-700 transition hover:bg-coral-100 active:scale-95 dark:border-coral-500/40 dark:bg-coral-500/10 dark:text-coral-300 dark:hover:bg-coral-500/20"
              >
                <PlusIcon className="h-4 w-4" />
                New prompt
              </button>
            </div>
          </div>

          <PromptGrid
            prompts={visiblePrompts}
            onOpen={openPrompt}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      </main>

      <CommandPalette
        open={paletteOpen}
        prompts={allPrompts}
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
        onDelete={() => activePrompt && deletePrompt(activePrompt.id)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        notice={settingsNotice}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
      />

      {form && (
        <PromptForm
          key={form.initial?.id ?? "new"}
          mode={form.mode}
          initial={form.initial}
          categories={categories}
          onCancel={() => setForm(null)}
          onSubmit={submitForm}
        />
      )}
    </div>
  );
}
