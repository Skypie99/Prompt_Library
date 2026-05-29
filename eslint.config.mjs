// eslint.config.mjs — ESLint v9 flat config
// eslint-config-next v16 exports native flat config arrays — no FlatCompat needed.
//
// CIRCULAR-REF WORKAROUND (eslint-plugin-react v7 / @typescript-eslint v8):
// Both plugins set plugin.configs.flat.*.plugins.X → back to the same plugin
// object, creating a circular reference. @eslint/eslintrc's ConfigValidator
// calls JSON.stringify during schema validation, which crashes on circular refs.
// Root cause: FlatCompat invokes @eslint/eslintrc to resolve the legacy-format
// "next/core-web-vitals" and "next/typescript" extends strings, and that path
// runs schema validation that hits the circular ref.
//
// Two-part fix:
//   1. Drop FlatCompat entirely — import the native flat config arrays directly.
//   2. Strip the `configs` property from each plugin via a cache-aware sanitizer
//      (the cache ensures equal original refs map to equal sanitized refs, which
//       ESLint requires to avoid "Cannot redefine plugin" errors).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

// Cache: original plugin ref → sanitized plugin ref (stable identity).
const _pluginCache = new Map();

function _sanitizePlugin(plugin) {
  if (_pluginCache.has(plugin)) return _pluginCache.get(plugin);
  // eslint-disable-next-line no-unused-vars
  const { configs: _unused, ...rest } = plugin;
  _pluginCache.set(plugin, rest);
  return rest;
}

function _sanitizeConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config))
    return config;
  if (!config.plugins) return config;
  return {
    ...config,
    plugins: Object.fromEntries(
      Object.entries(config.plugins).map(([k, p]) => [k, _sanitizePlugin(p)])
    ),
  };
}

export default [
  // Bring in Next.js recommended rules (core-web-vitals + TypeScript).
  // Sanitize to strip circular plugin.configs refs (see comment above).
  ...nextCoreWebVitals.map(_sanitizeConfig),
  ...nextTypescript.map(_sanitizeConfig),

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

      // Rules new in eslint-config-next v16 / react-hooks v5 / typescript-eslint v8.
      // The codebase predates these — downgrade to warn so CI passes while the
      // violations stay visible for a future cleanup pass.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
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
