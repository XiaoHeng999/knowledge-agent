## ADDED Requirements

### Requirement: Keyboard Navigation and Tab Order
All interactive elements SHALL be reachable via keyboard Tab navigation in a logical reading order (left-to-right, top-to-bottom). The tab order SHALL follow: sidebar domains -> sidebar actions -> center panel content -> center panel actions -> right panel content -> right panel actions. Focus indicators SHALL be visible with a 2px solid ring using the `--accent` color token. Tab navigation SHALL cycle within modal focus traps.

#### Scenario: Navigating the main layout with keyboard
- **WHEN** the user presses Tab repeatedly from the sidebar
- **THEN** focus moves through: first domain -> subsequent domains -> "New Domain" button -> center panel search bar -> knowledge list items -> right panel content, in that order

#### Scenario: Focus trap in a modal dialog
- **WHEN** a modal dialog is open and the user presses Tab on the last focusable element
- **THEN** focus wraps to the first focusable element in the modal, preventing focus from escaping to the underlying page

### Requirement: ARIA Attributes and Labels
All interactive elements SHALL have appropriate ARIA attributes: `aria-label` for icon-only buttons, `aria-expanded` for collapsible sections, `aria-selected` for tabs and list items, `aria-live="polite"` for dynamic content updates (chat messages, notifications), `aria-live="assertive"` for error messages, and `role` attributes for custom widgets. All images and icons SHALL have `aria-label` or `aria-hidden="true"` (for decorative).

#### Scenario: Chat message area announces new messages
- **WHEN** a new AI response appears in the chat
- **THEN** the message is appended to a region with `aria-live="polite"`, causing screen readers to announce the new content

#### Scenario: Collapsible sidebar sections
- **WHEN** a sidebar section (e.g., "Domains") is rendered
- **THEN** the toggle button has `aria-expanded="true/false"`, `aria-controls="domain-list"`, and the controlled section has `id="domain-list"` and `aria-hidden` matching the collapsed state

### Requirement: Focus Management
The system SHALL manage focus programmatically in these scenarios: (1) modal open -> focus moves to first interactive element in modal, (2) modal close -> focus returns to the trigger element, (3) route change -> focus moves to the main content heading, (4) toast appears -> focus does NOT move (non-modal notification). Focus management SHALL be implemented using `focus()` with `{ preventScroll: true }` where appropriate.

#### Scenario: Opening the domain creation modal
- **WHEN** the user clicks "New Domain" and the modal opens
- **THEN** focus is programmatically moved to the "Domain Name" input field inside the modal

#### Scenario: Closing the domain creation modal
- **WHEN** the user presses Escape or clicks the close button in the modal
- **THEN** focus returns to the "New Domain" button that triggered the modal

### Requirement: Color Contrast WCAG AA Compliance
All text and interactive elements SHALL meet WCAG AA contrast ratios: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold), and 3:1 for interactive components and graphical objects. Contrast SHALL be verified against all 5 style packs. The design token values for each style pack SHALL be validated against these thresholds.

#### Scenario: Verifying Tokyo Night theme contrast
- **WHEN** the Tokyo Night style pack is active
- **THEN** `--text-primary` (#a9b1d6) against `--background-primary` (#1a1b26) yields a contrast ratio of at least 4.5:1 for body text

#### Scenario: Style pack fails contrast check
- **WHEN** a custom theme override results in insufficient contrast
- **THEN** the system displays a warning: "Custom theme may not meet accessibility contrast requirements. Text readability could be affected."

### Requirement: Reduced Motion Support
The system SHALL respect the `prefers-reduced-motion: reduce` media query. When reduced motion is preferred: all CSS animations SHALL be disabled or reduced to opacity-only transitions (under 200ms), skeleton loading animations SHALL use static placeholder blocks, and auto-scrolling in chat SHALL be replaced with a "New messages" indicator.

#### Scenario: User has prefers-reduced-motion enabled
- **WHEN** the system detects `prefers-reduced-motion: reduce`
- **THEN** all slide/fade animations are replaced with instant state changes, the timeline scrolling becomes manual-only, and no auto-play animations occur

### Requirement: Minimum Touch Target Size
All interactive elements (buttons, links, inputs, toggles) SHALL have a minimum touch target size of 32x32 pixels. Elements that are visually smaller (e.g., icon buttons) SHALL use padding or an expanded click area to meet the minimum target size without changing the visual design.

#### Scenario: Icon-only button meets touch target
- **WHEN** an icon-only button (e.g., the sidebar collapse toggle) is rendered at 20x20 visual size
- **THEN** the clickable area is expanded to at least 32x32 via padding, ensuring the button is easily tappable on touch devices
