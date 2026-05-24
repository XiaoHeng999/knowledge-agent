import type { BetterSqlite3Database } from "../connection";
import type { FrameworkResultRow, FrameworkType } from "../schema";
import { BaseRepository, type ListResult } from "./base";

export class FrameworkResultsRepository extends BaseRepository<FrameworkResultRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "framework_results");
  }

  listByDomain(
    domainId: string,
    limit = 50,
    offset = 0,
  ): ListResult<FrameworkResultRow> {
    return this.list({
      where: "domain_id = ?",
      params: [domainId],
      limit,
      offset,
      orderBy: "created_at",
      orderDir: "DESC",
    });
  }

  listByType(
    domainId: string,
    frameworkType: FrameworkType,
    limit = 20,
    offset = 0,
  ): ListResult<FrameworkResultRow> {
    return this.list({
      where: "domain_id = ? AND framework_type = ?",
      params: [domainId, frameworkType],
      limit,
      offset,
      orderBy: "created_at",
      orderDir: "DESC",
    });
  }
}
