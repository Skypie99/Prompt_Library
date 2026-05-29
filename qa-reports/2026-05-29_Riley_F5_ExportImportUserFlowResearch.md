# F5 Export/Import — User Flow & Mental Model Research

**Date:** 2026-05-29  
**Researcher:** Riley (User Researcher)  
**Project:** Prompt Library Tool  
**Feature:** F5 — Export / Import library  
**Focus:** When & why users export, data loss anxiety, merge-vs-replace expectations

---

## Executive Summary

F5 is a **critical safety net** for a browser-based library app: if a user's browser storage is wiped (cache clear, device switch, data corruption), they lose all custom prompts, runs, and history. This report surfaces the **mental models and pain points** that drive export/import decisions, informed by common UX patterns in personal productivity tools (Notion, Obsidian, Figma).

**Confidence:** Medium-high — grounded in user research from similar tools + the app's storage architecture. Not from live telemetry (app is new, no analytics).

**Key Finding:** Users export reactively (after a loss scare or device change), not proactively. The UI must make export *frictionless* and import *obviously safe* or users won't use it.

---

## When & Why Users Export

### Trigger 1: Device Transition (Planned)

**Scenario:**  
Sky wants to work on prompts at home on their laptop, having created them on their work desktop.

**Current state:** All prompts live in this browser's localStorage. Opening the app on the laptop shows an empty library.

**Mental model:**
> "I need to get my prompts from the desktop to the laptop. There should be a button to save them somewhere I can move them."

**Export expectation:**
- One-click download a file (no signup required, no cloud)
- File is portable (can email to self, airdrop, USB stick)
- File is *human-readable* (they might peek at it to confirm their prompts are there)

**Current implementation supports this:** ✓ JSON file, human-readable, browser download.

**Risk:** If export fails silently or the file is empty, they won't know until they try to import on the laptop — too late.

---

### Trigger 2: Backup Anxiety (Reactive)

**Scenario:**  
Sky clears their browser cache (maybe to fix a performance issue, maybe accidentally). They panic: "Did I just lose my prompts?"

**Mental model:**
> "I should have backed up my work. Is there a backup I can restore from?"

**Export expectation:**
- A way to recover from today's backup (if they had made one earlier)
- If no backup exists, something to prevent this from happening again

**Current implementation challenge:**
- Export only works if the user **proactively** clicks before disaster
- For reactive recovery, they're out of luck (localStorage is gone)

**Mitigation (out of scope for F5, but worth noting):**
- Consider auto-exporting to IndexedDB or a recoverable cache tier
- Show a "Last auto-backup: 2h ago" indicator in Settings

---

### Trigger 3: Sharing / Collaboration (Deferred)

**Scenario:**  
Sky finishes a useful set of prompts for a project and wants to share them with a teammate.

**Mental model:**
> "I want to give them a file they can load into their own library, without me having access to their data."

**Export expectation:**
- File is self-contained (no cloud dependency)
- Recipient can load it without asking for permission or signing into my account

**Current implementation supports this:** ✓ Self-contained JSON, import is file-based.

**Risk:** User may worry the file contains their API key (security foot-gun). The spec correctly excludes the API key, but the UI must **clearly reassure** them.

---

## Data Loss Anxiety: The Fear

When Sky considers exporting, they think:

1. **"Is my data safe in this export file?"**
   - Concern: What if the file is corrupted and I can't restore it?
   - Mitigation: Show file size / checksum / date in preview before import.

2. **"Will I lose my data if I import?"**
   - Concern: Does "Import" mean "replace everything" or "add to what I have"?
   - Mitigation: Default to "Merge" (safe, additive). Make "Replace" a separate, heavily-warned action.

3. **"Does this file contain my API key or private data?"**
   - Concern: If I email this file to myself or a teammate, am I leaking credentials?
   - Mitigation: Spec correctly excludes API key. UI should state: "This file does **not** contain your API key or sensitive settings."

---

## Merge vs. Replace: User Expectations

### Merge Mode (Safe Default)

**User mental model:**
> "I'm adding the prompts from this file to my library. If I already have a prompt with the same name, keep mine. If I have new prompts in the file, add them."

**Spec alignment (F5b):**
- Only import prompts I don't already have (by id)
- If a prompt is new, also add its favorites, runs, and saved values
- Keep existing prompts untouched

**User concern:** "What if the file is newer than my library? Will I lose my recent changes?"

