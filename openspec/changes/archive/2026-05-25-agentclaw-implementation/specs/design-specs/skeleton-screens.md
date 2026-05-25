# Skeleton Screen Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: P0.10.1 (9 View Skeleton Layouts), P0.10.2 (Flash Threshold 100ms), P0.10.3 (Timeout State > 10s)
> Dependency: None
> Related: animation-presets.md (skeletonPulse animation)

---

## P0.10.1 Skeleton Layouts for 9 Views

### General Rules

- All skeletons use `--background-tertiary` for primary shapes and `--surface` for secondary shapes
- Animation: `.anim-skeleton-pulse` (opacity 0.4 → 1.0 → 0.4, 1.5s ease-in-out infinite)
- Border radius: 6px for card shapes, 4px for inline shapes, 50% for circles
- Transition from skeleton to content: `.anim-fade-in` (200ms ease-out)
- When `prefers-reduced-motion: reduce`: static placeholder at `opacity: 0.7`, no pulse animation

### Common Skeleton Primitive Types

| Primitive | Dimensions | Border Radius | Usage |
|-----------|-----------|---------------|-------|
| `circle` | 32×32px | 50% | Avatars, icons, domain color dots |
| `circle-lg` | 48×48px | 50% | Large avatars, stat icons |
| `line` | width varies × 12px | 4px | Text lines, labels |
| `line-short` | 40% width × 12px | 4px | Short text (dates, tags) |
| `line-heading` | 60% width × 20px | 4px | Headings, titles |
| `card` | 100% width × 80px | 6px | Cards, list items |
| `card-lg` | 100% width × 120px | 6px | Large cards |
| `pill` | 64px × 24px | 12px | Tags, badges |
| `rect` | 100% width × 200px | 6px | Image/preview placeholders |
| `metric` | 80px × 40px | 4px | Stat numbers |

---

### 1. Dashboard Skeleton

```
┌──────────────────────────────────────────────────┐
│  ████████████  (heading, 20px)                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─ Row 1: 60/40 split ────────────────────────┐ │
│  │                                              │ │
│  │  ┌── Today Overview (60%) ──┐ ┌── Inbox ──┐ │ │
│  │  │ ██████████ (metric)      │ │ ███ (3)    │ │ │
│  │  │                          │ │            │ │ │
│  │  │ ██████████████ (stat)    │ │ ██████     │ │ │
│  │  │ ██████████████ (stat)    │ │ ██████     │ │ │
│  │  │ ██████████████ (stat)    │ │ ██████     │ │ │
│  │  │                          │ │            │ │ │
│  │  └──────────────────────────┘ └────────────┘ │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Domain Activity ────────────────────────────┐ │
│  │                                              │ │
│  │  ●  ████████████  ████████████████           │ │
│  │  ●  ████████████  ████████████████           │ │
│  │  ●  ████████████  ████████████████           │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Recent Decisions ──────────────────────────┐ │
│  │  ████████████████████  ██████                │ │
│  │  ████████████████████  ██████                │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Heading: 1 × `line-heading`
- Row 1: 2 cards (60%/40% split)
  - Today Overview: 1 × `metric` + 3 × `line`
  - Inbox Summary: 1 × `circle` + 3 × `card` (compact, 48px height)
- Domain Activity: 3 rows × (`circle` + `line` + `line-short`)
- Recent Decisions: 2 × (`line` + `line-short`)

**Total skeleton elements**: ~25 shapes

---

### 2. Knowledge List Skeleton

```
┌──────────────────────────────────────────────────┐
│  ████████████  [████|████]  [███]  [████]        │
├──────────────────────────────────────────────────┤
│                                                   │
│  [███████ ▼] [██████ ▼] [██████ ▼]               │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  ████████████████████        [██████]       │  │
│  │  ●●○○○  ██████  |  ████  |  ██████        │  │
│  │  ███████████████████████████████            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  ████████████████████        [██████]       │  │
│  │  ●●○○○  ██████  |  ████  |  ██████        │  │
│  │  ███████████████████████████████            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  ████████████████████        [██████]       │  │
│  │  ●●○○○  ██████  |  ████  |  ██████        │  │
│  │  ███████████████████████████████            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  ████████████████████        [██████]       │  │
│  │  ●●○○○  ██████  |  ████  |  ██████        │  │
│  │  ███████████████████████████████            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Header: 1 × `line-heading` + SegmentedControl placeholder (2 pills) + `circle` + `pill`
- Filters row: 3 × `pill` (dropdown placeholders)
- 4 × Knowledge Card: each containing
  - `line-heading` (title) + `pill` (type badge) — right-aligned
  - 5 × `circle` (comprehension dots) + `line-short` + separator + `line-short` + separator + `line-short`
  - `line` (description) at ~80% width

