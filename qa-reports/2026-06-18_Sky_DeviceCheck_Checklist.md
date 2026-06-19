# 📱 Prompt Library — Device Check (Sky, iOS Safari)

**Open on your iPhone (same Wi-Fi as the Mac):** http://192.168.1.78:4321
This is the **built release branch** (Phase 3 + 4) — exactly what will ship. Not the live site.

> For checks 1–3 you'll need to run a prompt, so paste your Anthropic API key in **Settings (⚙)** first. It's your key on your device — nothing leaves your phone except the normal Claude API call.

## The 7 accessibility checks (turn on VoiceOver: triple-click side button, or Settings ▸ Accessibility ▸ VoiceOver)

- [ ] **1. Streaming announces** — open a prompt, fill it, Run. Does VoiceOver read Claude's answer *as it streams in* (not just silence)?
- [ ] **2. Run status announces** — when a run finishes, does VoiceOver say something like "completed / errored / stopped"?
- [ ] **3. Error announces** — run with a bad/empty key to force an error. Does VoiceOver read the red error text? (If silent → I'll add `role="alert"`.)
- [ ] **4. Focus restore** — open a prompt (sheet slides up), close it. Does focus return to the card you tapped (not jump to the top)?
- [ ] **5. Dynamic Type** — Settings ▸ Display & Brightness ▸ Text Size → max. Reopen the app. Text scales without clipping/overlap?
- [ ] **6. Model dropdown tap** — in an open prompt, the **"Claude Opus 4.8 ▾"** model selector — does it open reliably from a finger tap?
- [ ] **7. Reduce Motion + zoom** — Settings ▸ Accessibility ▸ Motion ▸ Reduce Motion ON → the sheet should *not* slide-animate. Also pinch-zoom the page to ~200% → no content cut off, everything reachable.

## The 2 visual judgment calls (no VoiceOver needed)

- [ ] **E1 — dark danger** — switch to dark mode. Force an error (bad key + Run). Does the red/coral error styling feel coherent in the neon-terminal palette, or jarring?
- [ ] **E2 — model selector look** — does the inline **"Claude Opus 4.8 ▾"** selector look *embedded* in the run bar, or bolted-on? (Native iOS select chrome — this is the bit Chromium can't show me.)

## What to send back
Just tell me which numbers pass and which don't. Any failure = a quick targeted fix on the branch, re-verify, then we ship. **All pass → the Art. 17 gate holds → Rory does the real gated merge → it's honestly done.**
