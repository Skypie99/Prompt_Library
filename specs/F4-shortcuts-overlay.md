# F4 — Keyboard shortcuts overlay

_Quinn + Dani, compressed._

## Problem

The app has good keyboard shortcuts (`⌘K`, `/`, `Esc`, `⌘↵` to run, etc.) but no one tells the user. Power users discover them by accident; everyone else never uses them.

## Goal

Press `?` (when not typing) → a modal lists every shortcut in one place. Auto-built from a single static list so adding a new shortcut is one line.

## Scope

- New `ShortcutsModal` component, opens on `?` (when not typing).
- Closes on `Esc` (already in the global Esc handler) or backdrop click or the modal's Close button.
- Lists current shortcuts:
  - `?` — Show this help
  - `⌘K` / `Ctrl+K` — Open search palette
  - `/` — Open search palette
  - `Esc` — Close any open overlay
  - `⌘↵` / `Ctrl+↵` — Run the current prompt (inside a prompt's detail)
- Each row: shortcut on the left as `<kbd>` chips, action on the right.
- Header shows the same "?" hint as a teaser elsewhere (small inline `<kbd>?</kbd>` in the footer of the search palette).

## Acceptance

| # | Behaviour |
|---|---|
| 1 | Pressing `?` from anywhere (not while typing) opens the modal. |
| 2 | Pressing `?` while in an input does NOT open the modal. |
| 3 | `Esc` and backdrop click close it. |
| 4 | Modal traps focus while open (existing modals don't fully trap, but at minimum the modal is reachable by tab and the close button is the first focusable). |
| 5 | Each shortcut row is readable by a screen reader as "Keystroke X: Action Y". |
| 6 | Adding a future shortcut means one line in `SHORTCUTS` array. |
| 7 | `npx tsc --noEmit` green. |

## Size

**S** — one new component (~80 lines), tiny edit to HomeClient (state + key handler addition + render).

## Out of scope

- Customizable shortcuts — overkill for this size of app.
- Per-platform key labels beyond `⌘` vs `Ctrl` swap based on platform — we'll show both.
