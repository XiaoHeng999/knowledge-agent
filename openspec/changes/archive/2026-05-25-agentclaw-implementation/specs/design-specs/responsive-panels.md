# Responsive Panel Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: P0.14.1 (Content Type Min Widths), P0.14.2 (Diff Preview Modal Evaluation), P0.14.3 (Panel Drag Boundaries)
> Dependency: design-specs/spec.md (right panel density), accessibility/interaction-model.md (focus management)
> Related: electron-scaffold/spec.md (window sizing), cross-platform/spec.md (platform behavior)

---

## P0.14.1 Content Type Minimum Widths

### Right Panel Content Types

The right panel renders different content depending on the user's context. Each content type has specific minimum width requirements to remain usable.

| Content Type | Min Width | Triggered By | Reason |
|-------------|-----------|-------------|--------|
| **Diff Preview** | 400px | Agent write review (version control) | Side-by-side diff requires horizontal space; line numbers + old/new columns need at least 200px each |
| **Knowledge Node Detail** | 320px | Click knowledge card in list or graph | Markdown content + metadata + comprehension indicator need comfortable reading width |
| **Event Detail** | 280px | Click timeline event | Date + title + description + linked knowledge nodes |
| **Inbox Item Detail** | 280px | Click inbox card | Source info + AI summary + actions |
| **Domain Overview** | 280px | Domain settings panel | Config fields, model selections, stats |
| **Settings Section** | 320px | Settings page detail | Form inputs, toggle lists, model tables |
| **Source Detail** | 280px | Click source link in knowledge node | URL + title + fetched content preview |

### Panel Width Behavior by Content Type

```
Panel closed (width: 0)
    │
    ├─ Content type = Diff Preview → opens at min 400px
    │
    ├─ Content type = Knowledge/Settings → opens at min 320px
    │
    └─ Content type = Event/Inbox/Domain/Source → opens at min 280px
```

### Dynamic Width Calculation

```typescript
function getDefaultPanelWidth(contentType: PanelContentType): number {
  const minWidths: Record<PanelContentType, number> = {
    'diff-preview': 400,
    'knowledge-detail': 320,
    'event-detail': 280,
    'inbox-detail': 280,
    'domain-overview': 280,
    'settings-section': 320,
    'source-detail': 280,
  };

  // If user has a saved width for this content type, use it (clamped to min)
  const saved = getSavedPanelWidth(contentType);
  return Math.max(minWidths[contentType], saved ?? minWidths[contentType]);
}
```

### Content Overflow Handling

When the panel is at minimum width and content overflows:

| Overflow Type | Handling |
|--------------|----------|
| Text (descriptions, markdown) | Word-wrap, never truncate |
| Diff side-by-side | Switch to unified diff view below 400px (single column) |
| Tables (metadata, sources) | Horizontal scroll within panel content area |
| Images/previews | Scale down to fit, max-width: 100% |
| Code blocks | Horizontal scroll within code block |

---

## P0.14.2 Diff Preview: Panel vs Modal Evaluation

### Option A: Right Panel (Current Design)

The diff preview renders inside the right panel, like other content types.

#### Advantages

| Pro | Detail |
|-----|--------|
| **Spatial context** | User sees the diff alongside the conversation/knowledge list without losing their place |
| **Consistent UX** | Same interaction pattern as all other detail views — no modal-specific behavior to learn |
| **Multi-tasking** | Can reference the diff while typing a message or browsing knowledge |
| **Keyboard flow** | No focus trap — user can Tab between panel and main content naturally |

#### Disadvantages

| Con | Detail |
|-----|--------|
| **Width constraint** | Panel max 380px (comfortable) / 320px (compact) is tight for side-by-side diff |
| **Scroll nesting** | Panel scroll + diff scroll creates double-scroll-wheel confusion |
| **Vertical space** | Long diffs require excessive scrolling in a panel |

### Option B: Modal Overlay

The diff preview opens as a centered modal overlay above the main content.

#### Advantages

| Pro | Detail |
|-----|--------|
| **Full width** | Modal can use 80% viewport width (e.g., 1200px on a 1440px screen), giving 600px per diff column |
| **Dedicated focus** | User enters a "review mode" with no distractions |
| **More vertical space** | Full viewport height minus header/footer |

