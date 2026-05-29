# Alex — A11y Audit: F-usage Token Display
**Date:** 2026-05-29
**Branch audited:** feat/f-usage-token-display-2026-05-29
**Verdict:** PASS_WITH_NOTES

---

## Response panel token display

**Location:** `src/components/PromptDetail.tsx` lines 846–853

```tsx
{!running && !error && currentTokensUsed && (
  <p
    className="mb-1 text-xs text-ink-soft dark:text-paper-muted"
    aria-label={`Token usage: ${formatTokens(currentTokensUsed.input)} input tokens, ${formatTokens(currentTokensUsed.output)} output tokens`}
  >
    Tokens: {formatTokens(currentTokensUsed.input)} in · {formatTokens(currentTokensUsed.output)} out
  </p>
)}
```

**Is it decorative or informational?** Informational — it reports billable usage. Correct to expose to screen readers.

**Is the `aria-label` on the right element?** YES. It is on the `<p>` that contains the abbreviated visible text. The pattern is correct: the AT reads the `aria-label` (full form) and ignores the visible shorthand.

**`aria-label` wording:** "Token usage: 312 input tokens, 1,204 output tokens" — clearly describes the data. PASS.

**`aria-live` needed?** NO, and it is correctly absent. The element is conditionally rendered only after run completion (`!running && !error && currentTokensUsed`). At that point the `running` state has already flipped and focus has not moved to this element, but the context is stable: the user just watched a run finish. A polite live region here would compete with any "run complete" announce from the run-button state change; omitting it is the right call. Screen reader users who tab into the response panel will encounter the token count in normal reading order above the response body.

**Tab order:** The `<p>` is non-focusable (no `tabIndex`), which is correct — it is supplementary data, not an interactive target. No issue.

**VERDICT: PASS**

---

## RunHistory token display

**Location:** `src/components/RunHistory.tsx` lines 419–426

```tsx
{run.tokensUsed && (
  <p
    className="text-[11px] text-ink-soft dark:text-paper-muted"
    aria-label={`Token usage: ${formatTokens(run.tokensUsed.input)} input tokens, ${formatTokens(run.tokensUsed.output)} output tokens`}
  >
    {formatTokens(run.tokensUsed.input)} in · {formatTokens(run.tokensUsed.output)} out
  </p>
)}
```

