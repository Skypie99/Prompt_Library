"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

// F-n2-9 — three-way theme: explicit Light / Dark / follow System.
// The stored value (`promptlib:theme`) is one of "light" | "dark" | "system"
// (or absent = "system"). The no-flash script in layout.tsx still reads
// this same key — when it's "system" (or missing), the script consults
// matchMedia. When it's "light" / "dark", the script honors the choice.

type Mode = "light" | "dark" | "system";

function readStored(): Mode {
  try {
    const v = localStorage.getItem("promptlib:theme");
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* unavailable */
  }
  return "system";
}

function applyMode(mode: Mode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  let dark: boolean;
  if (mode === "dark") {
    dark = true;
  } else if (mode === "light") {
    dark = false;
  } else {
    dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  root.classList.toggle("dark", dark);
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

  // Sync local state to the stored preference on mount. This is a one-time
  // client-side hydration: useState cannot use readStored() directly because
  // localStorage is unavailable on the server (SSR hydration mismatch).
  useEffect(() => {
    setMode(readStored());
  }, []);

  // F-n2-9 — when mode is "system", track changes to the OS preference
  // live (toggling your laptop theme updates the app without a refresh).
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyMode("system");
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, [mode]);

  function cycle() {
    // Cycle: light → dark → system → light...
    const next: Mode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
    persist(next);
    applyMode(next);
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
      {/* Icon reflects current effective theme, not the mode itself —
          system + dark OS shows a sun (because clicking would go to
          light). Less ambiguous than a "system" glyph. */}
      {mode === "dark" ||
      (mode === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches) ? (
        <SunIcon className="h-[18px] w-[18px]" />
      ) : (
        <MoonIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
