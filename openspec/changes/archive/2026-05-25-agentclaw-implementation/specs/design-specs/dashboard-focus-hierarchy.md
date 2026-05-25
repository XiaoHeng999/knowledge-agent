# Dashboard Focus Hierarchy

> Version: 1.0 | Date: 2026-05-22
> Task: P0.16.4 — Redesign dashboard focus hierarchy (DT15)
> Dependency: component-specs.md (component specs), comprehension-visualization.md (score viz)
> Covers: Dashboard layout, visual weight distribution, stat card hierarchy, information density

---

## 1. Design Problem

The original dashboard lacks a clear visual hierarchy. All sections appear equally weighted, causing users to scan without focus. The redesign establishes a **reading order**: primary statistics first, then domain overview, then activity feeds.

---

## 2. Layout Structure

### 2.1 First Row: 60/40 Split

The top row uses a 60/40 split to create an immediate focal point.

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  ┌───────────────────────┐ │
│  │                                  │  │                       │ │
│  │  TODAY'S OVERVIEW      (60%)     │  │  INBOX         (40%)  │ │
│  │                                  │  │                       │ │
│  │  ┌─────────┐ ┌─────────┐        │  │  ┌─────────────────┐  │ │
│  │  │  12     │ │  $0.42  │        │  │  │ AI summary...   │  │ │
│  │  │ New     │ │ Cost    │        │  │  │ source: arxiv   │  │ │
│  │  └─────────┘ └─────────┘        │  │  │ [Accept] [Skip] │  │ │
│  │  ┌─────────┐ ┌─────────┐        │  │  └─────────────────┘  │ │
│  │  │  3      │ │  2/3    │        │  │  ┌─────────────────┐  │ │
│  │  │ Runs    │ │ Research│        │  │  │ AI summary...   │  │ │
│  │  └─────────┘ └─────────┘        │  │  │ source: rss     │  │ │
│  │                                  │  │  │ [Accept] [Skip] │  │ │
│  │  Last research: 30 min ago       │  │  └─────────────────┘  │ │
│  └──────────────────────────────────┘  │  +2 more items        │ │
│                                         └───────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Second Row: Domain Cards

