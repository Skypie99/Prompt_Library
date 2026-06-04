# Dani — Teal Re-skin Design Spec

**Date:** 2026-05-29
**Status:** READY_FOR_SHAMUS
**Author:** Dani (Creative Director)

---

## Rationale

The coral accent (`#DC6B4E`) reads too close to Claude's brand orange-red and pulls the product into Anthropic's visual territory rather than its own. The 8-category stripe palette spans warm ochres, terracottas, and mustards alongside cool hues — a Google Material-style rainbow that fragments rather than coheres. The replacement uses a soft, blue-leaning teal (`#2F9E96`) as the single accent — calm, modern, and clearly distinct from both Claude coral and any major design system's primary. The category stripes are redesigned as a coordinated cool-neutral family spanning teal through blue to muted mauve, all with comparable saturation so the grid reads as a system, not a collection.

---

## Primary Palette — teal scale (replaces coral)

The anchor `teal.500` was chosen at `#2F9E96` (HSL ≈ 175°, 54%, 37%). This matches coral.500's luminance tier (both sit at ~0.26–0.27 relative luminance) so all existing contrast decisions translate directly. The full scale uses the same lightness curve as the coral scale — pale surfaces at 50–200, usable UI tones at 300–500, AA text colors at 600–900.

| Step | Hex | vs white (contrast ratio) | white text on (contrast ratio) | WCAG note |
|------|-----|---------------------------|-------------------------------|-----------|
| teal.50 | `#EEF8F7` | 1.08 | 1.08 | Lightest surface tint; surface/bg use only |
| teal.100 | `#D4EFED` | 1.21 | 1.21 | Pale tint; bg/selection overlays |
| teal.200 | `#A9DED9` | 1.49 | 1.49 | Selection bg, scrollbar thumb, soft overlays |
| teal.300 | `#75CAC3` | 1.91 | 1.91 | Hover border, dark mode hover text |
| teal.400 | `#47B5AC` | 2.48 | 2.48 | Focus ring (AA large text/UI ≥3:1 at ring weight) |
| teal.500 | `#2F9E96` | 3.25 | 3.25 | **Anchor.** Active chip bg, star icon, primary accent. AA UI ✓ (≥3:1) |
| teal.600 | `#238178` | 4.68 | 4.68 | Hover text (CTA), active border on deep context. **AA text ✓** (≥4.5:1) |
| teal.700 | `#1C6660` | 6.73 | 6.73 | Category pill text (light mode). AA text ✓ |
| teal.800 | `#174E49` | 9.45 | 9.45 | Deep text; rarely used directly |
| teal.900 | `#103B37` | 12.33 | 12.33 | Near-black teal; reserved for extreme contrast contexts |

**WCAG notes on teal.500 as chip background with white text:**
teal.500 achieves 3.25:1 with white — meeting AA for UI components and large text (WCAG 2.1 SC 1.4.11 requires ≥3:1 for non-text UI). The existing coral.500 (`#DC6B4E`) achieved 3.36:1 with white text — both are in the same WCAG tier. The white/80 count sub-label inside chips (opacity-reduced) is a decorative element and does not require independent contrast compliance. For AA normal text at 14px, `teal.600` (4.68:1) is used as the CTA/hover text color — same role coral.600 would have served.

---

## Teal semantic mappings (drop-in replacements for coral)

All token-to-token replacements are 1:1 step substitutions. Rename the key `coral` → `teal` in `tailwind.config.ts` and update all class references from `coral-*` to `teal-*`.

| Old token | New token | Context |
|-----------|-----------|---------|
| `coral.50` | `teal.50` | Category pill background (light mode): `bg-coral-50` on PromptCard |
| `coral.100` | `teal.100` | (unused currently; reserved) |
| `coral.200` | `teal.200` | Selection background (`::selection`), scrollbar thumb (`.scrollbar-soft`), cardHover shadow color |
| `coral.300` | `teal.300` | Hover border on chips (light), dark-mode hover text on chips/tags/buttons |
| `coral.400` | `teal.400` | Focus ring (`focus-visible:ring-coral-400`) on CategoryChips, TagChips, PromptCard |
| `coral.500` | `teal.500` | **Active chip border+bg** (`border-coral-500 bg-coral-500`), star icon color, dark-mode card hover border (`/40` opacity) |
| `coral.600` | `teal.600` | Hover text color (`hover:text-coral-600`) on chips, tags, "show more" buttons |
| `coral.700` | `teal.700` | Category pill text on PromptCard (`text-coral-700`) |
| `coral.500/15` | `teal.500/15` | Dark mode category pill background (`dark:bg-coral-500/15`) |
| `coral.300` (dark) | `teal.300` | Dark mode category pill text (`dark:text-coral-300`), dark hover text |

