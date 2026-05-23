# F1 — Run history design

_Design by Dani. Companion to `F1-run-history.md` (Quinn)._

## Visual language (reuse what exists)

Stay inside the warm palette already in `tailwind.config.ts`:
- Surfaces: `bg-surface` / `dark:bg-night-surface`
- Hairlines: `border-border` / `dark:border-night-border`
- Body text: `text-ink` / `dark:text-paper`; muted: `text-ink-muted` / `dark:text-paper-muted`; softest: `text-ink-soft`
- Accent: `coral-500` for primary action, `coral-50` / `coral-500/10` for soft fills, `coral-100/70` / `coral-500/20` for the filled-variable highlight (matches PromptDetail preview)
- Status dots:
  - `completed` → `bg-green-500` (use Tailwind's default `green-500`; the palette doesn't ship one, so reuse Tailwind's; if Sky wants a custom green later it's a one-token change)
  - `aborted` → `bg-ink-soft` (neutral; user-initiated, not an error)
  - `errored` → `bg-coral-600` (we already use coral for error tinting in PromptDetail)
- Type: card label uses the existing `text-xs font-medium uppercase tracking-wider text-ink-soft` pattern.
- Motion: reuse `animate-fade-in` for panel reveal and `animate-scale-in` only for the View expansion.

## Where it lives

Inside `PromptDetail` modal, below the existing Response panel, in the right column. Same scroll container — it just becomes another stacked section. Collapsed by default so the modal doesn't feel taller on first open.

```
┌──────────────── PromptDetail right column ────────────────┐
│ Variables …                                                │
│ [Copy] [Run with Claude]                                   │
│ Response (when present) …                                  │
│                                                            │
│ ─── History (3) ──── [Clear all]               ▾           │  ← collapsed header
│                                                            │
└────────────────────────────────────────────────────────────┘
```

When expanded:

```
│ ─── History (3) ──── [Clear all]               ▴           │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ● 2 min ago · Opus 4.7      [↶ Restore] [⧉] [×]     │  │ ← row, collapsed
│ │   "Sure, here's a tighter draft you can drop in…"    │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ ● 5 min ago · Sonnet 4.6    [↶ Restore] [⧉] [×]     │  │
│ │   "I'd start with the user's pain point and then…"   │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ ● 12 min ago · Haiku 4.5    [↶ Restore] [⧉] [×]     │  │ ← errored, coral dot
│ │   "That API key was rejected. Double-check it…"      │  │
│ └──────────────────────────────────────────────────────┘  │
```

When a row is expanded ("View"):

```
│ │ ● 2 min ago · Opus 4.7      [↶ Restore] [⧉] [×] [▴]  │  │
│ │   Inputs                                              │  │
│ │   ┌────────────────────────────────────────────────┐ │  │
│ │   │ tone   │  warm, plain                          │ │  │
│ │   │ topic  │  shipping a beta                      │ │  │
│ │   └────────────────────────────────────────────────┘ │  │
│ │   Response                                            │  │
│ │   ┌────────────────────────────────────────────────┐ │  │
│ │   │ Sure, here's a tighter draft you can drop in…  │ │  │
│ │   │ (full text, scrollable to ~24rem)              │ │  │
│ │   └────────────────────────────────────────────────┘ │  │
│ │   Sent prompt (toggle)                                │  │
```

## Layout & spacing

- Panel header: `mt-5 border-t border-border pt-4 dark:border-night-border` (same rhythm as the Response panel).
- Header row: `flex items-center justify-between` with the label on the left (`History · {count}`) and `Clear all` on the right (text button, `text-coral-600 hover:text-coral-700`, only shown when count > 0).
- The header itself is a `<button>` so the whole row toggles open/closed; chevron icon flips.
- Entry list: `ul` with `divide-y divide-border dark:divide-night-border`; each `li` is `px-3 py-2.5`.
- Entry row, collapsed: 2 lines:
  - Line 1: `[status dot] [relative time] · [model label]   [Restore] [Copy] [Delete]`
  - Line 2 (when present): single-line clipped response preview (`truncate`, `text-ink-muted`, `text-xs`).
