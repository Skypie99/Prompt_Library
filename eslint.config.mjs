// eslint.config.mjs — ESLint v9 flat config
// eslint-config-next v16 exports native flat config arrays — no FlatCompat needed.
//
// CIRCULAR-REF WORKAROUND (eslint-plugin-react v7 / @typescript-eslint v8):
// Both plugins attach their own flat config presets as plugin.configs.flat, and
// those preset objects contain plugin.configs.flat.*.plugins.X → back to the
// same plugin object — a circular reference. @eslint/eslintrc's config-validator
// calls JSON.stringify on the whole config for error formatting, which crashes.
// Fix: strip the `configs` property from each plugin object with a cache-aware
// sanitizer (cache ensures equal original refs → equal sanitized refs, which
// ESLint requires to avoid "Cannot redefine plugin" errors).
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

// Cache: original plugin object → sanitized plugin object (stable identity).
const _pluginCache = new Map();

function _sanitizePlugin(plugin) {
  if (_pluginCache.has(plugin)) return _pluginCache.get(plugin);
  // Destructure out `configs` — only used in legacy eslintrc mode, contains circular refs.
  // eslint-disable-next-line no-unused-vars
  const { configs: _unused, ...rest } = plugin;
  _pluginCache.set(plugin, rest);
  return rest;
}

function _sanitizeConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config))
    return config;
  if (!config.plugins) return config;
  const sanitizedPlugins = Object.fromEntries(
    Object.entries(config.plugins).map(([k, p]) => [k, _sanitizePlugin(p)])
  );
  return { ...config, plugins: sanitizedPlugins };
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