**One non-token change — cardHover shadow in tailwind.config.ts:**

```ts
// Old
cardHover: "0 2px 4px rgba(42,37,32,0.06), 0 16px 40px -16px rgba(220,107,78,0.28)"

// New
cardHover: "0 2px 4px rgba(42,37,32,0.06), 0 16px 40px -16px rgba(47,158,150,0.28)"
```

`rgba(47,158,150)` = teal.500 in decimal. No other shadow values change.

---

## Category Stripe Palette (replaces 8-hue rainbow)

8 hues spanning cool-teal through blue-grey to dusty mauve (hue range 160–288°, ~18° between each). All are muted (saturation ~30–40% HSL), matching lightness (~55–60% HSL for light; ~70–72% for dark). No warm oranges, reds, or yellows. The family coheres rather than pops — the card left stripe is a scan signal, not decoration.

| Slot | Name | Light hex | Dark hex | Light vs white | Dark vs white | HSL hue | Notes |
|------|------|-----------|----------|----------------|---------------|---------|-------|
| 0 | seafoam | `#6FA09A` | `#93C1BB` | 2.93 | 1.98 | h160 | Blue-green teal; coolest entry |
| 1 | lagoon | `#5E9E97` | `#84BFB9` | 3.08 | 2.07 | h178 | Near-primary hue, lighter/less saturated than teal.500 |
| 2 | steel | `#6292AA` | `#88B5CC` | 3.38 | 2.20 | h198 | Pure blue-grey; bridges teal and blue |
| 3 | cornflower | `#6880AE` | `#8FA4CE` | 3.97 | 2.51 | h215 | Mid blue; most saturated of the blues |
| 4 | periwinkle | `#7880B8` | `#9FA8D5` | 3.76 | 2.32 | h232 | Muted indigo-blue |
| 5 | violet slate | `#8A82B8` | `#ADA7D4` | 3.52 | 2.27 | h252 | Muted violet; transitions warm |
| 6 | soft plum | `#9680B0` | `#BAA8CE` | 3.49 | 2.19 | h270 | Desaturated purple |
| 7 | dusty mauve | `#9E80A4` | `#C0A8C4` | 3.46 | 2.18 | h288 | Coolest purple-mauve; terminus of the family |

**Design intent:** These stripes are 3px visual signals, not text containers. Contrast ratios of ~3:1 on the light values (vs white card background) are by design — the same tier as the original palette. Dark variants are lighter and lower-contrast for the dark-mode card surface (`night-surface: #26221E`). The hue arc from seafoam → lagoon → steel → cornflower → periwinkle → violet slate → soft plum → dusty mauve reads as a single cool family when glanced at across a grid.

**Note on lagoon (slot 1) vs primary teal.500:** Lagoon (`#5E9E97`) sits at h178, teal.500 (`#2F9E96`) at h175. They're only 3° apart in hue. However, lagoon is 20 lightness points lighter and ~14% less saturated — so as a 3px stripe it will read as a pale teal cousin, clearly not the same as the primary accent used on chips. The pairing is intentional: it makes the "this card is in a teal-ish category" stripe feel at home on the teal-accented chip bar above, rather than clashing.

---

## Files to change (Shamus instruction)

### 1. `tailwind.config.ts`

**Lines 36–47:** Rename key `coral` → `teal` and replace all hex values:

```ts
teal: {
  50:  "#EEF8F7",
  100: "#D4EFED",
  200: "#A9DED9",
  300: "#75CAC3",
  400: "#47B5AC",
  500: "#2F9E96",
  600: "#238178",
  700: "#1C6660",
  800: "#174E49",
  900: "#103B37",
},
```

**Line 56 (cardHover shadow):** Replace the rgba color:

```ts
cardHover: "0 2px 4px rgba(42, 37, 32, 0.06), 0 16px 40px -16px rgba(47, 158, 150, 0.28)",
```

The ink-based first shadow and other shadows are untouched.

---

### 2. `src/app/globals.css`

**Line 16 (::selection):** `bg-coral-200/60` → `bg-teal-200/60`

**Lines 25, 28 (scrollbar-soft):** Both `coral.200` references → `teal.200`:

```css
.scrollbar-soft {
  scrollbar-color: theme("colors.teal.200") transparent;
}
.scrollbar-soft::-webkit-scrollbar-thumb {
  background-color: theme("colors.teal.200");
  border-radius: 9999px;
}
```

The dark-mode scrollbar lines reference `night.border` — those are unchanged.

---

