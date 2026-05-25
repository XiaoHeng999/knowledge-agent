# Conversation Tree Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: P0.13.1 (Collapse/Expand), P0.13.2 (Branch Navigation), P0.13.3 (Virtual Scrolling), P0.13.4 (New Branch Button)
> Dependency: expert-chat/spec.md (tree-shaped conversation UI), accessibility/interaction-model.md (keyboard navigation)
> Related: design-specs/animation-presets.md (collapse/expand animations)

---

## P0.13.1 Collapse/Expand Behavior

### Default State Rules

When a conversation is loaded, the tree applies these default visibility rules:

| Node State | Default Visibility | Reason |
|-----------|-------------------|--------|
| Active branch (path from root to current leaf) | **Expanded** | User's current context is always visible |
| Inactive branches (sibling branches not currently viewed) | **Collapsed** | Reduces visual noise, focuses on active path |
| Root node | Always expanded | Entry point of conversation |

### Maximum Visible Depth

- **Maximum expanded depth**: 3 levels from the root node
- Nodes deeper than 3 levels are auto-collapsed, showing the "... N hidden messages" indicator
- The user can manually expand deeper nodes, but auto-expand on load stops at depth 3
- If the active branch goes deeper than 3 levels, the active path is expanded fully regardless of the limit

### Depth Calculation

```
Root (depth 0)
├── User msg (depth 1) ← auto-expanded
│   ├── AI response A (depth 2) ← auto-expanded (active)
│   │   ├── User msg (depth 3) ← auto-expanded (active path continues)
│   │   │   └── AI response (depth 4) ← COLLAPSED by default (depth > 3)
│   │   └── AI response B (depth 3) ← collapsed (inactive sibling)
│   └── AI response C (depth 2) ← collapsed (inactive sibling)
└── User msg (depth 1) ← collapsed (inactive sibling)
```

### Collapse Toggle UI

Each node with children displays a collapse toggle:

```
┌────────────────────────────────────────────────┐
│  ● AI Response                    [▼ collapse] │
│  "Based on my analysis..."                     │
│                                                │
│    ├── User: "Tell me more about X"            │
│    ├── AI: "Certainly, X is..."     ← active   │
│    └── ... 3 hidden messages       [▶ expand]  │
└────────────────────────────────────────────────┘
```

| Element | Specification |
|---------|--------------|
| Toggle icon | `▼` (expanded) / `▶` (collapsed), 16px, `--text-tertiary` color |
| Toggle position | Right side of the message header, vertically centered |
| Hover state | Background `--surface`, icon color → `--text-secondary` |
| Hidden count indicator | `"... {N} hidden messages"` in `--text-tertiary`, 12px font, italic |
| Animation | `.anim-collapse` / `.anim-expand` (from animation-presets.md) |
| Reduced motion | Instant state change, no animation |

### Collapse Interaction

| Trigger | Action |
|---------|--------|
| Click collapse toggle (`▼`) | Collapse all descendant nodes, show hidden count |
| Click expand toggle (`▶`) | Expand immediate children only (lazy expand) |
| Click hidden count indicator | Same as expand toggle |
| Double-click message header | Toggle collapse state |

### Persistence

- Collapse state is stored per conversation in the database (field: `collapsedNodeIds: string[]`)
- On conversation load, persisted collapse states are restored
- Default rules apply only for nodes without persisted state (new conversations)
- When the user navigates to a different branch, previously manually collapsed states are preserved

### Database Field

```typescript
// Added to conversations table
interface Conversation {
  // ... existing fields
  collapsedNodeIds: string[]; // JSON array of collapsed node UUIDs
}
```

---

## P0.13.2 Branch Navigation Mechanism

### Branch Selector UI

When a node has multiple child branches (i.e., the user retried or edited to create siblings), a **branch selector** appears:

```
┌────────────────────────────────────────────────┐
│  User: "Explain transformers"                  │
│                                                │
│  ┌─ Branch Selector ───────────────────────┐  │
│  │  [◄]  Branch 1/3  [►]                   │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  AI: "Transformers are a neural network..."    │
│  (current branch content)                      │
└────────────────────────────────────────────────┘
```

| Element | Specification |
|---------|--------------|
| Container | Inline below the parent message, full width |
| Counter text | `"Branch {current}/{total}"`, 12px, `--text-secondary` |
| Arrow buttons | `◄` / `►`, 24×24px touch target, `--text-tertiary` → `--text-primary` on hover |
| Active indicator | Thin `--accent` bar (2px) below the selector |
| Visibility | Only shown when a node has > 1 child branch |

### Navigation Methods

| Method | Action |
|--------|--------|
| Click `◄` arrow | Switch to previous sibling branch |
| Click `►` arrow | Switch to next sibling branch |
| Click first message of a branch | Set that branch as active, collapse other siblings |
| `←` arrow key (when branch selector focused) | Previous branch |
| `→` arrow key (when branch selector focused) | Next branch |
| `↑` / `↓` arrow keys | Navigate between messages within the active branch (standard list navigation) |

### Focus Management on Branch Switch

