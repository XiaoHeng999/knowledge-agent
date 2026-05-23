import type { BetterSqlite3Database } from "../connection";
import type { PredictionRow } from "../schema";
import { BaseRepository, type ListResult } from "./base";

export class TimelineEntriesRepository extends BaseRepository<PredictionRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "predictions");
  }

  listByDomain(
    domainId: string,
    limit = 50,
    offset = 0,
  ): ListResult<PredictionRow> {
    return this.list({
      where: "domain_id = ?",
      params: [domainId],
      limit,
      offset,
      orderBy: "predicted_date",
      orderDir: "DESC",
    });
  }

  findExpired(): PredictionRow[] {
    return this.db
      .prepare(
        "SELECT * FROM predictions WHERE status = 'pending' AND predicted_date < datetime('now')",
      )
      .all() as PredictionRow[];
  }
}
