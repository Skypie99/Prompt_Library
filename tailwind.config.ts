import type { Config } from "tailwindcss";

// Desert Parchment (light) / Neon Terminal (dark):
//   Light mode = warm sandy parchment, amber/sienna accent
//   Dark mode  = near-black with electric cyan accent
// darkMode: "class" — flip a `dark` class on <html>.
//
// TWO-ACCENT SYSTEM (the room vs. the button you press):
//   • desert = AMBIENT / brand / nav / browse — the warm "room": wordmark,
//     `>_` logo, hero eyebrow + gradient, category chips, tag-filter chips,
//     the favorite star (gold-star metaphor), header chrome, scrollbars.
//   • teal   = ACTION — primary CTAs, the run moment, pending selection.
//     Applies in BOTH themes (light + dark), so a "press me" control reads
//     teal whether the room is amber or neon.
//   AA on solid teal: a filled teal button (teal-500/600) carries DARK text
//   (text-night, ~5–8:1) — never white (white-on-teal-500 is only 2.4:1).
//   This keeps the neon fill bright AND passes WCAG 1.4.3.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light surfaces — warm parchment, sandy tone
        cream: "#FDF6E3",
        surface: "#FFFCF5",
        border: "#E5CFA4",

        // Warm ink
        ink: {
          DEFAULT: "#1A1410",
          muted: "#6E5C4A",
          // Darkened from #9E8A74 to #826D58 for WCAG 1.4.3 AA:
          // 4.55:1 on cream (#FDF6E3), 4.79:1 on surface (#FFFCF5).
          // Remains visibly lighter than ink-muted (#6E5C4A, 5.91:1).
          soft: "#826D58",
        },

        // Dark surfaces — near-black with a slight blue cast
        night: {
          DEFAULT: "#080A12",
          surface: "#0E1120",
          border: "#1A2240",
        },
        paper: {
          DEFAULT: "#C9D1E0",
          muted: "#7B8AA0",
        },

        // Semantic feedback scales (F5 export/import confirmation flows)
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          300: "#86EFAC",
          400: "#4ADE80",
          700: "#15803D",
          900: "#14532D",
        },

        danger: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },

        // Light-mode accent: warm desert amber/sienna
        desert: {
          50: "#FDF7EE",
          100: "#FAECCC",
          200: "#F5D898",
          300: "#E8B96A",
          400: "#D4894A",
          500: "#B86B30",
          600: "#9A5020", // 4.9:1 contrast on cream — WCAG AA ✓
          700: "#7C3A14",
          800: "#5C2A0C",
          900: "#3D1A07",
        },

        // Dark-mode accent: electric cyan (neon terminal)
        teal: {
          50: "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#22D3EE", // dark-mode neon
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
          800: "#155E75",
          900: "#164E63",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
        display: ['"Fraunces Variable"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "Fira Code", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.12), 0 8px 24px -8px rgba(0,0,0,0.16)",
        // Light-mode: warm amber hover glow
        cardHoverWarm:
          "0 0 0 1px rgba(184, 107, 48, 0.28), 0 0 20px rgba(184, 107, 48, 0.08), 0 4px 14px rgba(100, 55, 12, 0.12)",
        // Dark-mode: neon cyan hover glow
        cardHover:
          "0 0 0 1px rgb(34 211 238 / 0.5), 0 0 24px rgb(34 211 238 / 0.12), 0 4px 16px rgba(0,0,0,0.3)",
        palette: "0 24px 60px -20px rgba(0,0,0,0.5)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        // Bottom-sheet entrance on mobile (Sheet primitive). Desktop uses scale-in.
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "scale-in": "scale-in 200ms ease-out",
        pop: "pop 250ms ease-out",
        "slide-up": "slide-up 240ms cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
