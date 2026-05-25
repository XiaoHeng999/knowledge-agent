# Height Breakpoints + Minimum Window Specification

> Version: 1.0 | Date: 2026-05-22
> Task: P0.16.3 — Add height breakpoints + minimum window specs (DT14)
> Dependency: design-specs/responsive-panels.md (width breakpoints), electron-scaffold/spec.md (window config)
> Covers: Vertical responsive behavior, minimum window dimensions, sidebar height constraints

---

## 1. Minimum Window Size

The application enforces a minimum window size to prevent unusable layouts.

| Property | Value | Reason |
|----------|-------|--------|
| **Minimum width** | 1024px | Sidebar (180px) + Main content (640px) + Panel minimum (204px) |
| **Minimum height** | 768px | Title bar (36px) + Content (min 400px) + Status bar (28px) + breathing room |
| **Default width** | 1280px | Comfortable three-panel layout |
| **Default height** | 800px | Standard desktop resolution |

### Electron Configuration

```typescript
// electron/main.ts
const mainWindow = new BrowserWindow({
  width: 1280,
  height: 800,
  minWidth: 1024,
  minHeight: 768,
  // ...
});
```

### User Resizing Behavior

| Scenario | Behavior |
|----------|----------|
| User drags below 1024×768 | Window stops at minimum size (OS-enforced) |
| Display changes resolution (e.g., monitor disconnect) | Window clamps to display bounds, min 1024×768 |
| Restored from maximized | Returns to previous size (clamped to min if display changed) |

---

## 2. Height Breakpoints

### 2.1 Breakpoint Definitions

| Breakpoint | Height | Layout Changes |
|-----------|--------|----------------|
| **Tall** | ≥ 900px | Full layout with generous spacing |
| **Standard** | 768–899px | Reduced spacing, compact header |
| **Minimum** | = 768px | All spacing at minimum, no scroll in header/footer |

### 2.2 Vertical Layout Zones

```
┌──────────────────────────────────────┐
│ Title Bar           36px (fixed)     │ ← Always visible, never scrolls
├──────────────────────────────────────┤
│                                      │
│ Content Area        flex-1           │ ← Absorbs height changes
│ (sidebar + main + panel)             │
│                                      │
├──────────────────────────────────────┤
│ Status Bar          28px (fixed)     │ ← Always visible, never scrolls
└──────────────────────────────────────┘
```

Total chrome height: 36px + 28px = **64px** fixed.

Content area height at minimum window: 768px − 64px = **704px**.

### 2.3 Per-Breakpoint Adjustments

| Element | ≥ 900px (Tall) | 768–899px (Standard) |
|---------|----------------|----------------------|
| Title bar height | 36px | 36px (unchanged) |
| Status bar height | 28px | 28px (unchanged) |
| Sidebar item height | 32px | 28px |
| Sidebar search input height | 32px | 28px |
| Sidebar padding | `var(--spacing-sm)` | `var(--spacing-xs)` |
| Sidebar section gap | `var(--spacing-sm)` | `var(--spacing-xs)` |
| Domain tree indent | `var(--spacing-md)` per level | `var(--spacing-sm)` per level |
| Main content padding | `var(--spacing-lg)` | `var(--spacing-md)` |
| Card grid gap | `var(--spacing-md)` | `var(--spacing-sm)` |
| Dashboard stat card padding | `var(--spacing-md)` | `var(--spacing-sm)` |
| Chat message padding | `var(--spacing-sm)` `var(--spacing-md)` | `var(--spacing-xs)` `var(--spacing-sm)` |
| Chat input min height | 44px | 36px |
| Right panel header height | 40px | 36px |
| Right panel content padding | `var(--spacing-md)` | `var(--spacing-sm)` |
| Table row height | 40px | 36px |
| Filter bar height | 40px | 36px |
| Command palette max height | 420px | 340px |

---

## 3. Sidebar Height Behavior

### 3.1 Sidebar Sections

The sidebar has four vertical zones, from top to bottom:

```
┌──────────────┐
│ Search Input  │  Fixed height: 28-32px
├──────────────┤
│ Domain Tree   │  flex-1, overflow-y: auto
│ (scrollable)  │
├──────────────┤
│ Quick Record  │  Fixed height: 36px (button)
├──────────────┤
│ Settings      │  Fixed height: 36px
└──────────────┘
```

### 3.2 Viewport Height < 700px — Sidebar Maximum Height

When the viewport content height falls below 700px (i.e., window height < 764px):

| Element | Adjustment |
|---------|-----------|
| Search input | Remains visible, height reduces to 28px |
| Domain tree | `max-height: calc(100vh - 64px - 28px - 36px - 36px - 16px)` |
| Quick record | Hidden (collapsed into a "+" floating action button) |
| Settings | Remains visible at bottom |
| Domain tree items | Height 24px, font-size `var(--font-size-sm)` |

