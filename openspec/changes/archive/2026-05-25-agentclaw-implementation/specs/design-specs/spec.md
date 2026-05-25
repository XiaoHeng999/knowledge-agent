## ADDED Requirements

### Requirement: Animation Presets
The system SHALL define 6-8 standard animation presets as reusable CSS classes and JavaScript utilities:

1. **fade-in**: opacity 0 -> 1, 200ms ease-out
2. **slide-up**: translateY(8px) -> 0, 250ms ease-out
3. **slide-in-right**: translateX(20px) -> 0, 200ms ease-out
4. **scale-in**: scale(0.95) -> 1, 150ms ease-out
5. **expand**: height 0 -> auto, 300ms ease-out (for collapsible sections)
6. **skeleton-pulse**: opacity 0.4 -> 1 -> 0.4, 1.5s ease-in-out infinite
7. **toast-enter**: translateY(100%) -> 0, 300ms cubic-bezier(0.21, 1.02, 0.73, 1)
8. **toast-exit**: opacity 1 -> 0, 200ms ease-in

All animations SHALL respect `prefers-reduced-motion: reduce` by falling back to instant state changes.

#### Scenario: Applying fade-in to a new chat message
- **WHEN** a new chat message appears in the conversation
- **THEN** the message element applies the `fade-in` animation: opacity transitions from 0 to 1 over 200ms with ease-out timing

#### Scenario: Reduced motion overrides animations
- **WHEN** the user has `prefers-reduced-motion: reduce` enabled and a toast enters
- **THEN** the toast appears instantly at its final position without animation

### Requirement: Skeleton Screen Specifications
The system SHALL define skeleton loading states for 9 views:

1. **Domain List**: 5 placeholder items with rounded rectangles (icon circle + 2 text lines)
2. **Knowledge List**: 4 placeholder cards with title bar + 3 text lines + tag pills
3. **Knowledge Detail**: Title bar + 5 paragraph blocks + metadata row
4. **Chat View**: 3 message pairs (user bubble + AI bubble) with typing indicator
5. **Inbox List**: 5 placeholder items with source icon + title + preview snippet
6. **Research Dashboard**: 3 metric cards + run history table with 5 rows
7. **Timeline**: 6 placeholder event cards along a horizontal axis
8. **Settings**: 4 settings section blocks with toggle placeholders
9. **Model List**: 6 model row placeholders with provider icon + name + status indicator

Each skeleton SHALL use the `--background-tertiary` and `--surface` tokens with the `skeleton-pulse` animation. Skeletons SHALL be displayed within 100ms of the data request.

#### Scenario: Loading the knowledge list view
- **WHEN** the user navigates to the knowledge list and data is being fetched
- **THEN** 4 skeleton knowledge cards are displayed immediately (within 100ms), each showing a title bar, 3 text lines, and 2 tag pill placeholders, with the pulse animation

#### Scenario: Skeleton replaced by actual content
- **WHEN** the knowledge data finishes loading
- **THEN** the skeleton cards are replaced by actual knowledge list items using the `fade-in` animation for a smooth transition

### Requirement: Empty State Designs
The system SHALL define empty states for 7 scenarios:

1. **No Domains**: Illustration + "Create your first domain" + CTA button
2. **Empty Knowledge Base**: Illustration + "Start building your knowledge base" + import/create options
3. **Empty Inbox**: Illustration + "Your inbox is empty" + "Import content to get started"
4. **No Conversations**: Illustration + "Start a conversation with your domain expert" + CTA button
5. **No Research Runs**: Illustration + "Set up automated research" + schedule configuration prompt
6. **No Predictions**: Illustration + "No predictions yet" + "Create your first prediction"
7. **No Search Results**: Clear message + "Try different keywords" + search tips

Each empty state SHALL include: a thematic SVG illustration, a headline, a description (max 2 sentences), and a primary CTA button. Empty states SHALL be centered vertically and horizontally in their container.

#### Scenario: Viewing an empty knowledge base
- **WHEN** the user opens a newly created domain with no knowledge nodes
- **THEN** the center panel displays a centered empty state: knowledge-themed illustration, "Start building your knowledge base", "Import articles, papers, or notes to create your first knowledge node.", and "Import Content" / "Create Note" CTA buttons

### Requirement: Command Palette Keyboard Model
The system SHALL provide a command palette (`Cmd/Ctrl+K`) that supports: navigation commands, action commands, search, and slash commands. The palette SHALL open as a modal overlay with a search input, a scrollable result list, and keyboard navigation (arrow keys + Enter). Results SHALL be categorized: Recent, Actions, Navigation, Skills. The palette SHALL support fuzzy matching on command names.

#### Scenario: Opening and using the command palette
- **WHEN** the user presses `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux)
- **THEN** a modal overlay appears with a search input focused; typing "dom" shows fuzzy-matched results including "New Domain" (Action) and "Switch Domain" (Navigation); pressing Enter executes the selected command

#### Scenario: Command palette with no matching results
- **WHEN** the user types a query that matches no commands
- **THEN** the palette displays "No results found. Try a different search term." with the input still focused for immediate correction

### Requirement: Tree Conversation Fold and Expand
The tree conversation UI SHALL support folding and expanding branches. Each node with children SHALL have a collapse toggle. Collapsed branches SHALL show a "... N hidden messages" indicator. The fold/expand state SHALL be preserved per conversation and restored when the conversation is reopened. Double-clicking a branch SHALL toggle its state.

#### Scenario: Folding a conversation branch
- **WHEN** the user clicks the collapse toggle on a node with 5 child messages
- **THEN** the 5 child messages are hidden and a "... 5 hidden messages" indicator appears with an expand toggle

#### Scenario: Persisting fold state
- **WHEN** the user folds several branches, closes the conversation, and reopens it
- **THEN** the previously folded branches remain collapsed, and the fold state is restored from the database

### Requirement: Right Panel Density Specification
The right panel SHALL support two density modes: (1) **Comfortable** (default): 16px padding, 20px line height, 16px font size, 24px section gaps; (2) **Compact**: 8px padding, 18px line height, 14px font size, 12px section gaps. The density mode SHALL be toggled via the panel header and persisted in user settings. The panel SHALL have a maximum width of 380px in comfortable mode and 320px in compact mode.

#### Scenario: Switching to compact density
- **WHEN** the user clicks the density toggle in the right panel header
- **THEN** the panel transitions to compact mode: padding reduces to 8px, font size to 14px, line height to 18px, and the panel narrows to 320px; the change is applied without page reload

#### Scenario: Density preference persists across sessions
- **WHEN** the user sets compact density and restarts the application
- **THEN** the right panel opens in compact density mode, restored from the user's saved preferences
