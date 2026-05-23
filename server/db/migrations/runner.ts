import type { BetterSqlite3Database } from "../connection";
import type { Migration } from "./types";
import fs from "fs";
import path from "path";

export interface MigrationRunnerResult {
  applied: number;
  currentVersion: number;
  appliedVersions: number[];
}

export interface MigrationRollbackResult {
  rolledBack: number;
  currentVersion: number;
}

export interface AppliedMigration {
  version: number;
  description: string;
  appliedAt: string;
}

const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export class MigrationRunner {
  constructor(private db: BetterSqlite3Database) {}

  run(migrations: Migration[]): MigrationRunnerResult {
    this.ensureMigrationsTable();

    const applied = this.getAppliedVersions();
    const pending = migrations
      .filter((m) => !applied.has(m.version))
      .sort((a, b) => a.version - b.version);

    if (pending.length === 0) {
      const currentVersion = this.getCurrentVersion();
      console.log(`[MigrationRunner] No pending migrations. Current version: ${currentVersion}`);
      return { applied: 0, currentVersion, appliedVersions: [] };
    }

    this.validateMigrations(migrations, applied);

    const isFreshDb = applied.size === 0 && pending.length > 5;
    const appliedVersions: number[] = [];

    const applyAll = (migs: Migration[]) => {
      for (const migration of migs) {
        const start = performance.now();
        this.db.transaction(() => {
          migration.up(this.db);
          this.db
            .prepare(
              "INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, datetime('now'))",
            )
            .run(migration.version, migration.description);
        })();
        appliedVersions.push(migration.version);
        const elapsed = Math.round(performance.now() - start);
        console.log(
          `[MigrationRunner] Migration ${migration.version}: "${migration.description}" applied (${elapsed}ms)`,
        );
      }
    };

    if (isFreshDb) {
      this.db.transaction(() => applyAll(pending));
    } else {
      applyAll(pending);
    }

    const currentVersion = this.getCurrentVersion();
    console.log(
      `[MigrationRunner] Run complete. Applied: ${appliedVersions.length}, Current version: ${currentVersion}`,
    );
    return { applied: appliedVersions.length, currentVersion, appliedVersions };
  }

  rollback(migrations: Migration[], targetVersion: number): MigrationRollbackResult {
    this.ensureMigrationsTable();

    const appliedRows = this.getAppliedMigrations();
    const toRollback = appliedRows
      .filter((m) => m.version > targetVersion)
      .sort((a, b) => b.version - a.version);

    if (toRollback.length === 0) {
      return { rolledBack: 0, currentVersion: this.getCurrentVersion() };
    }

    let rolledBack = 0;

    for (const row of toRollback) {
      const migration = migrations.find((m) => m.version === row.version);
      if (!migration) {
        console.error(
          `[MigrationRunner] ERROR: Migration file for version ${row.version} not found. Cannot rollback.`,
        );
        break;
      }

      this.db.transaction(() => {
        migration.down(this.db);
        this.db.prepare("DELETE FROM schema_migrations WHERE version = ?").run(migration.version);
      })();
      rolledBack++;
      console.log(`[MigrationRunner] Rolled back migration ${migration.version}`);
    }

    return { rolledBack, currentVersion: this.getCurrentVersion() };
  }

  getCurrentVersion(): number {
    const row = this.db
      .prepare("SELECT MAX(version) as v FROM schema_migrations")
      .get() as { v: number | null } | undefined;
    return row?.v ?? 0;
  }

  getAppliedMigrations(): AppliedMigration[] {
    this.ensureMigrationsTable();
    const rows = this.db
      .prepare("SELECT version, description, applied_at FROM schema_migrations ORDER BY version")
      .all() as AppliedMigration[];
    return rows;
  }

  validate(migrations: Migration[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const versions = migrations.map((m) => m.version).sort((a, b) => a - b);

    for (let i = 0; i < versions.length; i++) {
      if (versions[i] !== i + 1) {
        errors.push(`Gap in migration versions: expected ${i + 1}, found ${versions[i]}`);
      }
    }

    const uniqueVersions = new Set(versions);
    if (uniqueVersions.size !== versions.length) {
      errors.push("Duplicate migration version detected");
    }

    for (const migration of migrations) {
      if (typeof migration.up !== "function" || typeof migration.down !== "function") {
        errors.push(`Migration ${migration.version} must implement both up() and down()`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private ensureMigrationsTable(): void {
    this.db.exec(MIGRATIONS_TABLE_SQL);
  }

  private getAppliedVersions(): Set<number> {
    const rows = this.db
      .prepare("SELECT version FROM schema_migrations")
      .all() as { version: number }[];
    return new Set(rows.map((r) => r.version));
  }

  private validateMigrations(migrations: Migration[], applied: Set<number>): void {
    const result = this.validate(migrations);
    if (!result.valid) {
      throw new Error(`Migration validation failed:\n${result.errors.join("\n")}`);
    }

    const allVersions = new Set([...applied, ...migrations.map((m) => m.version)]);
    for (const migration of migrations) {
      if (migration.dependencies) {
        for (const dep of migration.dependencies) {
          if (!allVersions.has(dep)) {
            throw new Error(
              `Migration ${migration.version} depends on version ${dep}, which is not available`,
            );
          }
        }
      }
    }
  }
}
