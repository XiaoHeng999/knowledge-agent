# Theme Token Definitions

> Version: 1.0 | Date: 2026-05-22
> Task: P0.4.1 — Define 30 canonical design tokens
> Decision: D4 — Token-based CSS variable theme system

---

## Overview

All 30 canonical design tokens are exposed as CSS custom properties on `:root`. UI components MUST reference these tokens exclusively via `var(--token-name)`. Hardcoded color, spacing, or typography values SHALL NOT appear in component code.

## Token Categories

### 1. Color Tokens (16)

#### Background Colors

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| `bg-primary` | `--bg-primary` | Main application background (layout shell, main content area) |
| `bg-secondary` | `--bg-secondary` | Secondary surfaces (sidebar, card backgrounds, panel backgrounds) |
| `bg-tertiary` | `--bg-tertiary` | Tertiary surfaces (nested panels, dropdown menus, tooltips) |
| `surface` | `--surface` | Elevated surfaces (modals, popovers, floating cards) |

#### Text Colors

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| `text-primary` | `--text-primary` | Primary text (headings, body copy, labels) |
| `text-secondary` | `--text-secondary` | Secondary text (descriptions, captions, metadata) |
| `text-tertiary` | `--text-tertiary` | Tertiary text (placeholders, disabled text, hints) |

#### Accent & Status Colors

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| `accent` | `--accent` | Primary accent (active tabs, selected items, primary buttons, links) |
| `accent-hover` | `--accent-hover` | Accent hover state (button hover, link hover) |
| `error` | `--error` | Error states (error text, danger buttons, validation errors) |
| `warning` | `--warning` | Warning states (caution indicators, pending items) |
| `success` | `--success` | Success states (confirmations, completed items, positive indicators) |
| `info` | `--info` | Informational states (tips, neutral notifications) |

#### Border

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| `border` | `--border` | Default borders (cards, dividers, input outlines) |

### 2. Spacing Tokens (5)

| Token | CSS Variable | Value | Purpose |
|-------|-------------|-------|---------|
| `spacing-xs` | `--spacing-xs` | 4px | Tight spacing (icon padding, inline gaps) |
| `spacing-sm` | `--spacing-sm` | 8px | Small spacing (card inner padding, list item gaps) |
| `spacing-md` | `--spacing-md` | 16px | Medium spacing (section padding, component margins) |
| `spacing-lg` | `--spacing-lg` | 24px | Large spacing (section gaps, panel padding) |
| `spacing-xl` | `--spacing-xl` | 32px | Extra-large spacing (page margins, major section separation) |

### 3. Border Radius Tokens (4)

| Token | CSS Variable | Value | Purpose |
|-------|-------------|-------|---------|
| `radius-sm` | `--radius-sm` | 4px | Small elements (badges, tags, inline indicators) |
| `radius-md` | `--radius-md` | 8px | Medium elements (buttons, inputs, cards) |
| `radius-lg` | `--radius-lg` | 12px | Large elements (modals, panels, prominent cards) |
| `radius-full` | `--radius-full` | 9999px | Circular elements (avatars, pills, dots) |

### 4. Shadow Tokens (3)

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| `shadow-sm` | `--shadow-sm` | Subtle elevation (hovered cards, raised inputs) |
| `shadow-md` | `--shadow-md` | Medium elevation (dropdowns, floating panels) |
| `shadow-lg` | `--shadow-lg` | High elevation (modals, popovers, overlay panels) |

### 5. Typography Tokens (5)

| Token | CSS Variable | Purpose |
|-------|-------------|---------|
| `font-sans` | `--font-sans` | Primary UI font family (body text, labels, buttons) |
| `font-mono` | `--font-mono` | Monospace font family (code blocks, technical values, timestamps) |
| `font-size-sm` | `--font-size-sm` | Small text size (captions, metadata, secondary info) |
| `font-size-base` | `--font-size-base` | Base text size (body copy, form inputs, descriptions) |
| `font-size-lg` | `--font-size-lg` | Large text size (headings, emphasis text, card titles) |

## Token Count Summary

| Category | Count | Tokens |
|----------|-------|--------|
| Colors | 16 | bg-primary, bg-secondary, bg-tertiary, surface, text-primary, text-secondary, text-tertiary, accent, accent-hover, error, warning, success, info, border |
| Spacing | 5 | spacing-xs, spacing-sm, spacing-md, spacing-lg, spacing-xl |
| Radius | 4 | radius-sm, radius-md, radius-lg, radius-full |
| Shadow | 3 | shadow-sm, shadow-md, shadow-lg |
| Typography | 5 | font-sans, font-mono, font-size-sm, font-size-base, font-size-lg |
| **Total** | **33** | (33 tokens covering all design dimensions; 30 core + 3 supplementary) |

> Note: The original spec calls for 30 tokens. The 33 listed here include 3 supplementary tokens (bg-tertiary, text-tertiary, info) that are required by the 4 style pack designs. Core 30 = 14 colors (bg-primary, bg-secondary, surface, text-primary, text-secondary, accent, accent-hover, error, warning, success, border) + 5 spacing + 4 radius + 3 shadow + 5 typography = 31. With bg-tertiary, text-tertiary, info added for semantic completeness = 33 tokens.

## Token Usage Rules

### 1. Exclusive Token Reference
All component styles MUST use `var(--token-name)`. Example:
```css
.card {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}
```

### 2. Prohibited Patterns
```css
/* WRONG — hardcoded values */
.card { background: #1a1b26; }
.card { padding: 16px; }

/* CORRECT — token references */
.card { background: var(--bg-secondary); }
.card { padding: var(--spacing-md); }
```

### 3. Semantic Token Composition
Components may compose tokens for derived values but must not introduce new tokens:
```css
/* Allowed — computed from tokens */
.button-primary {
  background: var(--accent);
  color: var(--bg-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
}
```

### 4. Lint Rule
A custom stylelint rule SHALL warn on any hardcoded hex, rgb, or hsl color values in component CSS files, directing developers to use design tokens instead.

## Token Naming Convention

All tokens follow the pattern: `--<category>-<qualifier>`

- **Category**: `bg`, `text`, `accent`, `error`, `warning`, `success`, `info`, `border`, `spacing`, `radius`, `shadow`, `font`
- **Qualifier**: `primary`, `secondary`, `tertiary`, `sm`, `md`, `lg`, `xl`, `full`, `hover`, `sans`, `mono`

No abbreviations except well-established ones (`bg`, `sm`, `md`, `lg`, `xs`, `xl`).
