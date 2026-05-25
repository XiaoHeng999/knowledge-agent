## ADDED Requirements

### Requirement: Domain CRUD Operations
The system SHALL support creating, reading, updating, and deleting domains. Each domain SHALL have a unique name, an optional description, a color (hex), an icon identifier, and timestamps. Domain deletion SHALL be soft-delete with a confirmation prompt; deleted domains and their associated data SHALL be recoverable for 30 days.

#### Scenario: Creating a new domain
- **WHEN** the user clicks "New Domain" and provides a name, optional description, color, and icon
- **THEN** a new domain entry is created in the database, a corresponding directory structure is created on disk, and the domain appears in the left sidebar

#### Scenario: Deleting a domain
- **WHEN** the user clicks "Delete Domain" and confirms the action
- **THEN** the domain is soft-deleted (marked with `deleted_at` timestamp), removed from the sidebar, but all associated files and database records are retained for 30 days

### Requirement: Plugin-Style Directory Structure
Each domain SHALL be created with a standardized directory structure: `knowledge/` for markdown files, `extensions/` for custom tools and prompts, `templates/` for domain-specific templates, `research/` for research artifacts, and `config.yaml` for domain configuration. The directory root SHALL be configurable via application settings.

#### Scenario: Domain directory creation
- **WHEN** a new domain "Machine Learning" is created
- **THEN** the following directory tree is created: `domains/machine-learning/{knowledge/,extensions/,templates/,research/,config.yaml}`

#### Scenario: Domain directory already exists
- **WHEN** a domain directory already exists on disk (e.g., from a previous installation)
- **THEN** the system verifies the directory structure, creates any missing subdirectories, and links the domain to the existing files without data loss

### Requirement: Config.yaml Parsing and Validation
Each domain's `config.yaml` SHALL define: `name`, `description`, `color`, `icon`, `default_model`, `research_schedule`, `sources`, and `extensions` fields. The system SHALL parse this file on domain load and validate it against a JSON schema. Invalid configurations SHALL produce a descriptive error without crashing.

#### Scenario: Loading a valid config.yaml
- **WHEN** the user activates a domain with a valid `config.yaml`
- **THEN** the domain settings are parsed and applied: the default model is set, research schedule is configured, and sources are loaded into the research agent

#### Scenario: Loading an invalid config.yaml
- **WHEN** the user activates a domain with an invalid `config.yaml` (e.g., unknown field, wrong type)
- **THEN** a warning notification is displayed identifying the invalid field, the domain loads with default values for invalid fields, and the user is offered a link to edit the configuration

### Requirement: Domain Listing and Navigation
The left sidebar SHALL display all active (non-deleted) domains sorted alphabetically. Each domain entry SHALL show its icon, name, and a count of unread inbox items. Clicking a domain SHALL activate it and load its content in the center panel. The active domain SHALL be visually highlighted.

#### Scenario: Viewing the domain list
- **WHEN** the user views the left sidebar
- **THEN** all active domains are listed alphabetically, each showing its colored icon, name, and a badge with the count of unread inbox items

#### Scenario: Switching active domain
- **WHEN** the user clicks on a different domain in the sidebar
- **THEN** the center panel loads the selected domain's overview (recent knowledge, inbox summary, active predictions), and the sidebar highlights the new active domain
