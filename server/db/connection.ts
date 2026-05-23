import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";
import fs from "fs";

export type BetterSqlite3Database = Database.Database;

let dbInstance: BetterSqlite3Database | null = null;

function getDefaultDbPath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "agentclaw.db");
}

export function createConnection(dbPath?: string): BetterSqlite3Database {
  if (dbInstance) return dbInstance;

  const resolvedPath = dbPath ?? getDefaultDbPath();

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");

  dbInstance = db;
  return dbInstance;
}

export function getConnection(): BetterSqlite3Database {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call createConnection() first.");
  }
  return dbInstance;
}

export function closeConnection(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function backupDatabase(targetPath: string): void {
  const db = getConnection();
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  db.backup(targetPath);
}
