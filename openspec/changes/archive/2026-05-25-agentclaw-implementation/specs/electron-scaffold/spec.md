## ADDED Requirements

### Requirement: Project Initialization
The application SHALL be bootstrapped as an Electron application embedding a Next.js 15 renderer. The main process SHALL be written in TypeScript. The Next.js dev server SHALL start automatically in development mode, and in production the exported static build SHALL be loaded via `file://` protocol.

#### Scenario: First launch in development mode
- **WHEN** a developer runs `npm run dev`
- **THEN** Electron main process launches, Next.js dev server starts on a dynamic port, and the BrowserWindow loads `localhost:<port>` within 5 seconds

#### Scenario: Production build loads static export
- **WHEN** the packaged application launches
- **THEN** the BrowserWindow loads the Next.js static export from the `out/` directory via the `file://` protocol without requiring a running HTTP server

### Requirement: Three-Column Responsive Layout
The UI SHALL present a persistent three-column layout: (1) left sidebar for domain navigation, (2) center panel for primary content (chat, knowledge list, inbox), and (3) right panel for detail/context views. The layout SHALL collapse responsively at 900px and 1200px breakpoints.

#### Scenario: Wide viewport above 1200px
- **WHEN** the window width exceeds 1200px
- **THEN** all three columns are visible simultaneously with the sidebar at 260px, center panel at flex-grow, and right panel at 380px

#### Scenario: Medium viewport between 900px and 1200px
- **WHEN** the window width is between 900px and 1200px
- **THEN** the right panel collapses into a slide-over overlay triggered by user action, while the sidebar and center panel remain visible

#### Scenario: Narrow viewport below 900px
- **WHEN** the window width falls below 900px
- **THEN** only the center panel is visible; both sidebar and right panel become slide-over overlays accessible via hamburger and info-toggle buttons

### Requirement: IPC Bridge and Preload Security
All communication between the renderer process and the main process SHALL occur through a contextBridge preload script. The preload script SHALL expose a strictly typed `window.api` object. No `nodeIntegration` or `contextIsolation: false` SHALL ever be used.

#### Scenario: Renderer invokes a privileged operation
- **WHEN** the Next.js renderer needs to read a file from disk
- **THEN** it calls `window.api.fs.readFile(path)` which proxies through the preload contextBridge to the main process IPC handler, and the result is returned as a Promise

#### Scenario: Security audit of BrowserWindow configuration
- **WHEN** a BrowserWindow is created
- **THEN** `nodeIntegration` MUST be `false`, `contextIsolation` MUST be `true`, and `sandbox` MUST be `true`

### Requirement: Window Lifecycle Management
The application SHALL support single-instance locking, tray minimization, and graceful shutdown. The main process MUST prevent multiple instances and MUST persist window bounds across restarts.

#### Scenario: User launches a second instance
- **WHEN** a second instance of the application is launched
- **THEN** the first instance's window is brought to focus and the second instance exits immediately

#### Scenario: User closes the window
- **WHEN** the user clicks the window close button
- **THEN** the window hides to the system tray instead of quitting; the application only fully quits when the user selects "Quit" from the tray context menu

### Requirement: IPC Channel Registry
All IPC channels SHALL be registered in a central registry with TypeScript type definitions for both request and response payloads. Channels SHALL be grouped by domain (fs, db, models, domains, knowledge, inbox, research, settings).

#### Scenario: Developer adds a new IPC handler
- **WHEN** a developer registers a new IPC handler in the main process
- **THEN** the channel name MUST appear in the typed registry, and the preload bridge MUST expose a corresponding typed method that compiles without `any` casts
