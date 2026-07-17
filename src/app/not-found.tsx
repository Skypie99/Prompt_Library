import type { Metadata } from "next";

// S5 — Own the 404 (Fable-audit Part-3, phase BP6). SERVER component on purpose:
// no "use client", no hooks, no client JS → it stays fully static-exportable and
// `output:"export"` emits out/404.html from it (the framework default it replaces
// had no wordmark, no theme, no way home). It renders INSIDE the root layout, so
// the cream→night surface flip (globals.css body base), the three self-hosted
// fonts, the no-flash theme <script>, and <ThemeSync/> all apply — this page needs
// NO theme logic of its own. The signature marks (the `>_` terminal eyebrow, the
// hero H1 type, the Resume-pill back-affordance) are mirrored INLINE as class
// strings because HomeClient/Header are client islands we must not import here.
// LOCKED-safe: every color/utility is an existing token — no recolor, no new
// keyframe (the only motion is the pill's motion-safe hover, already in the app).
export const metadata: Metadata = {
  title: "Page not found — Prompt Library",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      {/* Ambient two-accent surface — STATIC gradients (no animation), the same
          layers the hero uses (HomeClient.tsx): warm desert-sun glow in light,
          faint cyan dot-grid in dark. Decorative → aria-hidden. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-desert-hero dark:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden dark:block bg-dot-grid"
      />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center">
        {/* `>_` terminal eyebrow — mirrors the hero eyebrow (HomeClient.tsx:480),
            label swapped to 404. The glyph is aria-hidden; desert in light /
            neon-teal in dark. */}
        <span className="inline-flex items-center gap-2 rounded border border-desert-400/30 bg-desert-400/5 px-3 py-1 font-mono text-xs font-medium uppercase tracking-widest text-desert-600 dark:border-teal-400/40 dark:bg-teal-400/10 dark:text-teal-400">
          <span aria-hidden>&gt;_</span>404
        </span>

        {/* The page's single H1 — house Fraunces display pattern (layout renders
            no heading, so this is the only h1). */}
        <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink dark:text-paper sm:text-5xl md:text-6xl">
          This prompt got away.
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted dark:text-paper-muted sm:text-lg">
          That page isn&apos;t here — but your whole library is a click away.
        </p>

        {/* Back to the library — a REAL focusable link home (plain <a href="/">;
            the app has no next/link, trailingSlash:true resolves to root). Reuses
            the Resume-pill affordance + the canonical desert-600/desert-400 focus
            ring settled in S15 (BP3). The arrow is aria-hidden so the link's
            accessible name is exactly "Back to the library". */}
        <a
          href="/"
          className="group mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-cream/60 px-4 py-1.5 text-xs font-medium text-ink-muted transition hover:border-desert-300 hover:text-desert-700 motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-desert-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream dark:border-night-border dark:bg-night/40 dark:text-paper-muted dark:hover:text-teal-300 dark:focus-visible:ring-desert-400 dark:focus-visible:ring-offset-night"
        >
          <span aria-hidden className="shrink-0">
            &larr;
          </span>
          Back to the library
        </a>
      </div>
    </main>
  );
}
