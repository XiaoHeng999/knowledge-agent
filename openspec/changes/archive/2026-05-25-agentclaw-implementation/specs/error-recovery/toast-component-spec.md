# Toast Component Specification

> Version: 1.0 | Date: 2026-05-22

---

## Overview

A toast notification component for non-critical feedback. Positioned in the bottom-right corner of the application window. Supports stacking, auto-dismiss, and action buttons.

---

## Positioning

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
│                          ┌─────────┐ │
│                          │ Toast 3 │ │ ← Most recent (top of stack)
│                          ├─────────┤ │
│                          │ Toast 2 │ │
│                          ├─────────┤ │
│                          │ Toast 1 │ │ ← Oldest (bottom of stack)
│                          └─────────┘ │
└──────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Position | Fixed, bottom-right corner |
| Bottom offset | 44px (above status bar which is 28px + 16px margin) |
| Right offset | 16px from window edge |
| Z-index | `z-50` (above all content, below modal dialogs) |
| Max visible | 3 toasts at a time |
| Stack direction | Vertical, newest at top |
| Stack gap | 8px between toasts |

---

## Toast Types

### Success

```
┌──────────────────────────────────┐
│ ✓  Knowledge node created        │
│                        [View]  ✕ │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `#ECFDF5` (green-50) |
| Border-left | 3px solid `#10B981` (green-500) |
| Icon | `✓` checkmark, `#059669` (green-600), 16px |
| Duration | 3 seconds auto-dismiss |
| Dismiss | Auto + manual close button |

### Error

```
┌──────────────────────────────────┐
│ ⚠  Research run failed            │
│    (network error)                │
│                   [Retry]     ✕  │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `#FEF2F2` (red-50) |
| Border-left | 3px solid `#EF4444` (red-500) |
| Icon | `⚠` warning, `#DC2626` (red-600), 16px |
| Duration | 5 seconds auto-dismiss (or manual) |
| Dismiss | Auto + manual close button |

### Warning

```
┌──────────────────────────────────┐
│ ⚡  Domain config reset to         │
│     defaults                      │
│                       [View]  ✕  │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `#FFFBEB` (amber-50) |
| Border-left | 3px solid `#F59E0B` (amber-500) |
| Icon | `⚡` lightning, `#D97706` (amber-600), 16px |
| Duration | 5 seconds auto-dismiss |
| Dismiss | Auto + manual close button |

### Info

```
┌──────────────────────────────────┐
│ ℹ  3 research runs completed      │
│                         [View] ✕ │
└──────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `#EFF6FF` (blue-50) |
| Border-left | 3px solid `#3B82F6` (blue-500) |
| Icon | `ℹ` info, `#2563EB` (blue-600), 16px |
| Duration | 3 seconds auto-dismiss |
| Dismiss | Auto + manual close button |

---

## Component Dimensions

| Property | Value |
|----------|-------|
| Min width | 280px |
| Max width | 420px |
| Height | Auto (content-driven) |
| Padding | 12px 16px |
| Border-radius | 8px |
| Shadow | `0 4px 12px rgba(0, 0, 0, 0.1)` |

---

## Typography

| Element | Spec |
|---------|------|
| Title/message | 14px/Medium, `text-primary` |
| Description | 13px/Regular, `text-secondary` |
| Action button | 13px/Medium, variant accent color |
| Close button (✕) | 12px, `text-tertiary`, hover `text-secondary` |

---

## Action Button

| Property | Value |
|----------|-------|
| Style | Ghost button (no background, text-only) |
| Color | Matches toast type accent color |
| Hover | Background at 10% opacity of accent color |
| Position | Right-aligned, inline with message |
| Max | 1 action button per toast |
| Common actions | "Retry", "View", "Dismiss", "Go to Settings" |

---

## Close Button

| Property | Value |
|----------|-------|
| Icon | `✕` (unicode ×), 10px |
| Color | `text-tertiary` (`#9CA3AF`) |
| Hover | `text-secondary` (`#6B7280`) |
| Size | 20px × 20px click target |
| Position | Top-right corner of toast |

