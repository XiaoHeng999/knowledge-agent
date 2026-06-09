import type { BetterSqlite3Database } from "../connection";

export class SettingsRepository {
  constructor(private db: BetterSqlite3Database) {}

  get(key: string): string | null {
    const row = this.db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: unknown): void {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    this.db
      .prepare(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
      )
      .run(key, serialized);
  }

  remove(key: string): boolean {
    const result = this.db.prepare("DELETE FROM settings WHERE key = ?").run(key);
    return result.changes > 0;
  }
}
