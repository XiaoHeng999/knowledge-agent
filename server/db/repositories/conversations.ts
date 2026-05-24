import type { BetterSqlite3Database } from "../connection";
import { BaseRepository, type ListOptions, type ListResult } from "./base";
import type { ConversationRow } from "../schema";
import { TABLE_NAMES } from "../schema";

export class ConversationsRepository extends BaseRepository<ConversationRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, TABLE_NAMES.CONVERSATIONS);
  }

  listByDomain(
    domainId: string,
    options: { limit?: number; offset?: number; status?: string } = {},
  ): ListResult<ConversationRow> {
    const { limit = 50, offset = 0, status } = options;
    const params: unknown[] = [domainId];
    let where = "domain_id = ?";
    if (status) {
      where += " AND status = ?";
      params.push(status);
    }
    return this.list({ limit, offset, where, params, orderBy: "updated_at", orderDir: "DESC" });
  }

  findBySessionType(
    domainId: string,
    sessionType: string,
  ): ConversationRow | null {
    const sql = `SELECT * FROM ${this.tableName} WHERE domain_id = ? AND session_type = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1`;
    return (this.db.prepare(sql).get(domainId, sessionType) as ConversationRow) ?? null;
  }

  archiveByDomain(domainId: string): number {
    const sql = `UPDATE ${this.tableName} SET status = 'archived', updated_at = ? WHERE domain_id = ? AND status = 'active'`;
    const result = this.db.prepare(sql).run(new Date().toISOString(), domainId);
    return result.changes;
  }
}