**Total skeleton elements**: ~40 shapes

---

### 3. Timeline Skeleton

```
┌──────────────────────────────────────────────────┐
│  ████████████               [████ ▼]  [███]      │
├──────────────────────────────────────────────────┤
│                                                   │
│  ████████  (month heading)                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                   │
│  ●─ ██████  ████████████████████     [██]         │
│  │  ████████████████                             │
│  │                                               │
│  ●─ ██████  ████████████████████     [██]         │
│  │  ████████████████                             │
│  │                                               │
│  ●─ ██████  ████████████████████     [██]         │
│  │  ████████████████                             │
│  │                                               │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                   │
│  ◌─ ██████  ████████████████████  ████████        │
│  │  ████████████████                             │
│  │                                               │
│  ◌─ ██████  ████████████████████  ████████        │
│     ████████████████                             │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Header: 1 × `line-heading` + `pill` (period selector) + `circle` (search)
- Month heading: 1 × `line-short`
- Separator line (solid for events, dashed for predictions)
- 3 × Event Card: each containing
  - `circle` (dot marker) + `line-short` (date) + `line` (title) + `pill` (importance)
  - `line-short` (source info)
- 2 × Prediction Card: each containing
  - `circle` (hollow marker, dashed border) + `line-short` + `line` + `line-short` (confidence)
  - `line-short` (basis)

**Total skeleton elements**: ~25 shapes

---

### 4. Research Dashboard Skeleton

```
┌──────────────────────────────────────────────────┐
│  ████████████                        [████████]   │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─ Today's Research ─────────────────────────┐  │
│  │                                             │  │
│  │  [██]  ████████████  ██████  |  ███  | ██   │  │
│  │  [██]  ████████████  ██████  |  ███  | ██   │  │
│  │  [██]  ████████████  ██████  |  ███  | ██   │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ Latest Findings ──────────────────────────┐  │
│  │                                             │  │
│  │  ●  ████████████                            │  │
│  │  ├── ████████████████████                   │  │
│  │  ├── ████████████████████                   │  │
│  │  └── [███████████ ...]                      │  │
│  │                                             │  │
│  │  ●  ████████████                            │  │
│  │  ├── ████████████████████                   │  │
│  │  └── [███████████ ...]                      │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ Cost Summary ─────────────────────────────┐  │
│  │  ██████  |  ██████  |  ██████              │  │
│  │  ████████████████████████████               │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Header: 1 × `line-heading` + `pill` (trigger button)
- Today's Research: 3 × (`circle` + `line` + `line-short` + separator + `line-short` + separator + `line-short`)
- Latest Findings: 2 groups × (`circle` + `line`) + 2-3 × `line` (findings) + `line-short`
- Cost Summary: 3 × `metric` + `line` (model info)

**Total skeleton elements**: ~35 shapes

---

### 5. Expert Chat Skeleton

```
┌──────────────────────────────────────────────────┐
│  ████████████                  [██████████ ▼]     │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │                                              │  │
│  │  ●  ████████████████████████████  (AI msg)  │  │
│  │     ████████████████████                    │  │
│  │                                              │  │
│  │  ████████████████████  ██████  (User msg)   │  │
│  │  ████████████████████                       │  │
│  │                                              │  │
│  │  ●  ████████████████████████  (AI msg)     │  │
│  │     ████████████████████                    │  │
│  │     ████████████████████                    │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  ████████████████████████████     [▶]       │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Header: 1 × `line-heading` + `pill` (model switcher)
- 3 × Message Pairs (user + AI):
  - AI message: `circle` (avatar) + 2 × `line` (80% width) + 1 × `line` (60% width)
  - User message: 2 × `line` (right-aligned, using `--surface` token to differentiate)
- Input area: 1 × `rect` (height: 44px, border-radius: 8px) + `circle` (send button)

**Total skeleton elements**: ~25 shapes

---

### 6. Inbox Skeleton

```
┌──────────────────────────────────────────────────┐
│  ████████ (3)                 [██████] [████]     │
├──────────────────────────────────────────────────┤
│                                                   │
│  [████████] [████████] [████████]  (filter tabs) │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  [██]  ████████████████████████             │  │
│  │  ████████████████████████████████           │  │
│  │  ██████████                                 │  │
│  │  [██████ ▼]  [██████]  [███]               │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  [██]  ████████████████████████             │  │
│  │  ████████████████████████████████           │  │
│  │  ██████████                                 │  │
│  │  [██████ ▼]  [██████]  [███]               │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  [██]  ████████████████████████             │  │
│  │  ████████████████████████████████           │  │
│  │  ██████████                                 │  │
│  │  [██████ ▼]  [██████]  [███]               │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  [██]  ████████████████████████             │  │
│  │  ████████████████████████████████           │  │
│  │  ██████████                                 │  │
│  │  [██████ ▼]  [██████]  [███]               │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │  [██]  ████████████████████████             │  │
│  │  ████████████████████████████████           │  │
│  │  ██████████                                 │  │
│  │  [██████ ▼]  [██████]  [███]               │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Header: 1 × `line-heading` + `line-short` (count badge) + 2 × `pill`
- Filter tabs: 3 × `pill`
- 5 × Inbox Item Card: each containing
  - `circle` (source type icon) + `line-heading` (title)
  - `line` + `line` (AI summary, ~90% + ~70% width)
  - `line-short` (timestamp)
  - 3 × `pill` (actions: assign domain, view source, discard)