### 3.3 Floating Action Button (Compact Sidebar)

When Quick Record is hidden:

```
┌──────────────┐
│ Search        │
├──────────────┤
│               │
│ Domain Tree   │
│ (scrollable)  │
│               │
│            [+]│ ← Floating action button, bottom-right of sidebar
│               │
├──────────────┤
│ ⚙ Settings    │
└──────────────┘
```

| Property | Value |
|----------|-------|
| **Size** | 32px × 32px |
| **Background** | `var(--accent)` |
| **Icon** | 16px plus, white |
| **Border radius** | `var(--radius-full)` |
| **Position** | Absolute, bottom 52px, right 8px |
| **Shadow** | `var(--shadow-md)` |
| **Hover** | `var(--accent-hover)`, `var(--shadow-lg)` |

---

## 4. Content Area Minimum Heights

### 4.1 View-Specific Minimums

Each view defines a minimum content height to prevent layout breakage. If the content area is shorter than the minimum, the view scrolls internally.

| View | Min Content Height | Scrolling |
|------|--------------------|-----------|
| Dashboard | 500px | Page scroll |
| Knowledge List | 400px | List virtual scroll |
| Knowledge Graph | 400px | Graph canvas (no scroll, zoom only) |
| Expert Chat | 300px | Message list scroll |
| Timeline | 400px | Page scroll |
| Research Dashboard | 500px | Page scroll |
| Inbox | 400px | List scroll |
| Settings | 400px | Page scroll |

### 4.2 Chat View Compact Mode

When the content area height is < 500px, the chat view enters compact mode:

| Element | Normal | Compact (< 500px) |
|---------|--------|--------------------|
| Message padding | `var(--spacing-sm)` `var(--spacing-md)` | `var(--spacing-xs)` `var(--spacing-sm)` |
| Message max width | 70%/80% | 85%/90% |
| Input area height | 80px (with toolbar) | 56px (toolbar hidden) |
| Model switcher | Visible in header | Hidden (accessible via Cmd+K) |
| Branch indicators | Full display | Compact dots only |

---

## 5. Right Panel Height Behavior

### 5.1 Panel Content Overflow

| Scenario | Behavior |
|----------|----------|
| Panel content > panel height | Content area scrolls (header stays fixed) |
| Panel content < panel height | Content renders at natural height, no scroll |

### 5.2 Panel Header Scroll Lock

The panel header (40px / 36px compact) remains fixed at the top during content scroll.

```css
.context-panel {
  display: flex;
  flex-direction: column;
}

.context-panel__header {
  flex-shrink: 0;
  height: 40px; /* 36px at < 900px height */
}

.context-panel__content {
  flex: 1;
  overflow-y: auto;
}
```

---

## 6. Full-Screen Mode

### 6.1 Toggle

- **macOS**: Ctrl+Cmd+F
- **Windows/Linux**: F11

### 6.2 Full-Screen Layout

| Element | Normal | Full Screen |
|---------|--------|-------------|
| Title bar | 36px visible | **Hidden** (auto-hide on mouse to top edge) |
| Status bar | 28px visible | 28px visible (remains) |
| Content height gain | — | +36px |

### 6.3 Title Bar Auto-Show

In full-screen mode, moving the mouse to the top 4px of the screen triggers the title bar to slide down:

- Animation: `slide-down` 150ms ease-out
- Duration: visible for 3 seconds after mouse leaves, then auto-hides
- Override: stays visible while mouse is within title bar bounds

---

## 7. CSS Implementation

### 7.1 Custom Properties for Height

```css
:root {
  --titlebar-height: 36px;
  --statusbar-height: 28px;
  --chrome-height: 64px; /* titlebar + statusbar */
  --content-height: calc(100vh - var(--chrome-height));
}

/* Height breakpoints */
@media (max-height: 899px) {
  :root {
    --sidebar-item-height: 28px;
    --main-padding: var(--spacing-md);
    --chat-input-min-height: 36px;
  }
}

@media (min-height: 900px) {
  :root {
    --sidebar-item-height: 32px;
    --main-padding: var(--spacing-lg);
    --chat-input-min-height: 44px;
  }
}

/* Very compact */
@media (max-height: 764px) {
  :root {
    --sidebar-search-height: 28px;
    --sidebar-item-height: 24px;
  }
}
```

---

## Validation Checklist

- [x] Minimum window size: 1024×768
- [x] Default window size: 1280×800
- [x] Height breakpoints defined (Tall ≥ 900px, Standard 768–899px)
- [x] Per-breakpoint spacing adjustments specified
- [x] Sidebar height behavior at < 700px viewport
- [x] Floating action button for compact sidebar
- [x] View-specific minimum content heights
- [x] Chat compact mode at < 500px content height
- [x] Right panel header scroll lock
- [x] Full-screen mode behavior
- [x] CSS custom properties for height-based adjustments
- [x] Consistent with responsive-panels.md width breakpoints
