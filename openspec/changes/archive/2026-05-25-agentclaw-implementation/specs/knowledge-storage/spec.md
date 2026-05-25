## ADDED Requirements

### Requirement: Markdown File Format with YAML Frontmatter
Each knowledge node SHALL be stored as a Markdown file with YAML frontmatter. The frontmatter SHALL contain: `id` (UUID), `title`, `domain_id`, `tags` (array of strings), `source` (optional: url, pdf, manual, import, research), `confidence` (0.0-1.0), `created_at`, and `updated_at`. The body SHALL contain the knowledge content in Markdown format.

#### Scenario: Creating a knowledge file
- **WHEN** a new knowledge node is created with title "Transformer Architecture" and tags ["deep-learning", "attention"]
- **THEN** a file is written at `domains/{domain-slug}/knowledge/transformer-architecture.md` with the YAML frontmatter containing all metadata and the user-provided Markdown body

#### Scenario: Reading a knowledge file
- **WHEN** the system loads a knowledge file from disk
- **THEN** the YAML frontmatter is parsed into a typed metadata object, the Markdown body is extracted separately, and both are returned as a structured knowledge node object

### Requirement: Knowledge Node Parsing and Validation
The system SHALL parse YAML frontmatter using a strict schema validator. Invalid frontmatter (missing required fields, wrong types) SHALL produce a validation error listing all issues. The parser SHALL handle edge cases: multi-line values, special characters in titles, empty bodies.

#### Scenario: Parsing a valid knowledge file
- **WHEN** the system encounters a well-formed Markdown file with complete YAML frontmatter
- **THEN** the file is parsed into a `KnowledgeNode` object with all fields populated and no errors

#### Scenario: Parsing a file with missing required fields
- **WHEN** the system encounters a Markdown file with YAML frontmatter missing the `title` field
- **THEN** a validation error is returned: "Missing required field: title"; the file is NOT loaded into the knowledge base and is flagged for manual correction

### Requirement: Knowledge CRUD Operations
The system SHALL support creating, reading, updating, and deleting knowledge nodes through both the UI and the `knowledge_write` custom tool. Create and update operations SHALL trigger embedding generation and vector index update. Delete SHALL remove the file and its vector entry.

#### Scenario: Updating a knowledge node via UI
- **WHEN** the user edits a knowledge node's content and tags in the knowledge editor and clicks "Save"
- **THEN** the Markdown file is updated on disk, the database record is updated, the embedding is regenerated, the vector index is updated, and a git auto-commit is triggered

#### Scenario: Deleting a knowledge node
- **WHEN** the user deletes a knowledge node
- **THEN** the file is moved to a `.trash/` directory (not permanently deleted), the database record is soft-deleted, the vector entry is removed, and a git auto-commit is triggered

### Requirement: Per-Domain Knowledge List Rendering
The center panel SHALL display a paginated list of knowledge nodes for the active domain. Each list item SHALL show: title, tags, source, confidence indicator, and last updated time. The list SHALL support sorting by title, date, and confidence. Filtering by tag and full-text search SHALL be available.

#### Scenario: Viewing knowledge nodes for a domain
- **WHEN** the user navigates to the knowledge view for the "Machine Learning" domain
- **THEN** a paginated list (20 items per page) of knowledge nodes is displayed, sorted by `updated_at` descending, with each item showing title, tags as colored pills, source badge, and relative timestamp

#### Scenario: Filtering by tag
- **WHEN** the user clicks the "attention" tag pill in the filter bar
- **THEN** the list is filtered to show only knowledge nodes tagged with "attention", and the result count updates accordingly
