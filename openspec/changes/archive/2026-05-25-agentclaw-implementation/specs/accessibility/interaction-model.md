# Accessibility Interaction Model Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: P0.11.1 (Keyboard Navigation), P0.11.2 (ARIA Spec Table), P0.11.3 (Focus Management), P0.11.4 (Color Contrast)
> Dependency: None
> Related: accessibility/spec.md (added requirements), design-specs/animation-presets.md (reduced motion)

---

## P0.11.1 Keyboard Navigation Flow

### Global Tab Order

The application follows a logical reading order (left-to-right, top-to-bottom):

```
1. Skip-to-content link (hidden, visible on Tab)
2. Title bar
   └─ Window controls (minimize, maximize, close)
3. Left Sidebar
   ├─ Search trigger button (Cmd+K)
   ├─ Inbox button (with badge)
   ├─ Domain tree
   │   ├─ Domain 1 (collapsible section toggle)
   │   │   ├─ Knowledge tab
   │   │   ├─ Timeline tab
   │   │   ├─ Research tab
   │   │   └─ Expert Chat tab
   │   ├─ Domain 2 ...
   │   └─ "New Domain" button
   ├─ Research Dashboard link
   └─ Settings link
4. Main Content Area
   ├─ Breadcrumb / view header
   ├─ Content-specific interactive elements (cards, buttons, inputs)
   └─ Pagination / "Load More" buttons
5. Right Panel (when open)
   ├─ Panel header (close button, density toggle)
   ├─ Panel content (detail, diff, edit form)
   └─ Panel actions (save, cancel, etc.)
6. Status Bar
   └─ Model info, cost, research status (non-interactive, focus skips)
```

### Skip Navigation Link

```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

- **Visible**: Only when focused (first Tab press in the app)
- **Position**: Absolute top-left, z-index above all content
- **Action**: Moves focus to `#main-content` landmark
- **Styling**: `background: var(--accent); color: var(--text-on-accent); padding: 8px 16px;`

### Keyboard Shortcuts Reference

| Shortcut | Context | Action |
|----------|---------|--------|
| `Tab` | Global | Move focus to next interactive element |
| `Shift+Tab` | Global | Move focus to previous interactive element |
| `Escape` | Modal/Panel open | Close modal or panel, return focus to trigger |
| `Escape` | Command Palette | Close palette, return focus |
| `Escape` | Sidebar expanded (>900px) | No action (sidebar stays) |
| `Cmd/Ctrl+K` | Global | Open command palette |
| `Cmd/Ctrl+1-9` | Global | Quick-switch to domain N |
| `Enter` | List item focused | Open detail/select item |
| `Space` | Button/toggle focused | Activate button/toggle |
| `↑/↓` | List/card navigation | Move selection up/down within list |
| `←/→` | Tab bar / segmented control | Switch active tab |
| `Home/End` | Scrollable list | Jump to first/last item |
| `Cmd/Ctrl+F` | Knowledge List, Chat | Focus search input in current view |
| `/` | Expert Chat input | Trigger slash command autocomplete |

### Escape Key Behavior

| Context | Escape Behavior |
|---------|----------------|
| Modal dialog open | Close modal → focus returns to trigger |
| Command palette open | Close palette → focus returns to trigger |
| Right panel open | Close panel → focus returns to main content |
| Dropdown open | Close dropdown → focus stays on trigger |
| Toast notification visible | Dismiss toast (no focus change) |
| Confirm dialog open | Close dialog (cancel action) → focus returns |
| Inline edit mode | Cancel edit → revert, focus stays on element |
| No overlay/modal | No action |

---

## P0.11.2 ARIA Specification Table

### Global Landmarks

| Region | HTML Element | ARIA Role | aria-label |
|--------|-------------|-----------|------------|
| Title bar | `<header>` | `banner` | "AgentClaw title bar" |
| Left sidebar | `<nav>` | `navigation` | "Domain navigation" |
| Main content | `<main>` | `main` | — (uses `aria-labelledby` with view heading) |
| Right panel | `<aside>` | `complementary` | "Detail panel" |
| Status bar | `<footer>` | `contentinfo` | "Application status" |

