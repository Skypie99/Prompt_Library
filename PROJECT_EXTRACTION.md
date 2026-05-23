# Project Extraction — Prompt Library Tool

> **Purpose of this document.** This is a comprehensive, structured extraction of the *Prompt Library Tool* project, prepared so an external AI assistant can author a detailed automated quality-assurance and continuous-improvement prompt. It covers all eleven requested areas, and the **full source of every key file is reproduced verbatim in Appendix A**.
>
> **A note on scope.** The request referred to "two projects," but only one project is present in the selected working folder (`Prompt Library Tool`). This document therefore covers that single project in full depth. If a second project exists elsewhere (another folder, a Git repo, or a connected service such as GitHub/Notion/Drive), point me to it and I will produce a matching extraction.
>
> **Confidence labels.** Where a section reports facts read directly from the code, it is marked **[from code]**. Where it reflects analysis or reasonable inference (because the project has no README, no docs, and no Git history), it is marked **[inferred]** so the reviewer can weight it accordingly and you can correct it.

---

## 1. Project Overview

**What it is [from code].** Prompt Library Tool is a single-page web application for keeping a curated, searchable library of reusable AI prompts and running them against Anthropic's Claude API directly from the browser. A user can browse and fuzzy-search prompts, fill in `{{variable}}` placeholders through generated form fields, watch a live preview of the final prompt assemble, then either copy it or run it live with a streamed Claude response — all without leaving the page.

**Who uses it [inferred].** Individual power users and small teams who accumulate prompts and want them organized, parameterized, and one keystroke away. It is a *bring-your-own-key* tool: each user supplies their own Anthropic API key, which never leaves their browser except to call Anthropic.

**Problem it solves [inferred].** Useful prompts normally end up scattered across notes apps, docs, and chat histories, and reusing them means copy-pasting and hand-editing the variable parts every time. This app centralizes the library, makes it instantly searchable, turns the variable parts into proper input fields, and removes the copy-paste step by running the prompt in place and streaming the answer back.

**Shape of the product [from code].** It is a static, client-only site (no backend, no database). Three seed prompts ship with the app; everything the user adds, favorites, or recently opened is stored in the browser's `localStorage`. It is configured to deploy as a static export to GitHub Pages under the path `/prompt-library-tool/`.

---

## 2. Tech Stack

| Layer | Choice | Version (declared) | Notes |
|---|---|---|---|
| Language | TypeScript | ^5.7.2 | `strict: true`, path alias `@/* → ./src/*` **[from code]** |
| Framework | Next.js (App Router) | ^15.1.6 (15.5.18 installed) | `output: "export"` → fully static site **[from code]** |
| UI runtime | React / React DOM | ^19.0.0 | Client components for all interactivity **[from code]** |
| Styling | Tailwind CSS | ^3.4.17 | Custom warm palette, `darkMode: "class"` **[from code]** |
| CSS tooling | PostCSS + Autoprefixer | ^8.4.49 / ^10.4.20 | Standard Tailwind pipeline **[from code]** |
| Fonts | `@fontsource-variable/inter`, `@fontsource-variable/fraunces` | ^5.0.0 | Self-hosted variable fonts (offline-capable, no Google fetch) **[from code]** |
| Fuzzy search | Fuse.js | ^7.0.0 | Weighted multi-field index with match highlighting **[from code]** |
| Class utility | clsx | ^2.1.1 | Conditional className composition **[from code]** |
| External API | Anthropic Messages API | `anthropic-version: 2023-06-01` | Called from the browser via SSE streaming with the `anthropic-dangerous-direct-browser-access` opt-in header **[from code]** |
| Persistence | Browser `localStorage` | — | User prompts, favorites, recents, settings, theme, onboarding flag **[from code]** |
| Hosting target | GitHub Pages (static) | — | `basePath`/`assetPrefix` applied only in production **[from code]** |

**Not present [from code].** No backend or server runtime, no database, no state library (Redux/Zustand/Context), no test framework, no ESLint/Prettier config files, no CI configuration, no environment variables beyond the implicit `NODE_ENV`. The only network dependency at runtime is `api.anthropic.com`.

---

## 3. Project Architecture

**Overall pattern [from code].** A static, client-heavy SPA built on the Next.js App Router with exactly one route (`/`). The single server component (`src/app/page.tsx`) reads the seed prompts at build time and hands them to a large client component, `HomeClient`, which owns essentially all application state and behavior. There is a clean separation between a pure-logic layer (`src/lib`) and a presentation layer (`src/components`).

**Three layers:**

**`src/lib` — pure logic (no JSX) [from code]:**
- `types.ts` — the `Prompt` and `PromptVariable` interfaces shared everywhere.
- `prompts.ts` — loads the seed prompts from JSON and derives the sorted category list.
- `library.ts` — all `localStorage` CRUD for user prompts, favorites, recents, and the onboarding flag, plus helpers (`mergePrompts`, `slugify`, `generateId`, validation guard, `RECENT_CAP`).
- `search.ts` — builds the Fuse index, runs searches, and converts Fuse match indices into highlight segments for `<mark>` rendering.
- `settings.ts` — the model catalog (Opus 4.7 / Sonnet 4.6 / Haiku 4.5), defaults, and load/save of API key, model, and max tokens.
- `variables.ts` — the `{{token}}` engine: extract variables from a body, humanize names, decide single-line vs. textarea, parse a body into text/variable segments, substitute values, and count filled fields.
- `anthropic.ts` — a dependency-free streaming client for the Messages API with a typed `ClaudeError` (`auth | rate-limit | overloaded | network | bad-request | unknown`) and SSE parsing.

**`src/components` — UI [from code]:**
- `HomeClient.tsx` — the orchestrator. Holds overlay state, settings, and library state; hydrates from `localStorage` after mount; computes all derived/memoized lists; defines every action handler; wires global keyboard shortcuts; and renders the page plus all modals.
- `Header.tsx`, `CategoryChips.tsx`, `PromptGrid.tsx` → `PromptCard.tsx`, `OnboardingHint.tsx`, `ThemeToggle.tsx` — the browsing surface.
- `CommandPalette.tsx` — the ⌘K fuzzy-search overlay with keyboard navigation and highlighted matches.
- `PromptDetail.tsx` — the largest interactive component: split preview/inputs view, copy, streaming run/stop, response panel, favorite/duplicate/edit/delete.
- `PromptForm.tsx` — create/edit/duplicate modal (title, description, body, category combobox, tag chips).
- `SettingsModal.tsx` — API key (show/hide), model select, max-tokens (clamped on save).
- `icons.tsx` — a small inline SVG icon set.

**`src/app` — framework shell [from code]:** `layout.tsx` (font imports, metadata, and a pre-paint no-flash theme script via `dangerouslySetInnerHTML`), `page.tsx` (server component), `globals.css` (Tailwind layers + warm scrollbars), `icon.svg`.

**`src/data/prompts.json`** — the three built-in seed prompts.

**Data flow [from code].** Seed prompts (build-time) and user prompts (hydrated from `localStorage` in a `useEffect` after mount) are combined by `mergePrompts` into `allPrompts`, sorted newest-first. From that, `HomeClient` memoizes: a sorted category list, an id→prompt `Map`, the category-filtered `visiblePrompts`, and the `favoritePrompts`/`recentPrompts` lists (favorites/recents are stored as id arrays and resolved through the map). Every mutation goes through a `useCallback` handler that updates React state **and** writes through to `localStorage` in the same step. The detail modal receives the active prompt and the settings, manages its own variable values, renders the live preview via `parseBody`, and on "Run" calls `substituteBody` → `streamClaude`, appending each streamed chunk to component state.

**SSR / hydration strategy [from code].** Because it is a static export, server-rendered output uses the *defaults* (empty API key, default model, no user data) so the first paint matches; `localStorage` is read only after mount. Theme is the exception: an inline script in `<head>` applies the saved `dark` class before React renders, preventing a flash of the wrong colors.

**State management [from code].** Entirely React local state inside `HomeClient` (plus small local state in each modal). No global store and no React Context; `localStorage` is the durable layer.

---

## 4. File Structure

```
prompt-library-tool/
├── .gitignore
├── next-env.d.ts                 # generated Next.js types (git-ignored)
├── next.config.js                # static export + GitHub Pages basePath/assetPrefix
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.ts            # full color palette, fonts, shadows, animations
├── tsconfig.json                 # strict, @/* path alias
├── node_modules/                 # (installed deps; git-ignored)
├── .next/                        # (build cache/output; git-ignored)
└── src/
    ├── app/
    │   ├── globals.css           # Tailwind layers + warm scrollbar utilities
    │   ├── icon.svg              # app favicon (coral sparkle)
    │   ├── layout.tsx            # fonts, metadata, no-flash theme script
    │   └── page.tsx              # server component → renders <HomeClient/>
    ├── components/
    │   ├── CategoryChips.tsx     # All + per-category filter pills
    │   ├── CommandPalette.tsx    # ⌘K fuzzy search overlay
    │   ├── Header.tsx            # sticky top bar (search, theme, settings)
    │   ├── HomeClient.tsx        # ★ central state + layout orchestrator
    │   ├── OnboardingHint.tsx    # one-time first-visit banner
    │   ├── PromptCard.tsx        # a single prompt card (with favorite star)
    │   ├── PromptDetail.tsx      # ★ detail modal: preview, run, copy, edit
    │   ├── PromptForm.tsx        # create / edit / duplicate modal
    │   ├── PromptGrid.tsx        # responsive grid of cards
    │   ├── SettingsModal.tsx     # API key, model, max tokens
    │   ├── ThemeToggle.tsx       # light/dark switch
    │   └── icons.tsx             # inline SVG icon set
    ├── data/
    │   └── prompts.json          # 3 built-in seed prompts
    └── lib/
        ├── anthropic.ts          # streaming Messages API client + typed errors
        ├── library.ts            # localStorage CRUD + merge/slug/id helpers
        ├── prompts.ts            # seed loader + category derivation
        ├── search.ts             # Fuse index + highlight segmentation
        ├── settings.ts           # model catalog + settings persistence
        ├── types.ts              # Prompt / PromptVariable interfaces
        └── variables.ts          # {{token}} extract / parse / substitute
```

Source totals roughly 2,500 lines across 23 TypeScript/TSX/CSS/JSON files. There is **no README and no Git repository** in the folder.

---

## 5. Core Functionality

