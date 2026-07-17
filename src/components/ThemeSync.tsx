"use client";

import { useEffect, useLayoutEffect } from "react";
import { applyMode, readStored } from "./ThemeToggle";

// useLayoutEffect on the client (before paint), plain useEffect on the server
// (avoids the prerender warning). Mirror of the shim in ThemeToggle.
const useIsoLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Re-asserts the theme class that React 19 strips on hydration.
 *
 * `<html>` is a React 19 *HostSingleton*. On the hydration commit React runs
 * `acquireSingletonInstance`, which removes EVERY attribute on `<html>` and
 * re-applies only the JSX props (`lang="en"` — there is no `className` prop),
 * wiping the `class="dark"` that layout.tsx's pre-paint no-flash script set.
 * `suppressHydrationWarning` does NOT prevent this — it only silences the dev
 * warning; the singleton attribute reset happens regardless. (Observed timeline
 * on the static export: dark added ~11ms, stripped ~240ms.)
 *
 * This component re-applies the stored preference in a layout effect, which
 * fires after DOM mutations but BEFORE the browser paints. It is rendered as a
 * direct child of <body> (a sibling of the page tree) so it hydrates in the
 * ROOT SHELL commit — the same synchronous layout-effect walk that runs the
 * <html> wipe — guaranteeing re-assert-after-wipe with no visible flash,
 * independent of ThemeToggle's depth or any future Suspense/loading.tsx
 * boundary in the page segment. Renders nothing. F-n2-9.
 */
export function ThemeSync() {
  useIsoLayoutEffect(() => {
    applyMode(readStored());
  }, []);
  return null;
}
