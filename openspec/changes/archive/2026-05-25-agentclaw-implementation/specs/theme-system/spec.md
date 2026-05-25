## ADDED Requirements

### Requirement: Canonical Token Set Definition
The theme system SHALL define exactly 30 canonical design tokens covering: colors (background-primary, background-secondary, background-tertiary, surface, border, text-primary, text-secondary, text-tertiary, accent, accent-hover, error, warning, success, info), spacing (xs, sm, md, lg, xl), radii (sm, md, lg, full), shadows (sm, md, lg), and typography (font-sans, font-mono, font-size-sm, font-size-base, font-size-lg). All UI components MUST reference these tokens exclusively; hardcoded color or spacing values SHALL NOT be used.

#### Scenario: Component references a design token
- **WHEN** a UI component needs a background color
- **THEN** it uses `var(--background-primary)` instead of a hardcoded hex value, ensuring theme compatibility

#### Scenario: Audit for hardcoded values
- **WHEN** a developer adds a component with a hardcoded color like `#1a1a2e`
- **THEN** the linter produces a warning: "Use design token instead of hardcoded color value"

### Requirement: Style Pack Mappings
The system SHALL provide 4 style pack mappings that assign concrete values to all 30 canonical tokens: (1) Linear - clean, precise, blue-accented, (2) Cursor - dark, developer-focused, purple-accented, (3) Notion - light, minimal, warm-gray, (4) PostHog - vibrant, data-driven, yellow-accented. Each style pack SHALL be defined as a JSON object mapping token names to CSS values. The default style pack SHALL be "Tokyo Night" (dark, purple-blue, high contrast).

#### Scenario: Applying the Linear style pack
- **WHEN** the user selects the "Linear" style pack
- **THEN** all 30 tokens are remapped: `--background-primary` becomes `#ffffff`, `--accent` becomes `#5E6AD2`, `--font-sans` becomes `Inter`, and the UI immediately reflects the new values

#### Scenario: Default theme on first launch
- **WHEN** the application is launched for the first time
- **THEN** the "Tokyo Night" style pack is applied with values: `--background-primary: #1a1b26`, `--text-primary: #a9b1d6`, `--accent: #7aa2f7`

### Requirement: Runtime Theme Switching
The user SHALL be able to switch between style packs at runtime without reloading the application. Switching SHALL be accessible via: (1) Settings > Appearance, (2) the command palette (`Ctrl+T`), and (3) a quick-toggle in the sidebar footer. The selected theme SHALL be persisted in the `settings` table and restored on next launch.

#### Scenario: Switching theme via command palette
- **WHEN** the user presses `Ctrl+T` and selects "Notion" from the theme list
- **THEN** all CSS variables are updated instantly, no page reload occurs, and the "Notion" theme is persisted for the next application launch

#### Scenario: Switching theme in settings
- **WHEN** the user opens Settings > Appearance and clicks on the "PostHog" style pack card
- **THEN** the theme preview updates live, clicking "Apply" confirms the change, and the selection is persisted

### Requirement: CSS Variable Integration
All design tokens SHALL be exposed as CSS custom properties on the `:root` element. Components SHALL reference tokens via `var(--token-name)`. The theme switcher SHALL update these CSS variables on the document root, triggering an immediate repaint without JavaScript-driven style updates on individual components.

#### Scenario: Theme change triggers CSS repaint
- **WHEN** the style pack is changed from "Tokyo Night" to "Notion"
- **THEN** the `:root` CSS variables are updated, all components referencing `var(--background-primary)` immediately repaint with the new value, and no component-level JavaScript is required

### Requirement: Custom Token Override
Advanced users SHALL be able to override individual token values while keeping the rest of a style pack intact. Custom overrides SHALL be stored in a `theme-overrides.json` file in the user's config directory and applied after the style pack values.

#### Scenario: Overriding the accent color
- **WHEN** the user sets `--accent: #ff6b6b` in the custom overrides
- **THEN** the accent color throughout the UI changes to the custom red while all other tokens remain from the active style pack
