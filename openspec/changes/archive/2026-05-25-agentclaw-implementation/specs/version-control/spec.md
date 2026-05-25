## ADDED Requirements

### Requirement: Automatic Git Initialization
The system SHALL automatically initialize a Git repository in the application data directory on first run. Each domain's directory SHALL be tracked within this repository. The `.gitignore` SHALL exclude binary files, embeddings cache, and temporary files. The initial commit SHALL be created automatically with a descriptive message.

#### Scenario: First application launch
- **WHEN** the application is launched for the first time and no Git repository exists
- **THEN** `git init` is executed in the data directory, a `.gitignore` is created, and an initial commit "Initial AgentClaw setup" is made

#### Scenario: Subsequent launches
- **WHEN** the application is launched and a Git repository already exists
- **THEN** no initialization occurs and the application proceeds normally

### Requirement: Pre-Write Auto-Commit Hook
The system SHALL automatically commit changes to knowledge files, domain configurations, and research artifacts before each write operation. Commits SHALL use descriptive messages generated from the operation type and target (e.g., "Update knowledge: [node title] in [domain name]"). The auto-commit MUST complete within 200ms.

#### Scenario: Editing a knowledge node
- **WHEN** the user saves changes to a knowledge node's content
- **THEN** the system stages the updated markdown file, creates a commit "Update knowledge: [title] in [domain]", and the save operation returns success only after the commit completes

#### Scenario: Rapid successive edits
- **WHEN** the user saves multiple knowledge nodes within 5 seconds
- **THEN** each save produces a separate commit; commits are NOT batched or squashed automatically

### Requirement: Diff Visualization Component
The system SHALL provide a diff viewer that displays the differences between any two commits for a given file. The diff SHALL use standard unified diff format with color-coded additions (green) and deletions (red). The viewer SHALL support side-by-side and inline modes.

#### Scenario: Viewing changes to a knowledge node
- **WHEN** the user opens the version history for a knowledge node and selects two commits
- **THEN** a diff view displays the text changes between those versions with additions highlighted in green and deletions in red

#### Scenario: No differences between selected commits
- **WHEN** the user selects two commits where the file content is identical
- **THEN** the diff viewer displays "No changes between selected versions"

### Requirement: One-Click Rollback
The system SHALL allow users to rollback any file to a previous commit with a single action. Rollback SHALL require confirmation. After rollback, a new commit SHALL be created documenting the rollback action. The current state SHALL be preserved as a "pre-rollback" commit.

#### Scenario: Rolling back a knowledge node to a previous version
- **WHEN** the user views a diff and clicks "Restore this version"
- **THEN** a confirmation dialog appears; upon confirmation, a pre-rollback commit is created, the file is restored to the selected version, and a post-rollback commit "Rollback [file] to [commit hash]" is created

#### Scenario: Rolling back a domain configuration
- **WHEN** the user rolls back a domain's `config.yaml` to a previous version
- **THEN** the configuration is restored, all dependent features (research schedule, default model) are re-initialized with the restored values, and a notification confirms the rollback
