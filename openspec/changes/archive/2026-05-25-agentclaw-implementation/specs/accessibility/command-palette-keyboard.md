# Command Palette Keyboard Model Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: P0.12.1 (Keyboard Interaction), P0.12.2 (Search Filter Rules), P0.12.3 (Parameter Input Mode)
> Dependency: P0.11 (Accessibility Interaction Model)
> Related: accessibility/interaction-model.md (focus management, ARIA), UI-UX-design-v2.md §4.2

---

## P0.12.1 Complete Keyboard Interaction Matrix

### Activation

| Key | Context | Action |
|-----|---------|--------|
| `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) | Global, any context | Open command palette, focus search input |
| `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux) | Palette already open | Close palette, return focus |

### Navigation Within Palette

| Key | Action |
|-----|--------|
| `↓` | Move selection down one item. Wraps from last to first. If on a group header, skip to first item in group. |
| `↑` | Move selection up one item. Wraps from first to last. If on a group header, skip to last item in previous group. |
| `Tab` | Move to next **group header**. Pressing Tab again moves to next group. The selected item within each group resets to the first item. |
| `Shift+Tab` | Move to previous **group header**. Same behavior as Tab but reversed. |
| `Home` | Jump selection to first item in the palette |
| `End` | Jump selection to last item in the palette |
| `Enter` | Execute the currently selected item (command, navigation, or search result) |
| `Escape` | Close the palette. Focus returns to the element that triggered it. |

### Group Structure

Results are organized into these groups, displayed in this order:

| # | Group | ID | Icon | Items |
|---|-------|----|------|-------|
| 1 | Recent | `recent` | 🕐 | Up to 3 recently accessed views/nodes |
| 2 | Commands | `commands` | ⚡ | Slash commands matching the query |
| 3 | Navigation | `navigation` | 🧭 | Domain views and pages matching the query |
| 4 | Knowledge | `knowledge` | 📌 | Knowledge nodes matching the search query |
| 5 | Actions | `actions` | ⚙️ | Quick actions (new domain, import, settings) |

Each group shows:
- **Group header**: Non-selectable label ("Commands", "Navigation", etc.)
- **Group items**: Up to 5 per group (see P0.12.2)
- **Group footer**: "Show N more..." if group has additional results (see P0.12.2)

### Selection State

```
┌──────────────────────────────────────────────┐
│  🔍 Search commands, knowledge, domains...    │  ← input (always focused)
├──────────────────────────────────────────────┤
│                                               │
│  🕐 Recent                                    │  ← group header (non-selectable)
│  ├── AI/ML > Knowledge Graph                  │
│  ├── Transformer (knowledge node)             │
│  └── Frontend > Expert Chat                   │
│                                               │
│  ⚡ Commands                                  │  ← group header
│  ├── /daily        Today's research summary   │  ← highlighted (↓ selected)
│  │   ─────────────────────────────────────    │
│  ├── /deep-dive    Deep research on topic     │
│  └── /summarize    Summarize content          │
│                                               │
│  📌 Knowledge                                 │  ← group header
│  ├── Transformer         AI/ML    ●●●●○       │
│  ├── Attention Is All... AI/ML    ●●●○○       │
│  └── Show 3 more...                          │
│                                               │
│  ─────────────────────────────────────────── │
│  ↑↓ navigate   Tab group   ↵ select   Esc ✕  │
└──────────────────────────────────────────────┘
```

The highlighted item has:
- Background: `--bg-secondary` (or `--surface`)
- Left border accent: 2px `--accent`
- `aria-selected="true"` and `aria-activedescendant` on input points to this item

### Visual Feedback

| State | Style |
|-------|-------|
| Default item | Transparent background |
| Hovered item (mouse) | `--bg-secondary` background |
| Keyboard-selected item | `--bg-secondary` + 2px left `--accent` border |
| Executed item | Brief flash of `--accent` at 20% opacity, then palette closes |

### Empty State

