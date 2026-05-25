## ADDED Requirements

### Requirement: Error Registry for All Features
The system SHALL maintain a centralized error registry covering all 12 core features. Each error entry SHALL define: error code (e.g., `CHAT.API_FAILURE`), severity level (critical/warning/info), user-facing message, recovery strategy (retry/fallback/graceful-degrade), and logging level. The registry SHALL be a TypeScript constant object accessible to all modules.

#### Scenario: Looking up an error by code
- **WHEN** a module encounters an API failure during chat
- **THEN** it looks up `CHAT.API_FAILURE` in the error registry, retrieves the user-facing message "Unable to reach the AI model. Your message has been saved as a draft.", and displays it with the configured recovery button "Retry"

#### Scenario: Unknown error handling
- **WHEN** a module encounters an error not defined in the registry
- **THEN** the system falls back to a generic error entry with code `SYSTEM.UNKNOWN`, displays "An unexpected error occurred", logs the full stack trace for debugging, and offers a "Report Issue" action

### Requirement: TOP 5 Error UI States
The system SHALL define explicit UI states for the 5 most critical error scenarios:

1. **API Fail Mid-Chat**: The last user message shows a retry banner; the draft is preserved; the input remains enabled.
2. **Model Unavailable**: The model selector shows a red indicator; a notification suggests switching models; the current conversation is preserved.
3. **Import Failure**: The import item shows an error badge with the failure reason; a retry button is displayed; the raw content remains accessible.
4. **Database Lock**: A modal overlay informs the user of a temporary database lock; automatic retry occurs every 2 seconds for up to 30 seconds; manual retry is available.
5. **Graph Render Failure**: The graph view falls back to a list view; an error banner offers "Retry Graph" and "Report Issue" actions.

#### Scenario: API failure during chat message generation
- **WHEN** the AI model API returns a 500 error while generating a response
- **THEN** the user's message is preserved with a red retry banner "Generation failed. Tap to retry.", the chat input remains enabled for continued use, and the retry button re-sends the same message

#### Scenario: Database lock during concurrent writes
- **WHEN** a write operation fails due to SQLite database lock
- **THEN** a non-blocking modal appears: "Saving... The database is temporarily busy.", automatic retry occurs every 2 seconds for up to 30 seconds, and on success the modal dismisses silently

### Requirement: Toast Notification System
The system SHALL provide a toast notification component for non-critical feedback. Toasts SHALL appear in the bottom-right corner, stack vertically with a maximum of 3 visible, auto-dismiss after 5 seconds (info) or 10 seconds (warning), and support 4 types: success (green), error (red), warning (yellow), info (blue). Each toast SHALL have an optional action button.

#### Scenario: Displaying a success toast
- **WHEN** a knowledge node is successfully created
- **THEN** a green toast appears in the bottom-right: "Knowledge node created" with an "View" action button that navigates to the node

#### Scenario: Displaying an error toast with retry
- **WHEN** a research run fails due to network error
- **THEN** a red toast appears: "Research run failed (network error)" with a "Retry" action button; the toast persists for 10 seconds or until dismissed

### Requirement: Structured Logging Pipeline
The system SHALL implement structured logging with the following fields: `timestamp`, `level` (debug/info/warn/error), `module`, `action`, `message`, `error` (optional stack trace), `context` (optional JSON). Logs SHALL be written to both the console (development) and a rotating log file (production, max 10MB, 5 files). Error-level logs SHALL include the full error registry entry.

#### Scenario: Logging an API failure with full context
- **WHEN** an API call to Anthropic fails with a 429 rate limit error
- **THEN** a structured log entry is written: `{ timestamp: "2026-05-22T14:30:00Z", level: "error", module: "expert-chat", action: "send_message", message: "API rate limit exceeded", error: "HTTP 429...", context: { model: "claude-sonnet", retryAfter: 60 } }`

#### Scenario: Log file rotation
- **WHEN** the active log file reaches 10MB
- **THEN** the current file is rotated to `agentclaw.log.1`, a new `agentclaw.log` is created, and files older than the 5th rotation are deleted