**Visually distinguishable without position alone?** Mostly YES — the token count is at `text-[11px]` (11px) with `text-ink-soft`, smaller and lighter than the primary `text-xs` run time and model label next to it. The contrast-in-size + muted colour gives secondary-info affordance. However there is no typographic separator (no `·` or `|`) between the model label span and the token `<p>` — they sit next to each other inside a flex row. On layout: the model label is `flex-start`, the token count is `flex-end` (it's in the same `flex items-center justify-between` row as the label and action buttons). The positional separation is clear visually. One mild polish concern: at narrow viewport widths where the flex row wraps, the token count could stack in an ambiguous position, but that is a layout concern, not a WCAG violation.

**`aria-label` on the element:** YES, matching pattern as above. Full unabbreviated form used. PASS.

**Screen reader read-out of the full list entry:** Each `<li>` contains, in DOM order:
1. `<span aria-hidden>` coloured status dot (hidden from AT — correct)
2. `<span class="sr-only">{STATUS_LABEL}` — e.g. "Completed, " (announced)
3. `<time>` with relative timestamp
4. `<span>` with " · modelLabel"
5. Optional label button
6. Token `<p>` with aria-label

A screen reader would announce roughly: *"Completed, 2 minutes ago · claude-3-5-sonnet-20241022 Token usage: 312 input tokens, 1,204 output tokens Restore inputs Run again Copy this response Delete this run Show full response"*

This reads sensibly. The token count is clearly labelled and positioned between the run metadata and action buttons. PASS.

**Tab order in the list:** The token `<p>` is non-focusable. Tab stops are: status filter select, Last 24h toggle, Export, Clear all, then per-row: Restore, Run again, Copy, Delete, Expand. Token count is encountered only in reading order (up-arrow on AT), not tab order. This is correct — adding a tab stop here would clutter navigation for no interactive purpose.

**VERDICT: PASS**

---

## Contrast check on ink.soft at text-xs (12px normal weight)

Backgrounds encountered:
- `surface` (#FFFDF9) — modal/card background in PromptDetail response panel
- `cream` (#FAF6EF) — page background (history list bg is `bg-cream/30`, negligibly lighter)

Dark mode equivalents use `text-paper-muted` (#A89E90) on `night` (#1C1916) and `night-surface` (#26221E).

### Light mode

| Text colour | Background | Ratio | Required (12px normal) | Result |
|---|---|---|---|---|
| `ink.soft` #938A7E | `surface` #FFFDF9 | **3.35:1** | 4.5:1 | **FAIL** |
| `ink.soft` #938A7E | `cream` #FAF6EF | **3.16:1** | 4.5:1 | **FAIL** |
| `ink.muted` #6E665C | `surface` #FFFDF9 | 5.56:1 | 4.5:1 | PASS |
| `ink.muted` #6E665C | `cream` #FAF6EF | 5.24:1 | 4.5:1 | PASS |

### Dark mode

| Text colour | Background | Ratio | Required (12px normal) | Result |
|---|---|---|---|---|
| `paper.muted` #A89E90 | `night` #1C1916 | 6.63:1 | 4.5:1 | PASS |
| `paper.muted` #A89E90 | `night-surface` #26221E | 5.98:1 | 4.5:1 | PASS |

**Light mode `ink.soft` FAILS WCAG AA at 12px** in both callsites (response panel header and RunHistory list). The dark mode equivalents pass comfortably.

Note: `text-[11px]` used in RunHistory is even smaller than `text-xs` (12px), so the required ratio is still 4.5:1 (normal weight). The failure is the same.

**Recommendation:** Replace `text-ink-soft` with `text-ink-muted` (`#6E665C`) on both token display elements. `text-ink-muted` passes at 5.56:1 / 5.24:1 against light mode backgrounds. The visual hierarchy intent (secondary info, lighter than primary) is preserved — `ink.muted` is still clearly lighter than `ink` (#2A2520 at 13.6:1), it just crosses the accessibility threshold.

---

## Issues

### POLISH — Light mode contrast on token count text

**Severity:** WCAG AA failure (not a blocker in the Constitutional sense, but a clear accessibility defect)

**Both callsites** use `text-ink-soft` on light backgrounds:

- `PromptDetail.tsx` line 848: `className="mb-1 text-xs text-ink-soft dark:text-paper-muted"`
- `RunHistory.tsx` line 421: `className="text-[11px] text-ink-soft dark:text-paper-muted"`

**Fix:** Change `text-ink-soft` to `text-ink-muted` in both. Dark mode class `dark:text-paper-muted` is correct and should stay.

```diff
- className="mb-1 text-xs text-ink-soft dark:text-paper-muted"
+ className="mb-1 text-xs text-ink-muted dark:text-paper-muted"
```

```diff
- className="text-[11px] text-ink-soft dark:text-paper-muted"
+ className="text-[11px] text-ink-muted dark:text-paper-muted"
```

These are the only two changes needed. The `aria-label`, element choice, `formatTokens`, and placement are all correct.

---

## formatTokens function

`formatTokens(n)` uses `n.toLocaleString("en")` with a `String(n)` fallback. This produces "1,204" not "1.2k". The `aria-label` strings pass raw numbers through `formatTokens`, so they announce the full unabbreviated value (e.g., "1,204 input tokens"). PASS — no abbreviation shortcuts in the accessible label.

---

## ESCALATIONS

None. No privacy, security, or architectural concerns. The contrast failure is a straightforward CSS token swap (two lines). No Sky decision needed.

**Recommended next action:** Shamus applies the two-line fix on the feat branch before merge. Shamus or Gary re-runs typecheck to confirm (it's a Tailwind class change — no type errors expected). Alex gate: PASS after fix.