### Custom Components ARIA Map

#### Comprehension Indicator (0-5 dots)

```html
<div role="img" aria-label="Comprehension level: 4 out of 5">
  <span aria-hidden="true">●●●●○</span>
</div>
```

| Attribute | Value |
|-----------|-------|
| `role` | `img` |
| `aria-label` | `"Comprehension level: {N} out of 5"` |
| Visual dots | `aria-hidden="true"` (decorative) |

#### Domain Color Dot

```html
<span aria-hidden="true" class="domain-color-dot" style="background: #7C3AED" />
<!-- Accompanied by text label with domain name -->
```

| Attribute | Value |
|-----------|-------|
| `aria-hidden` | `true` (decorative, color info is in text) |

#### Sidebar Domain Tree

```html
<nav aria-label="Domain navigation">
  <button aria-expanded="true" aria-controls="domain-ai-ml">
    <span aria-hidden="true" class="domain-color-dot" />
    AI/ML
  </button>
  <ul id="domain-ai-ml" role="tree">
    <li role="treeitem" aria-selected="false">
      <a href="/domain/1/knowledge">Knowledge</a>
    </li>
    <li role="treeitem" aria-selected="true">
      <a href="/domain/1/chat" aria-current="page">Expert Chat</a>
    </li>
    ...
  </ul>
</nav>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Section toggle | `aria-expanded` | `true` / `false` |
| Section toggle | `aria-controls` | ID of collapsible section |
| Collapsible section | `id` | Matching `aria-controls` |
| Tree items | `role="treeitem"` | — |
| Active page | `aria-current` | `page` |
| Selected item | `aria-selected` | `true` / `false` |

#### Command Palette

```html
<dialog role="dialog" aria-label="Command palette" aria-modal="true">
  <input role="combobox" aria-expanded="true" aria-controls="cmd-results"
         aria-autocomplete="list" aria-activedescendant="cmd-item-0"
         placeholder="Search commands, knowledge, domains..." />
  <ul id="cmd-results" role="listbox">
    <li role="option" id="cmd-item-0" aria-selected="true">
      /daily — Today's research summary
    </li>
    <li role="option" id="cmd-item-1" aria-selected="false">
      Transformer — Knowledge node (AI/ML)
    </li>
  </ul>
</dialog>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Dialog | `role="dialog"` | — |
| Dialog | `aria-modal="true"` | — |
| Dialog | `aria-label` | "Command palette" |
| Search input | `role="combobox"` | — |
| Search input | `aria-expanded` | `true` when results visible |
| Search input | `aria-controls` | ID of result list |
| Search input | `aria-autocomplete` | `list` |
| Search input | `aria-activedescendant` | ID of currently highlighted option |
| Result list | `role="listbox"` | — |
| Result items | `role="option"` | — |
| Result items | `aria-selected` | `true` for highlighted item |

#### Knowledge Card

```html
<article role="article" aria-labelledby="kn-title-123" tabindex="0">
  <h3 id="kn-title-123">Transformer</h3>
  <span class="badge" aria-label="Type: concept">concept</span>
  <div role="img" aria-label="Comprehension level: 4 out of 5">●●●●○</div>
  <p>基于自注意力机制的神经网络架构...</p>
</article>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Card root | `role="article"` | — |
| Card root | `tabindex="0"` | Focusable via keyboard |
| Card root | `aria-labelledby` | ID of title heading |
| Type badge | `aria-label` | `"Type: {type}"` |
| Comprehension dots | `role="img"` | With `aria-label` |
| Description | `<p>` | Standard text, no ARIA needed |

#### Chat Message

```html
<div role="log" aria-label="Chat messages" aria-live="polite">
  <article aria-label="AI assistant message">
    <div role="img" aria-label="AI assistant avatar">🤖</div>
    <div class="message-content">
      <p>MoE 是一种架构模式...</p>
    </div>
  </article>
  <article aria-label="User message">
    <div role="img" aria-label="User avatar">👤</div>
    <div class="message-content">
      <p>什么是 mixture of experts？</p>
    </div>
  </article>