**Browse [from code].** The home page shows a hero with a large search affordance, a row of category filter chips ("All" + each derived category), and — only while "All" is selected — curated **Favorites** and **Recent** sections, followed by the **All prompts** grid. A "New prompt" button sits above the grid, and a live count of visible prompts is shown.

**Search [from code].** ⌘K (or `/` when not typing in a field) opens the Command Palette. Fuse.js searches across title (weight 0.4), description (0.25), tags (0.2), and body (0.15) with a forgiving threshold (0.4), `ignoreLocation`, and a 2-character minimum. Results update on every keystroke (no debounce — the dataset is small), matched substrings are wrapped in `<mark>`, and ↑/↓ navigate while Enter opens. The index is rebuilt only when the prompt list changes (`useMemo`).

**Open & customize a prompt [from code].** The detail modal is a split view. The **left** pane is a live preview where each `{{token}}` renders as a highlighted "filled" value or a dashed "unfilled" placeholder. The **right** pane auto-generates inputs from the variables detected in the body — long-form fields (names matching `code|content|notes|transcript|message|…` or hinting at pasted text) become resizable textareas; the rest are single-line inputs. A "`n/m` filled" counter and a "Clear" action are shown.

**Copy & Run [from code].** "Copy" puts the substituted final text on the clipboard (with a legacy `execCommand` fallback for non-secure contexts) and flips to a "Copied" state for 1.5s. "Run with Claude" streams a response token-by-token into the response panel, with a live "Streaming…" indicator and a blinking cursor; a "Stop" button aborts via `AbortController`. ⌘↵ runs the prompt. If no API key is set, Run instead opens Settings with a helpful notice. Errors render as friendly messages, and auth errors include an inline "Open Settings" button.

**Create / edit / duplicate / delete [from code].** The form modal supports create and edit; "Duplicate" pre-fills a new prompt titled "… (copy)". Title and body are required; category is a free-type combobox backed by a `<datalist>` of existing categories (defaulting to "Uncategorized"); tags are chip inputs (Enter or comma to add, Backspace to remove the last). Seed prompts cannot be edited or deleted (those buttons are hidden), but they can be favorited and duplicated. Deletion uses an inline confirmation and also strips the id from favorites and recents.

**Settings [from code].** API key with show/hide and a "stored locally" reassurance; model select among Claude Opus 4.7 (`claude-opus-4-7`), Sonnet 4.6 (`claude-sonnet-4-6`), and Haiku 4.5 (`claude-haiku-4-5-20251001`); and a max-tokens field clamped to 256–8192 on save (default 2048). A link to the Anthropic Console is provided.

**Theme & onboarding [from code].** A light/dark toggle persists to `localStorage` and is applied pre-paint to avoid flashing. A one-time onboarding banner explains ⌘K and the API key, and is dismissed permanently once closed.

**Keyboard model [from code].** ⌘K / Ctrl+K toggles the palette; `/` opens it (unless typing); Escape closes any overlay; ⌘↵ runs the active prompt; ↑/↓/Enter drive the palette list.

---

## 6. Current Code