| Event | Focus Action |
|-------|-------------|
| Branch switched via click | Focus → First message of newly active branch |
| Branch switched via keyboard | Focus → Branch selector (user can Tab into branch content) |
| Branch switched via arrow key | Focus stays on branch selector |

### Branch Data Model

```typescript
interface ConversationNode {
  id: string;
  parentId: string | null;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  branchIndex: number; // 0-based index among siblings
  children: ConversationNode[];
  createdAt: string;
  modelId?: string; // which model generated this (for assistant nodes)
}

// Computed property
interface BranchInfo {
  totalBranches: number;
  currentBranchIndex: number;
  branchSummaries: Array<{
    index: number;
    firstMessagePreview: string; // first 80 chars
    modelUsed: string;
  }>;
}
```

### Keyboard Navigation Flow

```
Tab into conversation tree
    │
    ├─ First message (root)
    │   │
    │   ├─ ↓ → Next message in active branch
    │   ├─ ↑ → Previous message in active branch
    │   │
    │   └─ If branch selector present:
    │       ├─ ← → Previous sibling branch
    │       ├─ → → Next sibling branch
    │       ├─ Enter → Enter branch (focus first child message)
    │       └─ Tab → Move to next interactive element outside tree
    │
    └─ Tab → Leave conversation tree
```

### ARIA Attributes for Branch Navigation

```html
<div role="tree" aria-label="Conversation branches">
  <div role="group" aria-label="Branch selector, 3 branches">
    <button role="button" aria-label="Previous branch" aria-keyshortcuts="ArrowLeft">
      ◄
    </button>
    <span aria-live="polite">Branch 1 of 3</span>
    <button role="button" aria-label="Next branch" aria-keyshortcuts="ArrowRight">
      ►
    </button>
  </div>
  <!-- Active branch messages -->
  <div role="treeitem" aria-selected="true" aria-expanded="true">
    <!-- message content -->
  </div>
</div>
```

---

## P0.13.3 Virtual Scrolling Specification

### Activation Threshold

- **Virtual scrolling activates**: When the active branch contains **> 50 visible messages**
- **Deactivates**: When messages drop to ≤ 50 after filtering/branch switch
- The threshold counts only **currently visible** messages (collapsed branches excluded)

### Overscan Configuration

| Parameter | Value | Reason |
|-----------|-------|--------|
| `overscanBefore` | 5 messages | Smooth upward scroll without blank flash |
| `overscanAfter` | 10 messages | Downward scroll is more common in chat, extra buffer |
| `estimatedItemHeight` | 120px | Average message height (AI messages are taller) |

### Measurement Strategy

1. First 50 messages render normally (no virtualization overhead)
2. On message 51+, activate virtual scrolling with the following approach:
   - Use `ResizeObserver` to measure actual heights of rendered items
   - Maintain a height cache: `Map<messageId, measuredHeight>`
   - Unmeasured items use `estimatedItemHeight` (120px)
   - Re-measure when content changes (e.g., code blocks expand)

### Scroll Position Management

| Scenario | Behavior |
|----------|----------|
| New message appended (bottom) | Auto-scroll to bottom if user is within 150px of bottom edge |
| New message appended (user scrolled up) | Show "↓ New message" floating button, no auto-scroll |
| Branch switch | Scroll to first message of new branch |
| Window resize | Maintain scroll position relative to current viewport center |
| Collapse/expand | Adjust scroll to keep the toggled node visible |

### "New Message" Floating Indicator

When the user has scrolled up and a new message arrives:

```
┌─────────────────────────────────────┐
│  ↓ 1 new message              [Jump] │
└─────────────────────────────────────┘
```

| Element | Specification |
|---------|--------------|
| Position | Fixed to bottom of chat area, 12px above input |
| Background | `--surface` with `--shadow-md` |
| Animation | `.anim-slide-up` (250ms) |
| Dismiss | Click "Jump" → scroll to bottom + dismiss; auto-dismiss after 5s |

### Virtual Scrolling Implementation Interface

```typescript
interface VirtualScrollConfig {
  /** Number of messages before activating virtual scroll */
  activationThreshold: number; // 50
  /** Messages to render above viewport */
  overscanBefore: number; // 5
  /** Messages to render below viewport */
  overscanAfter: number; // 10
  /** Default height for unmeasured items */
  estimatedItemHeight: number; // 120
  /** Distance from bottom (px) to trigger auto-scroll */
  autoScrollThreshold: number; // 150
}

interface VirtualScrollState {
  /** Currently rendered message IDs (subset of all visible) */
  visibleRange: { startIndex: number; endIndex: number };
  /** Total height of all messages (sum of measured + estimated) */
  totalHeight: number;
  /** Scroll offset in pixels */
  scrollOffset: number;
  /** Whether user is near bottom (for auto-scroll) */
  isNearBottom: boolean;
}
```

### Performance Budget

| Metric | Target |
|--------|--------|
| Frame rate during scroll | ≥ 60fps |
| Time to render 50 → 1000 messages | < 100ms (virtualization activation) |
| Memory per 1000 messages | < 5MB (only rendered items in DOM) |
| Scroll position restore after branch switch | < 16ms |

