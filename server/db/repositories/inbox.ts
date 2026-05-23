import type { BetterSqlite3Database } from "../connection";
import type { InboxItemRow } from "../schema";
import { BaseRepository, type ListResult } from "./base";

export class InboxRepository extends BaseRepository<InboxItemRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "inbox_items");
  }

  listByStatus(
    status?: InboxItemRow["status"],
    limit = 50,
    offset = 0,
  ): ListResult<InboxItemRow> {
    if (status) {
      return this.list({
        where: "status = ?",
        params: [status],
        limit,
        offset,
        orderBy: "created_at",
        orderDir: "DESC",
      });
    }
    return this.list({ limit, offset, orderBy: "created_at", orderDir: "DESC" });
  }

  processItem(id: string, domainId: string, knowledgeNodeId: string): InboxItemRow | null {
    this.db
      .prepare(
        `UPDATE inbox_items
         SET status = 'accepted', domain_id = ?, knowledge_node_id = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(domainId, knowledgeNodeId, id);
    return this.findById(id);
  }

  rejectItem(id: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE inbox_items SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`,
      )
      .run(id);
    return result.changes > 0;
  }

  getStats(): { pending: number; accepted: number; rejected: number; processing: number } {
    const rows = this.db
      .prepare("SELECT status, COUNT(*) as cnt FROM inbox_items GROUP BY status")
      .all() as { status: string; cnt: number }[];

    const result = { pending: 0, accepted: 0, rejected: 0, processing: 0 };
    for (const row of rows) {
      if (row.status in result) {
        (result as Record<string, number>)[row.status] = row.cnt;
      }
    }
    return result;
  }
}
