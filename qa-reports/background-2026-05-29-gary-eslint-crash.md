# Gary QA — ESLint Circular-JSON Crash Fix
**Date:** 2026-05-29
**Branch:** ci/eslint-setup-2026-05-29
**Commit:** 1b9d2a5
**Role:** Gary (BACKGROUND mode — no external sends)

---

## Summary

Fixed the pre-existing `TypeError: Converting circular structure to JSON` crash in `npm run lint`. The crash was not introduced by the ESLint branch — it is a known incompatibility between `eslint-plugin-react` v7, `@typescript-eslint` v8, and `@eslint/eslintrc` v3 in ESLint 9 flat config mode.

**Before:** `npm run lint` always crashed with circular-JSON error, 0 files linted.
**After:** `npm run lint` completes cleanly — 0 errors, 5 pre-existing warnings.

---

## Root Cause

### The circular reference chain

`eslint-plugin-react` v7.37.5 and `@typescript-eslint/eslint-plugin` v8.60.0 both expose their flat config presets via `plugin.configs.flat`. Those preset objects include a `plugins` map that points back to the originating plugin instance:

```
plugin.configs.flat.recommended.plugins.react === plugin  // circular!
```

### Where it crashes

ESLint 9 loads `eslint.config.mjs` and processes the flat config array. When `eslint-config-next/core-web-vitals` (which registers `eslint-plugin-react` as a plugin) is spread into the array, `@eslint/eslintrc`'s `ConfigValidator.formatErrors` calls `JSON.stringify` on the config array to produce human-readable validation error messages. `JSON.stringify` cannot serialize circular references and throws:

```
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    |     property 'configs' -> object with constructor 'Object'
    |     property 'flat' -> object with constructor 'Object'
    |     ...
    |     property 'plugins' -> object with constructor 'Object'
    --- property 'react' closes the circle
```

Stack trace key frames:
- `eslint.config.mjs:16` — the `...nextCoreWebVitals` spread
- `@eslint/eslintrc/lib/shared/config-validator.js:308` — `JSON.stringify` call
- `@eslint/eslintrc/lib/config-array-factory.js` — `_normalizeConfigData` / `_loadExtends`

### Why the previous "rewrite to native flat config" didn't fix it

The previous cycle's fix (`e3e6d9b`) correctly removed `FlatCompat` and switched to direct imports (`import nextCoreWebVitals from "eslint-config-next/core-web-vitals"`). This was necessary but not sufficient — the crash originates in the plugin objects themselves, not in the compat layer.

---

## Fix Applied

**File:** `eslint.config.mjs`

Added a cache-aware `_sanitizePlugin` helper that strips the `configs` property from each plugin object before ESLint processes it. The `configs` property is only meaningful in legacy eslintrc mode; flat config runtime only uses `rules` (and optionally `meta`). Stripping it breaks the circular reference without affecting any lint behavior.

```js
const _pluginCache = new Map();

function _sanitizePlugin(plugin) {
  if (_pluginCache.has(plugin)) return _pluginCache.get(plugin);
  const { configs: _unused, ...rest } = plugin;
  _pluginCache.set(plugin, rest);
  return rest;
}

function _sanitizeConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return config;
  if (!config.plugins) return config;
  const sanitizedPlugins = Object.fromEntries(
    Object.entries(config.plugins).map(([k, p]) => [k, _sanitizePlugin(p)])
  );
  return { ...config, plugins: sanitizedPlugins };
}
```

The `Map` cache is critical: `@next/next` appears in two config objects in `core-web-vitals` — both reference the same plugin instance. ESLint's flat config system enforces that the same plugin name across multiple config objects must be the exact same reference (`===`). Without the cache, each call to `_sanitizeConfig` would create a new object for the same plugin, causing `Cannot redefine plugin "@next/next"` errors.

The spread in the export becomes:
```js
...nextCoreWebVitals.map(_sanitizeConfig),
...nextTypescript.map(_sanitizeConfig),
```

---

## Verification

| Check | Before | After |
|---|---|---|
| `npm run lint` | CRASH (circular-JSON) | PASS — 0 errors, 5 warnings |
| `npm run typecheck` | PASS | PASS |
| `npm run test` | 335/335 PASS | 335/335 PASS |

### Remaining warnings (pre-existing, not introduced here)

| Count | Rule | Location | Notes |
|---|---|---|---|
| 3 | `prettier/prettier` | `PromptDetail.tsx` L791, L892, L980 | Trailing comma style |
| 2 | `@typescript-eslint/no-unused-vars` | `transfer-extra.test.ts` L63-64 | `m`, `d` vars |

These 5 warnings existed before this fix and are unrelated to it.

---

## DECISIONS FOR SKY

None. The fix is minimal, mechanical, and non-behavioral. No privacy, security, or architecture decisions required.

The workaround is appropriate for eslint-plugin-react v7 + @typescript-eslint v8. If either package is upgraded to a version that removes the circular `configs.flat` self-reference, the sanitizer becomes a no-op (it just passes through the object with `configs` already absent or non-circular) and can be removed.
