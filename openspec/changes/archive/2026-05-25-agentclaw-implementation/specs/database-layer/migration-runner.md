# Migration Runner Design

> Version: 1.0 | Date: 2026-05-22
> Task: P0.5.2 — Design migration runner

---

## Overview

The migration runner manages database schema versioning. It tracks applied migrations in `schema_migrations`, applies pending migrations in order, and supports rollback. The runner executes at application startup before any service becomes interactive.

---

## Architecture

```
Application Startup
    │
    ▼
Database Connection (WAL mode, foreign_keys ON)
    │
    ▼
MigrationRunner.run()
    │
    ├── 1. Ensure schema_migrations table exists
    ├── 2. Load all applied versions from DB
    ├── 3. Load all migration files from server/db/migrations/
    ├── 4. Validate migration integrity (sequential, no gaps)
    ├── 5. Compute pending migrations (versions not in applied list)
    ├── 6. Apply pending migrations in version order
    │       Each migration: BEGIN → up(db) → INSERT INTO schema_migrations → COMMIT
    └── 7. Report status (applied N, current version: M)
```

---

## API

```typescript
// server/db/migrations/runner.ts

interface MigrationRunnerResult {
  /** Number of migrations applied this run */
  applied: number;
  /** Current schema version after this run */
  currentVersion: number;
  /** List of applied version numbers */
  appliedVersions: number[];
}

interface MigrationRunnerRollbackResult {
  /** Number of migrations rolled back */
  rolledBack: number;
  /** Schema version after rollback */
  currentVersion: number;
}

class MigrationRunner {
  constructor(db: Database);

  /** Apply all pending migrations. Called at startup. */
  run(): MigrationRunnerResult;

  /** Roll back migrations to a target version. Called manually. */
  rollback(targetVersion: number): MigrationRunnerRollbackResult;

  /** Get current schema version without applying migrations. */
  getCurrentVersion(): number;

  /** Get list of all applied migrations with timestamps. */
  getAppliedMigrations(): Array<{ version: number; description: string; appliedAt: string }>;

  /** Validate migration files without applying them. */
  validate(): { valid: boolean; errors: string[] };
}
```

---

## Execution Strategy

### Pending Migration Detection

```
Applied versions from DB: [1, 2, 3]
Available migration files: [1, 2, 3, 4, 5]
Pending: [4, 5]
```

The runner computes `available_versions - applied_versions` and sorts by version ascending.

### Forward Migration (run)

For each pending migration in version order:

```typescript
for (const migration of pendingMigrations) {
  db.transaction(() => {
    migration.up(db);

    db.prepare(
      "INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, datetime('now'))"
    ).run(migration.version, migration.description);
  })();
}
```

**Transaction scope**: Each migration runs in its own transaction. If migration 4 succeeds but migration 5 fails, migration 4's changes are preserved and migration 5 is not recorded. On next startup, only migration 5 is re-attempted.

### Batch Transaction Mode (Optional)

For fresh databases with many pending migrations, the runner can optionally wrap all migrations in a single transaction for faster execution:

```typescript
// Only when applying ALL migrations to an empty database
if (appliedVersions.length === 0 && pendingMigrations.length > 5) {
  db.transaction(() => {
    for (const migration of pendingMigrations) {
      migration.up(db);
      insertMigrationRecord(migration);
    }
  })();
}
```

This reduces WAL overhead for initial setup. Batch mode is only used when no migrations have been applied (fresh DB).

### Rollback (rollback)

Rollback applies `down()` migrations in reverse version order:

```
Current version: 5
Target version: 3
Rollback: down(5) → down(4) → done
```

```typescript
const toRollback = appliedMigrations
  .filter(m => m.version > targetVersion)
  .sort((a, b) => b.version - a.version); // reverse order

for (const migration of toRollback) {
  db.transaction(() => {
    migration.down(db);
    db.prepare("DELETE FROM schema_migrations WHERE version = ?").run(migration.version);
  })();
}
```