**Total skeleton elements**: ~55 shapes

---

### 7. Domain Overview Skeleton

```
┌──────────────────────────────────────────────────┐
│  ●  ████████████                  [████] [████]   │
├──────────────────────────────────────────────────┤
│                                                   │
│  ████████████████████████████████ (description)  │
│  ████████████████████  |  ████████████████       │
│  ██████████  |  ████████████████                  │
│                                                   │
│  ┌─── [████] [████] [████] [████] [████] ───────┐│
│  │                                               ││
│  │  (Content area matches active tab skeleton)   ││
│  │                                               ││
│  └───────────────────────────────────────────────┘│
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Domain header: 1 × `circle` (domain color dot) + `line-heading` + 2 × `pill` (edit, manage)
- Info section: 1 × `line` (description, ~90%) + 2 × `line-short` (model info) + 2 × `line-short` (stats)
- Tab bar: 5 × `pill` (tab placeholders)
- Content area: delegates to the active tab's skeleton (default: Knowledge List skeleton)

**Total skeleton elements**: ~12 shapes (header) + delegated content skeleton

---

### 8. Knowledge Graph Skeleton

```
┌──────────────────────────────────────────────────┐
│  ████████████  [████|████]  [███]  [████ ▼]      │
├──────────────────────────────────────────────────┤
│                                                   │
│          ┌──────────┐                             │
│          │ ████████ │                             │
│          │ ●●●●○    │                             │
│          └──┬───┬───┘                             │
│             │   │                                  │
│      ┌──────┘   └──────┐                          │
│      ▼                 ▼                          │
│  ┌────────┐       ┌──────────┐                    │
│  │████████│       │██████████│                    │
│  │●●●○○   │       │●●○○○     │                    │
│  └────────┘       └──────────┘                    │
│                                                   │
│          ┌──────────┐                             │
│          │██████████│                             │
│          │●●●●○     │                             │
│          └──────────┘                             │
│                                                   │
│  ┌─ Graph Legend ─────────────────────────────┐  │
│  │  ██████  ██████  ██████  ██████  ██████    │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌── Controls ────────────────────────────────┐  │
│  │  [+] [-] [⟲]  [████] [████] [████]        │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Header: 1 × `line-heading` + SegmentedControl + `circle` (search) + `pill` (filter)
- 5 × Graph Nodes: each containing
  - `card` (48×48px or 64×64px, varying sizes to indicate different node weights)
  - 5 × `circle` (comprehension dots, 4px each) inside
  - Connection lines: thin `--background-tertiary` lines between nodes (CSS-drawn)
- Legend bar: 5 × `circle` + `line-short` pairs
- Control bar: 3 × `circle` (zoom/fit) + 3 × `pill` (layout options)

**Total skeleton elements**: ~30 shapes

**Note**: Graph skeleton is a simplified visual representation. Actual graph rendering should show a few static placeholder nodes with connection lines, not an animated force simulation.

---

### 9. Settings Skeleton

