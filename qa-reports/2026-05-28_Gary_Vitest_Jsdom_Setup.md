# Gary Report — Vitest jsdom + @testing-library/react Setup — 2026-05-28

## 1. DECISIONS FOR SKY

None. All changes are test-infrastructure only. No app logic touched.

## 2. BLOCKERS / FAIL_FAST

None. All gates passed.

## 3. Summary

Wired jsdom and `@testing-library/react` into the Vitest setup so component-level
UI tests can be written (specifically for the F-r2 Retry button, AC-7). The project
already had `jsdom ^25.0.1` installed but `vitest.config.ts` was using
`environment: "node"` with no setupFiles. Three `@testing-library` packages were
installed and the config was updated. A smoke test confirms the full stack works.

**Branch:** `qa/vitest-jsdom-setup-2026-05-28`
**Head SHA:** `3b46a86`
**Base:** `main` @ `1889ae7`

---

## 4. What Shipped (Checkpoints)

### `3b46a86` — qa(prompt-lib): wire jsdom + @testing-library/react into Vitest for component tests

**vitest.config.ts changes:**
- Kept `environment: "node"` as default (preserves existing pure-logic tests)
- Added `environmentMatchGlobs`:
  - `["**/*.test.tsx", "jsdom"]` — any `.tsx` test gets jsdom automatically
  - `["**/tests/smoke/**", "jsdom"]` — smoke dir
  - `["**/tests/components/**", "jsdom"]` — future component test dir
- Added `setupFiles: ["./tests/setup.ts"]`
- Expanded `include` to cover `.tsx` and `tests/**` paths

**tsconfig.test.json changes:**
- Added `"jsx": "react-jsx"` (Vitest/React needs this; base tsconfig uses `"preserve"` for Next.js)
- Expanded `include` globs to match `.tsx` and `tests/**` paths
- Did NOT add `@testing-library/jest-dom` to `types` array — that caused 6 pre-existing
  `@ts-expect-error` directives to become TS2578 errors. Types are picked up via the
  `@testing-library/jest-dom/vitest` augmentation import in `setup.ts` instead.

**tests/setup.ts (new):**
```ts
import "@testing-library/jest-dom";
import "@testing-library/jest-dom/vitest";
```
The `vitest` import augments `vitest`'s `Assertion` interface so matchers like
`toBeInTheDocument`, `toBeDisabled`, `toHaveTextContent` are typed correctly.

**tests/smoke/Button.smoke.test.tsx (new):**
4-case smoke test verifying the full stack: render → `getByRole` → `fireEvent.click`
→ `toBeInTheDocument` / `toBeDisabled` matchers. Self-contained (no app imports) so
failures here always indicate infrastructure breakage, not app bugs.

**src/lib/__tests__/ (6 files — pre-existing bug fix):**
Removed 6 unused `@ts-expect-error` directives on `globalThis.localStorage = stub`
lines. These were already failing `typecheck:test` on `main` — same issue documented
in `2026-05-28_Gary_CI_TsExpectErrorCleanup.md` (fixed on `ci/auto-2026-05-25-rory`
but not yet merged to main). The paired `globalThis.window` directives one line above
each are still needed and were left intact.

---

## 5. Packages Installed

| Package | Version | Where |
|---|---|---|
| `@testing-library/react` | 16.3.2 | devDependencies |
| `@testing-library/user-event` | 14.6.1 | devDependencies |
| `@testing-library/jest-dom` | 6.9.1 | devDependencies |

Installed in the main project `node_modules` (worktree shares via symlink).
`package.json` and `package-lock.json` in the worktree reflect these additions.

---

## 6. Test Results

### Smoke test
```
✓ tests/smoke/Button.smoke.test.tsx (4 tests) 41ms
```
All 4 cases passed: render, click handler, disabled state, `toHaveTextContent`.

### Full suite
```
Test Files  13 passed (13)
     Tests  218 passed (218)
  Duration  1.08s
```
Previous count was 214. 4 new smoke tests added. Zero regressions.

### typecheck
```
npm run typecheck    → clean (0 errors)
npm run typecheck:test → clean (0 errors)
```

---

## 7. Gotchas for the Next Engineer

### Environment routing
The `environmentMatchGlobs` approach means you get the right environment automatically:
- Write `MyComponent.test.tsx` → jsdom (React rendering works)
- Write `myLogic.test.ts` → node (fast, no DOM overhead)
- No per-file `@vitest-environment` docblocks needed

### Next.js App Router server components
Server-only components (`"use server"`, `next/headers`, `cookies()`, etc.) **cannot
be rendered in jsdom tests**. If you import them, you'll get errors about missing
Next.js internals. The workaround:
1. Mock the server component: `vi.mock("@/components/MyServerComponent", () => ({ default: () => <div>mock</div> }))`
2. Or test client sub-components in isolation (preferred — they're the interactive parts anyway)
3. Use Next.js integration tests (Playwright/Cypress) for full-page server component flows

### React 19 + @testing-library/react 16
RTL 16 supports React 19. `act()` behavior changed slightly — async state updates
need `await act(async () => { ... })` in some cases. `fireEvent` is synchronous and
worked fine for the smoke test. For complex async interactions, prefer
`@testing-library/user-event`'s `userEvent.setup()` + `await user.click()` pattern.

### The @ts-expect-error cleanup
The 6 removed directives were on `globalThis.localStorage = stub` lines in the
localStorage-stub helpers used by `density`, `library`, `runs`, `sort`, `transfer`,
and `values` tests. The `globalThis.window` suppressions one line above each are
still valid (assigning `{ localStorage: stub }` to `globalThis.window` still isn't
type-safe). This same fix was already applied on `ci/auto-2026-05-25-rory-prompt-lib-ci`
(SHA `f82cc7a`) — when that branch merges, there will be a clean merge with no
conflicts on these lines since the changes are identical.

---

## 8. Findings by Domain

### Tests / CI (Gary)
- jsdom environment confirmed working via smoke test
- `environmentMatchGlobs` is the right pattern — avoids the "jsdom for everything
  including server-side code" footgun that a global `environment: "jsdom"` would cause
- `@testing-library/user-event` 14.x requires `userEvent.setup()` before each test
  that uses pointer events (the smoke test used `fireEvent` directly to keep it simple)
- Vitest CJS deprecation warning is cosmetic — Vitest 2.x with Node 20+ will resolve
  this by upgrading the vite internals; no action needed now
