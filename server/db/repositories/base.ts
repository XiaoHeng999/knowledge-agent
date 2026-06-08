import type { BetterSqlite3Database } from "../connection";
import { randomUUID } from "crypto";
import { TABLE_COLUMNS } from "../schema";

const VALID_ORDER_DIRS = new Set(["ASC", "DESC"]);

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
  private allowedColumns: ReadonlySet<string>;

  constructor(
    protected db: BetterSqlite3Database,
    protected tableName: string,
  ) {
    this.allowedColumns = TABLE_COLUMNS[tableName as keyof typeof TABLE_COLUMNS]
      ?? new Set<string>();
  }

  private filterColumns(data: Record<string, unknown>): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.allowedColumns.has(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  create(data: Partial<T> & Record<string, unknown>): T {
    const id = (data.id as string) ?? randomUUID();
    const now = new Date().toISOString();

    const row = this.filterColumns({ id, ...data, created_at: now, updated_at: now });

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
    const filtered = this.filterColumns(data as Record<string, unknown>);
    const entries = Object.entries(filtered).filter(([key]) => key !== "id" && key !== "created_at");
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
    const { limit = 50, offset = 0, where, params = [] } = options;

    const orderDir = VALID_ORDER_DIRS.has(options.orderDir ?? "") ? options.orderDir! : "DESC";
    const orderBy = this.allowedColumns.has(options.orderBy ?? "") ? options.orderBy! : "updated_at";

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
