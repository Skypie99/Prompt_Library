import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    // Default environment for pure-logic tests (src/lib/__tests__)
    environment: "node",
    // Component tests (.tsx) and anything under tests/smoke/ or tests/components/
    // get jsdom automatically — no per-file @vitest-environment docblock needed.
    environmentMatchGlobs: [
      ["**/*.test.tsx", "jsdom"],
      ["**/tests/smoke/**", "jsdom"],
      ["**/tests/components/**", "jsdom"],
    ],
    setupFiles: ["./tests/setup.ts"],
    include: [
      "src/**/__tests__/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
    ],
  },
});