The complete, verbatim contents of every source and configuration file are reproduced in **[Appendix A: Full Source Listings](#appendix-a--full-source-listings)** at the end of this document. The map below orients the reviewer; the "★" files are where most logic and risk live.

| File | Lines | Responsibility |
|---|---|---|
| `next.config.js` | 33 | Static export, GitHub Pages base path, image/trailing-slash settings |
| `tailwind.config.ts` | 85 | Palette, fonts, shadows, keyframe animations |
| `tsconfig.json` | 24 | Strict TS, `@/*` alias |
| `package.json` | 29 | Scripts and dependencies |
| `postcss.config.js` / `.gitignore` | 7 / 25 | Tooling and ignores |
| `src/app/layout.tsx` | 31 | Fonts, metadata, no-flash theme script |
| `src/app/page.tsx` | 8 | Server component entry |
| `src/app/globals.css` | 41 | Tailwind layers + scrollbars |
| `src/lib/types.ts` | 28 | Core data model |
| `src/lib/prompts.ts` | 12 | Seed loader + categories |
| `src/lib/library.ts` ★ | 102 | `localStorage` CRUD + merge/slug/id |
| `src/lib/search.ts` ★ | 82 | Fuse index + highlight segments |
| `src/lib/settings.ts` | 70 | Model catalog + settings persistence |
| `src/lib/variables.ts` ★ | 102 | `{{token}}` extract / parse / substitute |
| `src/lib/anthropic.ts` ★ | 162 | Streaming Messages API client + typed errors |
| `src/components/HomeClient.tsx` ★ | 382 | Central state + orchestration |
| `src/components/PromptDetail.tsx` ★ | 502 | Detail modal: preview, run, copy, edit |
| `src/components/CommandPalette.tsx` ★ | 213 | Fuzzy-search overlay |
| `src/components/PromptForm.tsx` | 207 | Create/edit/duplicate form |
| `src/components/SettingsModal.tsx` | 167 | Settings UI |
| `src/components/icons.tsx` | 146 | Inline SVG icons |
| `src/components/PromptCard.tsx` | 78 | Single card |
| `src/components/Header.tsx` | 49 | Top bar |
| `src/components/CategoryChips.tsx` | 39 | Category filter pills |
| `src/components/ThemeToggle.tsx` | 36 | Theme switch |
| `src/components/PromptGrid.tsx` | 27 | Card grid |
| `src/components/OnboardingHint.tsx` | 27 | First-visit banner |
| `src/data/prompts.json` | 45 | 3 seed prompts |

---

## 7. Known Issues & Limitations

The project has no issue tracker, so the following are derived from reading the code. Each is labeled by where it comes from.

**Data model gap — user prompts can't define variable metadata [from code].** When a prompt is created in `HomeClient.submitForm`, it is stored with `variables: []`. Variables are auto-detected from the body at render time (`extractVariables`), and unlabeled tokens are humanized. The practical effect: seed prompts can carry custom labels/placeholders, but user-created prompts cannot — their fields always show a humanized name and no placeholder. This is a real functional limitation, not just polish.

**No portability / shared library [from code/inferred].** Everything the user creates lives only in that browser's `localStorage`. There is no import/export, no sync, and no backend. Clearing site data, switching browsers, or using another device loses the library. For a "library" product this is the most consequential limitation.

**Plaintext API key in `localStorage` [from code].** The Anthropic key is stored unencrypted under `promptlib:apiKey`. This is reasonable for a single-user BYO-key tool, but any cross-site-scripting flaw would expose the key (see §9).

**ID collision risk [from code].** `generateId` is `slugify(title) + 4 random base-36 chars` with no uniqueness check against existing ids. Collisions are unlikely but possible; a collision would make two prompts share an id (breaking the id→prompt map and favorites/recents).

**Silent persistence failures [from code].** All `localStorage` writes are wrapped in `try/catch` that silently swallows errors. If the quota is exceeded (large library or very long bodies; ~5 MB typical limit) or storage is disabled, saves fail with no user feedback — data loss without warning.

**Mixed date formats in sort [from code].** Seed prompts use date-only `createdAt` ("2026-05-22") while user prompts use full ISO timestamps. `mergePrompts` sorts lexicographically, which happens to remain chronological, but the inconsistency is a latent foot-gun (e.g., if formats ever diverge further).

**Accessibility gaps in modals [from code/inferred].** Overlays (`PromptDetail`, `PromptForm`, `SettingsModal`, `CommandPalette`) lack `role="dialog"`/`aria-modal`, a focus trap, and focus restoration to the triggering element on close. `PromptCard` uses `role="button"` on a `div` (necessary because it nests a real button) — keyboard handling is implemented, but it is non-standard. Initial focus is handled in the detail and palette only.

**No tests, lint config, or CI [from code].** There is no test framework, no ESLint/Prettier config in the repo, and no CI. One `eslint-disable react-hooks/exhaustive-deps` is used intentionally in `PromptDetail`'s reset effect.

**No rate-limit/backoff handling [from code].** A 429 produces a friendly message but no automatic retry/backoff; the user must retry manually.

**Settings clamp only on save [from code].** Max-tokens is clamped to 256–8192 in `SettingsModal.handleSave`, but `loadSettings` accepts any finite number from `localStorage`, so a hand-edited value could fall outside the intended range.

**Single route / no deep-linking [from code].** Prompts open in modals with no URL state, so a specific prompt or search can't be linked or bookmarked, and the browser back button doesn't close modals.

---

## 8. Performance Considerations

**Current scale is comfortable [from code/inferred].** With a handful of prompts, rebuilding the Fuse index on list change and searching on every keystroke is effectively instant; memoization (`useMemo`) keeps derived lists and the index from recomputing needlessly.

**Streaming re-renders [from code].** `streamClaude`'s `onText` does `setResponse(prev => prev + chunk)`, triggering a React render per streamed chunk. For typical responses this is fine; for very long outputs the many small state updates and growing `<pre>` could become janky. Batching chunks (e.g., via `requestAnimationFrame` or a short flush interval) would scale better.

**No virtualization / pagination [from code].** The grid and palette render every matching prompt. This is ideal for small libraries but would degrade (DOM size, search cost, render time) at hundreds-to-thousands of prompts. At that scale, add list virtualization and/or debounced search.

**Fast initial load [from code].** Static export plus self-hosted variable fonts (no Google Fonts round-trip) and `images: { unoptimized: true }` (no images to optimize) keep the first paint quick. The whole app is a single client bundle — no route-level code-splitting beyond Next defaults, which is acceptable for a one-route app.

**Build-time seed data [from code].** Seeds are imported as JSON at build time, so they cost nothing at runtime.

---

## 9. Security Considerations

**Data handled [from code].** The user's Anthropic API key, the prompt content they write, the variable values they enter, and the responses Claude returns. All of it stays client-side; nothing is sent anywhere except the prompt text to `api.anthropic.com` when the user runs a prompt.

**Direct-from-browser API calls [from code].** Requests include `anthropic-dangerous-direct-browser-access: true`, which intentionally allows the key to be used from client JS. This is by design for a single-user BYO-key tool, but it means the key is present in the browser and is **not** suitable for a shared/multi-tenant deployment where one key would serve many users. (Deploying the static site publicly is fine — each visitor uses their *own* key, stored in their *own* browser.)

**XSS would expose the key [from code/inferred].** Because the key sits in `localStorage`, any script-injection vulnerability could exfiltrate it. Mitigating factors: the app renders all user/prompt/response content as **text** (in `<pre>` and `<span>`/`<mark>`), never as HTML, so there is no obvious injection path from prompt or response content; the only `dangerouslySetInnerHTML` use is a static, developer-authored theme script with no user input. There is no Content-Security-Policy defined, which would be a worthwhile hardening step.

**No authentication/authorization [from code].** None exists, and none is needed for a local single-user tool — but this should be stated explicitly so it isn't deployed as if it were multi-user.

**Input validation [from code].** `isValidPrompt` guards against malformed entries when reading user prompts from storage, dropping anything missing a string `id`/`title`/`body`. Settings parsing falls back to safe defaults on bad data.

**Transport [from code].** All API traffic is HTTPS to Anthropic; the SSE stream is parsed defensively and ignores unparseable/keep-alive lines.

---

## 10. User Experience Goals

**Intended feel [from code/inferred].** Warm, calm, and approachable rather than cold/technical — a cream-and-coral palette, a characterful Fraunces display serif paired with Inter for UI, soft shadows, and restrained fade/scale/"pop" animations. The product voice in copy is friendly and human ("Your prompts, one keystroke away," conversational error messages).

**Speed and keyboard-first [from code].** The core loop — find a prompt, fill it in, copy or run — should take seconds. ⌘K/`/` search, ↑/↓/Enter navigation, ⌘↵ to run, and Escape to dismiss make it usable without the mouse. Search is instant and shows *why* each result matched via highlighting.

**Transparency [from code].** The live preview shows exactly what will be sent before running, with filled vs. unfilled variables visually distinct, and a "n/m filled" counter so nothing is sent half-complete by surprise. The model name and the ⌘↵ hint sit right under the Run button.

**Forgiving error handling [from code].** Failures map to plain-language messages with a next action (e.g., auth errors offer "Open Settings"); Stop preserves whatever already streamed; copy has a fallback path.

**UX pain points worth addressing [inferred].** (1) User-created prompts can't have friendly variable labels/placeholders (see §7). (2) No way to export/back up or move a library between devices. (3) Modal focus management/a11y (focus trap + restore, dialog roles). (4) Mobile: the header search button is hidden below the `sm` breakpoint (the hero search remains), and the two-pane detail view collapses to stacked panes — worth a dedicated mobile pass. (5) No deep-linking/back-button support for open prompts.

---

## 11. Future Roadmap

> **[inferred]** There is no stated roadmap in the repo. The items below are derived from code comments and the gaps above, and are offered as a starting point — please correct or replace them with your actual vision.

Code comments hint at intended evolution (e.g., `library.ts` and `variables.ts` reference user-added prompts being "merged in… in a later phase" and tokens "never formally declared (e.g. user-added prompts later)") — most of which is already implemented, suggesting the project recently reached its first complete feature set.

Reasonable next directions, roughly by value/effort:
- **Library portability:** import/export to JSON, and/or optional sync (a lightweight backend or a connected store) so a library survives device changes.
- **Full variable editing for user prompts:** let creators define labels, placeholders, and multiline hints (persist the `variables` array instead of leaving it empty).
- **Deep-linking & history:** reflect the open prompt and active search in the URL; make the back button close modals.
- **Accessibility hardening:** dialog roles, focus trap and restore, and an audit pass.
- **Scale features:** debounced search and list virtualization once libraries grow large.
- **Sharing/collaboration:** shareable read-only prompt links or a team library.
- **Run ergonomics:** prompt run history, save/compare outputs, multi-model side-by-side, and conversation (multi-turn) runs rather than single-shot.
- **Security hardening:** a Content-Security-Policy, and an option to keep the key only in memory for the session rather than `localStorage`.
- **Quality infrastructure:** add tests (unit tests for `lib/` are high-leverage), ESLint/Prettier, and CI — directly relevant to the QA prompt this document is meant to feed.

---

## Appendix A — Full Source Listings

Every file below is reproduced exactly as it exists in the project.


### `package.json`

```json
{
  "name": "prompt-library-tool",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "preview": "npx serve out"
  },
  "dependencies": {
    "@fontsource-variable/fraunces": "^5.0.0",
    "@fontsource-variable/inter": "^5.0.0",
    "clsx": "^2.1.1",
    "fuse.js": "^7.0.0",
    "next": "^15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `next.config.js`

```js
/** @type {import('next').NextConfig} */

// On GitHub Pages this project is served from a subpath, not the domain root:
//   https://skypie99.github.io/prompt-library-tool/
// `basePath` / `assetPrefix` make every route and asset URL resolve under that
// subpath. We ONLY apply them in production builds so that `npm run dev` keeps
// serving cleanly at the root (http://localhost:3000) with no broken links.
const isProd = process.env.NODE_ENV === "production";
const repo = "prompt-library-tool";

const nextConfig = {
  // Emit a fully static site into ./out — no server needed to host it.
  output: "export",

  // Pin the workspace root to THIS folder. Without it, Next.js can get confused
  // when an unrelated package-lock.json exists higher up (e.g. in your home
  // directory) and prints a "multiple lockfiles" warning.
  outputFileTracingRoot: __dirname,

  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",

  // The default <Image> optimizer needs a running server, which a static
  // export doesn't have, so we serve images as-is.
  images: { unoptimized: true },

  // GitHub Pages resolves /path/ (directory + index.html) more reliably than
  // extension-less routes, so emit trailing-slash directories.
  trailingSlash: true,
};

module.exports = nextConfig;
```

### `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

// The whole palette lives here so the "warm, approachable" look is defined in
// one place. Light mode is the default; `darkMode: "class"` lets us flip a
// `dark` class on <html> for the optional dark theme.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light surfaces
        cream: "#FAF6EF", // page background — soft, warm off-white
        surface: "#FFFDF9", // cards / modals — a hair brighter than the page
        border: "#ECE3D5", // hairline borders

        // Warm charcoal text (never pure black)
        ink: {
          DEFAULT: "#2A2520",
          muted: "#6E665C",
          soft: "#938A7E",
        },

        // Dark surfaces (warm near-black, not blue-black)
        night: {
          DEFAULT: "#1C1916",
          surface: "#26221E",
          border: "#38322B",
        },
        paper: {
          DEFAULT: "#F1EBE1",
          muted: "#A89E90",
        },

        // The single accent: a muted, earthy coral
        coral: {
          50: "#FDF3EF",
          100: "#FAE3DA",
          200: "#F4C7B6",
          300: "#ECA88E",
          400: "#E48468",
          500: "#DC6B4E",
          600: "#C85539",
          700: "#A6442D",
          800: "#853828",
          900: "#6E3024",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "system-ui", "sans-serif"],
        display: ['"Fraunces Variable"', "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(42, 37, 32, 0.04), 0 8px 24px -12px rgba(42, 37, 32, 0.12)",
        cardHover:
          "0 2px 4px rgba(42, 37, 32, 0.06), 0 16px 40px -16px rgba(220, 107, 78, 0.28)",
        palette: "0 24px 60px -20px rgba(42, 37, 32, 0.35)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "scale-in": "scale-in 200ms ease-out",
        pop: "pop 250ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
```

### `postcss.config.js`

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `.gitignore`

```gitignore
# dependencies
/node_modules

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# typescript
next-env.d.ts

# local env files
.env*.local
```

### `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";

// Self-hosted variable fonts (no runtime request to Google) — works offline and
// on a static host. Inter for UI/body, Fraunces for the characterful display.
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Library",
  description: "Search, customize, and run your prompts with Claude in seconds.",
};

// Runs before first paint to apply the saved theme, avoiding a flash of the
// wrong colors on reload. Default is light unless the user chose dark.
const noFlashTheme = `(function(){try{if(localStorage.getItem('promptlib:theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
        {children}
      </body>
    </html>
  );
}
```

### `src/app/page.tsx`

```tsx
import { HomeClient } from "@/components/HomeClient";
import { seedPrompts } from "@/lib/prompts";

// Server component: reads the seed prompts at build time and hands them to the
// interactive client shell.
export default function Home() {
  return <HomeClient prompts={seedPrompts} />;
}
```

### `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  body {
    @apply bg-cream text-ink font-sans antialiased;
    @apply dark:bg-night dark:text-paper;
  }

  ::selection {
    @apply bg-coral-200/60 text-ink;
  }
}

@layer utilities {
  /* Thin, warm scrollbars that match the palette. */
  .scrollbar-soft {
    scrollbar-width: thin;
    scrollbar-color: theme("colors.coral.200") transparent;
  }
  .scrollbar-soft::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .scrollbar-soft::-webkit-scrollbar-thumb {
    background-color: theme("colors.coral.200");
    border-radius: 9999px;
  }
  .dark .scrollbar-soft {
    scrollbar-color: theme("colors.night.border") transparent;
  }
  .dark .scrollbar-soft::-webkit-scrollbar-thumb {
    background-color: theme("colors.night.border");
  }
}
```

### `src/app/icon.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#DC6B4E" />
  <path
    d="M16 6.5c.5 3.2 1.8 4.5 5 5-3.2.5-4.5 1.8-5 5-.5-3.2-1.8-4.5-5-5 3.2-.5 4.5-1.8 5-5Z"
    fill="#FFFDF9"
  />
  <circle cx="22.5" cy="22.5" r="2.2" fill="#FFFDF9" opacity="0.85" />
</svg>
```

### `src/lib/types.ts`

```ts
// The shape of every prompt in the app — both the seed prompts shipped in
// prompts.json and the ones a user adds in-app (added in a later phase).

export interface PromptVariable {
  /** Matches a {{token}} inside the prompt body. */
  name: string;
  /** Human-friendly label shown above the input field. */
  label: string;
  /** Optional example text shown inside the empty input. */
  placeholder?: string;
}

export interface Prompt {
  /** Stable slug or uuid. */
  id: string;
  title: string;
  /** One-line summary shown on cards and in search results. */
  description: string;
  /** The actual prompt text. May contain {{variables}}. */
  body: string;
  variables: PromptVariable[];
  category: string;
  tags: string[];
  /** ISO date string. */
  createdAt: string;
  /** true for built-ins from prompts.json; false for user-added prompts. */
  isSeed: boolean;
}
```

### `src/lib/prompts.ts`

```ts
import seedData from "@/data/prompts.json";
import type { Prompt } from "./types";

// Seed prompts shipped with the app (read-only). To add your own permanent
// prompts, edit src/data/prompts.json directly. User-added prompts saved to
// localStorage will be merged in here in a later phase.
export const seedPrompts: Prompt[] = seedData as Prompt[];