---

## P0.13.4 "New Branch" Button Behavior

### Button Placement

The "New Branch" button appears on every **user message** in the conversation:

```
┌────────────────────────────────────────────────┐
│  User: "Explain transformers"                  │
│                                                │
│  [✎ Edit]  [↻ New Branch]          2:30 PM   │
└────────────────────────────────────────────────┘
```

| Element | Specification |
|---------|--------------|
| Button icon | `↻` (or branch icon), 16px |
| Button label | "New Branch", 12px font, `--text-tertiary` |
| Visibility | Hidden by default, appears on message hover |
| Hover state | Icon + label → `--text-secondary`, background `--surface` |
| Touch target | 32×32px minimum |

### Behavior

**When clicked:**

1. Creates a new sibling branch at the **same depth** as the current branch
2. The new branch starts from the same parent node (the AI response that preceded the user message)
3. The user message is copied into the new branch as a starting point
4. An empty input field appears for the user to modify the message
5. The AI then generates a new response in this branch

### Branch Creation Flow

```
State before "New Branch" click:

  User: "Explain X"
    └── AI: "X is..." (Branch 1)
          └── User: "Tell me more" ← [↻ New Branch] clicked here
                └── AI: "Here's more..."

State after click:

  User: "Explain X"
    └── AI: "X is..."
          ├── User: "Tell me more" (Branch 1)
          │     └── AI: "Here's more..."
          └── [✎ Input: "Tell me more"] (Branch 2) ← NEW, editable
                └── (waiting for AI response)
```

### Interaction Details

| Aspect | Specification |
|--------|--------------|
| Copied message | Pre-filled in input field, editable before sending |
| Branch naming | Auto-named "Branch {N}" where N = total branches at this depth |
| Active branch | Switches to the new branch immediately |
| Branch selector | Updated to show `{N}/{totalBranches}` |
| Undo | No implicit undo — user can delete the branch via context menu |

### "New Branch" vs "Retry" Distinction

| Action | Behavior | Use Case |
|--------|----------|----------|
| **New Branch** (`↻`) | Copies user message, allows editing, creates sibling | Want a different angle or to modify the question |
| **Retry** (on AI message) | Re-generates AI response with same input, creates sibling | Want a different answer to the same question |

### Context Menu for Branches

Right-click or long-press on any branch selector opens:

| Option | Action |
|--------|--------|
| "Rename branch" | Inline edit of branch label |
| "Delete branch" | Confirm dialog → removes branch and all descendants |
| "Merge to main" | Moves branch content to primary branch (advanced) |

### ARIA for New Branch Button

```html
<button
  aria-label="Create new branch from this message"
  title="Create a sibling branch to try a different approach"
>
  ↻ New Branch
</button>
```

---

## Component Structure

```
src/components/chat/
├── conversation-tree.tsx       # Main tree container with virtual scroll
├── conversation-node.tsx       # Individual message node
├── branch-selector.tsx         # Branch navigation (◄ N/M ►)
├── collapse-toggle.tsx         # Expand/collapse toggle
├── new-branch-button.tsx       # "New Branch" action button
└── new-message-indicator.tsx   # Floating "↓ N new messages"

src/lib/hooks/
├── use-virtual-scroll.ts       # Virtual scrolling logic
├── use-conversation-tree.ts    # Tree state management
└── use-branch-navigation.ts    # Branch switching logic
```

### Key Interfaces

```typescript
// Tree state management
interface ConversationTreeState {
  nodes: Map<string, ConversationNode>;
  rootId: string;
  activeBranchPaths: Map<string, number>; // parentId → active branchIndex
  collapsedNodeIds: Set<string>;
}

// Actions
type TreeAction =
  | { type: 'SWITCH_BRANCH'; parentId: string; branchIndex: number }
  | { type: 'TOGGLE_COLLAPSE'; nodeId: string }
  | { type: 'CREATE_BRANCH'; parentId: string; sourceMessageId: string }
  | { type: 'DELETE_BRANCH'; parentId: string; branchIndex: number }
  | { type: 'RESTORE_COLLAPSE_STATE'; collapsedIds: string[] };
```

---

## Validation

- [ ] Collapse/expand default state: active branch expanded, inactive collapsed
- [ ] Maximum visible depth of 3 levels (active path exempt)
- [ ] Branch selector UI with ◄/► navigation
- [ ] Keyboard navigation: ←/→ for branches, ↑/↓ for messages
- [ ] Click first message of branch sets it active
- [ ] Virtual scrolling activates at > 50 messages
- [ ] Overscan: 5 before, 10 after viewport
- [ ] Auto-scroll within 150px of bottom
- [ ] "New message" floating indicator when scrolled up
- [ ] "New Branch" button on user messages, hidden by default
- [ ] New branch creates sibling at same depth
- [ ] Collapse state persisted in database
- [ ] All ARIA attributes specified
- [ ] Performance budget: ≥ 60fps during scroll
