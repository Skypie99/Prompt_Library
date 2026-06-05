import type { Metadata, Viewport } from "next";

// Self-hosted variable fonts (no runtime request to Google) — works offline and
// on a static host. Inter for UI/body, Fraunces for the characterful display.
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "@fontsource/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Library",
  description: "Search, customize, and run your prompts with Claude in seconds.",
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
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
        {children}
      </body>
    </html>
  );
}