When no results match:

```
┌──────────────────────────────────────────────┐
│  🔍 xyz                                       │
├──────────────────────────────────────────────┤
│                                               │
│          No results found                     │
│                                               │
│   Try a different search term or use          │
│   / to browse slash commands.                 │
│                                               │
└──────────────────────────────────────────────┘
```

- Input remains focused for immediate correction
- No group headers shown
- Suggestion text is non-interactive

### Scroll Behavior

- Palette body has `max-height: 440px` (approximately 8-10 visible items)
- Keyboard navigation auto-scrolls to keep the selected item visible
- Scrolling uses `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`
- When `prefers-reduced-motion: reduce`: `scrollIntoView({ block: 'nearest' })` (no smooth)

---

## P0.12.2 Search Filter Rules

### Debounce

- **Debounce time**: 150ms after the last keystroke
- **Immediate search**: If the input is cleared (backspace to empty), show default results immediately (no debounce)
- **Debounce cancellation**: If user types another character before 150ms, reset the timer

```typescript
// Debounce implementation pattern
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    executeSearch(query);
  }, 150),
  []
);

// On input change
const handleInputChange = (value: string) => {
  setQuery(value);
  if (value.length === 0) {
    // Clear results immediately, show defaults
    clearSearch();
  } else {
    // Debounce search
    debouncedSearch(value);
  }
};
```

### Result Limits Per Group

| Group | Max Displayed | Overflow Action |
|-------|---------------|-----------------|
| Recent | 3 | No overflow (hard cap at 3) |
| Commands | 5 | "Show {N} more commands..." footer |
| Navigation | 5 | "Show {N} more pages..." footer |
| Knowledge | 5 | "Show {N} more nodes..." footer |
| Actions | 5 | "Show {N} more actions..." footer |

**Total visible items**: Up to 23 (3 recent + 5×4 groups) + group headers

### "Show N More" Footer

When a group has more than 5 matching results:

```
│  📌 Knowledge                                 │
│  ├── Transformer         AI/ML    ●●●●○       │
│  ├── Attention Is All... AI/ML    ●●●○○       │
│  ├── ViT                 AI/ML    ●●○○○       │
│  ├── GPT-4               AI/ML    ●●●●●       │
│  └── MoE                 AI/ML    ●●○○○       │
│  Show 8 more nodes...  →                      │
```

- **Text**: "Show {N} more {group-name}..."
- **Action**: Pressing `Enter` on this item expands the group to show all results (no limit)
- **Keyboard navigation**: The footer item is selectable and navigable like any result item
- **Alternative**: Mouse click also expands

### Search Matching

| Query Pattern | Search Behavior |
|--------------|-----------------|
| Empty input | Show default results: 3 recent + top 5 commands + top 5 navigation |
| `/` prefix | Filter to slash commands only. Show all matching commands. |
| Text query | Fuzzy match across: command names, command descriptions, knowledge node titles, domain names, page names |
| `/daily` | Exact match to `/daily` command. Highlight it. |

### Fuzzy Matching Algorithm

- Match characters in order, not necessarily contiguous
- Score by: exact prefix > word boundary match > fuzzy match
- Highlight matched characters in results with `<mark>` element
- Example: `"trans"` matches `"Transformer"` → `<mark>Trans</mark>former`

```typescript
// Scoring priority
type MatchType = 'exact' | 'prefix' | 'word-boundary' | 'fuzzy';

interface SearchResult {
  item: SearchItem;
  matchType: MatchType;
  score: number;       // Higher = better match
  matchedIndices: number[]; // For highlighting
}
```

### Result Sorting

Within each group, results are sorted by:
1. Match type (exact > prefix > word-boundary > fuzzy)
2. Score (higher first)
3. Recency (for Recent group)
4. Alphabetical (tiebreaker)

---

## P0.12.3 Parameter Input Mode

### Overview

