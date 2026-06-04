# Prompt Library Tool — Contributor Onboarding Guide

**Last updated:** 2026-05-29 | **For:** First-time contributors, community members, and Sky's extended team

---

## What is Prompt Library?

The Prompt Library Tool is a Next.js 15 + React 19 web app that lets users:
- **Browse** a library of AI prompts (built-in seed prompts + custom user prompts)
- **Run** prompts against Claude's API (with live token usage tracking)
- **Save** API key, model selection, and per-prompt run history locally (browser storage)
- **Create** custom prompts with templated variables
- **Export/Import** your library as JSON for backup or sharing

**Live:** https://skypie99.github.io/portfolio/ (shipped on GitHub Pages)

---

## Tech Stack

| Layer | Stack |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TailwindCSS 3.4 |
| Type Safety | TypeScript 5.7 |
| Testing | Vitest 2 + Testing Library |
| Styling | Tailwind (teal color theme as of 2026-05-29) |
| Linting | ESLint v9 |

---

## Project Structure

```
src/
├── app/                   # Next.js app routes, layout
├── components/            # React components (22 files)
│   ├── PromptGrid.tsx        # Main grid of prompts
│   ├── PromptDetail.tsx      # Prompt detail + run editor
│   ├── Settings.tsx          # API key, model, settings form
│   ├── RunHistory.tsx        # Per-prompt run history
│   └── ... (18 more)
├── lib/
│   ├── anthropic.ts       # Streaming API client, error handling
│   ├── library.ts         # Seed + user prompt management
│   ├── storage.ts         # Browser localStorage wrappers
│   ├── runs.ts            # Run history storage
│   └── ... (others)
└── data/
    └── seeds.ts           # Hardcoded seed prompts

qa-reports/              # Role findings, QA reports (92 files)
FEATURES.md              # Living backlog (features, acceptance criteria)
DECISIONS_LOG.md         # Sky decisions on UI placement, persistence
PROJECT_STATE.md         # Current status, blockers, next actions
LEARNINGS.md             # Patterns, pitfalls, architectural notes

---

## Getting Started (Local Setup)

### Prerequisites
- Node.js 18+
- npm or yarn
- Text editor (VS Code recommended)
- GitHub CLI (if you plan to open PRs)

### 1. Clone & Install
```bash
cd ~/Documents/Claude/Projects
git clone https://github.com/skypie99/prompt-library-tool.git
cd "Prompt Library Tool"
npm install
```

### 2. Run Locally
```bash
npm run dev
# Opens http://localhost:3000
```

### 3. Type Check & Test
```bash
npm run typecheck    # TypeScript validation
npm run test         # Run Vitest suite (347+ tests)
npm run test:watch   # Watch mode
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint errors
npm run format       # Prettier formatting
```

---

## Key Patterns & Conventions

### State Management
- **Browser Storage**: `lib/storage.ts` handles all localStorage reads/writes (apiKey, model, settings).
- **Per-Prompt History**: `lib/runs.ts` stores run outputs, token counts, errors per prompt ID.
- **No Redux/Context**: This app uses React hooks + localStorage. State flows down via props.

### Component Anatomy
1. **Page Layout** (`src/app/page.tsx`): Top-level route handler.
2. **Prompt Grid** (`PromptGrid.tsx`): List of cards (seeds + user prompts).
3. **Prompt Detail** (`PromptDetail.tsx`): Single prompt view with form, run button, history, error state.
4. **Settings Modal** (`Settings.tsx`): API key, model selection, export/import.

### Adding a Feature
1. **Create a new branch** off `main` (never edit main directly; Sky merges).
2. **Write acceptance tests** first (`src/components/__tests__/YourComponent.test.tsx`).
3. **Implement** the feature.
4. **Run tests** (`npm run test`) and **typecheck** (`npm run typecheck`).
5. **Commit with a clear message**: "feat(component-name): short description".
6. **Open a PR** with a link to the relevant `FEATURES.md` item.

### Styling
- **Color Theme**: Teal anchor (#2F9E96) in `lib/categoryColor.ts`.
- **Tailwind Config**: `tailwind.config.ts` — extends with custom spacing, teal scale.
- **No inline styles**: Use Tailwind classes or CSS modules.

### Error Handling
- **API Errors**: `lib/anthropic.ts` catches and types errors as `ClaudeError` (kind: `"auth"`, `"rate-limit"`, etc.).
- **User Feedback**: `PromptDetail.tsx` shows error banners with actionable next steps.
- **Logging**: SSE errors include context (prompt ID, model, token count).

---

## Code Review Expectations

### Before Opening a PR
- [ ] `npm run typecheck` passes (0 errors).
- [ ] `npm run test` passes (no new test failures).
- [ ] `npm run lint` is clean (or deferred warnings are documented in `DECISIONS_LOG.md`).
- [ ] Commit messages are clear (imperative mood: "add", "fix", "refactor").
- [ ] No secrets in code (API keys, credentials, tokens).
- [ ] Accessibility: form labels, focus states, aria-label on interactive elements.

### Who Reviews
- **Shamus** (lead dev): All PRs merge through Shamus's branch `shamus/merge-gate`. Sky will not merge directly to `main`.
- **Gary** (QA): Lint, test coverage, build safety.
- **Dani** (design): UI/UX changes, component consistency, brand adherence (teal theme).
- **Alex** (integration): Feature completeness, acceptance criteria alignment.

### Post-Merge
- **ESLint**: 14 deferred warnings in test files (low priority, tracked in `PROJECT_STATE.md`).
- **a11y**: Search/Settings focus rings required before ship (status: in progress, `a11y/header-focus-teal-2026-05-29` branch).
- **Token usage**: Now live in UI (per-run input/output counts displayed in RunHistory + PromptDetail).

---

## Common Tasks

### Add a Seed Prompt
1. Edit `src/data/seeds.ts`.
2. Add an object with `id`, `title`, `description`, `category`, `template`.
3. If template has variables (e.g., `{variable_name}`), they auto-populate the form in PromptDetail.
4. Test: `npm run test`.

### Create a New Component
1. Place in `src/components/YourComponent.tsx`.
2. Write tests in `src/components/__tests__/YourComponent.test.tsx`.
3. Export from `src/components/index.ts` (if shared).
4. Import and use in parent components.

### Fix a Bug
1. Open an issue or check `DECISIONS_LOG.md` for known issues.
2. Create a branch: `git checkout -b fix/issue-name main`.
3. Add a failing test that reproduces the bug.
4. Fix the code.
5. Verify `npm run test` passes.
6. Commit: `git commit -m "fix(component): brief description"`.

### Update Dependencies
1. `npm outdated` to check for upgrades.
2. `npm update` to bump patch/minor versions.
3. Test thoroughly (`npm run test`, `npm run build`).
4. Commit: `git commit -m "chore: bump deps"`.

---

## Documentation & Decisions

- **FEATURES.md**: Living backlog with full acceptance criteria for each feature.
- **DECISIONS_LOG.md**: Sky's decisions on UI placement, color, persistence, etc. (updated as new decisions land).
- **LEARNINGS.md**: Architectural patterns, pitfalls, test strategies.
- **PROJECT_STATE.md**: Current status, what's in flight, blockers, next steps (updated after each role cycle).

### Asking for Guidance
- **Feature question?** Check `FEATURES.md` and `DECISIONS_LOG.md` first.
- **Architecture question?** See `LEARNINGS.md`.
- **Blocked?** File it in `DECISIONS_LOG.md` as "DECISIONS FOR SKY" or "@mention Morgan" in a PR comment.
- **Community question?** Open an issue on GitHub; Casey monitors.

---

## Testing Strategy

### Unit Tests (lib/)
- `lib/storage.test.ts`: localStorage mock, get/set/clear key-value pairs.
- `lib/anthropic.test.ts`: ClaudeError parsing, retry-after header extraction.
- `lib/library.test.ts`: seed/user prompt filtering, favorites, recent.

### Component Tests
- `PromptGrid.test.tsx`: render seed + user prompts, filter by category.
- `PromptDetail.test.tsx`: form input, run button, error states (auth, rate-limit).
- `Settings.test.tsx`: API key input, model selection, export/import.

### Running Tests
```bash
# Run once
npm run test

