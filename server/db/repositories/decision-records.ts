import type { BetterSqlite3Database } from "../connection";
import type { DecisionRow } from "../schema";
import { BaseRepository, type ListResult } from "./base";

export class DecisionRecordsRepository extends BaseRepository<DecisionRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "decisions");
  }

  listByDomain(
    domainId: string,
    limit = 50,
    offset = 0,
  ): ListResult<DecisionRow> {
    return this.list({
      where: "domain_id = ?",
      params: [domainId],
      limit,
      offset,
      orderBy: "decision_number",
      orderDir: "DESC",
    });
  }

  nextDecisionNumber(domainId: string): number {
    const row = this.db
      .prepare("SELECT MAX(decision_number) as max_num FROM decisions WHERE domain_id = ?")
      .get(domainId) as { max_num: number | null };
    return (row.max_num ?? 0) + 1;
  }
}