**Recommendation:** In the import preview, show:
```
File contains 12 prompts. You have 5 of them already.
7 new prompts will be added.

[Preview] [Cancel] [Merge]
```

This answers the concern: "I'm adding 7 new ones, keeping my 5."

---

### Replace Mode (Dangerous Default if Not Gated)

**User mental model:**
> "I want to use the prompts from this file instead of my current library. I know this will overwrite everything."

**Spec alignment (F5c, deferred):**
- Wipe all user prompts, favorites, runs, and values
- Load everything from the file

**User concern:** "What if I click this by accident?"

**Recommendation:**
1. Make Replace mode a **separate button** under Merge, not a toggle (two clear actions, not a switch)
2. Require a **confirmation dialog:**
   ```
   Replace your entire library?
   
   This will delete:
   - All 15 custom prompts
   - 47 saved runs
   - 8 favorites
   
   You can undo by re-importing your current backup file.
   
   [Cancel] [Yes, replace]
   ```
3. Only unlock Replace after Merge is widely used and understood

---

## Import Validation: The Trust Problem

When a user drags a file into the import dialog, they're asking:

**"Is this safe to load?"**

### Current Spec Gaps (Edge Cases)

1. **Corrupted run entry:**  
   Spec (F5b) says "partial validity — drop only the corrupt entry, not the whole import."  
   **User expectation:** A friendly error message like:
   ```
   Imported 11 of 12 prompts. 
   1 run entry was corrupted and skipped.
   [Details] [Confirm]
   ```

2. **File from a newer app version:**  
   Spec says "show a friendly 'this file is newer than this app' message."  
   **User expectation:** Similar honesty:
   ```
   This file was exported from Prompt Library v2.3.
   You have v2.1.
   Some data might not import correctly.
   [Import anyway] [Cancel]
   ```

3. **File missing required fields:**  
   Spec says "reject anything missing version or with the wrong top-level shape."  
   **User expectation:** Don't crash; show:
   ```
   This doesn't look like a Prompt Library export file.
   Check that you selected the right file.
   [Choose another file]
   ```

---

## Scenario: Full User Journey

### Happy Path: Backup → Switch Device → Restore

1. **Day 1, Desktop:** Sky creates 5 prompts, refines them over 2 hours.
2. **Day 1, End:** Before bed, clicks "Export library" → downloads `prompt-library-2026-05-29.json`
3. **Day 2, Laptop:** Opens the app → empty library. Clicks "Import library" → selects the file → preview shows "5 prompts, 8 runs"
4. **Day 2, Import:** Clicks "Merge" → all 5 prompts + their runs appear on the laptop
5. **Day 2, Verify:** Scrolls through, confirms all prompts are there, can run them

**UX expectation:** Steps 1–5 take < 2 min, no confusion.

**Current spec supports this:** ✓ Export (F5a) + Import merge (F5b) cover it.

---

### Pain Path: Panic Recovery (Reactive)

1. **Day 3, Desktop:** Sky clears browser cache (to fix a bug)
2. **Day 3, Panic:** Opens the app → library is gone. "Did I lose everything?"
3. **Day 3, Despair:** Looks for a backup → only has the file from Day 1 (exports only what they had then)
4. **Day 3, Recovery:** Imports the Day 1 file → gets back 5 prompts, but any new ones created after Day 1 are lost

**UX expectation:** Some recovery, but incomplete. Better if export was automatic/frequent.

**Current spec limitation:** Export is manual-only. A future feature could auto-backup, but F5 doesn't solve reactive backup.

---

## Hidden Expectations: Browser Defaults

When a user downloads a file, they expect:
- Filename includes date (✓ spec: `prompt-library-<YYYY-MM-DD>.json`)
- File is not a `.txt` or `.zip` (✓ `.json` is universal)
- File can be opened in a text editor (✓ JSON is human-readable)
- Double-clicking the file doesn't install malware (✓ it's just data)

---

## Accessibility & Clarity

### Export Button

**Current spec:** "A button labeled **Export library** appears in Settings, below the 'API key' row."

**User expectation:**
- Label is clear ("Export", not "Download" or "Backup")
- Button is in an expected location (Settings, near other data-control buttons)
- Clicking it provides feedback ("Downloading...", "Downloaded")

**Recommendation:** Add a brief tooltip on hover:
```
Export your prompts, runs, and favorites to a JSON file.
Your API key and settings are not included.
```

This addresses the "does it leak my API key?" concern upfront.

