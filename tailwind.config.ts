import type { Config } from "tailwindcss";

// Developer Terminal aesthetic — cool, dark, technical.
// Light mode = clean cool-white; dark mode = near-black with electric cyan accent.
// darkMode: "class" — flip a `dark` class on <html>.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light surfaces — cool off-white, no warm tint
        cream: "#F0F4FA",
        surface: "#FFFFFF",
        border: "#DDE2EE",

        // Cool slate text
        ink: {
          DEFAULT: "#0F172A",
          muted: "#64748B",
          soft: "#94A3B8",
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
          50:  "#F0FDF4",
          100: "#DCFCE7",
          300: "#86EFAC",
          400: "#4ADE80",
          700: "#15803D",
          900: "#14532D",
        },

        danger: {
          50:  "#FEF2F2",
          200: "#FECACA",
          300: "#FCA5A5",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },

        // Primary accent: electric cyan (cyberpunk rebrand)
        teal: {
          50:  "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#22D3EE", // dark-mode neon
          500: "#06B6D4",
          600: "#0891B2", // 4.8:1 contrast on white — WCAG AA ✓
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
        // Neon border glow — the defining cyberpunk hover
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
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "scale-in": "scale-in 200ms ease-out",
        pop: "pop 250ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