</div>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Message list | `role="log"` | Live region for chat |
| Message list | `aria-live="polite"` | Announces new messages |
| Message list | `aria-label` | "Chat messages" |
| AI message | `aria-label` | "AI assistant message" |
| User message | `aria-label` | "User message" |
| Avatars | `role="img"` | With descriptive `aria-label` |

#### Right Panel

```html
<aside aria-label="Detail panel" aria-hidden="false">
  <div role="tablist" aria-label="Panel tabs">
    <button role="tab" aria-selected="true" aria-controls="panel-detail" id="tab-detail">Detail</button>
    <button role="tab" aria-selected="false" aria-controls="panel-sources" id="tab-sources">Sources</button>
  </div>
  <div role="tabpanel" id="panel-detail" aria-labelledby="tab-detail">
    <!-- Panel content -->
  </div>
</aside>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Panel | `aria-hidden` | `true` when closed, `false` when open |
| Panel | `aria-label` | "Detail panel" |
| Tab bar | `role="tablist"` | — |
| Tab buttons | `role="tab"` | With `aria-selected`, `aria-controls` |
| Tab panels | `role="tabpanel"` | With `aria-labelledby` |

#### Toast Notification

```html
<div role="status" aria-live="assertive" aria-atomic="true">
  <span>API connection failed</span>
  <button aria-label="Retry API connection">Retry</button>
  <button aria-label="Dismiss notification">✕</button>
</div>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Toast root | `role="status"` | — |
| Toast root | `aria-live="assertive"` | For error toasts |
| Toast root | `aria-live="polite"` | For success/info toasts |
| Toast root | `aria-atomic="true"` | Announce entire toast content |
| Icon buttons | `aria-label` | Descriptive action label |

#### Dialog / Modal

```html
<dialog aria-labelledby="dialog-title" aria-describedby="dialog-desc" aria-modal="true">
  <h2 id="dialog-title">Create New Domain</h2>
  <p id="dialog-desc">Enter a name and select a template for your new knowledge domain.</p>
  <form>...</form>
</dialog>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Dialog | `aria-labelledby` | ID of title heading |
| Dialog | `aria-describedby` | ID of description element |
| Dialog | `aria-modal="true"` | Prevents screen reader from reading background |

#### Segmented Control (List | Graph)

```html
<div role="radiogroup" aria-label="View mode">
  <button role="radio" aria-checked="true" id="view-list">List</button>
  <button role="radio" aria-checked="false" id="view-graph">Graph</button>
</div>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Container | `role="radiogroup"` | — |
| Container | `aria-label` | "View mode" |
| Options | `role="radio"` | — |
| Options | `aria-checked` | `true` / `false` |

#### Graph Visualization

```html
<div role="img" aria-label="Knowledge graph visualization showing 234 nodes and 89 connections. Use list view for keyboard-accessible browsing.">
  <svg aria-hidden="true">
    <!-- D3.js rendered graph -->
  </svg>
</div>
<navigation-note>
  <a href="#knowledge-list">Switch to list view for keyboard navigation</a>
</navigation-note>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Graph container | `role="img"` | Treat as single image |
| Graph container | `aria-label` | Summary of graph content |
| SVG | `aria-hidden="true"` | Not keyboard navigable |
| List view link | Visible | Provides accessible alternative |

#### Skeleton Loading

```html
<div role="status" aria-label="Loading content">
  <span aria-hidden="true" class="skeleton-line" />
  <span aria-hidden="true" class="skeleton-card" />
</div>
```

| Element | Attribute | Value |
|---------|-----------|-------|
| Skeleton container | `role="status"` | — |
| Skeleton container | `aria-label` | "Loading content" |
| Skeleton shapes | `aria-hidden="true"` | Decorative |

---

## P0.11.3 Focus Management Specification

### Focus Visible Indicator

All focusable elements display a **2px solid ring** when focused:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none; /* Remove outline for mouse clicks */
}

/* Never remove outline entirely */
:focus-visible {
  outline: 2px solid var(--accent) !important;
}
```