#### Disadvantages

| Con | Detail |
|-----|--------|
| **Context loss** | Covers the conversation, losing spatial reference to the discussion |
| **Focus trap required** | Must implement focus trap (adds complexity) |
| **Workflow interruption** | Modal is blocking — user must accept/reject before continuing |
| **Inconsistency** | Only diff uses modal; all other content types use panel |

### Decision: Hybrid Approach

**Recommendation**: Use the **right panel for quick review** + **"Expand" button to open full modal** for detailed review.

| Aspect | Specification |
|--------|--------------|
| Default behavior | Diff preview opens in right panel in **unified diff** format (single column, additions green, deletions red) |
| Panel diff mode | Unified diff (no side-by-side), minimum 400px panel width |
| "Expand" button | In panel header, opens full modal with **side-by-side diff** view |
| Modal close | Escape or "Collapse" button returns to panel view with unified diff |
| Accept/Reject actions | Available in both panel and modal views |

### Hybrid UI Flow

```
Agent writes knowledge node
    │
    └─ Right panel opens with unified diff (400px min)
        │
        ├─ [Accept] → Apply changes, close panel
        ├─ [Reject] → Discard changes, close panel
        ├─ [Edit] → Inline edit mode in panel
        │
        └─ [⤢ Expand] → Full modal (side-by-side diff)
                          │
                          ├─ [Accept] → Apply, close modal + panel
                          ├─ [Reject] → Discard, close modal + panel
                          └─ [⤡ Collapse] → Return to panel view
```

### ARIA for Expand/Collapse

```html
<!-- In panel -->
<button aria-label="Expand diff to full-screen view" title="Open in full view">
  ⤢ Expand
</button>

<!-- In modal -->
<button aria-label="Collapse diff to panel view" title="Return to panel view">
  ⤡ Collapse
</button>
```

---

## P0.14.3 Panel Drag Boundaries

### Layout Structure

```
┌──────────┬────────────────────────────┬──────────────┐
│          │                            │              │
│ Sidebar  │     Main Content Area      │ Right Panel  │
│ 200px    │     (flexible)             │  0-400px     │
│ (fixed)  │     min 640px              │  (draggable) │
│          │                            │              │
└──────────┴────────────────────────────┴──────────────┘
```

### Width Constraints

| Component | Default Width | Min Width | Max Width | Resizable |
|-----------|-------------|-----------|-----------|-----------|
| Sidebar | 200px | 180px (at < 1200px) | 240px | No (auto-adjusts by breakpoint) |
| Main Content | Remaining | **640px** | Unlimited | No (fills remaining space) |
| Right Panel | Content-dependent | 280px-400px (by type) | 400px | Yes (drag handle) |

### Drag Handle Specification

| Element | Specification |
|---------|--------------|
| Position | Left edge of right panel (vertical strip) |
| Width | 4px visible handle area, 12px hit area (4px visible + 4px on each side) |
| Cursor | `col-resize` when hovering handle |
| Visual indicator | 2px × 24px centered dash, `--border-default` → `--accent` on hover |
| Active drag state | Handle → `--accent`, cursor `col-resize` globally (even outside handle) |

### Drag Behavior Rules

| Rule | Detail |
|------|--------|
| **Main content min 640px** | Panel cannot drag wider than `viewportWidth - sidebarWidth - 640` |
| **Panel content min width** | Panel cannot drag narrower than the content type's minimum width |
| **Snap points** | None — panel width is fully continuous within bounds |
| **Animation** | None during drag (immediate feedback); 200ms ease-out on programmatic resize |

### Drag Boundary Calculation

```typescript
interface DragBoundaries {
  /** Maximum panel width = viewport - sidebar - mainContentMinWidth */
  maxPanelWidth: number;
  /** Minimum panel width based on current content type */
  minPanelWidth: number;
}

function calculateDragBoundaries(
  viewportWidth: number,
  sidebarWidth: number,
  contentType: PanelContentType,
  mainContentMinWidth: number = 640,
): DragBoundaries {
  const maxPanelWidth = viewportWidth - sidebarWidth - mainContentMinWidth;
  const minPanelWidth = getContentMinWidth(contentType);

  return {
    maxPanelWidth: Math.max(maxPanelWidth, minPanelWidth),
    minPanelWidth,
  };
}
```

