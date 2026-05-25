## ADDED Requirements

### Requirement: Build Configuration for All Platforms
The system SHALL support building distributable packages for three platforms:

- **macOS**: DMG installer for arm64 (Apple Silicon) and x64 (Intel), code-signed and notarized
- **Windows**: NSIS installer and Portable `.exe` for x64, with optional code signing
- **Linux**: AppImage, `.deb` (Debian/Ubuntu), and `.rpm` (Fedora/RHEL) for x64

Builds SHALL be configured via `electron-builder` in `package.json`. Each platform target SHALL be defined in the build config with appropriate metadata (app ID, category, file associations).

#### Scenario: Building for macOS Apple Silicon
- **WHEN** the developer runs `npm run build:mac -- --arm64`
- **THEN** a DMG file is produced targeting arm64 architecture, including the app bundle with embedded Next.js static export, and the output is placed in `dist/`

#### Scenario: Building for Windows
- **WHEN** the developer runs `npm run build:win`
- **THEN** both an NSIS installer `.exe` and a Portable `.exe` are produced for x64, with Windows-specific metadata (app ID, installer options) configured

#### Scenario: Building for Linux
- **WHEN** the developer runs `npm run build:linux`
- **THEN** AppImage, `.deb`, and `.rpm` files are produced for x64, with Linux-specific metadata (categories, mime types) configured

### Requirement: Platform Detection and Conditional Behavior
The system SHALL detect the current platform at runtime using `process.platform` and adjust behavior accordingly. Platform-specific behaviors SHALL include: (1) keyboard shortcut mappings (Cmd vs Ctrl), (2) menu bar integration (macOS native menu vs in-app menu), (3) tray icon behavior, and (4) default font rendering.

#### Scenario: Keyboard shortcuts on macOS vs Windows/Linux
- **WHEN** the application runs on macOS
- **THEN** keyboard shortcuts use `Cmd` as the modifier key (e.g., `Cmd+K` for command palette); on Windows/Linux, shortcuts use `Ctrl` (e.g., `Ctrl+K`)

#### Scenario: Native menu bar on macOS
- **WHEN** the application runs on macOS
- **THEN** the application menu is integrated into the native macOS menu bar; on Windows/Linux, an in-app menu bar is rendered

### Requirement: Cross-Platform Path Abstraction
The system SHALL use a path abstraction layer that resolves file paths correctly for each platform. The abstraction SHALL handle: data directory (`~/Library/Application Support/AgentClaw` on macOS, `%APPDATA%/AgentClaw` on Windows, `~/.config/AgentClaw` on Linux), log directory, temp directory, and domain storage paths. All path joins SHALL use `path.join()` or `path.resolve()` to handle platform-specific separators.

#### Scenario: Resolving the data directory on each platform
- **WHEN** the application starts on macOS
- **THEN** the data directory resolves to `~/Library/Application Support/AgentClaw`
- **WHEN** the application starts on Windows
- **THEN** the data directory resolves to `%APPDATA%/AgentClaw`
- **WHEN** the application starts on Linux
- **THEN** the data directory resolves to `~/.config/AgentClaw`

#### Scenario: Path separators in domain file paths
- **WHEN** the system constructs a path to a knowledge file
- **THEN** `path.join(dataDir, 'domains', domainSlug, 'knowledge', filename)` is used, producing correct separators on all platforms

### Requirement: Auto-Update with electron-updater
The system SHALL integrate `electron-updater` for automatic application updates. On macOS and Windows, updates SHALL be downloaded from a GitHub Releases feed. On Linux, the user SHALL be directed to download the new AppImage/deb/rpm manually. The update check SHALL run on application startup and every 4 hours thereafter. The user SHALL be prompted before an update is installed.

#### Scenario: Update available on macOS
- **WHEN** the application detects a newer version on the GitHub Releases feed
- **THEN** a notification appears: "Update available: v1.2.0. Download and install?" with "Update" and "Later" buttons; clicking "Update" downloads and installs the update, then prompts to restart

#### Scenario: Update check fails
- **WHEN** the update check cannot reach the GitHub Releases feed (network error)
- **THEN** the failure is logged silently, no notification is shown to the user, and the next scheduled check proceeds normally

#### Scenario: Linux update notification
- **WHEN** a newer version is detected on Linux
- **THEN** a notification appears: "Update available: v1.2.0. Download from GitHub." with a link to the releases page, since auto-update is not supported on Linux
