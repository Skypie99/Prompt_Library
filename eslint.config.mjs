// eslint.config.mjs — ESLint v9 flat config
// Uses FlatCompat to bridge eslint-config-next (legacy format) into v9.
import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // Bring in Next.js recommended rules (core-web-vitals + TypeScript)
  ...compat.extends("next/core-web-vitals", "next/typescript"),

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