### Focus Transfer Rules

#### Modal Open

| Trigger | Action |
|---------|--------|
| Domain create dialog opens | Focus → "Domain Name" input field |
| API Key dialog opens | Focus → Provider select dropdown |
| Confirm dialog opens | Focus → Primary action button |
| Command palette opens | Focus → Search input field |
| Settings section expand | Focus stays on toggle (no transfer) |

**Timing**: Focus transfer happens **after** the open animation completes (use `requestAnimationFrame` or `animationend` event).

#### Modal Close

| Trigger | Action |
|---------|--------|
| Escape pressed | Focus → Element that triggered the modal |
| Close button clicked | Focus → Element that triggered the modal |
| Overlay clicked | Focus → Element that triggered the modal |
| Primary action completed | Focus → Relevant updated element (e.g., new domain in list) |

**Implementation**: Each modal stores a `triggerElement` reference on open and restores focus on close.

```typescript
// Modal focus management pattern
function openModal(triggerElement: HTMLElement) {
  modalRef.current.triggerElement = triggerElement;
  modalRef.current.showModal();
  requestAnimationFrame(() => {
    const firstFocusable = modalRef.current.querySelector(
      'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable as HTMLElement)?.focus();
  });
}

function closeModal() {
  modalRef.current.close();
  const trigger = modalRef.current.triggerElement;
  if (trigger) {
    trigger.focus({ preventScroll: true });
  }
}
```

#### Panel Open/Close

| Trigger | Action |
|---------|--------|
| Knowledge node clicked in list | Panel opens → Focus → Panel close button |
| Graph node clicked | Panel opens → Focus → Panel close button |
| Timeline event clicked | Panel opens → Focus → Panel close button |
| Panel close (Escape / button) | Focus → Element that triggered the panel |

**Note**: Unlike modals, panels do **not** trap focus. Users can Tab out of the panel into the main content.

#### Route Change

| Trigger | Action |
|---------|--------|
| Navigation to new view | Focus → View heading (h1/h2) with `tabindex="-1"` |
| Tab switch within domain | Focus → Active tab content heading |
| Back navigation | Focus → Previously focused element (if restorable) |

```typescript
// Route change focus management
useEffect(() => {
  const heading = document.querySelector('h1, h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: false });
  }
}, [pathname]);
```

#### Toast Notification

| Trigger | Action |
|---------|--------|
| Toast appears | Focus does **NOT** move (non-modal notification) |
| Toast with action button | User can Tab to the button; toast does not steal focus |

### Focus Trap Specification

#### Modal Dialogs

When a modal dialog is open, focus is trapped within the dialog boundary:

1. Tab from last focusable element → wraps to first focusable element
2. Shift+Tab from first focusable element → wraps to last focusable element
3. No focusable element outside the dialog receives focus

```typescript
// Focus trap implementation
function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const getFocusableElements = () =>
      Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
}
```

#### Command Palette

Same focus trap as modal dialogs. The palette is `aria-modal="true"` and focus wraps within:
- Search input (always first)
- Result items
- Action buttons (if any)

---

## P0.11.4 Color Contrast Requirements

### WCAG AA Thresholds

| Element Type | Minimum Contrast Ratio | Standard |
|-------------|----------------------|----------|
| Normal text (< 18px, < 14px bold) | 4.5:1 | WCAG AA 1.4.3 |
| Large text (≥ 18px, or ≥ 14px bold) | 3:1 | WCAG AA 1.4.3 |
| Interactive components | 3:1 | WCAG AA 1.4.11 |
| Graphical objects / icons | 3:1 | WCAG AA 1.4.11 |
| Focus indicator (outline) | 3:1 against adjacent colors | WCAG AA 1.4.11 |
| Disabled text | No requirement | — |
| Placeholder text | No requirement (but recommended 3:1+) | — |