---

## Animations

### Entry

| Property | Value |
|----------|-------|
| Animation | `toast-enter` |
| Duration | 200ms |
| Easing | `cubic-bezier(0.21, 1.02, 0.73, 1)` (ease-out with slight overshoot) |
| From | `opacity: 0; transform: translateX(40px)` |
| To | `opacity: 1; transform: translateX(0)` |

### Exit

| Property | Value |
|----------|-------|
| Animation | `toast-exit` |
| Duration | 150ms |
| Easing | `ease-in` |
| From | `opacity: 1; transform: translateX(0)` |
| To | `opacity: 0; transform: translateX(40px)` |

### Auto-dismiss Progress

| Property | Value |
|----------|-------|
| Indicator | Thin progress bar at bottom of toast |
| Height | 2px |
| Color | Toast type accent color at 40% opacity |
| Animation | Linear width reduction from 100% to 0% over duration |
| On hover | Progress pauses, timer resets on mouse leave |

---

## Stacking Behavior

1. New toasts appear at the **top** of the stack
2. When a toast is dismissed, toasts below it slide up to fill the gap (200ms ease-out)
3. If a 4th toast is added while 3 are visible:
   - The **oldest** toast (bottom) is immediately dismissed with exit animation
   - New toast enters at the top
4. Same-content deduplication: if a toast with identical title+description already exists, update it (reset timer, increment count badge if applicable)

---

## Auto-Dismiss Rules

| Scenario | Behavior |
|----------|----------|
| Default | Auto-dismiss after type-specific duration |
| Hover | Pause timer; resume on mouse leave with full remaining duration |
| Has action button | Auto-dismiss still applies (user may miss it) |
| Error type with Retry | 5s auto-dismiss even with Retry button — Retry still available in original error location |
| Critical errors | Do NOT auto-dismiss — require manual close |
| During auto-dismiss | Progress bar visible at bottom |

---

## Accessibility

| Property | Value |
|----------|-------|
| Role | `role="status"` |
| Live region | `aria-live="polite"` |
| Atomic | `aria-atomic="true"` |
| Label | `aria-label="Notification: {message}"` |
| Close button | `aria-label="Dismiss notification"` |
| Action button | Inherits button a11y |
| Focus | Does not steal focus on appear |
| Keyboard | Escape on focused toast closes it |

---

## React Component Interface

```typescript
interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number; // ms, overrides type default
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean; // if true, no auto-dismiss
}

// Usage via hook
const { addToast, removeToast } = useToast();

addToast({
  type: 'error',
  title: 'Research run failed (network error)',
  action: { label: 'Retry', onClick: () => retryResearch() },
});
```

---

## Toast Usage Map by Feature

| Feature | Toast Type | Message Example | Action |
|---------|-----------|-----------------|--------|
| F2 Research | success | "Research run completed. 3 new nodes." | View |
| F2 Research | error | "Research run failed (network error)" | Retry |
| F3 Framework | success | "Framework analysis complete" | View Results |
| F5 Knowledge | success | "Knowledge node created" | View |
| F5 Knowledge | error | "Failed to save to domain" | Retry |
| F6 Domain | success | "Domain '{name}' created" | Open |
| F6 Domain | warning | "Domain config reset to defaults" | View |
| F8 Import | success | "Imported 5 items from RSS feed" | View in Inbox |
| F8 Import | error | "Failed to fetch URL: {url}" | Retry |
| F9 Model | warning | "Failed to switch to {model}" | Dismiss |
| F9 Model | success | "API key validated for {provider}" | — |
| F9 Model | success | "Model available: {name}" | — |
| F10 Graph | warning | "Graph rendering failed" | Retry Graph |
| F11 Version | error | "Auto-save checkpoint failed" | View |
| F11 Version | warning | "Agent write blocked: out of scope" | View |
