import type { BetterSqlite3Database } from "../connection";
import { BaseRepository } from "./base";
import type { MessageRow } from "../schema";
import { TABLE_NAMES } from "../schema";

export class MessagesRepository extends BaseRepository<MessageRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, TABLE_NAMES.MESSAGES);
  }

  listByConversation(conversationId: string): MessageRow[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE conversation_id = ? ORDER BY created_at ASC`;
    return this.db.prepare(sql).all(conversationId) as MessageRow[];
  }

  getChildren(parentId: string): MessageRow[] {
    const sql = `SELECT * FROM ${this.tableName} WHERE parent_id = ? ORDER BY branch_index ASC, created_at ASC`;
    return this.db.prepare(sql).all(parentId) as MessageRow[];
  }

  getMaxBranchIndex(parentId: string): number {
    const sql = `SELECT MAX(branch_index) as maxIdx FROM ${this.tableName} WHERE parent_id = ?`;
    const row = this.db.prepare(sql).get(parentId) as { maxIdx: number | null };
    return row?.maxIdx ?? -1;
  }

  getRootMessage(conversationId: string): MessageRow | null {
    const sql = `SELECT * FROM ${this.tableName} WHERE conversation_id = ? AND parent_id IS NULL ORDER BY created_at ASC LIMIT 1`;
    return (this.db.prepare(sql).get(conversationId) as MessageRow) ?? null;
  }

  countByConversation(conversationId: string): number {
    const sql = `SELECT COUNT(*) as cnt FROM ${this.tableName} WHERE conversation_id = ?`;
    const row = this.db.prepare(sql).get(conversationId) as { cnt: number };
    return row.cnt;
  }

  deleteByConversation(conversationId: string): number {
    const sql = `DELETE FROM ${this.tableName} WHERE conversation_id = ?`;
    const result = this.db.prepare(sql).run(conversationId);
    return result.changes;
  }

  getActiveBranch(conversationId: string): MessageRow[] {
    // Get messages along the active (first) branch path
    const sql = `
      WITH RECURSIVE tree AS (
        SELECT * FROM ${this.tableName}
        WHERE conversation_id = ? AND parent_id IS NULL
        UNION ALL
        SELECT m.* FROM ${this.tableName} m
        INNER JOIN tree t ON m.parent_id = t.id AND m.branch_index = 0
      )
      SELECT * FROM tree ORDER BY created_at ASC
    `;
    return this.db.prepare(sql).all(conversationId) as MessageRow[];
  }
}