### Token-to-Token Contrast Validation

Each style pack MUST pass the following token pair validations:

#### Text on Background (Primary)

| Token Pair | Element | Required Ratio |
|-----------|---------|----------------|
| `--text-primary` on `--bg-primary` | Body text, headings | 4.5:1 |
| `--text-secondary` on `--bg-primary` | Descriptions, labels | 4.5:1 |
| `--text-tertiary` on `--bg-primary` | Timestamps, hints | 4.5:1 |
| `--text-primary` on `--bg-secondary` | Card text | 4.5:1 |
| `--text-secondary` on `--bg-secondary` | Card descriptions | 4.5:1 |
| `--text-primary` on `--surface` | Panel text | 4.5:1 |

#### Accent / Interactive

| Token Pair | Element | Required Ratio |
|-----------|---------|----------------|
| `--accent` on `--bg-primary` | Buttons, links | 3:1 (component) + 4.5:1 (if text) |
| `--text-on-accent` on `--accent` | Button text | 4.5:1 |
| `--accent` focus ring on any bg | Focus indicators | 3:1 |

#### Border

| Token Pair | Element | Required Ratio |
|-----------|---------|----------------|
| `--border-default` on `--bg-primary` | Card borders, dividers | 3:1 |
| `--border-default` on `--bg-secondary` | Input borders | 3:1 |

#### Comprehension Indicator Dots

| Element | Required Ratio |
|---------|----------------|
| Filled dot on card background | 3:1 (graphical object) |
| Empty dot on card background | 3:1 (graphical object) |

### Style Pack Validation Matrix

Each style pack (Linear, Cursor, Notion, PostHog, Tokyo Night fallback) MUST be validated:

| # | Check | Method |
|---|-------|--------|
| 1 | All text-on-background pairs meet 4.5:1 | Automated contrast check (build-time) |
| 2 | Large text meets 3:1 | Automated contrast check |
| 3 | Interactive components meet 3:1 | Automated contrast check |
| 4 | Focus indicator visible on all backgrounds | Manual visual check |
| 5 | Comprehension dots visible on card backgrounds | Manual visual check |
| 6 | Error states (red) visible on background | Manual visual check |
| 7 | Success states (green) visible on background | Manual visual check |

### Custom Theme Warning

If a user applies custom theme overrides that fail contrast checks:

```
┌──────────────────────────────────────────────────┐
│  ⚠ Contrast Warning                             │
│                                                   │
│  Your custom theme colors may not meet            │
│  accessibility contrast requirements.             │
│  Text readability could be affected.              │
│                                                   │
│  [Reset to defaults]  [Keep anyway]               │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Build-Time Validation

Add a build step that validates all style pack token values against WCAG AA:

```typescript
// scripts/validate-contrast.ts
// Read token values from each style pack CSS
// Compute contrast ratios for all required pairs
// Fail the build if any pair is below threshold
// Report: "Style pack 'Tokyo Night': --text-secondary on --bg-primary = 3.8:1 (FAIL, need 4.5:1)"
```

---

## Validation

- [x] Keyboard Tab order follows logical reading order (sidebar → main → panel)
- [x] Skip-to-content link defined
- [x] Keyboard shortcuts table covers all contexts
- [x] Escape behavior defined for every context
- [x] ARIA attributes specified for all 12+ custom components
- [x] Graph visualization has accessible alternative
- [x] Chat messages use aria-live for announcements
- [x] Focus visible indicator defined (2px accent ring)
- [x] Focus transfer rules for modal open/close
- [x] Focus transfer rules for panel open/close
- [x] Focus transfer rules for route changes
- [x] Focus trap specification for modals and command palette
- [x] Toast notifications do not steal focus
- [x] WCAG AA contrast ratios defined (4.5:1 text, 3:1 large/components)
- [x] Token-to-token validation pairs listed
- [x] Style pack validation matrix defined
- [x] Custom theme warning designed
- [x] Build-time validation approach specified