### Viewport Width Scenarios

| Viewport Width | Sidebar | Main Content | Panel Behavior |
|---------------|---------|-------------|----------------|
| ≥ 1200px (full) | 200px | ≥ 640px | Panel 0-400px, fully draggable |
| 900-1200px (medium) | 180px | ≥ 640px | Panel 0-380px, max reduced |
| < 900px (compact) | Collapsed (icon only, 48px) | ≥ 640px | Panel becomes overlay |

### Below Minimum Viewport ( < 1024px )

If the viewport is narrower than `sidebarMin + mainContentMin + panelMin`:

```
1024px = 180px (sidebar) + 640px (main) + 204px (panel minimum for basic content)
```

| Viewport | Behavior |
|----------|----------|
| ≥ 1024px | All three regions visible, panel draggable |
| 900-1024px | Sidebar auto-collapses to icon-only (48px), main content + panel share space |
| 768-900px | Sidebar collapsed, panel opens as **overlay** covering right 40% of main content |
| < 768px | Not supported (minimum window size enforced at 1024×768) |

### Panel as Overlay Mode (< 900px)

When the panel renders as an overlay:

| Aspect | Specification |
|--------|--------------|
| Width | 40% of viewport width, min 280px |
| Position | Right-aligned, covers main content |
| Background | `--bg-primary` with `--shadow-xl` |
| Dismiss | Click outside panel, Escape key, or close button |
| Animation | `.anim-slide-in-right` (200ms) |
| Focus | Not trapped — user can Tab between panel and visible main content |

### Drag Persistence

```typescript
interface PanelPreferences {
  /** Per content type saved widths */
  widthsByType: Partial<Record<PanelContentType, number>>;
  /** Whether panel is open */
  isOpen: boolean;
  /** Density mode */
  density: 'comfortable' | 'compact';
}
```

- Saved widths are persisted to user settings (localStorage / SQLite)
- On panel open for a content type, the saved width is restored (clamped to current min/max)
- If viewport changes (window resize), saved width is clamped to new boundaries

---

## Component Structure

```
src/components/layout/
├── detail-panel.tsx             # Right panel container with drag handle
├── panel-content-router.tsx     # Routes content type to appropriate panel view
└── panel-drag-handle.tsx        # Drag handle component

src/components/diff/
├── diff-viewer.tsx              # Unified diff (panel mode)
├── diff-modal.tsx               # Side-by-side diff (modal mode)
└── diff-panel-header.tsx        # Header with expand/collapse toggle

src/lib/hooks/
├── use-panel-drag.ts            # Drag boundary calculation + resize logic
├── use-panel-content.ts         # Content type routing + min width logic
└── use-viewport-layout.ts       # Viewport breakpoint detection
```

### Key Types

```typescript
type PanelContentType =
  | 'diff-preview'
  | 'knowledge-detail'
  | 'event-detail'
  | 'inbox-detail'
  | 'domain-overview'
  | 'settings-section'
  | 'source-detail';

type PanelMode = 'inline' | 'overlay'; // inline = side panel, overlay = covers content

interface PanelState {
  isOpen: boolean;
  contentType: PanelContentType | null;
  width: number;
  mode: PanelMode;
  density: 'comfortable' | 'compact';
}
```

---

## Validation

- [ ] 7 content types have defined minimum widths
- [ ] Diff preview at 400px minimum with unified/side-by-side modes
- [ ] Hybrid panel + modal approach evaluated and decided
- [ ] Expand/collapse button between panel and modal diff views
- [ ] Main content minimum 640px enforced
- [ ] Drag handle with 4px visible / 12px hit area
- [ ] Drag boundaries prevent panel from violating main content min width
- [ ] Overlay mode for viewports < 900px
- [ ] Minimum window size 1024×768
- [ ] Panel widths persisted per content type
- [ ] ARIA attributes for expand/collapse actions
- [ ] All ARIA and focus management aligned with interaction-model.md