```
┌──────────────────────────────────────────────────┐
│  ████████████                                     │
│  [████████] [████████] [████] [████]              │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─ Section 1 ────────────────────────────────┐  │
│  │  ████████████████                           │  │
│  │  ████████████████████████████████           │  │
│  │  [████████████████████]  [████]             │  │
│  │                                             │  │
│  │  ████████████████                           │  │
│  │  ████████████████████████████████           │  │
│  │  [████████████████████]  [████]             │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ Section 2 ────────────────────────────────┐  │
│  │  ████████████████                           │  │
│  │  ████████████████████████████████           │  │
│  │  ████████████████████████████████           │  │
│  │  [████████]  [████████]  [████]             │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ Section 3 ────────────────────────────────┐  │
│  │  ████████████████                           │  │
│  │  ████████████████████████████████           │  │
│  │  ○  ████████████                            │  │
│  │  ○  ████████████                            │  │
│  │  ○  ████████████                            │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─ Section 4 ────────────────────────────────┐  │
│  │  ████████████████                           │  │
│  │  ████████████████████████████  [██]         │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Structure**:
- Header: 1 × `line-heading`
- Tab bar: 4 × `pill` (Models, Domains, General, About)
- 4 × Settings Sections: each containing
  - `line-heading` (section title)
  - `line` (description)
  - Varies by section type:
    - Input sections: `line` (input placeholder, full width) + `pill` (button)
    - List sections: 3 × (`circle` + `line`) + 3 × `pill` (action buttons)
    - Toggle sections: 3 × (`circle` + `line`) (radio/toggle placeholder)

**Total skeleton elements**: ~40 shapes

---

## P0.10.2 Flash Threshold (100ms)

### Definition

The **flash threshold** is the minimum loading duration that triggers skeleton display. If data loads in under 100ms, the skeleton is **not shown** and the user sees a direct render.

### Implementation

```typescript
// src/lib/hooks/use-skeleton.ts
interface UseSkeletonOptions {
  /** Flash threshold in ms. Default: 100 */
  threshold?: number;
}

function useSkeleton(isLoading: boolean, options?: UseSkeletonOptions): boolean {
  const threshold = options?.threshold ?? 100;
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSkeleton(true);
    }, threshold);

    return () => clearTimeout(timer);
  }, [isLoading, threshold]);

  return showSkeleton;
}
```

### Behavior Matrix

| Data Load Time | User Sees |
|---------------|-----------|
| < 100ms | Direct content render (no skeleton) |
| 100ms – 500ms | Skeleton appears → transitions to content via fadeIn |
| 500ms – 10s | Skeleton stays until data arrives |
| > 10s | Skeleton replaced by timeout state (see P0.10.3) |

### Per-View Threshold Override

Some views may warrant different thresholds:

| View | Threshold | Reason |
|------|-----------|--------|
| Dashboard | 100ms (default) | — |
| Knowledge List | 100ms (default) | — |
| Knowledge Graph | 200ms | D3 initialization is inherently slow; avoid flicker |
| Expert Chat | 100ms (default) | — |
| Settings | 50ms | Settings are local-only; fast load expected |
| All others | 100ms (default) | — |

---

## P0.10.3 Timeout State (> 10s)

### Definition

If a data request takes longer than 10 seconds, the skeleton is replaced by a **timeout state** that informs the user and offers recovery actions.

### Timeout UI Specification

```
┌──────────────────────────────────────────────────┐
│                                                   │
│                   ⏱                               │
│                                                   │
│          Taking longer than expected              │
│                                                   │
│   This is unusual. Your data might still be       │
│   loading, or something may have gone wrong.      │
│                                                   │
│          [ Try Again ]    [ Cancel ]              │
│                                                   │
│   Trying for 12s...                               │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Per-View Timeout Messages

| View | Headline | Description |
|------|----------|-------------|
| Dashboard | "Dashboard is taking longer than expected" | "Your overview data might still be loading. This can happen when the database is processing a large import." |
| Knowledge List | "Knowledge data is loading slowly" | "This might be due to a large knowledge base. Try filtering to a specific domain." |
| Knowledge Graph | "Graph rendering is taking a while" | "Large graphs with many nodes can take time. Consider switching to list view while waiting." |
| Expert Chat | "Chat is slow to respond" | "The AI model might be experiencing high load. Your message will be sent when ready." |
| Research Dashboard | "Research data is loading slowly" | "Research results might still be processing. Check the status bar for live progress." |
| Timeline | "Timeline events are loading slowly" | "This can happen when processing many time-based events. The data will appear shortly." |
| Inbox | "Inbox is loading slowly" | "Your inbox items are still being fetched. They'll appear here shortly." |
| Domain Overview | "Domain data is loading slowly" | "This domain's information is taking longer to load than expected." |
| Settings | "Settings are loading slowly" | "This is unusual — settings load from local storage. Try restarting the app." |

