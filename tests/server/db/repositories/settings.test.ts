import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import type { BetterSqlite3Database } from "../../../../server/db/connection";
import { SettingsRepository } from "../../../../server/db/repositories/settings";

describe("SettingsRepository", () => {
  let db: BetterSqlite3Database;
  let repo: SettingsRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    repo = new SettingsRepository(db);
  });

  it("returns null for a missing key", () => {
    expect(repo.get("nonexistent")).toBeNull();
  });

  it("stores a string value without double-encoding", () => {
    repo.set("theme", "linear");
    expect(repo.get("theme")).toBe("linear");
  });

  it("serializes an object value to JSON", () => {
    repo.set("config", { model: "gpt-4", temperature: 0.7 });
    const raw = repo.get("config");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({ model: "gpt-4", temperature: 0.7 });
  });

  it("serializes number and boolean values to JSON", () => {
    repo.set("count", 42);
    expect(repo.get("count")).toBe("42");

    repo.set("flag", true);
    expect(repo.get("flag")).toBe("true");
  });

  it("overwrites an existing key", () => {
    repo.set("theme", "dark");
    repo.set("theme", "light");
    expect(repo.get("theme")).toBe("light");
  });

  it("removes an existing key and returns true", () => {
    repo.set("theme", "dark");
    expect(repo.remove("theme")).toBe(true);
    expect(repo.get("theme")).toBeNull();
  });

  it("returns false when removing a missing key", () => {
    expect(repo.remove("nonexistent")).toBe(false);
  });
});
