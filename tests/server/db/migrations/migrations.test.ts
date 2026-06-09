import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import type { BetterSqlite3Database } from "../../../../server/db/connection";
import { MigrationRunner } from "../../../../server/db/migrations/runner";
import { loadMigrations } from "../../../../server/db/migrations/index";
import type { Migration } from "../../../../server/db/migrations/types";

describe("loadMigrations", () => {
  it("returns migrations sorted by version ascending", () => {
    const migrations = loadMigrations();
    expect(migrations.length).toBeGreaterThanOrEqual(4);

    const versions = migrations.map((m) => m.version);
    for (let i = 1; i < versions.length; i++) {
      expect(versions[i]).toBeGreaterThan(versions[i - 1]);
    }
  });

  it("each migration has version, description, up, and down", () => {
    const migrations = loadMigrations();
    for (const m of migrations) {
      expect(m.version).toBeTypeOf("number");
      expect(m.description).toBeTypeOf("string");
      expect(typeof m.up).toBe("function");
      expect(typeof m.down).toBe("function");
    }
  });
});

describe("MigrationRunner.validate", () => {
  let db: BetterSqlite3Database;
  let runner: MigrationRunner;

  beforeEach(() => {
    db = new Database(":memory:");
    runner = new MigrationRunner(db);
  });

  function makeMigration(version: number, extra?: Partial<Migration>): Migration {
    return {
      version,
      description: `Migration ${version}`,
      up: () => {},
      down: () => {},
      ...extra,
    };
  }

  it("accepts sequential migrations starting from 1", () => {
    const result = runner.validate([makeMigration(1), makeMigration(2), makeMigration(3)]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects version gaps", () => {
    const result = runner.validate([makeMigration(1), makeMigration(3)]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("expected 2, found 3"));
  });

  it("rejects duplicate versions", () => {
    const result = runner.validate([makeMigration(1), makeMigration(1)]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Duplicate migration version detected");
  });

  it("rejects migrations missing up or down", () => {
    const result = runner.validate([
      { version: 1, description: "bad", up: () => {}, down: undefined as unknown as () => void },
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/must implement both up\(\) and down\(\)/);
  });
});

describe("MigrationRunner.run", () => {
  let db: BetterSqlite3Database;
  let runner: MigrationRunner;

  beforeEach(() => {
    db = new Database(":memory:");
    runner = new MigrationRunner(db);
  });

  it("applies all pending migrations to a fresh database", () => {
    const migrations = loadMigrations();
    const result = runner.run(migrations);

    expect(result.applied).toBe(migrations.length);
    expect(result.currentVersion).toBe(migrations[migrations.length - 1].version);
    expect(result.appliedVersions).toEqual(migrations.map((m) => m.version));

    // Verify key tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain("domains");
    expect(tableNames).toContain("knowledge_nodes");
    expect(tableNames).toContain("messages");
    expect(tableNames).toContain("settings");
    expect(tableNames).toContain("skill_executions");
    expect(tableNames).toContain("schema_migrations");
  });

  it("returns applied=0 when no migrations are pending", () => {
    const migrations = loadMigrations();
    runner.run(migrations);

    const result = runner.run(migrations);
    expect(result.applied).toBe(0);
    expect(result.appliedVersions).toHaveLength(0);
  });

  it("tracks applied versions in schema_migrations", () => {
    const migrations = loadMigrations();
    runner.run(migrations);

    const applied = runner.getAppliedMigrations();
    expect(applied.length).toBe(migrations.length);
    expect(applied[0].version).toBe(1);
    expect(applied[0].description).toBeTypeOf("string");
    expect(applied[0].applied_at).toBeTypeOf("string");
  });

  it("inserts default settings from migration 001", () => {
    const migrations = loadMigrations();
    runner.run(migrations);

    const row = db.prepare("SELECT value FROM settings WHERE key = 'theme'").get() as { value: string } | undefined;
    expect(row).toBeDefined();
  });
});

describe("MigrationRunner.rollback", () => {
  let db: BetterSqlite3Database;
  let runner: MigrationRunner;

  beforeEach(() => {
    db = new Database(":memory:");
    runner = new MigrationRunner(db);
  });

  it("rolls back migrations above target version in descending order", () => {
    const migrations = loadMigrations();
    runner.run(migrations);

    const targetVersion = 2;
    const result = runner.rollback(migrations, targetVersion);

    expect(result.rolledBack).toBe(migrations.length - targetVersion);
    expect(result.currentVersion).toBe(targetVersion);
  });

  it("returns rolledBack=0 when target is current version", () => {
    const migrations = loadMigrations();
    runner.run(migrations);
    const current = runner.getCurrentVersion();

    const result = runner.rollback(migrations, current);
    expect(result.rolledBack).toBe(0);
  });

  it("can re-run migrations after rollback", () => {
    const migrations = loadMigrations();
    runner.run(migrations);
    runner.rollback(migrations, 0);

    // All tables dropped by full rollback
    const result = runner.run(migrations);
    expect(result.applied).toBe(migrations.length);
  });

  it("stops rollback when a migration file is missing", () => {
    const migrations = loadMigrations();
    runner.run(migrations);

    // Remove migration 4 from the list — rollback to 2 tries 4 first (missing → stops)
    const partial = migrations.filter((m) => m.version !== 4);
    const result = runner.rollback(partial, 2);

    // Nothing rolled back because migration 4 (the first attempted) is missing
    expect(result.rolledBack).toBe(0);
    expect(runner.getCurrentVersion()).toBe(4);
  });
});

describe("MigrationRunner — full up/down cycle", () => {
  let db: BetterSqlite3Database;
  let runner: MigrationRunner;

  beforeEach(() => {
    db = new Database(":memory:");
    runner = new MigrationRunner(db);
  });

  it("can fully apply then fully rollback all migrations", () => {
    const migrations = loadMigrations();
    runner.run(migrations);
    expect(runner.getCurrentVersion()).toBe(migrations[migrations.length - 1].version);

    // Full rollback
    runner.rollback(migrations, 0);
    expect(runner.getCurrentVersion()).toBe(0);

    // Re-apply
    runner.run(migrations);
    expect(runner.getCurrentVersion()).toBe(migrations[migrations.length - 1].version);
  });
});