/** Unique category names derived from the prompts themselves, alphabetised. */
export function getCategories(prompts: Prompt[]): string[] {
  return Array.from(new Set(prompts.map((p) => p.category))).sort();
}
```

### `src/lib/library.ts`

```ts
import type { Prompt } from "./types";

// Everything the user creates or curates, persisted to localStorage. Seed
// prompts stay in prompts.json and are never written here.

const STORAGE_KEYS = {
  userPrompts: "promptlib:userPrompts",
  favorites: "promptlib:favorites",
  recent: "promptlib:recent",
  onboarded: "promptlib:onboarded",
} as const;

export const RECENT_CAP = 10;

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage unavailable — silently skip persistence */
  }
}

function isValidPrompt(value: unknown): value is Prompt {
  const p = value as Partial<Prompt> | null;
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    typeof p.body === "string"
  );
}

// ---- User prompts ----
export function loadUserPrompts(): Prompt[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.userPrompts, []);
  return Array.isArray(data) ? data.filter(isValidPrompt) : [];
}

export function saveUserPrompts(prompts: Prompt[]): void {
  writeJSON(STORAGE_KEYS.userPrompts, prompts);
}

// ---- Favorites (array of prompt ids) ----
export function loadFavorites(): string[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.favorites, []);
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}

export function saveFavorites(ids: string[]): void {
  writeJSON(STORAGE_KEYS.favorites, ids);
}

// ---- Recent (array of prompt ids, most-recent first, capped) ----
export function loadRecent(): string[] {
  const data = readJSON<unknown[]>(STORAGE_KEYS.recent, []);
  return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
}

export function saveRecent(ids: string[]): void {
  writeJSON(STORAGE_KEYS.recent, ids);
}

// ---- Onboarding flag ----
export function loadOnboarded(): boolean {
  return readJSON<boolean>(STORAGE_KEYS.onboarded, false) === true;
}

export function saveOnboarded(): void {
  writeJSON(STORAGE_KEYS.onboarded, true);
}

// ---- Helpers ----

// Merge user prompts with seeds and sort newest-first (ISO dates sort
// lexicographically, which is also chronological).
export function mergePrompts(userPrompts: Prompt[], seedPrompts: Prompt[]): Prompt[] {
  return [...userPrompts, ...seedPrompts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "prompt";
}

// Slug + short random suffix keeps ids readable but collision-resistant.
export function generateId(title: string): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slugify(title)}-${suffix}`;
}
```

### `src/lib/search.ts`

```ts
import Fuse, { type FuseResultMatch } from "fuse.js";
import type { Prompt } from "./types";

// A single search result: the matched prompt plus (when there was a query) the
// Fuse match data we use to highlight which characters matched.
export interface PromptSearchResult {
  prompt: Prompt;
  matches?: readonly FuseResultMatch[];
}

// Build the Fuse index once per prompt list. Weights bias results toward the
// most meaningful fields (title first), but body text is still searchable.
export function createPromptFuse(prompts: Prompt[]): Fuse<Prompt> {
  return new Fuse(prompts, {
    keys: [
      { name: "title", weight: 0.4 },
      { name: "description", weight: 0.25 },
      { name: "tags", weight: 0.2 },
      { name: "body", weight: 0.15 },
    ],
    includeMatches: true, // needed to highlight matched characters
    includeScore: true,
    threshold: 0.4, // 0 = exact, 1 = match anything; 0.4 is forgiving but focused
    ignoreLocation: true, // match anywhere in the field (important for long bodies)
    minMatchCharLength: 2,
  });
}

// Empty query → return everything in original order. Otherwise → ranked matches.
export function searchPrompts(
  fuse: Fuse<Prompt>,
  prompts: Prompt[],
  query: string,
): PromptSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return prompts.map((prompt) => ({ prompt }));
  return fuse.search(trimmed).map((result) => ({
    prompt: result.item,
    matches: result.matches,
  }));
}

// One slice of a field, flagged as matched or not, for rendering highlights.
export interface HighlightSegment {
  text: string;
  highlight: boolean;
}

// Turn a field value + Fuse matches into segments so the UI can wrap matched
// runs in <mark>. Robust against adjacent/overlapping match ranges.
export function getHighlightSegments(
  value: string,
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
): HighlightSegment[] {
  const plain: HighlightSegment[] = [{ text: value, highlight: false }];
  if (!matches) return plain;

  const match = matches.find((m) => m.key === key);
  if (!match || match.indices.length === 0) return plain;

  const ranges = [...match.indices].sort((a, b) => a[0] - b[0]);
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const [rawStart, rawEnd] of ranges) {
    const start = Math.max(rawStart, cursor);
    const end = rawEnd + 1; // Fuse end indices are inclusive
    if (end <= cursor) continue; // fully behind cursor — skip
    if (start > cursor) {
      segments.push({ text: value.slice(cursor, start), highlight: false });
    }
    segments.push({ text: value.slice(start, end), highlight: true });
    cursor = end;
  }

  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor), highlight: false });
  }

  return segments;
}
```

### `src/lib/settings.ts`

```ts
// User settings, persisted to localStorage. Nothing here ever leaves the
// browser except the API key, and only when the user runs a prompt.

export interface Settings {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface ModelOption {
  id: string;
  label: string;
  hint: string;
}

// The only models offered — latest generation, per project spec.
export const MODELS: ModelOption[] = [
  { id: "claude-opus-4-7", label: "Claude Opus 4.7", hint: "Most capable" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Balanced" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", hint: "Fastest" },
];

export const DEFAULT_MODEL = "claude-opus-4-7";
export const DEFAULT_MAX_TOKENS = 2048;

const STORAGE_KEYS = {
  apiKey: "promptlib:apiKey",
  model: "promptlib:model",
  maxTokens: "promptlib:maxTokens",
} as const;

const FALLBACK: Settings = {
  apiKey: "",
  model: DEFAULT_MODEL,
  maxTokens: DEFAULT_MAX_TOKENS,
};

function isKnownModel(id: string): boolean {
  return MODELS.some((model) => model.id === id);
}

/** Human-friendly model name for display (falls back to the raw id). */
export function modelLabel(id: string): string {
  return MODELS.find((model) => model.id === id)?.label ?? id;
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return FALLBACK;
  try {
    const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey) ?? "";
    const storedModel = localStorage.getItem(STORAGE_KEYS.model) ?? DEFAULT_MODEL;
    const model = isKnownModel(storedModel) ? storedModel : DEFAULT_MODEL;
    const rawMax = localStorage.getItem(STORAGE_KEYS.maxTokens);
    const parsedMax = rawMax ? Number(rawMax) : NaN;
    const maxTokens = Number.isFinite(parsedMax) ? parsedMax : DEFAULT_MAX_TOKENS;
    return { apiKey, model, maxTokens };
  } catch {
    return FALLBACK;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.apiKey, settings.apiKey);
    localStorage.setItem(STORAGE_KEYS.model, settings.model);
    localStorage.setItem(STORAGE_KEYS.maxTokens, String(settings.maxTokens));
  } catch {
    /* localStorage unavailable (private mode / disabled) — settings just won't persist. */
  }
}
```

### `src/lib/variables.ts`

```ts
import type { Prompt, PromptVariable } from "./types";

// Matches {{ name }} tokens, tolerating surrounding whitespace. The capture
// group is the variable name. Defined as a string so each helper can build its
// own RegExp with a fresh lastIndex (a shared /g regex is stateful).
const TOKEN_SOURCE = "\\{\\{\\s*([^}]+?)\\s*\\}\\}";

export interface ResolvedVariable extends PromptVariable {
  /** Render a multi-line textarea instead of a single-line input. */
  multiline: boolean;
}

// A prompt body broken into plain text and variable tokens, in order.
export type BodySegment =
  | { type: "text"; value: string }
  | { type: "var"; name: string; raw: string };

// Turn "camelCase_or-snake" into "Camel Case Or Snake" for tokens that have no
// declared label.
function humanize(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

// Heuristic so long-form fields (code, transcripts, notes) get a textarea.
function isLikelyMultiline(name: string, placeholder?: string): boolean {
  if (placeholder && /paste|paragraph|multiple lines/i.test(placeholder)) return true;
  return /code|snippet|content|body|text|notes|paragraph|essay|transcript|message/i.test(name);
}

// Detect variables actually present in the body (first-appearance order,
// de-duplicated) and enrich them with any declared metadata. This means the UI
// always matches the body — even for prompts whose {{tokens}} were never
// formally declared (e.g. user-added prompts later).
export function extractVariables(prompt: Prompt): ResolvedVariable[] {
  const declared = new Map<string, PromptVariable>(
    prompt.variables.map((variable) => [variable.name, variable]),
  );
  const seen = new Set<string>();
  const result: ResolvedVariable[] = [];

  const regex = new RegExp(TOKEN_SOURCE, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(prompt.body)) !== null) {
    const name = match[1].trim();
    if (seen.has(name)) continue;
    seen.add(name);

    const meta = declared.get(name);
    result.push({
      name,
      label: meta?.label ?? humanize(name),
      placeholder: meta?.placeholder,
      multiline: isLikelyMultiline(name, meta?.placeholder),
    });
  }

  return result;
}

// Split the body into text/variable segments for live-preview rendering.
export function parseBody(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  const regex = new RegExp(TOKEN_SOURCE, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, match.index) });
    }
    segments.push({ type: "var", name: match[1].trim(), raw: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }

  return segments;
}

// Final prompt text for Copy / Run: filled tokens replaced by their value,
// unfilled tokens left as {{name}} so it's obvious what's still missing.
export function substituteBody(body: string, values: Record<string, string>): string {
  const regex = new RegExp(TOKEN_SOURCE, "g");
  return body.replace(regex, (whole, rawName: string) => {
    const value = values[rawName.trim()];
    return value && value.trim() !== "" ? value : whole;
  });
}

// How many of the detected variables currently have a non-empty value.
export function countFilled(
  variables: ResolvedVariable[],
  values: Record<string, string>,
): number {
  return variables.filter((variable) => (values[variable.name] ?? "").trim() !== "").length;
}
```

### `src/lib/anthropic.ts`

