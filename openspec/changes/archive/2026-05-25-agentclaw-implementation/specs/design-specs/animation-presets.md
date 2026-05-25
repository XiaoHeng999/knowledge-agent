# Animation Presets Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: P0.9.1 (Standard Animation Presets), P0.9.2 (Precise Parameters), P0.9.3 (prefers-reduced-motion Fallback)
> Dependency: None

---

## P0.9.1 Standard Animation Presets

### 8 Core Presets

| # | Name | CSS Class | JS Utility | Use Case |
|---|------|-----------|------------|----------|
| 1 | **fadeIn** | `.anim-fade-in` | `animateFadeIn()` | New content appearing (chat messages, list items) |
| 2 | **fadeOut** | `.anim-fade-out` | `animateFadeOut()` | Content disappearing (removing items, closing overlays) |
| 3 | **slideUp** | `.anim-slide-up` | `animateSlideUp()` | Content entering from below (modals, tooltips, notifications) |
| 4 | **slideDown** | `.anim-slide-down` | `animateSlideDown()` | Content entering from above (dropdowns, expandable headers) |
| 5 | **scaleIn** | `.anim-scale-in` | `animateScaleIn()` | Small elements appearing (badges, buttons, popovers) |
| 6 | **collapse** | `.anim-collapse` | `animateCollapse()` | Collapsing sections (sidebar sections, accordions) |
| 7 | **expand** | `.anim-expand` | `animateExpand()` | Expanding sections (detail panels, accordions) |
| 8 | **bounce** | `.anim-bounce` | `animateBounce()` | Attention-grabbing feedback (notification badge, success state) |

### Additional Utility Presets

| Name | CSS Class | Use Case |
|------|-----------|----------|
| **skeletonPulse** | `.anim-skeleton-pulse` | Skeleton loading shimmer |
| **toastEnter** | `.anim-toast-enter` | Toast notification sliding in from bottom-right |
| **toastExit** | `.anim-toast-exit` | Toast notification fading out |
| **spin** | `.anim-spin` | Loading spinners |

---

## P0.9.2 Precise Parameters

### fadeIn