---

### Import Button & Flow

**Current spec:** "A file-picker opens; I select a JSON file I previously exported. A preview card appears..."

**User expectation:**
1. File picker is standard OS dialog (Cmd+O on Mac, Ctrl+O on Windows)
2. Preview clearly shows what will happen: "Merging 7 new prompts"
3. Button text is action-oriented ("Merge", not "OK" or "Import")
4. Success feedback is visible ("3 new prompts added! Reloading...")

**Recommendation:** After successful merge, show a toast notification or a brief success banner (2–3 sec):
```
✓ Imported 7 new prompts. Your library is updated.
```

---

## Edge Cases & Risks

| Case | User Expectation | Spec Coverage | Gap? |
|------|------------------|---|---|
| **Export has 0 prompts** | File is still valid, import succeeds as no-op | F5a AC#1 ("Export succeeds") | None — spec handles it |
| **Import file is 500MB** | Reasonable rejection with friendly error | Not spec'd | **Gap:** No size limit or error message for huge files |
| **User exports twice on same day** | Filename gets `(1)`, `(2)` suffix (browser default) | Not spec'd, but OK | None — browser handles it |
| **Imported prompt has same name as existing** | Merge mode: keep existing. Replace mode: overwrite | F5b (merge), F5c (replace) | None — spec clear |
| **User imports, then closes browser before refresh** | Merges complete before page refresh; safe | F5b ("Merging 7 new...") | Unclear if merge is atomic or progressive |
| **File is from a shared folder that syncs (e.g., Dropbox)** | User might import stale version by accident | Not spec'd | **Gap:** No warning about file age or sync issues |

---

## Confidence Levels & Evidence

| Finding | Evidence | Confidence | Why |
|---------|----------|-----------|-----|
| **Export triggers (device switch, backup anxiety)** | Common in personal-data apps (Obsidian, Figma); aligned with app architecture (browser-local) | **High** | Extrapolated from similar tools + architecture |
| **Merge-by-default is safer than Replace** | UX best practice (destructive ops are opt-in); Notion, GitHub honor this | **High** | Industry standard pattern |
| **Users fear data loss & API leaks** | Spec explicitly excludes API key; user concern is natural | **High** | Spec acknowledges concern; users will have it anyway |
| **API key warning needed in UI** | Not explicitly in spec, but users will ask "does this leak my key?" | **Medium** | Reasoned from privacy concerns; not observed |
| **File corruption preview is important** | Spec mentions "partial validity — drop only corrupt entry"; users need to know | **Medium** | Spec acknowledges edge case; unclear UX |
| **Atomic merge vs. progressive** | Spec says "Merge" but doesn't clarify if process is atomic or streamed | **Low** | Implementation detail; spec is vague |

---

## Blockers for Ship?

**No.** The spec (F5a + F5b) is **solid and safe**:
- Merge-by-default prevents accidental data loss
- No API key leakage
- Validation catches corrupted files
- File is portable and human-readable

**Nice-to-have before ship:**
1. API key reassurance in Export button tooltip (addresses user fear)
2. File size validation (guards against huge file imports)
3. Success toast after merge (better feedback)
4. Atomicity clarification in spec (implementation detail, doesn't affect user flow)

---

## Next Steps

### For Quinn (Spec):
- Add note to F5a: "Export button includes tooltip: 'Your API key and settings are not included.'"
- Add to F5b validation: "Reject files > 10MB with friendly error: 'This file is too large. Check that you selected the right file.'"

### For Implementation (Shamus):
- F5a (Export): ~300 lines (button + helper functions, no state machine)
- F5b (Import merge): ~400 lines (file picker, preview, merge logic)

### For Morgan (Ship Timing):
- Both features are **independent** of other F-series work
- Can ship F5a (export-only) immediately as a safety net
- Can defer F5b (import) to next cycle while users validate the JSON format
- Replace mode (F5c) should wait until users are comfortable with merge

---

## Appendix: Information Architecture

**Settings → Data Management section:**

```
API Key: [••••••••••] [Reveal] [Reset]

Library Export & Restore:
- [Export library]  (downloads JSON)
- [Import library]  (opens file picker)

Where does my data go?
All your prompts, runs, and favorites are stored locally in this browser.
If you clear your cache, you'll lose them unless you've exported a backup.

Privacy reminder:
Exports do not include your API key or settings.
```

This structure reassures users while keeping the controls together.
