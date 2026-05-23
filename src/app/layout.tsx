import type { Metadata } from "next";

// Self-hosted variable fonts (no runtime request to Google) — works offline and
// on a static host. Inter for UI/body, Fraunces for the characterful display.
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Library",
  description: "Search, customize, and run your prompts with Claude in seconds.",
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
const noFlashTheme = `(function(){try{var s=localStorage.getItem('promptlib:theme');if(s==='dark'){document.documentElement.classList.add('dark');return;}if(s==='light'){return;}if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
        {children}
      </body>
    </html>
  );
}
