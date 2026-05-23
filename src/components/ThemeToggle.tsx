"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

// Flips the `dark` class on <html> and remembers the choice. The initial theme
// is applied by the no-flash script in layout.tsx before React mounts; here we
// just sync our local state to whatever that script decided.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("promptlib:theme", next ? "dark" : "light");
    } catch {
      /* localStorage can be unavailable (private mode) — ignore. */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-400"
    >
      {dark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
