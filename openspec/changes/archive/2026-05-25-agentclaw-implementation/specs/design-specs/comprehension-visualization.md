# Domain Comprehension Score Visualization

> Version: 1.0 | Date: 2026-05-22
> Task: P0.16.1 — Define domain comprehension score visualization (DT11)
> Dependency: theme-system/token-definitions.md (token references)
> Appears in: Dashboard + Domain Overview

---

## 1. Comprehension Score Model

The comprehension score represents how well the AI has understood a domain's knowledge corpus. It is a weighted aggregate of all knowledge nodes' individual comprehension levels within a domain.

### Score Calculation

```
Domain Comprehension Score = Σ(node.level × node.weight) / Σ(node.weight)

Where:
  node.level = 0–5 comprehension level
  node.weight = source_count × recency_factor
  recency_factor = 1.0 (updated < 7 days) / 0.7 (< 30 days) / 0.4 (> 30 days)
```

| Score Range | Label | Color Token | Description |
|-------------|-------|-------------|-------------|
| 0.0 – 0.9 | None | `var(--text-tertiary)` | No knowledge captured |
| 1.0 – 1.9 | Aware | `var(--warning)` | Surface-level awareness |
| 2.0 – 2.9 | Familiar | `var(--info)` | Basic understanding established |
| 3.0 – 3.9 | Understood | `var(--accent)` | Solid comprehension |
| 4.0 – 4.5 | Deep | `var(--success)` | Deep domain mastery |
| 4.6 – 5.0 | Expert | `var(--accent)` + glow | Near-complete mastery |

---

## 2. Visualization Components

### 2.1 Progress Ring (Dashboard Domain Card)

Used in the dashboard domain overview card to show a quick visual summary.

```
        ╭──────────╮
       │  ┌──────┐  │
       │  │ 3.2  │  │   ← Score value centered inside ring
       │  │Under- │  │   ← Label below score
       │  │stood  │  │
       │  └──────┘  │
        ╰──────────╯
```

| Property | Value |
|----------|-------|
| **Ring Size** | 80px × 80px |
| **Ring Stroke Width** | 6px |
| **Background Track** | `var(--bg-tertiary)` |
| **Fill Track** | Color from score range table |
| **Fill Animation** | `stroke-dashoffset` transition, 800ms ease-out |
| **Score Value** | Typography: `headline` (28px/600), text `var(--text-primary)` |
| **Score Label** | Typography: `caption` (12px/400), text `var(--text-tertiary)` |
| **Ring Gap** | 2px between end of fill and start of next segment |
| **Gradient** | Start: score range color → End: `var(--accent)` at 70% |

### SVG Structure

```html
<svg width="80" height="80" viewBox="0 0 80 80" role="img"
     aria-label="Comprehension: 3.2 out of 5, Understood">
  <!-- Background track -->
  <circle cx="40" cy="40" r="34" fill="none"
          stroke="var(--bg-tertiary)" stroke-width="6" />
  <!-- Fill arc -->
  <circle cx="40" cy="40" r="34" fill="none"
          stroke="var(--accent)" stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray="213.6"     <!-- 2π × 34 -->
          stroke-dashoffset="76.9"     <!-- 213.6 × (1 - 3.2/5) -->
          transform="rotate(-90 40 40)" />
  <!-- Score text -->
  <text x="40" y="38" text-anchor="middle" fill="var(--text-primary)"
        font-size="20" font-weight="600">3.2</text>
  <text x="40" y="52" text-anchor="middle" fill="var(--text-tertiary)"
        font-size="10" font-weight="400">Understood</text>
</svg>
```

### 2.2 Gradient Bar (Domain Overview Page)

Used in the domain overview page as a horizontal comprehension bar.