```ts
// A tiny, dependency-free client for the Anthropic Messages API that streams
// the response token-by-token. Called directly from the browser with the user's
// own key — that's why the request includes the explicit
// "anthropic-dangerous-direct-browser-access" opt-in header.

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export type ClaudeErrorKind =
  | "auth" // 401 / 403 — bad or unauthorized key
  | "rate-limit" // 429
  | "overloaded" // 503 / 529
  | "network" // fetch failed / connection dropped
  | "bad-request" // other 4xx
  | "unknown"; // anything else

// One error type with a machine-readable `kind` so the UI can react (e.g. show
// an "Open Settings" button for auth errors) and a friendly, human message.
export class ClaudeError extends Error {
  kind: ClaudeErrorKind;
  constructor(kind: ClaudeErrorKind, message: string) {
    super(message);
    this.name = "ClaudeError";
    this.kind = kind;
  }
}

export interface StreamClaudeParams {
  apiKey: string;
  model: string;
  maxTokens: number;
  prompt: string;
  signal?: AbortSignal;
  /** Called with each chunk of text as it streams in. */
  onText: (chunk: string) => void;
}

function mapHttpError(status: number, detail: string): ClaudeError {
  const suffix = detail ? ` (${detail})` : "";
  switch (true) {
    case status === 401 || status === 403:
      return new ClaudeError(
        "auth",
        "That API key was rejected. Double-check it in Settings and re-paste it.",
      );
    case status === 429:
      return new ClaudeError(
        "rate-limit",
        "Rate limit reached. Wait a moment, or switch to a faster model in Settings.",
      );
    case status === 503 || status === 529:
      return new ClaudeError(
        "overloaded",
        "Claude is overloaded right now. Give it a few seconds and try again.",
      );
    case status >= 400 && status < 500:
      return new ClaudeError("bad-request", `Claude rejected the request${suffix}.`);
    default:
      return new ClaudeError("unknown", `Something went wrong on Claude's side${suffix}.`);
  }
}

// Parse one SSE event block and forward any text delta. Throws a ClaudeError if
// the stream itself reports an error event.
function handleEvent(rawEvent: string, onText: (chunk: string) => void): void {
  let data = "";
  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data || data === "[DONE]") return;

  let payload: {
    type?: string;
    delta?: { type?: string; text?: string };
    error?: { message?: string };
  };
  try {
    payload = JSON.parse(data);
  } catch {
    return; // ignore keep-alives / unparseable lines
  }

  if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
    onText(payload.delta.text ?? "");
  } else if (payload.type === "error") {
    throw new ClaudeError("unknown", payload.error?.message ?? "Claude returned an error.");
  }
}

export async function streamClaude({
  apiKey,
  model,
  maxTokens,
  prompt,
  signal,
  onText,
}: StreamClaudeParams): Promise<void> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ClaudeError(
      "network",
      "Couldn't reach Claude — check your connection and try again.",
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error?.message ?? "";
    } catch {
      /* no JSON body — leave detail empty */
    }
    throw mapHttpError(response.status, detail);
  }

  if (!response.body) {
    throw new ClaudeError("unknown", "No response stream was received from Claude.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line.
      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        handleEvent(rawEvent, onText);
      }
    }
  } catch (error) {
    if (error instanceof ClaudeError) throw error;
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ClaudeError("network", "The connection to Claude was interrupted.");
  }
}
```

### `src/components/HomeClient.tsx`

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Prompt } from "@/lib/types";
import { getCategories } from "@/lib/prompts";
import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  loadSettings,
  saveSettings,
  type Settings,
} from "@/lib/settings";
import {
  RECENT_CAP,
  generateId,
  loadFavorites,
  loadOnboarded,
  loadRecent,
  loadUserPrompts,
  mergePrompts,
  saveFavorites,
  saveOnboarded,
  saveRecent,
  saveUserPrompts,
} from "@/lib/library";
import { Header } from "./Header";
import { PromptGrid } from "./PromptGrid";
import { CategoryChips } from "./CategoryChips";
import { CommandPalette } from "./CommandPalette";
import { PromptDetail } from "./PromptDetail";
import { SettingsModal } from "./SettingsModal";
import { OnboardingHint } from "./OnboardingHint";
import { PromptForm, type PromptFormValues } from "./PromptForm";
import { ClockIcon, PlusIcon, SearchIcon, SparkleIcon, StarIcon } from "./icons";

// Returns true if the keystroke happened inside a text field, so global
// single-key shortcuts (like "/") don't hijack normal typing.
function isTypingTarget(event: KeyboardEvent): boolean {
  const el = event.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

interface FormState {
  mode: "create" | "edit";
  initial: Prompt | null;
}

export function HomeClient({ prompts: seedPrompts }: { prompts: Prompt[] }) {
  // Overlay state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  // Settings (defaults first to match SSR, then hydrated from localStorage)
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    model: DEFAULT_MODEL,
    maxTokens: DEFAULT_MAX_TOKENS,
  });

  // Library state (all hydrated from localStorage after mount)
  const [userPrompts, setUserPrompts] = useState<Prompt[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setUserPrompts(loadUserPrompts());
    setFavorites(loadFavorites());
    setRecent(loadRecent());
    setShowOnboarding(!loadOnboarded());
  }, []);

  // ---- Derived data ----
  const allPrompts = useMemo(
    () => mergePrompts(userPrompts, seedPrompts),
    [userPrompts, seedPrompts],
  );
  const promptById = useMemo(() => {
    const map = new Map<string, Prompt>();
    for (const p of allPrompts) map.set(p.id, p);
    return map;
  }, [allPrompts]);

  const categories = useMemo(() => getCategories(allPrompts), [allPrompts]);

  const visiblePrompts = useMemo(
    () => (activeCategory ? allPrompts.filter((p) => p.category === activeCategory) : allPrompts),
    [allPrompts, activeCategory],
  );

  const favoritePrompts = useMemo(
    () => favorites.map((id) => promptById.get(id)).filter((p): p is Prompt => Boolean(p)),
    [favorites, promptById],
  );
  const recentPrompts = useMemo(
    () => recent.map((id) => promptById.get(id)).filter((p): p is Prompt => Boolean(p)),
    [recent, promptById],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  // ---- Actions ----
  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const openSettings = useCallback((notice?: string) => {
    setSettingsNotice(notice ?? null);
    setSettingsOpen(true);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      saveFavorites(next);
      return next;
    });
  }, []);

  const recordRecent = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_CAP);
      saveRecent(next);
      return next;
    });
  }, []);

  const openPrompt = useCallback(
    (prompt: Prompt) => {
      setPaletteOpen(false);
      setActivePrompt(prompt);
      recordRecent(prompt.id);
    },
    [recordRecent],
  );

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    saveOnboarded();
  }, []);

  const deletePrompt = useCallback((id: string) => {
    setUserPrompts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveUserPrompts(next);
      return next;
    });
    setFavorites((prev) => {
      const next = prev.filter((x) => x !== id);
      saveFavorites(next);
      return next;
    });
    setRecent((prev) => {
      const next = prev.filter((x) => x !== id);
      saveRecent(next);
      return next;
    });
    setActivePrompt(null);
  }, []);

  const submitForm = useCallback(
    (values: PromptFormValues) => {
      if (form?.mode === "edit" && form.initial) {
        const updated: Prompt = {
          ...form.initial,
          ...values,
          isSeed: false,
        };
        setUserPrompts((prev) => {
          const next = prev.map((p) => (p.id === updated.id ? updated : p));
          saveUserPrompts(next);
          return next;
        });
        setActivePrompt(updated);
      } else {
        const created: Prompt = {
          id: generateId(values.title),
          title: values.title,
          description: values.description,
          body: values.body,
          variables: [],
          category: values.category,
          tags: values.tags,
          createdAt: new Date().toISOString(),
          isSeed: false,
        };
        setUserPrompts((prev) => {
          const next = [created, ...prev];
          saveUserPrompts(next);
          return next;
        });
        setActivePrompt(created);
        recordRecent(created.id);
      }
      setForm(null);
    },
    [form, recordRecent],
  );

  // Global shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.key === "/" && !isTypingTarget(event)) {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
        setSettingsOpen(false);
        setActivePrompt(null);
        setForm(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showCuratedSections = activeCategory === null;

  return (
    <div className="min-h-screen">
      <Header onOpenSearch={() => setPaletteOpen(true)} onOpenSettings={() => openSettings()} />

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="relative pb-12 pt-16 sm:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-12 mx-auto h-64 max-w-3xl rounded-full bg-coral-200/40 blur-3xl dark:bg-coral-500/10"
          />
          <div className="relative text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium uppercase tracking-wider text-ink-muted dark:border-night-border dark:bg-night-surface dark:text-paper-muted">
              <SparkleIcon className="h-3.5 w-3.5 text-coral-500" />
              Prompt Library
            </span>

            <h1 className="mx-auto mt-6 max-w-2xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink dark:text-paper sm:text-6xl">
              Your prompts, one keystroke away.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-muted dark:text-paper-muted">
              Search, customize, and run your best prompts with Claude — in seconds.
            </p>

            <button
              onClick={() => setPaletteOpen(true)}
              className="group mx-auto mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 text-left shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:border-coral-200 hover:shadow-cardHover dark:border-night-border dark:bg-night-surface"
            >
              <SearchIcon className="h-5 w-5 text-ink-soft transition-colors group-hover:text-coral-500" />
              <span className="flex-1 text-ink-soft dark:text-paper-muted">
                Search prompts by title, tag, or content…
              </span>
              <kbd className="rounded-md border border-border bg-cream px-2 py-1 font-sans text-xs font-medium text-ink-soft dark:border-night-border dark:bg-night">
                ⌘K
              </kbd>
            </button>
          </div>
        </section>

        {showOnboarding && <OnboardingHint onDismiss={dismissOnboarding} />}

        <CategoryChips categories={categories} active={activeCategory} onSelect={setActiveCategory} />

        {/* Favorites */}
        {showCuratedSections && favoritePrompts.length > 0 && (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <StarIcon filled className="h-5 w-5 text-coral-500" />
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
                Favorites
              </h2>
            </div>
            <PromptGrid
              prompts={favoritePrompts}
              onOpen={openPrompt}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </section>
        )}

        {/* Recent */}
        {showCuratedSections && recentPrompts.length > 0 && (
          <section className="pt-10">
            <div className="mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-coral-500" />
              <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">Recent</h2>
            </div>
            <PromptGrid
              prompts={recentPrompts}
              onOpen={openPrompt}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          </section>
        )}

        {/* All prompts */}
        <section className="pb-24 pt-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-ink dark:text-paper">
              {activeCategory ?? "All prompts"}
            </h2>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-ink-muted sm:inline dark:text-paper-muted">
                {visiblePrompts.length} {visiblePrompts.length === 1 ? "prompt" : "prompts"}
              </span>
              <button
                onClick={() => setForm({ mode: "create", initial: null })}
                className="flex items-center gap-1.5 rounded-md border border-coral-300 bg-coral-50 px-3 py-1.5 text-sm font-medium text-coral-700 transition hover:bg-coral-100 active:scale-95 dark:border-coral-500/40 dark:bg-coral-500/10 dark:text-coral-300 dark:hover:bg-coral-500/20"
              >
                <PlusIcon className="h-4 w-4" />
                New prompt
              </button>
            </div>
          </div>

          <PromptGrid
            prompts={visiblePrompts}
            onOpen={openPrompt}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </section>
      </main>

      <CommandPalette
        open={paletteOpen}
        prompts={allPrompts}
        onClose={() => setPaletteOpen(false)}
        onSelect={openPrompt}
      />

      <PromptDetail
        prompt={activePrompt}
        settings={settings}
        isFavorite={activePrompt ? favorites.includes(activePrompt.id) : false}
        onClose={() => setActivePrompt(null)}
        onOpenSettings={openSettings}
        onToggleFavorite={() => activePrompt && toggleFavorite(activePrompt.id)}
        onEdit={() => activePrompt && setForm({ mode: "edit", initial: activePrompt })}
        onDuplicate={() =>
          activePrompt &&
          setForm({
            mode: "create",
            initial: { ...activePrompt, title: `${activePrompt.title} (copy)` },
          })
        }
        onDelete={() => activePrompt && deletePrompt(activePrompt.id)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        notice={settingsNotice}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
      />

      {form && (
        <PromptForm
          key={form.initial?.id ?? "new"}
          mode={form.mode}
          initial={form.initial}
          categories={categories}
          onCancel={() => setForm(null)}
          onSubmit={submitForm}
        />
      )}
    </div>
  );
}
```