- Expanded row gains: Inputs key/value list (2-column grid, mono for values, scrollable if long), full Response in a soft-cream box (`bg-cream/40 dark:bg-night`), and an optional "Sent prompt" disclosure for the exact substituted text.
- Action buttons reuse the existing `HeaderButton` square-icon pattern; "Restore" is a text+icon button (`text-xs font-medium`) to keep the affordance explicit.

## States

- **Empty (count = 0)** — panel hidden completely. No "no runs yet" empty state inside the modal; the cue is the Run button itself.
- **Hover** on entry row — soft background `hover:bg-cream/60 dark:hover:bg-night/40`, no jump.
- **Focus** on entry row — focus ring `focus-visible:ring-2 focus-visible:ring-coral-300` so keyboard users see what's selected.
- **Restoring** — instant; no loading state. Briefly flash the variable area with `animate-fade-in` so the user sees what changed.
- **Copying** — 1500ms "Copied" pill on the button, same pattern as `handleCopy` in PromptDetail.
- **Deleting one** — row removes with no confirm (one-row delete is low-stakes; clear-all has confirm).
- **Clearing all** — inline confirm bar appears above the list (`Cancel` / `Clear all` buttons), mirrors the existing delete-prompt confirm.

## Accessibility values

- Panel root: `<section aria-label="Run history">`.
- Toggle button: `aria-expanded={expanded}` and `aria-controls={listId}`.
- List: `<ul>` with `aria-label="Past runs"`.
- Each entry: `<li>` wrapping a clickable wrapper; status dot has `aria-hidden`, status spelled out in a visually-hidden span (`sr-only`) before the time so screen readers read "completed, 2 minutes ago, Opus 4.7".
- Action buttons: explicit `aria-label`s ("Restore inputs from this run", "Copy this response", "Delete this run", "Show full response").
- Relative time: visible text "2 min ago"; the same span has `title={absoluteIso}` so a hover reveals the exact time. Mark up the absolute time inside a `<time dateTime={iso}>` for assistive tech.
- Privacy note line under the panel header, `text-xs text-ink-soft`: _"Stored only in this browser."_

## Token usage / behavior decisions Dani is locking

1. **No new color tokens** — green/coral/ink-soft are enough. If green needs to be palette-native later, that's a Dani follow-up.
2. **Relative time formatter** — implement with `Intl.RelativeTimeFormat` (built-in, no dependency). Buckets: <60s → "just now"; <60m → "N min ago"; <24h → "N hr ago"; >24h → "MMM d" (e.g. "May 23"). Update every 30s while the panel is open.
3. **Truncation length** — first 80 chars of response on the collapsed row (`line-clamp-1` plus trailing ellipsis from `truncate`). Long enough to recognise, short enough to keep rows uniform.
4. **Max visible** — show all 10 entries; the panel scrolls inside the existing modal scroll container; no separate inner scroll on the list (avoids nested scroll traps).
5. **Mobile** — `PromptDetail` already stacks columns vertically below `md`; history panel inherits that. Action buttons stay 44px tall on touch (already true via `py-2.5`).

## Hand-off to Dana

Storage shape Dana should normalise on:

```ts
// localStorage key: promptlib:runs:<promptId>
type StoredRun = {
  id: string;          // local-only; entries identified by this
  ranAt: string;       // ISO; rendered as relative time
  model: string;       // model id; UI shows modelLabel(model)
  values: Record<string, string>; // filled vars at run time
  sentPrompt: string;  // substituted text actually sent
  response: string;    // possibly partial if aborted
  status: "completed" | "aborted" | "errored";
  errorMessage?: string; // present only when status === "errored"
};
type StoredRunList = StoredRun[]; // newest-first, cap 10
```

No backend, so Dana's deliverable here is a written storage proposal + a `runs.ts` module spec (not the implementation — that's Shamus).
