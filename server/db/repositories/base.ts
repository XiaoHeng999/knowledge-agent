import type { BetterSqlite3Database } from "../connection";
import { randomUUID } from "crypto";

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
  where?: string;
  params?: unknown[];
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export class BaseRepository<T extends object> {
  constructor(
    protected db: BetterSqlite3Database,
    protected tableName: string,
  ) {}

  create(data: Partial<T> & Record<string, unknown>): T {
    const id = (data.id as string) ?? randomUUID();
    const now = new Date().toISOString();

    const row: Record<string, unknown> = { id, ...data, created_at: now, updated_at: now };

    const columns = Object.keys(row);
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map((c) => row[c]);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
    this.db.prepare(sql).run(...values);

    return this.findById(id) as T;
  }

  findById(id: string): T | null {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const row = this.db.prepare(sql).get(id) as T | undefined;
    return row ?? null;
  }

  update(id: string, data: Partial<T>): T | null {
    const now = new Date().toISOString();
    const entries = Object.entries(data).filter(([key]) => key !== "id" && key !== "created_at");
    if (entries.length === 0) return this.findById(id);

    const setClauses = entries.map(([key]) => `${key} = ?`);
    const values = entries.map(([, val]) => val);

    const sql = `UPDATE ${this.tableName} SET ${setClauses.join(", ")}, updated_at = ? WHERE id = ?`;
    this.db.prepare(sql).run(...values, now, id);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = this.db.prepare(sql).run(id);
    return result.changes > 0;
  }

  list(options: ListOptions = {}): ListResult<T> {
    const { limit = 50, offset = 0, orderBy = "updated_at", orderDir = "DESC", where, params = [] } = options;

    const whereClause = where ? `WHERE ${where}` : "";
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
    const total = (this.db.prepare(countSql).get(...params) as { total: number }).total;

    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
    const items = this.db.prepare(sql).all(...params, limit, offset) as T[];

    return { items, total };
  }

  exists(id: string): boolean {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const row = this.db.prepare(sql).get(id);
    return row !== undefined;
  }
}