```css
.anim-fade-in {
  animation: fadeIn 200ms ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 200ms |
| Easing | `ease-out` (cubic-bezier(0, 0, 0.58, 1)) |
| Start state | `opacity: 0` |
| End state | `opacity: 1` |
| Fill mode | `forwards` |

**JS API**:
```typescript
animateFadeIn(element: HTMLElement, options?: { duration?: number }): Animation
```

---

### fadeOut

```css
.anim-fade-out {
  animation: fadeOut 200ms ease-in forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 200ms |
| Easing | `ease-in` (cubic-bezier(0.42, 0, 1, 1)) |
| Start state | `opacity: 1` |
| End state | `opacity: 0` |
| Fill mode | `forwards` |

**JS API**:
```typescript
animateFadeOut(element: HTMLElement, options?: { duration?: number }): Animation
```

**Note**: After fadeOut completes, the element SHOULD be removed from the DOM or set to `display: none` via a callback.

---

### slideUp

```css
.anim-slide-up {
  animation: slideUp 250ms ease-out forwards;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 250ms |
| Easing | `ease-out` (cubic-bezier(0, 0, 0.58, 1)) |
| Start state | `opacity: 0; transform: translateY(8px)` |
| End state | `opacity: 1; transform: translateY(0)` |
| Fill mode | `forwards` |

**JS API**:
```typescript
animateSlideUp(element: HTMLElement, options?: { duration?: number; distance?: number }): Animation
```

---

### slideDown

```css
.anim-slide-down {
  animation: slideDown 250ms ease-out forwards;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 250ms |
| Easing | `ease-out` (cubic-bezier(0, 0, 0.58, 1)) |
| Start state | `opacity: 0; transform: translateY(-8px)` |
| End state | `opacity: 1; transform: translateY(0)` |
| Fill mode | `forwards` |

**JS API**:
```typescript
animateSlideDown(element: HTMLElement, options?: { duration?: number; distance?: number }): Animation
```

---

### scaleIn

```css
.anim-scale-in {
  animation: scaleIn 150ms ease-out forwards;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 150ms |
| Easing | `ease-out` (cubic-bezier(0, 0, 0.58, 1)) |
| Start state | `opacity: 0; transform: scale(0.95)` |
| End state | `opacity: 1; transform: scale(1)` |
| Fill mode | `forwards` |

**JS API**:
```typescript
animateScaleIn(element: HTMLElement, options?: { duration?: number; fromScale?: number }): Animation
```

---

### collapse

```css
.anim-collapse {
  overflow: hidden;
  animation: collapse 300ms ease-in-out forwards;
}

@keyframes collapse {
  from {
    max-height: var(--anim-content-height, 500px);
    opacity: 1;
  }
  to {
    max-height: 0;
    opacity: 0;
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 300ms |
| Easing | `ease-in-out` (cubic-bezier(0.42, 0, 0.58, 1)) |
| Start state | `max-height: <content-height>; opacity: 1` |
| End state | `max-height: 0; opacity: 0` |
| Fill mode | `forwards` |

**Implementation note**: `--anim-content-height` is set via JS before animation starts:
```typescript
animateCollapse(element: HTMLElement): Animation {
  element.style.setProperty('--anim-content-height', `${element.scrollHeight}px`);
  // Force reflow
  element.offsetHeight;
  return element.animate(/* ... */);
}
```

**JS API**:
```typescript
animateCollapse(element: HTMLElement, options?: { duration?: number }): Animation
```

---

### expand

```css
.anim-expand {
  overflow: hidden;
  animation: expand 300ms ease-in-out forwards;
}

@keyframes expand {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: var(--anim-content-height, 500px);
    opacity: 1;
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 300ms |
| Easing | `ease-in-out` (cubic-bezier(0.42, 0, 0.58, 1)) |
| Start state | `max-height: 0; opacity: 0` |
| End state | `max-height: <content-height>; opacity: 1` |
| Fill mode | `forwards` |

**Implementation note**: Same `--anim-content-height` approach as collapse.

**JS API**:
```typescript
animateExpand(element: HTMLElement, options?: { duration?: number }): Animation
```

---

### bounce

```css
.anim-bounce {
  animation: bounce 500ms cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
}

@keyframes bounce {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.15);
  }
  50% {
    transform: scale(0.95);
  }
  75% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 500ms |
| Easing | `cubic-bezier(0.36, 0.07, 0.19, 0.97)` |
| Keyframes | 1.0 → 1.15 → 0.95 → 1.05 → 1.0 |
| Fill mode | `forwards` |

**JS API**:
```typescript
animateBounce(element: HTMLElement, options?: { duration?: number }): Animation
```

---

### Utility Presets Parameters

#### skeletonPulse

```css
.anim-skeleton-pulse {
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

@keyframes skeletonPulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 1.5s |
| Easing | `ease-in-out` |
| Iteration | `infinite` |
| Opacity range | 0.4 → 1.0 → 0.4 |

#### toastEnter

```css
.anim-toast-enter {
  animation: toastEnter 300ms cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
}

@keyframes toastEnter {
  from {
    opacity: 0;
    transform: translateY(100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 300ms |
| Easing | `cubic-bezier(0.21, 1.02, 0.73, 1)` (slight overshoot) |
| Start state | `opacity: 0; transform: translateY(100%) scale(0.95)` |
| End state | `opacity: 1; transform: translateY(0) scale(1)` |

#### toastExit

```css
.anim-toast-exit {
  animation: toastExit 200ms ease-in forwards;
}

@keyframes toastExit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 200ms |
| Easing | `ease-in` |
| Start state | `opacity: 1; transform: translateY(0)` |
| End state | `opacity: 0; transform: translateY(100%)` |

#### spin

```css
.anim-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

| Parameter | Value |
|-----------|-------|
| Duration | 1s |
| Easing | `linear` |
| Iteration | `infinite` |

---

## P0.9.3 prefers-reduced-motion Fallback

### Global Override Rule

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

This global rule ensures ALL animations are reduced to instant state changes when the user has `prefers-reduced-motion: reduce` enabled in their OS settings.

### Per-Preset Fallback Behavior

| Preset | Normal Behavior | Reduced Motion Fallback |
|--------|----------------|------------------------|
| fadeIn | Opacity 0→1 over 200ms | Instant `opacity: 1` |
| fadeOut | Opacity 1→0 over 200ms | Instant `opacity: 0` + remove |
| slideUp | translateY(8px)→0 over 250ms | Instant position, `opacity: 1` |
| slideDown | translateY(-8px)→0 over 250ms | Instant position, `opacity: 1` |
| scaleIn | scale(0.95)→1 over 150ms | Instant `scale(1)`, `opacity: 1` |
| collapse | max-height→0 over 300ms | Instant `max-height: 0; display: none` |
| expand | 0→max-height over 300ms | Instant `max-height: auto; opacity: 1` |
| bounce | Scale bounce over 500ms | No animation (element stays at scale 1) |
| skeletonPulse | Opacity pulse 1.5s infinite | Static `opacity: 0.7` (static placeholder) |
| toastEnter | Slide+scale 300ms | Instant appearance at final position |
| toastExit | Slide+fade 200ms | Instant disappearance |
| spin | Rotate 1s infinite | Replace spinner with static "Loading..." text |

### JS Detection Utility

```typescript
// src/lib/hooks/use-reduced-motion.ts
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

### Animation Utility with Reduced Motion Support

All JS animation utilities SHALL check for reduced motion preference:

```typescript
// src/lib/animation/index.ts
import { useReducedMotion } from '../hooks/use-reduced-motion';

export function createAnimator(element: HTMLElement) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    fadeIn: (options?: { duration?: number }) => {
      if (prefersReducedMotion) {
        element.style.opacity = '1';
        return null;
      }
      return element.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: options?.duration ?? 200, easing: 'ease-out', fill: 'forwards' }
      );
    },
    fadeOut: (options?: { duration?: number }) => {
      if (prefersReducedMotion) {
        element.style.opacity = '0';
        return null;
      }
      return element.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: options?.duration ?? 200, easing: 'ease-in', fill: 'forwards' }
      );
    },
    // ... other presets follow the same pattern
  };
}
```

### Chat Auto-Scroll Fallback

When reduced motion is enabled, the auto-scroll behavior in the chat view SHALL be replaced:

- **Normal**: Smooth scroll to bottom on new message
- **Reduced motion**: Show a "↓ N new messages" floating indicator; user clicks to jump to bottom (instant scroll)

---

## File Structure

```
src/
├── styles/
│   └── animations.css                # All @keyframes + CSS classes + reduced-motion override
├── lib/
│   ├── animation/
│   │   ├── index.ts                  # createAnimator() factory + all preset functions
│   │   └── types.ts                  # AnimationPreset type, AnimationOptions interface
│   └── hooks/
│       └── use-reduced-motion.ts     # React hook for detecting reduced motion preference
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| Core presets | 8: fadeIn, fadeOut, slideUp, slideDown, scaleIn, collapse, expand, bounce |
| Utility presets | 4: skeletonPulse, toastEnter, toastExit, spin |
| Duration range | 150ms (scaleIn) to 500ms (bounce) |
| Easing functions | ease-out (most), ease-in (exits), ease-in-out (expand/collapse), cubic-bezier (bounce, toastEnter) |
| CSS classes | `.anim-<name>` naming convention |
| JS API | `animate<Preset>(element, options?)` functions returning `Animation` |
| Reduced motion | Global CSS override (0.01ms duration) + JS-level checks in utilities |
| Chat scroll | Replaced with "N new messages" indicator when reduced motion is active |