Each rollback step is also wrapped in its own transaction.

---

## Validation

The runner validates migration integrity before applying any changes:

### 1. Sequential Check

```typescript
const versions = migrations.map(m => m.version).sort((a, b) => a - b);
for (let i = 0; i < versions.length; i++) {
  if (versions[i] !== i + 1) {
    throw new Error(`Gap in migration versions: expected ${i + 1}, found ${versions[i]}`);
  }
}
```

### 2. Duplicate Check

```typescript
const uniqueVersions = new Set(versions);
if (uniqueVersions.size !== versions.length) {
  throw new Error("Duplicate migration version detected");
}
```

### 3. Dependency Check

```typescript
for (const migration of migrations) {
  if (migration.dependencies) {
    for (const dep of migration.dependencies) {
      if (!appliedVersions.includes(dep) && !versions.includes(dep)) {
        throw new Error(`Migration ${migration.version} depends on ${dep}, which is not applied`);
      }
    }
  }
}
```

### 4. Interface Check

Each migration must implement both `up()` and `down()` as functions.

---

## Error Handling

### Migration Failure During `up()`

```
Scenario: Migration 5 fails during up()

Result:
- Migration 5's transaction is rolled back
- Migrations 1-4 remain applied
- schema_migrations records 1-4 only
- Error is logged with full SQL details
- Application starts normally (migration 5 will be re-attempted next launch)
```

### Migration Failure During `down()`

```
Scenario: Rollback of migration 5 fails during down()

Result:
- Transaction is rolled back (no changes applied)
- Application schema remains at version 5
- Error is logged with suggestion to manually fix
- Rollback operation returns error to caller
```

### Corrupted schema_migrations Table

```
Scenario: schema_migrations table is missing or corrupted

Recovery:
- Runner attempts to recreate schema_migrations
- If recreation fails, application exits with error code 1
- User is directed to manual recovery documentation
```

---

## Startup Integration

```typescript
// electron/main.ts (simplified)

import { createConnection } from "./server/db/connection";
import { MigrationRunner } from "./server/db/migrations/runner";

async function initializeDatabase() {
  const db = createConnection();

  // Configure SQLite pragmas
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  // Run migrations
  const runner = new MigrationRunner(db);
  const result = runner.run();

  if (result.applied > 0) {
    console.log(`Applied ${result.applied} migrations. Current version: ${result.currentVersion}`);
  }

  return db;
}
```

---

## Logging

Each migration operation logs:

```
[MigrationRunner] Starting migration run
[MigrationRunner] Current version: 3, Pending: 2 migrations
[MigrationRunner] Applying migration 4: "Add domain color column"
[MigrationRunner] Migration 4 applied successfully (12ms)
[MigrationRunner] Applying migration 5: "Add timeline indexes"
[MigrationRunner] Migration 5 applied successfully (8ms)
[MigrationRunner] Run complete. Applied: 2, Current version: 5
```

On error:

```
[MigrationRunner] ERROR: Migration 5 failed: SQLITE_ERROR: table "foo" already exists
[MigrationRunner] Rolling back migration 5 transaction
[MigrationRunner] Run complete with errors. Applied: 1/2, Current version: 4
```

---

## Performance

| Scenario | Time Budget |
|----------|-------------|
| Fresh DB (14 tables, initial schema) | < 500ms |
| 1 pending migration (typical) | < 50ms |
| 0 pending migrations (common) | < 10ms (read + compare only) |
| Rollback 1 migration | < 50ms |
| Validation (no apply) | < 5ms |

---

## Rollback Safety

- Rollback is only available through the Settings UI or CLI, never automatic
- Before rollback, the runner creates a backup: `database.db.bak.{version}`
- Users must confirm rollback with a dialog showing what will be removed
- Rollback is blocked if any service has active write operations
