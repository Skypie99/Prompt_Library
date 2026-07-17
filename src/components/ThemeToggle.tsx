"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

// F-n2-9 — three-way theme: explicit Light / Dark / follow System.
// The stored value (`promptlib:theme`) is one of "light" | "dark" | "system"
// (or absent = "system"). The no-flash script in layout.tsx still reads
// this same key — when it's "system" (or missing), the script consults
// matchMedia. When it's "light" / "dark", the script honors the choice.

type Mode = "light" | "dark" | "system";

// useLayoutEffect on the client (fires after DOM mutations, BEFORE the browser
// paints — so a re-assert lands before any frame is shown); plain useEffect on
// the server so the static-export prerender doesn't warn "useLayoutEffect does
// nothing on the server". See ThemeSync for why the re-assert is needed at all.
const useIsoLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

// Single source of truth for "is dark applied". Used by BOTH applyMode (the
// class on <html>) and the header glyph, so the icon can never disagree with the
// page (no sun over a cream page). F-n2-9.
export function isDarkFor(mode: Mode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function readStored(): Mode {
  try {
    const v = localStorage.getItem("promptlib:theme");
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* unavailable */
  }
  return "system";
}

export function applyMode(mode: Mode): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDarkFor(mode));
}

function persist(mode: Mode): void {
  try {
    if (mode === "system") {
      localStorage.removeItem("promptlib:theme");
    } else {
      localStorage.setItem("promptlib:theme", mode);
    }
  } catch {
    /* private mode / disabled — ignore */
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  // Mirrors the APPLIED theme (drives the glyph). Starts false so the server and
  // the first client render both draw the moon — no hydration mismatch — then
  // the layout-effect below corrects it before paint.
  const [isDark, setIsDark] = useState(false);

  // Sync local state to the stored preference on mount. useState cannot call
  // readStored() as its initializer because localStorage is unavailable during
  // the static-export prerender (that would be an SSR hydration mismatch); the
  // layout-effect runs client-side, after DOM mutations but before paint.
  useIsoLayoutEffect(() => {
    const stored = readStored();
    setMode(stored);
    setIsDark(isDarkFor(stored));
  }, []);

  // F-n2-9 — when mode is "system", track changes to the OS preference
  // live (toggling your laptop theme updates the app without a refresh).
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyMode("system");
      setIsDark(isDarkFor("system"));
    };
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [mode]);

  function cycle() {
    // Cycle: light → dark → system → light...
    const next: Mode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
    persist(next);
    applyMode(next);
    setIsDark(isDarkFor(next));
  }

  const label =
    mode === "light"
      ? "Light mode (click for dark)"
      : mode === "dark"
        ? "Dark mode (click for system)"
        : "Following system (click for light)";

  return (
    <button
      onClick={cycle}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-desert-300 hover:text-desert-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-teal-400 dark:focus-visible:ring-offset-night"
    >
      {/* Icon is sourced from the APPLIED theme (isDark) — set pre-paint by the
          mount layout-effect and kept in sync on cycle()/OS change — so a sun
          never appears over a cream page. system + dark OS shows a sun (clicking
          goes to light); less ambiguous than a dedicated "system" glyph. */}
      {isDark ? (
        <SunIcon className="h-[18px] w-[18px]" />
      ) : (
        <MoonIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
