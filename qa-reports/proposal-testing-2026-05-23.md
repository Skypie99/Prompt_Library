# Proposal — Vitest test runner

**Status:** PROPOSED — not installed yet. Adds new dev dependencies.
**Owner to approve:** Sky (skylerhalisky@gmail.com)
**Author:** Gary (safety-net pass, 2026-05-23)
**Estimated effort:** ~5 minutes to install + verify

---

## Why

The Prompt Library Tool currently has **no test runner** — only
`tsc --noEmit` (which actually isn't even wired as an npm script
right now; `next build` runs it internally).

This proposal wires up **Vitest** — the modern Next.js convention,
ESM-native, fast, and Jest-compatible API. Three test files are
already on disk and ready to run the moment this proposal lands:

- `src/lib/__tests__/variables.test.ts` (~25 cases — token parsing)
- `src/lib/__tests__/library.test.ts` (~15 cases — slugify, mergePrompts)
- `src/lib/__tests__/search.test.ts` (~15 cases — Fuse wrapper, highlights)

They're currently excluded from `tsconfig.json` so the typecheck stays
clean. When the runner is installed, the install also adds vitest's
own globals to the type roots, the exclude lines can come out, and
the tests run.

---

## Exact steps

```bash
cd "/Users/skypie/Documents/Claude/Projects/Prompt Library Tool"

# 1. Install vitest + DOM mock for the localStorage helpers in library.ts
npm install --save-dev \
  vitest@^2.1.8 \
  @vitejs/plugin-react@^4.3.4 \
  jsdom@^25.0.1
```

Add `vitest.config.ts` at the repo root:

```ts
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
    globals: true, // describe / it / expect without imports
    environment: "node", // override per-file with /* @vitest-environment jsdom */
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
  },
});
```

Add `tsconfig.test.json` so the test files get type info for the
Vitest globals (kept separate so the main typecheck stays narrow):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals"]
  },
  "include": ["src/**/__tests__/**/*.ts", "src/**/*.test.ts"],
  "exclude": []
}
```

Add scripts to `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "preview": "npx serve out",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "typecheck": "tsc --noEmit",
  "typecheck:test": "tsc --noEmit -p tsconfig.test.json"
}
```

Then **remove the test-file exclusions** added to `tsconfig.json` in
this qa branch (so the main typecheck once again covers test files,
now that the Vitest globals are resolvable via the dedicated
tsconfig.test.json):

```json
// tsconfig.json — remove these so test files are included again
"exclude": [
  "node_modules",
  "**/__tests__/**",
  "**/*.test.ts",
  "**/*.test.tsx"
]
```

Finally:

```bash
npm test                  # should print: Tests: ~55 passed
npm run typecheck         # should still print no errors
npm run typecheck:test    # type-check the tests separately
```

---

## What lands with this

- ~55 passing tests across `variables.ts`, `library.ts`, `search.ts`
- A `jsdom` environment configured so the next batch of tests can cover
  the `loadUserPrompts` / `saveUserPrompts` / `loadFavorites` /
  `loadRecent` localStorage round-trips in `library.ts` (those tests
  add `/* @vitest-environment jsdom */` at the top)
- A foundation for future `app/` and `components/` tests using
  `@testing-library/react`, when needed

---

## Why Vitest, not Jest

- Next.js 15 + React 19 work seamlessly with Vitest's ESM-first setup.
- Vitest's API is Jest-compatible (`describe`, `it`, `expect`), so the
  tests above run as-is.
- Single config file vs. Jest's babel/swc/transformIgnore dance.

---

## Risk

Low. Adds dev dependencies and config files only. No runtime impact.
Reversible by `git revert` and `npm uninstall`.
