# Proposal — GitHub Actions CI (typecheck + lint + test + build)

**Status:** PROPOSED — not added yet. Adds a single
`.github/workflows/ci.yml` file. No new npm dependencies; runs whatever
scripts are already in `package.json`.
**Owner to approve:** Sky (skylerhalisky@gmail.com)
**Author:** Gary (safety-net pass, 2026-05-23)
**Estimated effort:** ~3 minutes to drop in the file and push.

---

## Why

Today nothing automatically validates a change. The proposed workflow
runs four things in parallel:

1. `npm run typecheck` (after the testing proposal lands)
2. `npm run lint` (after the lint proposal lands)
3. `npm test` (after the testing proposal lands)
4. `npm run build` (already works — confirms `next build` is green)

Each runs independently so a failure in one doesn't hide failures in
the others.

---

## Exact steps

```bash
cd "/Users/skypie/Documents/Claude/Projects/Prompt Library Tool"
mkdir -p .github/workflows
```

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        check: [typecheck, lint, test, build]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install deps
        run: npm ci

      - name: Run ${{ matrix.check }}
        run: |
          if [ "${{ matrix.check }}" = "test" ]; then
            npm test -- --reporter=verbose
          else
            npm run ${{ matrix.check }}
          fi
```

Commit + push:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions for typecheck + lint + test + build"
git push origin <your-branch>
```

---

## Notes

- The matrix runs all four checks in parallel — `fail-fast: false` so
  a typecheck failure doesn't hide a build failure (or vice versa).
- This project does NOT need `--legacy-peer-deps` (unlike AccessMap).
- The `build` matrix entry is the most expensive (~30s) but is the
  ONLY thing that catches Next.js static-export regressions, which
  matters because this app ships as a static `out/` directory.

---

## Risk

Low. The workflow ONLY runs on push/PR — it doesn't deploy, doesn't
write to the repo. Reversible by deleting the file.

---

## Optional next steps after this lands

- **Required status checks** before a PR can merge — set in GitHub
  repo settings, no code change.
- **Deploy on green** — add a separate `deploy.yml` that runs after
  CI passes on `main`, builds the static export, and uploads to wherever
  this app is hosted.