```
┌──────────────────────────────────────────────────────────┐
│ Domain Comprehension                                      │
│                                                           │
│ ╔═══════════════════════════════╢─────────────────────────║ │
│ ║  3.2 / 5.0                  ║        Understood        ║ │
│ ╚═══════════════════════════════╧─────────────────────────╝ │
│                                                           │
│ ░░ Aware ░░░ Familiar █████ Understood ░░ Deep ░░ Expert │
└──────────────────────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| **Bar Height** | 8px |
| **Bar Width** | 100% of container |
| **Background** | `var(--bg-tertiary)` |
| **Border radius** | `var(--radius-full)` |
| **Fill Gradient** | `var(--warning)` → `var(--info)` → `var(--accent)` → `var(--success)` |
| **Fill Width** | (score / 5.0) × 100% |
| **Marker Position** | At (score / 5.0) × 100% |
| **Marker** | 12px × 12px circle, white fill, 2px `var(--text-primary)` stroke |
| **Section Title** | Typography: `subhead` (20px/400), text `var(--text-primary)` |
| **Score Display** | Typography: `stat` (48px/700), text `var(--text-primary)` |
| **Label** | Typography: `body-sm` (14px/400), text score range color |
| **Fill Animation** | Width transition, 800ms ease-out |

### Milestone Markers

The bar includes subtle milestone markers at each comprehension level boundary:

| Position | Label | Marker Style |
|----------|-------|-------------|
| 0/5 | None | Tick: 1px × 12px, `var(--border)` |
| 1/5 | Aware | Tick: 1px × 12px, `var(--warning)` at 30% |
| 2/5 | Familiar | Tick: 1px × 12px, `var(--info)` at 30% |
| 3/5 | Understood | Tick: 1px × 12px, `var(--accent)` at 30% |
| 4/5 | Deep | Tick: 1px × 12px, `var(--success)` at 30% |
| 5/5 | Expert | Tick: 1px × 12px, `var(--accent)` at 30% |

### 2.3 Mini Dot Row (Knowledge Node Card)

Inline comprehension indicator used in knowledge node cards within lists. This is the ComprehensionIndicator component (see component-specs.md 2.6) — 5 dots, 0-5 level.

### 2.4 Stat Card (Dashboard)

A compact stat card showing the comprehension score prominently.

```
┌──────────────┐
│ 3.2          │   ← Score value: stat (48px/700)
│ Understood   │   ← Label: body-sm (14px/400)
│ ────────●──  │   ← Mini progress bar, 4px height
│ 47 nodes     │   ← Sub-stat: caption (12px/400)
└──────────────┘
```

| Property | Value |
|----------|-------|
| **Card** | Background `var(--bg-secondary)`, border `var(--border)`, radius `var(--radius-md)`, padding `var(--spacing-md)` |
| **Score** | Typography `stat` (48px/700), text `var(--text-primary)` |
| **Label** | Typography `body-sm` (14px/400), text score range color |
| **Mini Bar** | Height 4px, background `var(--bg-tertiary)`, fill score range color, radius `var(--radius-full)` |
| **Sub-stat** | Typography `caption` (12px/400), text `var(--text-tertiary)` |

---

## 3. Animation Specifications

### Score Change Animation

When the comprehension score changes (e.g., after a research run or new knowledge import):

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Ring fill | `stroke-dashoffset` transition | 800ms | ease-out |
| Bar fill width | `width` transition | 800ms | ease-out |
| Score number | Counter animation (increment/decrement) | 600ms | ease-out |
| Label text | Crossfade | 300ms | ease-in-out |
| Color change | `stroke` / `background` transition | 400ms | ease-in-out |

### Reduced Motion

When `prefers-reduced-motion: reduce`:
- Ring and bar transitions are instant (0ms)
- Score number changes immediately
- Label text swaps immediately
- Color changes are instant

---

## 4. Accessibility

| Element | ARIA | Value |
|---------|------|-------|
| Progress Ring | `role="img"` | On SVG container |
| Progress Ring | `aria-label` | `"Domain comprehension: {score} out of 5, {label}"` |
| Gradient Bar | `role="progressbar"` | On bar element |
| Gradient Bar | `aria-valuenow` | Current score (e.g., "3.2") |
| Gradient Bar | `aria-valuemin` | "0" |
| Gradient Bar | `aria-valuemax` | "5" |
| Gradient Bar | `aria-label` | `"Domain comprehension level"` |
| Dot Indicator | `role="img"` | On container |
| Dot Indicator | `aria-label` | `"Comprehension: {n} of 5, {label}"` |

---

## 5. Color Contrast Verification

All score label colors must meet WCAG AA (4.5:1) against their backgrounds:

| Label | Color Token | On `--bg-secondary` | On `--bg-primary` | Pass? |
|-------|-------------|--------------------|--------------------|-------|
| None | `--text-tertiary` | Per style pack | Per style pack | Verified per pack |
| Aware | `--warning` | Yellow on dark: ≥ 4.5:1 ✓ | Yellow on dark: ✓ | Yes |
| Familiar | `--info` | Cyan on dark: ≥ 4.5:1 ✓ | Cyan on dark: ✓ | Yes |
| Understood | `--accent` | Blue on dark: ≥ 4.5:1 ✓ | Blue on dark: ✓ | Yes |
| Deep | `--success` | Green on dark: ≥ 4.5:1 ✓ | Green on dark: ✓ | Yes |
| Expert | `--accent` + glow | Same as Understood | Same | Yes |

> Light themes (Linear, Notion): Warning/info/accent/success colors must be verified at ≥ 3:1 for large text (labels are body-sm = 14px, so 4.5:1 required). Style pack mappings may need darker variants for status colors in light mode.

---

## Validation Checklist

- [x] Score calculation model defined (weighted average)
- [x] Score range → label → color mapping specified
- [x] Progress ring SVG structure and dimensions defined
- [x] Gradient bar layout and milestone markers specified
- [x] Mini dot row references ComprehensionIndicator component
- [x] Dashboard stat card layout defined
- [x] Animation specifications for score changes
- [x] Reduced-motion fallbacks specified
- [x] ARIA attributes for all visualization variants
- [x] Color contrast requirements noted