### `src/components/PromptDetail.tsx`

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { Prompt } from "@/lib/types";
import { ClaudeError, streamClaude } from "@/lib/anthropic";
import { modelLabel, type Settings } from "@/lib/settings";
import {
  countFilled,
  extractVariables,
  parseBody,
  substituteBody,
} from "@/lib/variables";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  DuplicateIcon,
  PencilIcon,
  StarIcon,
  TrashIcon,
} from "./icons";

interface PromptDetailProps {
  /** When null the modal is closed. */
  prompt: Prompt | null;
  settings: Settings;
  isFavorite: boolean;
  onClose: () => void;
  /** Open Settings, optionally with an inline notice (e.g. missing key). */
  onOpenSettings: (notice?: string) => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

// Small square icon button used in the detail header action row.
function HeaderButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:hover:text-coral-300 " +
        (active ? "text-coral-500" : "text-ink-muted dark:text-paper-muted")
      }
    >
      {children}
    </button>
  );
}

// Copy with a graceful fallback for older / non-secure contexts. localhost and
// https are secure, so the modern API is used in practice.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function PromptDetail({
  prompt,
  settings,
  isFavorite,
  onClose,
  onOpenSettings,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
}: PromptDetailProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Run state
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<ClaudeError | null>(null);
  const [responseCopied, setResponseCopied] = useState(false);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const variables = useMemo(() => (prompt ? extractVariables(prompt) : []), [prompt]);
  const segments = useMemo(() => (prompt ? parseBody(prompt.body) : []), [prompt]);

  // Reset everything whenever a different prompt opens; abort any in-flight run;
  // then focus the first field.
  useEffect(() => {
    abortRef.current?.abort();
    setValues({});
    setCopied(false);
    setConfirmingDelete(false);
    setRunning(false);
    setResponse("");
    setError(null);
    if (prompt) {
      requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLElement>("input, textarea")?.focus();
      });
    }
  }, [prompt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tidy up timers and any running stream on unmount.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (responseCopyTimer.current) clearTimeout(responseCopyTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  if (!prompt) return null;

  const filledCount = countFilled(variables, values);
  const hasValues = filledCount > 0;
  const finalText = substituteBody(prompt.body, values);
  const showResponsePanel = running || response.length > 0 || error !== null;

  function setValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCopy() {
    const ok = await copyToClipboard(finalText);
    if (!ok) return;
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  async function handleCopyResponse() {
    const ok = await copyToClipboard(response);
    if (!ok) return;
    setResponseCopied(true);
    if (responseCopyTimer.current) clearTimeout(responseCopyTimer.current);
    responseCopyTimer.current = setTimeout(() => setResponseCopied(false), 1500);
  }

  async function handleRun() {
    // No key yet → send the user to Settings with a helpful nudge.
    if (!settings.apiKey) {
      onOpenSettings("Add your Anthropic API key to run prompts live.");
      return;
    }

    setError(null);
    setResponse("");
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamClaude({
        apiKey: settings.apiKey,
        model: settings.model,
        maxTokens: settings.maxTokens,
        prompt: finalText,
        signal: controller.signal,
        onText: (chunk) => setResponse((prev) => prev + chunk),
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        // User pressed Stop — keep whatever streamed in, show no error.
      } else if (err instanceof ClaudeError) {
        setError(err);
      } else {
        setError(new ClaudeError("unknown", "Something unexpected happened. Please try again."));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleModalKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!running) handleRun();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        onKeyDown={handleModalKeyDown}
        className="relative flex max-h-[85vh] w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 dark:border-night-border">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700 dark:bg-coral-500/15 dark:text-coral-300">
                {prompt.category}
              </span>
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-cream px-2 py-0.5 text-xs text-ink-soft dark:bg-night dark:text-paper-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink dark:text-paper">
              {prompt.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted dark:text-paper-muted">
              {prompt.description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <HeaderButton
              label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              active={isFavorite}
              onClick={onToggleFavorite}
            >
              <StarIcon
                filled={isFavorite}
                className={clsx("h-[18px] w-[18px]", isFavorite && "animate-pop")}
              />
            </HeaderButton>
            <HeaderButton label="Duplicate" onClick={onDuplicate}>
              <DuplicateIcon className="h-[18px] w-[18px]" />
            </HeaderButton>
            {!prompt.isSeed && (
              <HeaderButton label="Edit" onClick={onEdit}>
                <PencilIcon className="h-[18px] w-[18px]" />
              </HeaderButton>
            )}
            {!prompt.isSeed && (
              <HeaderButton label="Delete" onClick={() => setConfirmingDelete(true)}>
                <TrashIcon className="h-[18px] w-[18px]" />
              </HeaderButton>
            )}
            <HeaderButton label="Close" onClick={onClose}>
              <CloseIcon className="h-[18px] w-[18px]" />
            </HeaderButton>
          </div>
        </div>

        {/* Inline delete confirmation */}
        {confirmingDelete && (
          <div className="flex items-center justify-between gap-3 border-b border-coral-200 bg-coral-50 px-6 py-3 dark:border-coral-500/30 dark:bg-coral-500/10">
            <span className="text-sm text-coral-900 dark:text-coral-100">
              Delete this prompt? This can&apos;t be undone.
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-md border border-coral-300 px-3 py-1.5 text-sm font-medium text-coral-800 transition hover:bg-coral-100 dark:border-coral-500/40 dark:text-coral-100 dark:hover:bg-coral-500/20"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="rounded-md bg-coral-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-coral-700 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Split body */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          {/* Left: live preview of the final prompt */}
          <div className="scrollbar-soft overflow-y-auto border-b border-border p-6 md:border-b-0 md:border-r dark:border-night-border">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-soft">
              Preview
            </div>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink dark:text-paper">
              {segments.map((segment, index) => {
                if (segment.type === "text") {
                  return <span key={index}>{segment.value}</span>;
                }
                const value = values[segment.name];
                const isFilled = value !== undefined && value.trim() !== "";
                return isFilled ? (
                  <span
                    key={index}
                    className="rounded bg-coral-100/70 px-1 text-ink dark:bg-coral-500/20 dark:text-paper"
                  >
                    {value}
                  </span>
                ) : (
                  <span
                    key={index}
                    className="rounded border border-dashed border-coral-300 px-1 text-coral-600 dark:border-coral-500/50 dark:text-coral-300"
                  >
                    {segment.raw}
                  </span>
                );
              })}
            </pre>
          </div>

          {/* Right: variable inputs + actions + response */}
          <div ref={panelRef} className="scrollbar-soft flex flex-col overflow-y-auto p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                Variables
              </span>
              {variables.length > 0 && (
                <span className="flex items-center gap-2 text-xs text-ink-soft">
                  <span>
                    {filledCount}/{variables.length} filled
                  </span>
                  {hasValues && (
                    <button
                      onClick={() => setValues({})}
                      className="font-medium text-coral-600 hover:text-coral-700 dark:text-coral-400"
                    >
                      Clear
                    </button>
                  )}
                </span>
              )}
            </div>

            {variables.length === 0 ? (
              <p className="text-sm text-ink-muted dark:text-paper-muted">
                This prompt has no variables — it&apos;s ready to copy or run as-is.
              </p>
            ) : (
              <div className="space-y-3">
                {variables.map((variable) => (
                  <div key={variable.name}>
                    <label
                      htmlFor={`var-${variable.name}`}
                      className="mb-1 block text-sm font-medium text-ink dark:text-paper"
                    >
                      {variable.label}
                    </label>
                    {variable.multiline ? (
                      <textarea
                        id={`var-${variable.name}`}
                        value={values[variable.name] ?? ""}
                        onChange={(event) => setValue(variable.name, event.target.value)}
                        placeholder={variable.placeholder}
                        rows={5}
                        className="w-full resize-y rounded-md border border-border bg-cream/50 px-3 py-2 font-mono text-xs leading-relaxed text-ink outline-none transition placeholder:text-ink-soft focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
                      />
                    ) : (
                      <input
                        id={`var-${variable.name}`}
                        value={values[variable.name] ?? ""}
                        onChange={(event) => setValue(variable.name, event.target.value)}
                        placeholder={variable.placeholder}
                        className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleCopy}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-95",
                  copied
                    ? "border-coral-500 bg-coral-500 text-white"
                    : "border-border text-ink hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:text-paper dark:hover:text-coral-300",
                )}
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>

              {running ? (
                <button
                  onClick={handleStop}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition active:scale-95 dark:border-night-border dark:text-paper"
                >
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-coral-300 border-t-coral-600" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleRun}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-coral-500 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-coral-600 active:scale-95"
                >
                  Run with Claude
                </button>
              )}
            </div>

            <p className="mt-2 text-center text-xs text-ink-soft dark:text-paper-muted">
              {modelLabel(settings.model)} · <kbd className="font-sans">⌘↵</kbd> to run
            </p>

            {/* Response / error */}
            {showResponsePanel && (
              <div className="mt-5 border-t border-border pt-4 dark:border-night-border">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">
                    Response
                  </span>
                  {running && (
                    <span className="flex items-center gap-1.5 text-xs text-coral-600 dark:text-coral-400">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-coral-300 border-t-coral-600" />
                      Streaming…
                    </span>
                  )}
                  {!running && response.length > 0 && !error && (
                    <button
                      onClick={handleCopyResponse}
                      className="text-xs font-medium text-coral-600 hover:text-coral-700 dark:text-coral-400"
                    >
                      {responseCopied ? "Copied" : "Copy response"}
                    </button>
                  )}
                </div>

                {error ? (
                  <div className="rounded-md border border-coral-300 bg-coral-50 px-3 py-2.5 text-sm text-coral-800 dark:border-coral-500/40 dark:bg-coral-500/10 dark:text-coral-200">
                    <p>{error.message}</p>
                    {error.kind === "auth" && (
                      <button
                        onClick={() => onOpenSettings("Paste a fresh API key and try again.")}
                        className="mt-2 font-medium underline underline-offset-2"
                      >
                        Open Settings
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="scrollbar-soft max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-cream/40 px-3 py-2.5 text-sm leading-relaxed text-ink dark:border-night-border dark:bg-night dark:text-paper">
                    {response}
                    {running && (
                      <span className="ml-0.5 inline-block animate-pulse font-semibold text-coral-500">
                        ▋
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `src/components/CommandPalette.tsx`

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { Prompt } from "@/lib/types";
import {
  createPromptFuse,
  searchPrompts,
  getHighlightSegments,
  type PromptSearchResult,
} from "@/lib/search";
import { SearchIcon } from "./icons";

interface CommandPaletteProps {
  open: boolean;
  prompts: Prompt[];
  onClose: () => void;
  onSelect: (prompt: Prompt) => void;
}

// Renders a field value with matched substrings wrapped in <mark>.
function Highlighted({
  value,
  matches,
  fieldKey,
}: {
  value: string;
  matches: PromptSearchResult["matches"];
  fieldKey: string;
}) {
  const segments = getHighlightSegments(value, matches, fieldKey);
  return (
    <>
      {segments.map((segment, index) =>
        segment.highlight ? (
          <mark
            key={index}
            className="rounded-[2px] bg-coral-200/70 text-ink dark:bg-coral-500/30 dark:text-paper"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

// A tiny keycap used in the footer hints.
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-cream px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-soft dark:border-night-border dark:bg-night dark:text-paper-muted">
      {children}
    </kbd>
  );
}

export function CommandPalette({ open, prompts, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Index is built once per prompt list. Search runs on every keystroke — the
  // dataset is small, so this is instant with no debounce needed.
  const fuse = useMemo(() => createPromptFuse(prompts), [prompts]);
  const results = useMemo(
    () => searchPrompts(fuse, prompts, query),
    [fuse, prompts, query],
  );

  // Fresh start each time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  // Reset the selection to the top whenever the query changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlighted row visible as you arrow through the list.
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  if (!open) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) onSelect(result.prompt);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 dark:border-night-border">
          <SearchIcon className="h-5 w-5 shrink-0 text-ink-soft" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search prompts by title, tag, or content…"
            className="flex-1 bg-transparent text-ink outline-none placeholder:text-ink-soft dark:text-paper"
            aria-label="Search prompts"
          />
          <Kbd>esc</Kbd>
        </div>

        {/* Results */}
        {results.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-ink-muted dark:text-paper-muted">
              No prompts match <span className="font-medium text-ink dark:text-paper">“{query}”</span>
            </p>
            <p className="mt-1 text-xs text-ink-soft">Try a different word or a tag.</p>
          </div>
        ) : (
          <ul ref={listRef} className="scrollbar-soft max-h-[50vh] overflow-y-auto p-2">
            {results.map((result, index) => {
              const isActive = index === activeIndex;
              return (
                <li key={result.prompt.id}>
                  <button
                    data-active={isActive}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => onSelect(result.prompt)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "bg-coral-100 dark:bg-coral-500/20"
                        : "hover:bg-coral-50/70 dark:hover:bg-night-border/40",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={clsx(
                          "truncate text-sm font-medium",
                          isActive
                            ? "text-coral-800 dark:text-coral-200"
                            : "text-ink dark:text-paper",
                        )}
                      >
                        <Highlighted
                          value={result.prompt.title}
                          matches={result.matches}
                          fieldKey="title"
                        />
                      </div>
                      <div className="truncate text-xs text-ink-muted dark:text-paper-muted">
                        <Highlighted
                          value={result.prompt.description}
                          matches={result.matches}
                          fieldKey="description"
                        />
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-coral-50 px-2 py-0.5 text-[11px] font-medium text-coral-700 dark:bg-coral-500/15 dark:text-coral-300">
                      {result.prompt.category}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-ink-soft dark:border-night-border dark:text-paper-muted">
          <span>
            {results.length} {results.length === 1 ? "result" : "results"}
          </span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd>
              open
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
```

### `src/components/PromptForm.tsx`

```tsx
"use client";

import { useState } from "react";
import type { Prompt } from "@/lib/types";
import { CloseIcon } from "./icons";

export interface PromptFormValues {
  title: string;
  description: string;
  body: string;
  category: string;
  tags: string[];
}

interface PromptFormProps {
  mode: "create" | "edit";
  /** Prefilled values (editing, or duplicating a prompt). */
  initial: Prompt | null;
  /** Existing category names, offered in the combobox. */
  categories: string[];
  onCancel: () => void;
  onSubmit: (values: PromptFormValues) => void;
}

const fieldClass =
  "w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30";

export function PromptForm({ mode, initial, categories, onCancel, onSubmit }: PromptFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const canSave = title.trim() !== "" && body.trim() !== "";

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, "");
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag]);
    setTagInput("");
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
    } else if (event.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  function handleSubmit() {
    if (!canSave) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      body,
      category: category.trim() || "Uncategorized",
      tags,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative flex max-h-[88vh] w-full max-w-2xl animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-night-border">
          <h2 className="font-display text-xl font-semibold text-ink dark:text-paper">
            {mode === "edit" ? "Edit prompt" : "New prompt"}
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="scrollbar-soft space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label htmlFor="pf-title" className="mb-1 block text-sm font-medium text-ink dark:text-paper">
              Title <span className="text-coral-500">*</span>
            </label>
            <input
              id="pf-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Weekly Status Update"
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="pf-description"
              className="mb-1 block text-sm font-medium text-ink dark:text-paper"
            >
              Description
            </label>
            <input
              id="pf-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="One line shown on the card and in search"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="pf-body" className="mb-1 block text-sm font-medium text-ink dark:text-paper">
              Prompt body <span className="text-coral-500">*</span>
            </label>
            <textarea
              id="pf-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your prompt. Use {{variableName}} for fill-in-the-blanks."
              rows={8}
              className={`${fieldClass} resize-y font-mono text-xs leading-relaxed`}
            />
            <p className="mt-1.5 text-xs text-ink-soft dark:text-paper-muted">
              Wrap fill-ins in double braces, like{" "}
              <code className="rounded bg-cream px-1 dark:bg-night">{"{{topic}}"}</code> — they become
              input fields automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pf-category"
                className="mb-1 block text-sm font-medium text-ink dark:text-paper"
              >
                Category
              </label>
              <input
                id="pf-category"
                list="pf-category-options"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Pick or type a new one"
                className={fieldClass}
              />
              <datalist id="pf-category-options">
                {categories.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="pf-tags" className="mb-1 block text-sm font-medium text-ink dark:text-paper">
                Tags
              </label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-cream/50 px-2 py-1.5 focus-within:border-coral-400 focus-within:ring-2 focus-within:ring-coral-200 dark:border-night-border dark:bg-night dark:focus-within:ring-coral-500/30">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded bg-coral-50 px-1.5 py-0.5 text-xs text-coral-700 dark:bg-coral-500/15 dark:text-coral-300"
                  >
                    #{tag}
                    <button
                      type="button"
                      aria-label={`Remove ${tag}`}
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="text-coral-500 hover:text-coral-700"
                    >
                      <CloseIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="pf-tags"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={tags.length ? "" : "Type and press Enter"}
                  className="min-w-[6rem] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft dark:text-paper"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4 dark:border-night-border">
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-muted transition hover:text-ink dark:border-night-border dark:text-paper-muted dark:hover:text-paper"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="rounded-md bg-coral-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === "edit" ? "Save changes" : "Create prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### `src/components/SettingsModal.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { DEFAULT_MAX_TOKENS, MODELS, type Settings } from "@/lib/settings";
import { CloseIcon } from "./icons";

interface SettingsModalProps {
  open: boolean;
  settings: Settings;
  /** Optional inline message, e.g. when opened because a key was missing. */
  notice: string | null;
  onClose: () => void;
  onSave: (next: Settings) => void;
}

export function SettingsModal({ open, settings, notice, onClose, onSave }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(settings.model);
  const [maxTokens, setMaxTokens] = useState(String(settings.maxTokens));
  const [showKey, setShowKey] = useState(false);

  // Sync the form to the saved settings each time the modal opens.
  useEffect(() => {
    if (open) {
      setApiKey(settings.apiKey);
      setModel(settings.model);
      setMaxTokens(String(settings.maxTokens));
      setShowKey(false);
    }
  }, [open, settings]);

  if (!open) return null;

  function handleSave() {
    const parsed = Number(maxTokens);
    const safeMax = Number.isFinite(parsed)
      ? Math.min(8192, Math.max(256, Math.round(parsed)))
      : DEFAULT_MAX_TOKENS;
    onSave({ apiKey: apiKey.trim(), model, maxTokens: safeMax });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-xl border border-border bg-surface shadow-palette dark:border-night-border dark:bg-night-surface">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 dark:border-night-border">
          <h2 className="font-display text-xl font-semibold text-ink dark:text-paper">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night dark:text-paper-muted"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {notice && (
            <div className="rounded-md border border-coral-300 bg-coral-50 px-3 py-2 text-sm text-coral-800 dark:border-coral-500/40 dark:bg-coral-500/10 dark:text-coral-200">
              {notice}
            </div>
          )}

          {/* API key */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="api-key" className="text-sm font-medium text-ink dark:text-paper">
                Anthropic API key
              </label>
              <button
                onClick={() => setShowKey((s) => !s)}
                className="text-xs font-medium text-coral-600 hover:text-coral-700 dark:text-coral-400"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="api-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
            />
            <p className="mt-1.5 text-xs text-ink-soft dark:text-paper-muted">
              Your key is stored locally in your browser and is only sent to Anthropic when you run a
              prompt.
            </p>
          </div>

          {/* Model */}
          <div>
            <label htmlFor="model" className="mb-1 block text-sm font-medium text-ink dark:text-paper">
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
            >
              {MODELS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} — {option.hint}
                </option>
              ))}
            </select>
          </div>

          {/* Max tokens */}
          <div>
            <label
              htmlFor="max-tokens"
              className="mb-1 block text-sm font-medium text-ink dark:text-paper"
            >
              Max response length (tokens)
            </label>
            <input
              id="max-tokens"
              type="number"
              min={256}
              max={8192}
              step={256}
              value={maxTokens}
              onChange={(event) => setMaxTokens(event.target.value)}
              className="w-full rounded-md border border-border bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition focus:border-coral-400 focus:ring-2 focus:ring-coral-200 dark:border-night-border dark:bg-night dark:text-paper dark:focus:ring-coral-500/30"
            />
            <p className="mt-1.5 text-xs text-ink-soft dark:text-paper-muted">
              The longest a response can be. Default 2048.
            </p>
          </div>

          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-coral-600 hover:text-coral-700 dark:text-coral-400"
          >
            Get an API key from the Anthropic Console →
          </a>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4 dark:border-night-border">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-muted transition hover:text-ink dark:border-night-border dark:text-paper-muted dark:hover:text-paper"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-coral-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-600 active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

### `src/components/PromptCard.tsx`

```tsx
"use client";

import clsx from "clsx";
import type { Prompt } from "@/lib/types";
import { StarIcon } from "./icons";

interface PromptCardProps {
  prompt: Prompt;
  onOpen: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function PromptCard({ prompt, onOpen, isFavorite, onToggleFavorite }: PromptCardProps) {
  // The card itself is the click target; the star is a nested control, so we
  // use a div with button semantics (a real <button> can't contain a button).
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className="group relative flex h-full cursor-pointer flex-col rounded-xl border border-border bg-surface p-5 text-left shadow-card transition duration-200 ease-out hover:-translate-y-1 hover:border-coral-200 hover:shadow-cardHover focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-300 dark:border-night-border dark:bg-night-surface dark:hover:border-coral-500/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex w-fit items-center rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700 dark:bg-coral-500/15 dark:text-coral-300">
          {prompt.category}
        </span>
        <button
          type="button"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          className={clsx(
            "-mr-1.5 -mt-1.5 flex h-8 w-8 items-center justify-center rounded-md transition active:scale-90",
            isFavorite
              ? "text-coral-500"
              : "text-ink-soft opacity-0 hover:text-coral-500 focus-visible:opacity-100 group-hover:opacity-100",
          )}
        >
          <StarIcon
            filled={isFavorite}
            className={clsx("h-[18px] w-[18px]", isFavorite && "animate-pop")}
          />
        </button>
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-coral-600 dark:text-paper dark:group-hover:text-coral-300">
        {prompt.title}
      </h3>

      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted dark:text-paper-muted">
        {prompt.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {prompt.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-cream px-2 py-0.5 text-xs text-ink-soft dark:bg-night dark:text-paper-muted"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}
```

### `src/components/PromptGrid.tsx`

```tsx
"use client";

import type { Prompt } from "@/lib/types";
import { PromptCard } from "./PromptCard";

interface PromptGridProps {
  prompts: Prompt[];
  onOpen: (prompt: Prompt) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

export function PromptGrid({ prompts, onOpen, isFavorite, onToggleFavorite }: PromptGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          onOpen={() => onOpen(prompt)}
          isFavorite={isFavorite(prompt.id)}
          onToggleFavorite={() => onToggleFavorite(prompt.id)}
        />
      ))}
    </div>
  );
}
```

### `src/components/Header.tsx`

```tsx
"use client";

import { GearIcon, SearchIcon, SparkleIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

export function Header({ onOpenSearch, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-cream/80 backdrop-blur dark:border-night-border/70 dark:bg-night/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-500 text-white shadow-sm">
            <SparkleIcon className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink dark:text-paper">
            Prompt Library
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:border-coral-300 hover:text-coral-600 sm:flex dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-400"
          >
            <SearchIcon className="h-4 w-4" />
            Search
            <kbd className="rounded border border-border bg-cream px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-soft dark:border-night-border dark:bg-night">
              ⌘K
            </kbd>
          </button>

          <ThemeToggle />

          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-400"
          >
            <GearIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
```

### `src/components/CategoryChips.tsx`

```tsx
"use client";

import clsx from "clsx";

interface CategoryChipsProps {
  categories: string[];
  /** null means "All". */
  active: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryChips({ categories, active, onSelect }: CategoryChipsProps) {
  const chips: { label: string; value: string | null }[] = [
    { label: "All", value: null },
    ...categories.map((c) => ({ label: c, value: c })),
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {chips.map((chip) => {
        const isActive = chip.value === active;
        return (
          <button
            key={chip.label}
            onClick={() => onSelect(chip.value)}
            className={clsx(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              isActive
                ? "border-coral-500 bg-coral-500 text-white shadow-sm"
                : "border-border bg-surface text-ink-muted hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-300",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
```

### `src/components/ThemeToggle.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

// Flips the `dark` class on <html> and remembers the choice. The initial theme
// is applied by the no-flash script in layout.tsx before React mounts; here we
// just sync our local state to whatever that script decided.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("promptlib:theme", next ? "dark" : "light");
    } catch {
      /* localStorage can be unavailable (private mode) — ignore. */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-ink-muted transition hover:border-coral-300 hover:text-coral-600 dark:border-night-border dark:bg-night-surface dark:text-paper-muted dark:hover:text-coral-400"
    >
      {dark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
```

### `src/components/OnboardingHint.tsx`

```tsx
"use client";

import { CloseIcon, SparkleIcon } from "./icons";

// One-time callout shown on first visit; dismissal is persisted by the caller.
export function OnboardingHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-6 flex animate-fade-in items-center gap-3 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 dark:border-coral-500/30 dark:bg-coral-500/10">
      <SparkleIcon className="h-5 w-5 shrink-0 text-coral-500" />
      <p className="flex-1 text-sm text-coral-900 dark:text-coral-100">
        Press{" "}
        <kbd className="rounded border border-coral-300 bg-coral-100 px-1.5 py-0.5 font-sans text-[11px] font-medium dark:border-coral-500/40 dark:bg-coral-500/20">
          ⌘K
        </kbd>{" "}
        to search · Add your Claude key in <span className="font-medium">Settings</span> to run
        prompts live.
      </p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-coral-700 transition hover:bg-coral-100 dark:text-coral-200 dark:hover:bg-coral-500/20"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
```

### `src/components/icons.tsx`

```tsx
import type { SVGProps } from "react";

// Small, dependency-free icon set. Each takes standard SVG props so size and
// color come from Tailwind classes (e.g. className="h-4 w-4 text-coral-500").

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function StarIcon({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2.5l2.95 5.97 6.59.96-4.77 4.65 1.13 6.56L12 18.6l-5.9 3.1 1.13-6.56-4.77-4.65 6.59-.96L12 2.5Z" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function DuplicateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// A 4-point sparkle — used for the app mark and the hero eyebrow.
export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5C9.7 7.9 11.4 6.2 12 2Z" />
      <path d="M18.5 14c.3 2 1.1 2.8 3.1 3.1-2 .3-2.8 1.1-3.1 3.1-.3-2-1.1-2.8-3.1-3.1 2-.3 2.8-1.1 3.1-3.1Z" opacity="0.8" />
    </svg>
  );
}
```

### `src/data/prompts.json`

```json
[
  {
    "id": "explain-like-im-five",
    "title": "Explain Like I'm Five",
    "description": "Turn any complex topic into a simple, vivid explanation for any audience.",
    "body": "Explain {{topic}} in simple terms that a {{audience}} could understand.\n\nUse one short, concrete analogy from everyday life, avoid jargon, and keep it under 150 words. End with a single sentence on why it matters.",
    "variables": [
      { "name": "topic", "label": "Topic to explain", "placeholder": "e.g. how vaccines work" },
      { "name": "audience", "label": "Audience", "placeholder": "e.g. a curious 10-year-old" }
    ],
    "category": "Learning",
    "tags": ["explainer", "teaching", "simplify"],
    "createdAt": "2026-05-22",
    "isSeed": true
  },
  {
    "id": "cold-outreach-email",
    "title": "Cold Outreach Email",
    "description": "Draft a short, personable cold email that actually earns a reply.",
    "body": "Write a concise cold outreach email to {{recipientName}} at {{company}}.\n\nThe one thing I want to land: {{valueProp}}\n\nKeep it under 120 words, lead with relevance to them (not me), use a warm but professional tone, and end with a single low-friction call to action. Then give me 2 subject line options.",
    "variables": [
      { "name": "recipientName", "label": "Recipient name", "placeholder": "e.g. Jordan" },
      { "name": "company", "label": "Their company", "placeholder": "e.g. Northwind Labs" },
      { "name": "valueProp", "label": "Core value proposition", "placeholder": "e.g. cut onboarding time in half" }
    ],
    "category": "Sales",
    "tags": ["email", "outreach", "sales"],
    "createdAt": "2026-05-22",
    "isSeed": true
  },
  {
    "id": "code-review-buddy",
    "title": "Code Review Buddy",
    "description": "Get a focused review of a snippet: bugs, readability, and one concrete fix.",
    "body": "Review the following {{language}} code:\n\n{{code}}\n\nDo three things, in order:\n1. Call out any bugs or correctness issues.\n2. Note the single biggest readability or maintainability improvement.\n3. Show a revised version of the most important part.\n\nBe specific and skip generic advice.",
    "variables": [
      { "name": "language", "label": "Language", "placeholder": "e.g. TypeScript" },
      { "name": "code", "label": "Code to review", "placeholder": "Paste your snippet here" }
    ],
    "category": "Engineering",
    "tags": ["code", "review", "debugging"],
    "createdAt": "2026-05-22",
    "isSeed": true
  }
]
```