```
┌──────────────────────────────────────────────────────────────────┐
│  YOUR DOMAINS                                                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ ▬ AI/ML      │  │ ▬ Frontend   │  │ ▬ Research   │           │
│  │              │  │              │  │              │           │
│  │    3.2/5     │  │    2.1/5     │  │    0.8/5     │           │
│  │  Understood  │  │  Familiar    │  │  None        │           │
│  │              │  │              │  │              │           │
│  │ 47 nodes     │  │ 23 nodes     │  │ 3 nodes      │           │
│  │ Last: 2h ago │  │ Last: 1d ago │  │ Last: 5d ago │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

### 2.3 Third Row: Activity Feed

```
┌──────────────────────────────────────────────────────────────────┐
│  RECENT ACTIVITY                                                 │
│                                                                  │
│  ● New insight: "Transformer attention..." — AI/ML    2h ago     │
│  ● Research completed — Frontend                      4h ago     │
│  ● Prediction updated: "WebAssembly adoption..."      1d ago     │
│  ● Decision recorded: ADR-007 — Research              2d ago     │
│                                                                  │
│  View all activity →                                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 Primary Stat Card (Today's Overview)

These are the **highest visual weight** elements in the dashboard.

| Property | Value |
|----------|-------|
| **Container** | |
| Width | 60% of content area |
| Padding | `var(--spacing-lg)` |
| Background | `var(--bg-secondary)` |
| Border | 1px solid `var(--border)` |
| Border radius | `var(--radius-lg)` |
| **Section Title** | |
| Typography | `eyebrow` (13px/500), uppercase, `var(--text-tertiary)` |
| Letter spacing | 0.4px |
| Margin bottom | `var(--spacing-md)` |
| **Stat Grid** | |
| Display | grid, 2 columns |
| Gap | `var(--spacing-md)` |
| **Stat Value** | |
| Typography | **48px / Bold (700)** / `var(--text-primary)` |
| Font family | `var(--font-sans)` |
| Line height | 1.10 |
| Letter spacing | -2.0px |
| **Stat Label** | |
| Typography | `body-sm` (14px/400), `var(--text-tertiary)` |
| Margin top | 4px |
| **Stat Accent** | |
| Cost stat | Value color `var(--warning)` when above daily threshold |
| Research stat | Progress shown as "N/M" where M is scheduled |
| **Last Updated** | |
| Typography | `caption` (12px/400), `var(--text-tertiary)` |
| Margin top | `var(--spacing-md)` |
| Icon | 12px clock, `var(--text-tertiary)` |

### 3.2 Inbox Preview (40% Panel)

| Property | Value |
|----------|-------|
| **Container** | |
| Width | 40% of content area |
| Padding | `var(--spacing-md)` |
| Background | `var(--bg-secondary)` |
| Border | 1px solid `var(--border)` |
| Border radius | `var(--radius-lg)` |
| **Section Title** | |
| Typography | `eyebrow` (13px/500), uppercase, `var(--text-tertiary)` |
| **Count Badge** (in title) | |
| Background | `var(--error)` |
| Text | white, `badge` (11px/600) |
| Padding | 1px 6px |
| Border radius | `var(--radius-full)` |
| **Inbox Item Preview** | |
| Padding | `var(--spacing-sm)` 0 |
| Border bottom | 1px solid `var(--border)` |
| **AI Summary** | |
| Typography | `body-sm` (14px/400), `var(--text-secondary)` |
| Max lines | 2, ellipsis |
| **Source** | |
| Typography | `caption` (12px/400), `var(--text-tertiary)` |
| Margin top | 4px |
| **Action Buttons** | |
| Height | 24px |
| Gap | `var(--spacing-xs)` |
| Accept | Text `var(--success)`, weight 500 |
| Skip | Text `var(--text-tertiary)` |
| **"More Items" Indicator** | |
| Typography | `body-sm` (14px/400), `var(--text-tertiary)` |
| Text | "+N more items" |

### 3.3 Domain Card (Second Row)

| Property | Value |
|----------|-------|
| **Container** | |
| Width | Auto-fill, minmax(260px, 1fr) |
| Padding | `var(--spacing-md)` |
| Background | `var(--bg-secondary)` |
| Border | 1px solid `var(--border)` |
| Border radius | `var(--radius-lg)` |
| **Color Header** | |
| Height | 4px |
| Background | Domain color |
| Border radius | `var(--radius-lg)` top |
| **Domain Name** | |
| Typography | `body-sm` (14px/500), `var(--text-primary)` |
| Domain color dot | 10px × 10px circle |
| **Comprehension Score** | |
| Progress ring | 80px × 80px (see comprehension-visualization.md) |
| Centered | In card |
| **Node Count** | |
| Typography | `caption` (12px/400), `var(--text-tertiary)` |
| **Last Activity** | |
| Typography | `caption` (12px/400), `var(--text-tertiary)` |
| **Hover** | |
| Border | Domain color at 30% |
| Shadow | `var(--shadow-md)` |
| Transform | translateY(-1px) |
| Cursor | pointer |

### 3.4 Activity Feed (Third Row)

| Property | Value |
|----------|-------|
| **Container** | |
| Background | `var(--bg-secondary)` |
| Border | 1px solid `var(--border)` |
| Border radius | `var(--radius-lg)` |
| Padding | `var(--spacing-md)` |
| **Section Title** | |
| Typography | `eyebrow` (13px/500), uppercase, `var(--text-tertiary)` |
| **Activity Row** | |
| Padding | `var(--spacing-sm)` 0 |
| Border bottom | 1px solid `var(--border)` |
| **Dot** | |
| Size | 6px circle |
| Color | `var(--accent)` |
| Margin right | `var(--spacing-sm)` |
| **Event Text** | |
| Typography | `body-sm` (14px/400), `var(--text-secondary)` |
| Bold portion | Weight 500, `var(--text-primary)` |
| **Domain Tag** | |
| Typography | `caption` (12px/400) |
| Text | Domain color |
| Margin left | `var(--spacing-xs)` |
| **Timestamp** | |
| Typography | `caption` (12px/400), `var(--text-tertiary)` |
| Align | right |
| **"View All" Link** | |
| Typography | `body-sm` (14px/500), `var(--accent)` |
| Hover | `var(--accent-hover)`, underline |
| Margin top | `var(--spacing-sm)` |

---

## 4. Visual Weight Hierarchy

### 4.1 Reading Order

Users should scan the dashboard in this order:

| Priority | Element | Visual Weight | Mechanism |
|----------|---------|---------------|-----------|
| 1 | Primary statistics | **Highest** | 48px Bold, negative tracking, largest text on page |
| 2 | Domain comprehension rings | High | Color + movement (animated fill) |
| 3 | Inbox count badge | High | Red badge on title — attention-grabbing |
| 4 | Domain names + colors | Medium | Domain color accents, card structure |
| 5 | Activity feed | Low | Regular body text, subtle dots |
| 6 | Section labels | Lowest | Eyebrow typography, all-caps, tertiary color |

### 4.2 Size Contrast Scale

| Element | Font Size | Weight | Visual Impact |
|---------|-----------|--------|---------------|
| Primary stat value | **48px** | **700** | Dominant — first thing the eye lands on |
| Domain score (ring) | 20px | 600 | Secondary — color + shape attract attention |
| Section title | 22px | 500 | Moderate — structured hierarchy |
| Body text | 14px | 400 | Baseline — information density |
| Captions | 12px | 400 | Subtle — supporting details |
| Eyebrows | 13px | 500 | Muted — structural labels |

### 4.3 Color Hierarchy

| Priority | Color Usage | Token |
|----------|------------|-------|
| 1 | Stat accent (cost warning) | `var(--warning)` — only used when action is needed |
| 2 | Inbox count badge | `var(--error)` — signals unread items |
| 3 | Domain colors | Per-domain custom colors |
| 4 | Comprehension fill | Score range color (see comprehension-visualization.md) |
| 5 | Section structure | `var(--bg-secondary)`, `var(--border)` |
| 6 | Text | `var(--text-primary)` → `var(--text-secondary)` → `var(--text-tertiary)` |

---

## 5. Responsive Behavior

### 5.1 Width Breakpoints

| Breakpoint | First Row | Domain Cards | Activity Feed |
|-----------|-----------|-------------|---------------|
| ≥ 1200px | 60/40 side-by-side | 3-up grid | Full width |
| 900–1199px | 60/40 (narrower inbox) | 2-up grid | Full width |
| < 900px (sidebar collapsed) | Stack vertically | 2-up grid | Full width |

### 5.2 At < 900px Width

```
┌──────────────────────────────────────┐
│ TODAY'S OVERVIEW                     │
│ ┌─────────┐ ┌─────────┐ ┌────────┐  │
│ │  12     │ │  $0.42  │ │  3     │  │
│ │ New     │ │ Cost    │ │ Runs   │  │
│ └─────────┘ └─────────┘ └────────┘  │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ INBOX (3)                            │
│ ┌──────────────────────────────────┐ │
│ │ AI summary... source: arxiv      │ │
│ │ [Accept] [Skip]                  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘

┌──────────────────┐ ┌──────────────────┐
│ ▬ AI/ML          │ │ ▬ Frontend       │
│    3.2/5         │ │    2.1/5         │
│  Understood      │ │  Familiar        │
│ 47 nodes         │ │ 23 nodes         │
└──────────────────┘ └──────────────────┘
```

### 5.3 Height Breakpoints

At **standard height** (768–899px), the dashboard adjusts:

| Element | Tall (≥ 900px) | Standard |
|---------|----------------|----------|
| First row padding | `var(--spacing-lg)` | `var(--spacing-md)` |
| Stat grid gap | `var(--spacing-md)` | `var(--spacing-sm)` |
| Inbox preview items | 3 visible | 2 visible |
| Domain cards | 3 visible | 2 visible |
| Activity items | 4 visible | 3 visible |
| Section gaps | `var(--spacing-lg)` | `var(--spacing-md)` |

---

## 6. Empty State

When the dashboard has no data (first launch before onboarding):

| Section | Empty State |
|---------|------------|
| Today's Overview | "--" for all stats, `var(--text-tertiary)`, "Complete onboarding to get started" |
| Inbox | "Your inbox is empty" illustration + "Import content to get started" CTA |
| Domain Cards | "Create your first domain" card with "+" icon, dashed border |
| Activity Feed | "No activity yet. Start by exploring your domain expert." |

The empty "Create your first domain" card:

| Property | Value |
|----------|-------|
| Border | 2px dashed `var(--border)` |
| Border radius | `var(--radius-lg)` |
| Padding | `var(--spacing-xl)` |
| Icon | 24px plus, `var(--text-tertiary)` |
| Text | `body-sm` (14px/400), `var(--text-tertiary)`, "Create your first domain" |
| Hover | Border `var(--accent)` at 50%, icon + text `var(--accent)` |
| Cursor | pointer |

---

## Validation Checklist

- [x] First row 60/40 split (Today's Overview / Inbox)
- [x] Primary statistics at 48px/Bold (700) with negative tracking
- [x] Reading order hierarchy clearly defined
- [x] Visual weight progression from stat → domain → activity
- [x] Color hierarchy prevents visual noise
- [x] Domain cards with comprehension rings
- [x] Activity feed as lightweight third row
- [x] Responsive breakpoints for width and height
- [x] Empty states for each section
- [x] Consistent with component-specs.md token references
- [x] Consistent with comprehension-visualization.md for score display
