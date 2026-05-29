// eslint.config.mjs — ESLint v9 flat config
// eslint-config-next v16 exports native flat config arrays — no FlatCompat needed.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
  // Bring in Next.js recommended rules (core-web-vitals + TypeScript)
  ...nextCoreWebVitals,
  ...nextTypescript,

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
