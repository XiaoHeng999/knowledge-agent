import type { BetterSqlite3Database } from "../connection";
import type { InboxItemRow } from "../schema";
import { BaseRepository, type ListResult } from "./base";

export class SourcesRepository extends BaseRepository<InboxItemRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "inbox_items");
  }

  listByStatus(
    status: InboxItemRow["status"],
    limit = 50,
    offset = 0,
  ): ListResult<InboxItemRow> {
    return this.list({
      where: "status = ?",
      params: [status],
      limit,
      offset,
      orderBy: "created_at",
      orderDir: "DESC",
    });
  }

  getStats(): { pending: number; accepted: number; rejected: number } {
    const rows = this.db
      .prepare("SELECT status, COUNT(*) as cnt FROM inbox_items GROUP BY status")
      .all() as { status: string; cnt: number }[];

    const result = { pending: 0, accepted: 0, rejected: 0 };
    for (const row of rows) {
      if (row.status === "pending") result.pending = row.cnt;
      else if (row.status === "accepted") result.accepted = row.cnt;
      else if (row.status === "rejected") result.rejected = row.cnt;
    }
    return result;
  }
}
