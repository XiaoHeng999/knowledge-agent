## ADDED Requirements

### Requirement: Schema Definition
The database SHALL consist of 14 tables: `domains`, `knowledge_nodes`, `knowledge_edges`, `conversations`, `messages`, `inbox_items`, `imports`, `research_runs`, `predictions`, `decisions`, `framework_results`, `skills`, `model_configs`, and `settings`. Every table MUST have `id` (TEXT PRIMARY KEY), `created_at` (TEXT ISO-8601), and `updated_at` (TEXT ISO-8601) columns. Foreign key constraints SHALL be enforced with `PRAGMA foreign_keys = ON`.

#### Scenario: Fresh database creation
- **WHEN** the application starts and no database file exists at the configured path
- **THEN** all 14 tables are created with correct schemas, foreign keys, and indexes within 500ms

#### Scenario: Schema validation on startup
- **WHEN** the application starts and a database file already exists
- **THEN** the migration runner validates the schema version and applies any pending migrations before the application becomes interactive

### Requirement: Migration Runner with Version Tracking
The database SHALL use a sequential migration system stored in a `schema_migrations` table. Each migration SHALL have a unique version number, a description, and a timestamp. Migrations MUST run inside a transaction and MUST be idempotent on re-run within the same version.

#### Scenario: Applying pending migrations
- **WHEN** the application detects that the current schema version is behind the latest available migration
- **THEN** all pending migrations are applied sequentially within a transaction; if any migration fails, the entire batch is rolled back and an error is reported

#### Scenario: Zero pending migrations
- **WHEN** the application starts and the schema version matches the latest migration
- **THEN** no migration operations are executed and startup continues normally

### Requirement: Vector Operations with SQLite-vec
The database SHALL integrate SQLite-vec for vector similarity search on the `knowledge_nodes` table. Each knowledge node SHALL store a 1536-dimensional embedding in a `vss_nodes` virtual table. The vector index MUST support cosine distance queries returning the top-K results within 50ms for up to 100,000 vectors.

#### Scenario: Inserting a knowledge node with embedding
- **WHEN** a knowledge node is created with text content
- **THEN** the text is embedded via the configured embedding model and the resulting vector is inserted into the `vss_nodes` virtual table linked to the node's ID

#### Scenario: Vector similarity search
- **WHEN** a user performs a hybrid search query
- **THEN** the system queries `vss_nodes` with the query embedding using cosine distance and returns the top 20 results ranked by similarity score

### Requirement: Repository CRUD Layer
Each table SHALL have a corresponding TypeScript Repository class providing `create`, `read`, `update`, `delete`, and `list` methods. All repository methods MUST accept and return strongly typed domain objects, not raw SQL rows. The repository layer SHALL use prepared statements with parameterized queries to prevent SQL injection.

#### Scenario: Creating a domain via repository
- **WHEN** `domainsRepository.create({ name, description, color, icon })` is called
- **THEN** a new row is inserted into the `domains` table with a generated UUID, current timestamps, and the provided values; the full domain object is returned

#### Scenario: Listing knowledge nodes for a domain
- **WHEN** `knowledgeNodesRepository.list({ domainId, limit, offset })` is called
- **THEN** an array of typed knowledge node objects is returned, ordered by `updated_at` descending, with pagination applied

### Requirement: Connection Management with WAL Mode
The database connection SHALL be opened in WAL (Write-Ahead Logging) mode to support concurrent reads from the renderer process. A single connection SHALL be maintained in the main process and accessed via the IPC bridge. Connection cleanup MUST occur on application quit.

#### Scenario: Concurrent read and write operations
- **WHEN** a write operation (e.g., inserting a knowledge node) is in progress and a read operation (e.g., listing domains) is requested simultaneously
- **THEN** the read operation completes without blocking, returning consistent data from the WAL snapshot
