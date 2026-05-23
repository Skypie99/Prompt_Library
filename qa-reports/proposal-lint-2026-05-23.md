# Proposal — ESLint + Prettier (Next.js flat config)

**Status:** PROPOSED — not installed yet. Adds new dev dependencies.
**Owner to approve:** Sky (skylerhalisky@gmail.com)
**Author:** Gary (safety-net pass, 2026-05-23)
**Estimated effort:** ~5 minutes to install + 1 minute to auto-fix

---

## Why

There is no lint config in the Prompt Library Tool repo. Next.js used
to ship a starter ESLint config in `create-next-app`, but Next 15
defers that to the user. This proposal restores the canonical Next.js
+ React Hooks lint config + Prettier.

What it catches that typecheck misses:
- `react-hooks/exhaustive-deps` — missing deps in `useEffect`
- `react/no-unescaped-entities` — stray quotes that break SSR rendering
- `@typescript-eslint/no-unused-vars` — variables left dangling after
  edits (already a few of these in the source)
- `@next/next/no-img-element` — `<img>` usage that should be `<Image>`

---

## Exact steps

```bash
cd "/Users/skypie/Documents/Claude/Projects/Prompt Library Tool"

# 1. Install
npm install --save-dev \
  eslint@^9.18.0 \
  @eslint/eslintrc@^3.2.0 \
  eslint-config-next@^15.1.6 \
  prettier@^3.4.2 \
  eslint-plugin-prettier@^5.2.1 \
  eslint-config-prettier@^9.1.0
```

Add `eslint.config.mjs` at the repo root (flat config; required by
ESLint 9 + Next 15):

```js
// eslint.config.mjs
import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  prettierConfig,
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      "prettier/prettier": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      "*.config.js",
      "*.config.mjs",
    ],
  },
];
```

Add `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "arrowParens": "always"
}
```

(`singleQuote: false` matches the existing source — variables.ts and
the rest use double-quoted strings.)

Add scripts to `package.json`:

```json
"scripts": {
  "lint": "next lint",
  "lint:fix": "next lint --fix",
  "format": "prettier --write ."
}
```

Run once:

```bash
npm run lint            # see current warnings
npm run lint:fix        # auto-fix what can be auto-fixed
npm run typecheck       # confirm still green
```

---

## Risk

Low. Adds dev dependencies and config files only. No runtime impact.

Reversible by `git revert` and `npm uninstall`.
