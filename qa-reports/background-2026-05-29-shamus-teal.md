# Shamus — Teal Re-skin [bg-cycle]
**Date:** 2026-05-29  **Branch:** feat/teal-reskin-2026-05-29
**Status:** DONE

## Changes made

### tailwind.config.ts
- Replaced `coral` key entirely with `teal` key, all 10 hex values per Dani TealSpec
- Updated `cardHover` boxShadow: coral rgba(220,107,78,0.28) → teal rgba(47,158,150,0.28)

### src/app/globals.css
- `::selection` bg: `bg-coral-200/60` → `bg-teal-200/60`
- `.scrollbar-soft` `scrollbar-color` theme call: `colors.coral.200` → `colors.teal.200`
- `.scrollbar-soft::-webkit-scrollbar-thumb` background-color: same swap

### src/lib/categoryColor.ts
- Replaced `PALETTE` array: warm 8-hue rainbow → cohesive cool-neutral teal→mauve family
  (seafoam, lagoon, steel, cornflower, periwinkle, violet slate, soft plum, dusty mauve)
- Updated comment to reference teal instead of coral

### All component files (16 files) — global coral- → teal- sweep
Every `coral-*` Tailwind class replaced with the equivalent `teal-*` step class.
Files touched: `ApiKeyNudge.tsx`, `CategoryChips.tsx`, `CommandPalette.tsx`,
`DensityToggle.tsx`, `Header.tsx`, `HomeClient.tsx`, `Markdown.tsx`,
`OnboardingHint.tsx`, `PromptCard.tsx`, `PromptDetail.tsx`, `PromptForm.tsx`,
`RunHistory.tsx`, `SettingsModal.tsx`, `ShortcutsModal.tsx`, `TagChips.tsx`,
`ThemeToggle.tsx` — also updated the coral mention in `icons.tsx` comment.

## Verification
- typecheck: PASS (tsc --noEmit, exit 0, zero errors)
- lint: N/A — ESLint is not installed in this project (not in node_modules/.bin/); `npm run lint` exits 127 "command not found". Pre-existing condition, unrelated to this change.
- tests: PASS (324/324 passing across 19 test files)

## Files changed
```
 src/app/globals.css               |  6 ++---
 src/components/ApiKeyNudge.tsx    |  6 ++---
 src/components/CategoryChips.tsx  |  6 ++---
 src/components/CommandPalette.tsx |  8 +++----
 src/components/DensityToggle.tsx  |  2 +-
 src/components/Header.tsx         |  8 +++----
 src/components/HomeClient.tsx     | 34 +++++++++++++-------------
 src/components/Markdown.tsx       |  6 ++---
 src/components/OnboardingHint.tsx | 10 ++++----
 src/components/PromptCard.tsx     | 12 +++++-----
 src/components/PromptDetail.tsx   | 50 +++++++++++++++++++--------------------
 src/components/PromptForm.tsx     | 28 +++++++++++-----------
 src/components/RunHistory.tsx     | 48 ++++++++++++++++++-------------------
 src/components/SettingsModal.tsx  | 48 ++++++++++++++++++-------------------
 src/components/ShortcutsModal.tsx |  2 +-
 src/components/TagChips.tsx       | 10 ++++----
 src/components/ThemeToggle.tsx    |  2 +-
 src/components/icons.tsx          |  2 +-
 src/lib/categoryColor.ts          | 21 ++++++++--------
 tailwind.config.ts                | 26 ++++++++++----------
 20 files changed, 167 insertions(+), 168 deletions(-)}
```

## Notes
Dani's spec listed 5 component files as targets. The grep audit found 16 components
with coral usage — all swept. The extra files (Markdown, CommandPalette, OnboardingHint,
DensityToggle, PromptDetail, ShortcutsModal, ApiKeyNudge, ThemeToggle, RunHistory,
Header, SettingsModal, HomeClient) were not mentioned in the spec but required the same
1:1 swap per the semantic mapping table. No structural, layout, or logic changes anywhere.

## NEXT: Alex should run a11y contrast check on this branch

## ESCALATIONS
None. Pure color token swap per Dani's spec. No privacy, security, or structural concerns.
ESLint not-installed is a pre-existing infrastructure gap worth noting for Gary.