# Watch mode (re-run on change)
npm run test:watch

# UI dashboard
npm run test:ui

# Coverage (optional, not mandatory)
npm run test -- --coverage
```

### Test Conventions
- Use `describe` and `it` blocks.
- Mock localStorage with `beforeEach` / `afterEach`.
- Mock Anthropic API calls with MSW (Mock Service Worker) or jest.mock.
- Test user interactions (click, type) with `@testing-library/user-event`.
- Avoid snapshot tests for UI (brittle); prefer semantic assertions.

---

## Deployment & CI/CD

- **Main branch** lives on GitHub; Sky merges branches into main.
- **Live site** is built from `main` and deployed to `gh-pages` (GitHub Pages).
- **CI**: GitHub Actions runs `npm run lint`, `npm run test`, `npm run typecheck` on every PR.
- **Build**: `npm run build` generates a static export; `npm run preview` serves it locally.

### Deploy Checklist (Sky's responsibility)
- All branches merged in the correct order (ESLint before ratelimit-retry, teal before a11y).
- `main` is green (all checks pass).
- `npm run build` succeeds.
- Push to `gh-pages` via GitHub CLI or Actions.

---

## Community Etiquette

- **Be respectful**: This is Sky's learning project. Tone is collaborative, not critical.
- **Suggest, don't demand**: Open issues with "This might improve UX because…" not "This is broken."
- **Test before opening a PR**: Failing tests = auto-reject.
- **Document decisions**: Add comments explaining *why* you made a choice, not just *what*.
- **Respect scope**: Stick to the feature you're working on; don't refactor unrelated code in the same PR.

---

## Questions?

- **Local dev issue?** Start with `npm install` and `npm run dev`. Check Node version (`node -v`).
- **Test failure?** Run `npm run test:watch` and inspect the error. Most failures are mock setup or assertion mismatches.
- **TypeScript error?** Run `npm run typecheck` to see all errors at once.
- **Can't find a file?** Check the structure above; components are in `src/components/`, library code is in `src/lib/`.
- **Want to propose a feature?** Add it to a comment in `FEATURES.md` or open a GitHub issue.

---

## Helpful Links

- **Main Repo**: https://github.com/skypie99/prompt-library-tool
- **Live Site**: https://skypie99.github.io/portfolio/
- **Anthropic Docs**: https://docs.anthropic.com/
- **Claude API**: https://console.anthropic.com/

---

**Welcome! Excited to have you contributing.** — Casey
