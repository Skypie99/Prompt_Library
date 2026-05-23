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

// Runs before first paint to apply the saved theme, avoiding a flash of the
// wrong colors on reload. Default is light unless the user chose dark.
const noFlashTheme = `(function(){try{if(localStorage.getItem('promptlib:theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

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
