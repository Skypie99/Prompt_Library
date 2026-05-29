import type { Config } from "tailwindcss";

// The whole palette lives here so the "warm, approachable" look is defined in
// one place. Light mode is the default; `darkMode: "class"` lets us flip a
// `dark` class on <html> for the optional dark theme.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light surfaces
        cream: "#FAF6EF", // page background — soft, warm off-white
        surface: "#FFFDF9", // cards / modals — a hair brighter than the page
        border: "#ECE3D5", // hairline borders

        // Warm charcoal text (never pure black)
        ink: {
          DEFAULT: "#2A2520",
          muted: "#6E665C",
          soft: "#938A7E",
        },

        // Dark surfaces (warm near-black, not blue-black)
        night: {
          DEFAULT: "#1C1916",
          surface: "#26221E",
          border: "#38322B",
        },
        paper: {
          DEFAULT: "#F1EBE1",
          muted: "#A89E90",
        },

        // The single accent: a muted, earthy coral
        coral: {
          50: "#FDF3EF",
          100: "#FAE3DA",
          200: "#F4C7B6",
          300: "#ECA88E",
          400: "#E48468",
          500: "#DC6B4E",
          600: "#C85539",
          700: "#A6442D",
          800: "#853828",
          900: "#6E3024",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
        display: ['"Fraunces Variable"', "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(42, 37, 32, 0.04), 0 8px 24px -12px rgba(42, 37, 32, 0.12)",
        cardHover: "0 2px 4px rgba(42, 37, 32, 0.06), 0 16px 40px -16px rgba(220, 107, 78, 0.28)",
        palette: "0 24px 60px -20px rgba(42, 37, 32, 0.35)",
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
