# Database Migration File Format

> Version: 1.0 | Date: 2026-05-22
> Task: P0.5.1 — Design migration file format

---

## Overview

Migrations are sequential TypeScript modules that transform the database schema from one version to the next. Each migration file defines an UP operation (forward) and a DOWN operation (rollback). The migration system uses a `schema_migrations` table to track applied versions.

---

## File Naming Convention

```
server/db/migrations/
├── 001_initial_schema.ts
├── 002_add_domain_color.ts
├── 003_add_timeline_indexes.ts
└── ...
```

**Pattern**: `{NNN}_{descriptive_name}.ts`
- `NNN`: Zero-padded 3-digit version number (001, 002, ..., 999)
- `descriptive_name`: snake_case description of what the migration does
- File extension: `.ts` (TypeScript module)

Version numbers MUST be sequential with no gaps. The runner validates this at startup.

---

## Migration Interface

```typescript
// server/db/migrations/types.ts

interface Migration {
  /** Unique version number, must match filename prefix */
  version: number;

  /** Human-readable description */
  description: string;

  /** List of version numbers this migration depends on */
  dependencies?: number[];

  /** Forward migration — applied in version order */
  up(db: Database): void;

  /** Rollback migration — applied in reverse version order */
  down(db: Database): void;
}
```

**`dependencies` field**: Explicitly declares which prior migrations must have been applied. Used for validation only — the runner enforces sequential execution regardless. Useful when a migration logically extends a specific prior migration (e.g., adding an index to a column created in migration 005).

---

## File Structure

Each migration file exports a single `Migration` object as the default export:

```typescript
// server/db/migrations/001_initial_schema.ts

import type { Migration } from "./types";

const migration: Migration = {
  version: 1,
  description: "Create initial schema with 14 tables",

  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL DEFAULT '#7aa2f7',
        icon TEXT,
        config_path TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_domains_name ON domains(name);
    `);
  },

  down(db) {
    db.exec("DROP TABLE IF EXISTS domains");
  },
};

export default migration;
```

---

## SQL Guidelines

### 1. Transaction Wrapping

The migration runner wraps each `up()` call in a transaction. Migration code should NOT manually manage transactions:

```typescript
// WRONG — double transaction
up(db) {
  db.exec("BEGIN");
  db.exec("CREATE TABLE ...");
  db.exec("COMMIT");
}

// CORRECT — runner handles transaction
up(db) {
  db.exec("CREATE TABLE ...");
}
```

### 2. Idempotency

Use `IF NOT EXISTS` / `IF EXISTS` to make migrations re-runnable:

```typescript
up(db) {
  db.exec("CREATE TABLE IF NOT EXISTS domains (...)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(name)");
}
```

### 3. Parameterized DDL

Migration SQL does not accept user input, so parameterized queries are not required for DDL statements. However, any DML (INSERT, UPDATE) in migrations MUST use parameterized queries.

### 4. SQLite Compatibility

All SQL MUST be compatible with SQLite 3.40+ and better-sqlite3:

- No `ALTER TABLE ... ADD CONSTRAINT` (not supported)
- No `CREATE OR REPLACE VIEW` (use `DROP + CREATE`)
- Use `TEXT` for ISO-8601 dates (no native datetime type)
- Foreign keys require `PRAGMA foreign_keys = ON`

---

## Version Tracking Table

The `schema_migrations` table is created automatically by the migration runner before any migrations run:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Schema**:
| Column | Type | Purpose |
|--------|------|---------|
| `version` | INTEGER PK | Migration version number |
| `description` | TEXT | Copied from migration file for audit trail |
| `applied_at` | TEXT | ISO-8601 timestamp when migration was applied |

---

## Example: Typical Migration

```typescript
// server/db/migrations/005_add_knowledge_comprehension.ts

import type { Migration } from "./types";

const migration: Migration = {
  version: 5,
  description: "Add comprehension_score column to knowledge_nodes",
  dependencies: [1], // Depends on initial schema creating knowledge_nodes

  up(db) {
    db.exec(`
      ALTER TABLE knowledge_nodes
        ADD COLUMN comprehension_score INTEGER NOT NULL DEFAULT 0
          CHECK (comprehension_score BETWEEN 0 AND 5);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_comprehension
        ON knowledge_nodes(comprehension_score);
    `);
  },

  down(db) {
    // SQLite doesn't support DROP COLUMN before 3.35.0
    // Recreate table without the column
    db.exec(`
      CREATE TABLE knowledge_nodes_backup AS
        SELECT id, domain_id, title, content, node_type, status,
               frontmatter, created_at, updated_at
        FROM knowledge_nodes;

      DROP TABLE knowledge_nodes;

      ALTER TABLE knowledge_nodes_backup RENAME TO knowledge_nodes;
    `);
  },
};

export default migration;
```

---

## Validation Rules

1. **Sequential numbering**: Versions must be 1, 2, 3, ... with no gaps
2. **Unique version per file**: Each file declares exactly one version
3. **Both up and down**: Every migration MUST implement both `up()` and `down()`
4. **No side effects**: Migrations must not import or call application services
5. **Deterministic**: Running `up()` on a clean DB must always produce the same schema
6. **Dependency satisfaction**: If `dependencies: [3]` is declared, migration 3 must exist in the applied list