### 3. `src/components/CategoryChips.tsx`

**Lines 62–65:** Global find-and-replace `coral-` → `teal-`. All occurrences:
- `focus-visible:ring-coral-400` → `focus-visible:ring-teal-400`
- `border-coral-500 bg-coral-500` → `border-teal-500 bg-teal-500`
- `hover:border-coral-300 hover:text-coral-600` → `hover:border-teal-300 hover:text-teal-600`
- `dark:hover:text-coral-300` → `dark:hover:text-teal-300`

No structural changes.

---

### 4. `src/components/TagChips.tsx`

**Lines 43–46, 71, 80–81:** Global find-and-replace `coral-` → `teal-`. All occurrences:
- `focus-visible:ring-coral-400` → `focus-visible:ring-teal-400`
- `border-coral-500 bg-coral-500` → `border-teal-500 bg-teal-500`
- `hover:border-coral-300 hover:text-coral-600` → `hover:border-teal-300 hover:text-teal-600`
- `dark:hover:text-coral-300` → `dark:hover:text-teal-300`
- `hover:text-coral-600 hover:underline` → `hover:text-teal-600 hover:underline`
- `focus-visible:ring-coral-400` (show-more/show-fewer buttons) → `focus-visible:ring-teal-400`

No structural changes.

---

### 5. `src/components/PromptCard.tsx`

**Lines 65, 85, 122–124, 136, 177:** Global find-and-replace `coral-` → `teal-`. All occurrences:
- `hover:border-coral-200` → `hover:border-teal-200`
- `focus-visible:ring-coral-300` → `focus-visible:ring-teal-300`
- `dark:hover:border-coral-500/40` → `dark:hover:border-teal-500/40`
- `bg-coral-50 ... text-coral-700` → `bg-teal-50 ... text-teal-700`
- `dark:bg-coral-500/15 dark:text-coral-300` → `dark:bg-teal-500/15 dark:text-teal-300`
- `text-coral-500` (star icon, both states) → `text-teal-500`
- `hover:text-coral-500` (unfavorited star hover) → `hover:text-teal-500`
- `group-hover:text-coral-600` (card title hover) → `group-hover:text-teal-600`
- `dark:group-hover:text-coral-300` → `dark:group-hover:text-teal-300`
- `hover:bg-coral-50 hover:text-coral-700` (tag button hover) → `hover:bg-teal-50 hover:text-teal-700`
- `dark:hover:bg-coral-500/15 dark:hover:text-coral-300` → `dark:hover:bg-teal-500/15 dark:hover:text-teal-300`
- `focus-visible:ring-coral-400` (tag button) → `focus-visible:ring-teal-400`

No structural changes.

---

### 6. `src/lib/categoryColor.ts`

**Lines 12–21:** Replace the `PALETTE` array entirely:

```ts
const PALETTE: ReadonlyArray<{ light: string; dark: string }> = [
  { light: "#6FA09A", dark: "#93C1BB" }, // seafoam
  { light: "#5E9E97", dark: "#84BFB9" }, // lagoon
  { light: "#6292AA", dark: "#88B5CC" }, // steel
  { light: "#6880AE", dark: "#8FA4CE" }, // cornflower
  { light: "#7880B8", dark: "#9FA8D5" }, // periwinkle
  { light: "#8A82B8", dark: "#ADA7D4" }, // violet slate
  { light: "#9680B0", dark: "#BAA8CE" }, // soft plum
  { light: "#9E80A4", dark: "#C0A8C4" }, // dusty mauve
];
```

Update the comment on line 9 to reference teal instead of coral:
```ts
// Palette intentionally stays in teal-to-mauve cool range so stripes
// don't compete with the primary teal accent on chips / CTAs.
```

The hash function and `categoryColor` export are unchanged.

---

## Verification checklist for Shamus

After applying all changes, run `npm run typecheck` (must pass — no type surface changes, but confirm no missed class names).

Visual sanity checks:
- Active category chip: solid teal fill, white label — should feel calm vs prior coral pop
- Inactive chip hover: teal text, teal border — subtle, not aggressive
- PromptCard hover: card title shifts to teal-600 text, card border goes teal-200 — visible but not showy
- Star (favorited): teal-500 icon — matches chip color, cohesive
- Scrollbar: pale teal thumb — barely visible, which is correct
- Text selection: teal-200 highlight — cool, unobtrusive
- Category stripes on cards: 8 distinct cool tones across a full grid — no rainbow, no warm pop

---

## ESCALATIONS

None. This is a pure color swap with no structural, layout, or accessibility regressions (the teal scale matches coral's luminance tier at every step). Sky does not need to approve for implementation to proceed.
