// eslint.config.mjs — ESLint v9 flat config
//
// eslint-config-next v15 relies on @rushstack/eslint-patch which is incompatible
// with ESLint v9 flat config. Instead we wire up the same rule sets directly:
//   - @typescript-eslint/eslint-plugin flat/recommended (covers TS-aware rules)
//   - eslint-plugin-react-hooks recommended-latest (flat config)
//   - eslint-config-prettier (disables conflicting style rules)
//   - eslint-plugin-prettier (surface formatting as warnings)
//
// When eslint-config-next ships a stable flat-config release (v16+), this file
// should be simplified back to the nextCoreWebVitals/nextTypescript import style.
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
  // TypeScript-aware rules (flat/recommended).
  // Uses type-unaware variant to avoid needing tsconfig project in CI.
  ...tsPlugin.configs["flat/recommended"],

  // Override parser + language options for all TS/TSX files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
  },

  // React Hooks rules
  {
    plugins: { "react-hooks": reactHooksPlugin },
    rules: reactHooksPlugin.configs["recommended-latest"].rules,
  },

  // Disable any Prettier-conflicting ESLint style rules
  prettierConfig,

  // Project-level rule overrides
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      // Surface Prettier formatting as warnings (auto-fixable)
      "prettier/prettier": "warn",

      // React Hooks — exhaustive-deps as warning (common, non-blocking)
      "react-hooks/exhaustive-deps": "warn",

      // Unused vars: allow _ prefix (e.g. _event, _index)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // console.log left in source code
      "no-console": "warn",

      // @ts-expect-error must include a description (3+ chars).
      // Downgrade to warn — existing comments are deliberate stubs in tests.
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        {
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 3,
        },
      ],
    },
  },

  // Files to ignore entirely
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "*.config.js",
      "*.config.mjs",
      "postcss.config.js",
      "tailwind.config.ts",
      // Next.js auto-generated file — not user-editable
      "next-env.d.ts",
    ],
  },
];