Some commands require parameters (e.g., `/deep-dive <topic>`, `/import <url>`). When a parameterized command is selected, the palette transitions from **search mode** to **parameter input mode**.

### Transition Flow

```
1. User types "deep" → /deep-dive command highlighted
2. User presses Enter → palette transitions to parameter input mode
3. Search input is replaced with parameter prompt
4. User types parameter value
5. User presses Enter → command executes with parameter
```

### Parameter Prompt UI

```
┌──────────────────────────────────────────────┐
│  ⚡ /deep-dive                                │  ← command label (non-editable)
│  ┌──────────────────────────────────────────┐ │
│  │  Enter topic to deep-dive into...        │ │  ← parameter input (focused)
│  └──────────────────────────────────────────┘ │
│                                               │
│  💡 Tip: Be specific for better results,      │  ← parameter hint
│     e.g., "transformer architecture"          │
│                                               │
│  [Cancel]                                     │  ← actions
│                                               │
│  Esc back   ↵ execute                        │
└──────────────────────────────────────────────┘
```

### Parameter Definition Schema

Each parameterized command defines its parameters:

```typescript
interface CommandParameter {
  name: string;           // Parameter name for display
  placeholder: string;    // Input placeholder text
  hint?: string;          // Help text shown below input
  required: boolean;      // Whether parameter is required
  validation?: {
    pattern?: RegExp;     // Regex pattern for validation
    message: string;      // Error message on validation failure
  };
  suggestions?: string[] | (() => Promise<string[]>); // Autocomplete options
}

interface CommandDefinition {
  id: string;
  label: string;
  description: string;
  parameters: CommandParameter[];
  execute: (params: Record<string, string>) => void | Promise<void>;
}
```

### Built-in Command Parameters

| Command | Parameter | Placeholder | Validation |
|---------|-----------|-------------|------------|
| `/deep-dive` | `topic` | "Enter topic to deep-dive into..." | Required, min 3 chars |
| `/summarize` | `url_or_text` | "Paste URL or text to summarize..." | Required, URL or text > 10 chars |
| `/import` | `url` | "Enter URL to import..." | Required, valid URL format |
| `/framework` | `framework_name` | "Select framework..." | Required, must match known framework |
| `/predict` | `topic` | "What do you want to predict?" | Required, min 3 chars |
| `/skill` | `skill_name` | "Select skill..." | Required, must match registered skill |
| `/connect` | `source_target` | "Source and target node names..." | Required |
| `/review` | `domain_name` | "Select domain to review..." | Required, must match domain |

### Tab Autocomplete

When a parameter has `suggestions` defined:

1. User starts typing → suggestions dropdown appears below the input
2. `↑/↓` navigates suggestions
3. `Tab` accepts the currently highlighted suggestion (partial or full)
4. `Enter` accepts and executes
5. `Escape` dismisses suggestions, stays in parameter input mode

```
┌──────────────────────────────────────────────┐
│  ⚡ /framework                                │
│  ┌──────────────────────────────────────────┐ │
│  │  tech█                                   │ │
│  └──────────────────────────────────────────┘ │
│                                               │
│  ├── Technical Readiness Level (TRL)          │  ← suggestion highlighted
│  ├── Competitive Landscape                    │
│  └── Hype Cycle                               │
│                                               │
│  ↑↓ navigate   Tab accept   ↵ execute        │
└──────────────────────────────────────────────┘
```

### Parameter Validation

- **Real-time validation**: Validation runs on every keystroke after the first character
- **Error display**: Red border on input + error message below

```
┌──────────────────────────────────────────────┐
│  ⚡ /import                                   │
│  ┌──────────────────────────────────────────┐ │
│  │  not-a-url                        🔴     │ │  ← red border
│  └──────────────────────────────────────────┘ │
│  ⚠ Please enter a valid URL (https://...)     │  ← error message
│                                               │
│  [Cancel]                                     │
│                                               │
│  Esc back   ↵ (disabled)                     │
└──────────────────────────────────────────────┘
```

