import type { Metadata, Viewport } from "next";

import { ThemeSync } from "@/components/ThemeSync";

// Self-hosted variable fonts (no runtime request to Google) — works offline and
// on a static host. Inter for UI/body, Fraunces for the characterful display.
// Fraunces is imported via its `opsz` build (carries wght + the optical-size
// axis, 9–144) rather than the default wght-only build: with
// font-optical-sizing:auto (the CSS default) the browser then matches opsz to
// font-size, so big display headings get Fraunces' high-contrast DISPLAY cut
// and small text its TEXT cut. Costs ~+30KB on the latin woff2 — a deliberate
// trade for the hero reading as type drawn for its size, not scaled up.
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://prompts.skypistudio.com"),
  title: "Prompt Library",
  description: "Search, customize, and run your prompts with Claude in seconds.",
  // Authorship so the project reads as Sky's work, not an anonymous demo.
  authors: [{ name: "Sky Halisky", url: "https://skypistudio.com" }],
  creator: "Sky Halisky",
  // og:image / twitter:image are auto-wired from src/app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    url: "https://prompts.skypistudio.com",
    siteName: "Prompt Library",
    title: "Prompt Library",
    description: "Search, customize, and run your prompts with Claude in seconds.",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Library",
    description: "Search, customize, and run your prompts with Claude in seconds.",
  },
};

// Mobile viewport. Without this, phones lay the page out at desktop width and
// clip the right edge (header buttons, headline, chips). `viewport-fit: cover`
// lets the bottom-sheet pad against `env(safe-area-inset-bottom)` on notched
// iPhones. App Router turns this export into the <meta name="viewport"> tag.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before first paint to apply the right theme, avoiding a flash of the
// wrong colors on reload.
//   - If the user has previously chosen a theme (the toggle stores 'dark' or
//     'light'), honor that choice — it's authoritative.
//   - Otherwise (first visit, or storage cleared), fall back to the OS-level
//     `prefers-color-scheme` so a user with dark mode set on their machine
//     lands in dark mode by default.
// The toggle still writes an explicit preference the moment the user clicks
// it, at which point we stop following the system.
// "system" is stored as the ABSENCE of the key (or the literal string
// "system"). Either path falls through to matchMedia. F-n2-9.
const noFlashTheme = `(function(){try{var s=localStorage.getItem('promptlib:theme');if(s==='dark'){document.documentElement.classList.add('dark');return;}if(s==='light'){return;}if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme delivery is a two-part contract (F-n2-9):
  //   1. The no-flash <script> below sets `class="dark"` on <html> before first
  //      paint, so a dark-preferring visitor never sees a light flash.
  //   2. <ThemeSync> re-asserts that class after hydration — because React 19
  //      treats <html> as a HostSingleton and, on the hydration commit, WIPES
  //      every attribute on it and re-applies only the JSX props (`lang` — no
  //      className), deleting the script's `dark` class ~240ms in.
  // `suppressHydrationWarning` only silences the dev warning for that mismatch;
  // it does NOT stop the singleton attribute reset (an earlier fix that relied
  // on it alone did not hold — see design-reviews/fable-audit S1). ThemeSync is
  // a direct child of <body> so its pre-paint layout-effect runs in the same
  // hydration commit as the wipe, re-adding the class before any frame paints.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