### Implementation

```typescript
// src/lib/hooks/use-skeleton.ts (extended)
const TIMEOUT_THRESHOLD = 10_000; // 10s

function useLoadingState(isLoading: boolean, options?: {
  flashThreshold?: number;
  timeoutThreshold?: number;
  timeoutMessages?: { headline: string; description: string };
}): {
  showSkeleton: boolean;
  isTimedOut: boolean;
} {
  const flashThreshold = options?.flashThreshold ?? 100;
  const timeoutThreshold = options?.timeoutThreshold ?? TIMEOUT_THRESHOLD;
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      setIsTimedOut(false);
      return;
    }

    const flashTimer = setTimeout(() => setShowSkeleton(true), flashThreshold);
    const timeoutTimer = setTimeout(() => setIsTimedOut(true), timeoutThreshold);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(timeoutTimer);
    };
  }, [isLoading, flashThreshold, timeoutThreshold]);

  return { showSkeleton: showSkeleton && !isTimedOut, isTimedOut };
}
```

### Timeout State Component

```typescript
// src/components/ui/loading-timeout.tsx
interface LoadingTimeoutProps {
  headline: string;
  description: string;
  onRetry: () => void;
  onCancel: () => void;
  /** Elapsed seconds display */
  elapsedSeconds: number;
}
```

### Actions

| Action | Behavior |
|--------|----------|
| **Try Again** | Cancels current request, triggers a new data fetch, resets timer |
| **Cancel** | Cancels the request entirely, returns to previous view or shows empty state |

### Timer Display

Below the actions, show elapsed time: `"Trying for 12s..."`, updating every second. This confirms the system is still alive and not frozen.

---

## Loading State Flow

```
Request Start
     │
     ├─ < 100ms → Direct content render
     │
     ├─ ≥ 100ms → Show skeleton (with pulse animation)
     │              │
     │              ├─ Data arrives → fadeIn content
     │              │
     │              └─ ≥ 10s → Show timeout state
     │                         │
     │                         ├─ "Try Again" → New request (restart flow)
     │                         └─ "Cancel" → Show empty state or previous view
     │
     └─ Error → Show error state (from P0.1 error specs)
```

---

## Component Structure

```
src/
├── components/
│   └── ui/
│       ├── skeleton.tsx          # Skeleton primitive components
│       ├── loading-timeout.tsx   # Timeout state component
│       └── empty-state.tsx       # Empty state (from P0.6.2)
├── lib/
│   └── hooks/
│       └── use-skeleton.ts       # useLoadingState hook
└── styles/
    └── animations.css            # skeletonPulse animation (from animation-presets.md)
```

### Skeleton Component API

```typescript
// src/components/ui/skeleton.tsx

// Base skeleton shape
function Skeleton({ className, width, height, radius }: SkeletonProps): JSX.Element;

// Preset shapes
function SkeletonCircle({ size }: { size?: number }): JSX.Element;       // 32×32 circle
function SkeletonLine({ width }: { width?: string }): JSX.Element;       // 12px height line
function SkeletonHeading({ width }: { width?: string }): JSX.Element;   // 20px height line
function SkeletonCard({ height }: { height?: number }): JSX.Element;     // Full-width card
function SkeletonPill({ width }: { width?: number }): JSX.Element;      // Pill shape

// View-level skeleton containers
function DashboardSkeleton(): JSX.Element;
function KnowledgeListSkeleton(): JSX.Element;
function KnowledgeGraphSkeleton(): JSX.Element;
function TimelineSkeleton(): JSX.Element;
function ResearchDashboardSkeleton(): JSX.Element;
function ExpertChatSkeleton(): JSX.Element;
function InboxSkeleton(): JSX.Element;
function DomainOverviewSkeleton(): JSX.Element;
function SettingsSkeleton(): JSX.Element;
```

---

## Validation

- [ ] 9 views have skeleton layout wireframes
- [ ] Each skeleton accurately reflects the real view's structure
- [ ] Flash threshold of 100ms defined with implementation
- [ ] Graph view has 200ms override threshold
- [ ] Timeout state at > 10s defined with per-view messages
- [ ] Try Again and Cancel actions specified
- [ ] Loading state flow diagram complete
- [ ] Component API and file structure defined
- [ ] prefers-reduced-motion: static placeholder at opacity 0.7