- **Enter disabled**: When validation fails, `Enter` is disabled and shown as grayed out
- **Fix**: When user corrects input to pass validation, error clears and Enter re-enables

### Multi-Parameter Commands

For commands with multiple parameters:

1. Parameters are collected **sequentially** — one at a time
2. After filling each parameter and pressing Enter, the next parameter prompt appears
3. Progress indicator shows "Parameter 1 of 2"

```
┌──────────────────────────────────────────────┐
│  ⚡ /connect                (1 of 2)          │
│  ┌──────────────────────────────────────────┐ │
│  │  Enter source node name...               │ │
│  └──────────────────────────────────────────┘ │
│  💡 Start typing to see matching nodes       │
│                                               │
│  Esc back                                     │
└──────────────────────────────────────────────┘

              ↓ After filling parameter 1 ↓

┌──────────────────────────────────────────────┐
│  ⚡ /connect                (2 of 2)          │
│  Source: Transformer                          │  ← filled parameter shown
│  ┌──────────────────────────────────────────┐ │
│  │  Enter target node name...               │ │
│  └──────────────────────────────────────────┘ │
│  💡 Choose a node to connect with Transformer│
│                                               │
│  Esc back                                     │
└──────────────────────────────────────────────┘
```

### Back Navigation

- **Escape** from parameter input → Return to search mode (preserves original query)
- **Escape** from multi-parameter (param 2+) → Return to previous parameter
- **Escape** from first parameter → Return to search mode

### Focus Management for Parameter Mode

1. Transition to parameter mode: Focus stays on input (content changes from search to parameter)
2. Transition back to search: Focus stays on input (content reverts to search query)
3. Suggestions appear: Focus stays on input, `aria-activedescendant` tracks highlighted suggestion

---

## Complete Keyboard Interaction Summary

| Key | Search Mode | Parameter Mode |
|-----|-------------|----------------|
| `Cmd/Ctrl+K` | Toggle open/close | Close palette |
| `Escape` | Close palette → focus to trigger | Back to search / close if first param |
| `↑/↓` | Navigate results | Navigate suggestions (if any) |
| `Tab` | Next group | Accept autocomplete suggestion |
| `Shift+Tab` | Previous group | No action (or dismiss suggestions) |
| `Enter` | Execute selected result | Execute with parameter / advance to next param |
| `Home/End` | First/last item | — |
| Any printable char | Update search query | Update parameter value |
| `Backspace` (empty) | — | Return to search mode |

---

## File Structure

```
src/
├── components/
│   └── cmd-palette/
│       ├── cmd-palette.tsx         # Main palette component
│       ├── search-input.tsx        # Search input with debounce
│       ├── result-list.tsx         # Grouped result list
│       ├── result-group.tsx        # Single group with header + items
│       ├── result-item.tsx         # Individual result item
│       ├── parameter-input.tsx     # Parameter input mode
│       └── empty-state.tsx         # No results state
├── lib/
│   └── commands/
│       ├── parser.ts              # /command [args] parsing
│       ├── registry.ts            # Command definitions + parameters
│       ├── search.ts              # Fuzzy search + filtering
│       └── types.ts               # CommandDefinition, CommandParameter, SearchResult
```

---

## Validation

- [x] Complete keyboard interaction matrix for all keys
- [x] Group structure with 5 categories defined
- [x] Selection state and visual feedback specified
- [x] Empty state defined
- [x] Scroll behavior with reduced-motion fallback
- [x] Debounce at 150ms with immediate clear
- [x] Per-group limit of 5 items with "Show N more" overflow
- [x] Fuzzy matching algorithm with scoring
- [x] Parameter input mode with transition flow
- [x] Parameter definition schema
- [x] Tab autocomplete for suggestions
- [x] Real-time validation with error display
- [x] Multi-parameter sequential collection
- [x] Back navigation (Escape) for all states
- [x] Focus management integrated with P0.11 specs
- [x] File structure defined
