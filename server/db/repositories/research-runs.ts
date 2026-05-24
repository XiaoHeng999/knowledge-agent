import type { BetterSqlite3Database } from "../connection";
import type { ResearchRunRow, ResearchRunStatus } from "../schema";
import { BaseRepository, type ListOptions, type ListResult } from "./base";

export interface ResearchRunListOptions extends ListOptions {
  domainId?: string;
  status?: ResearchRunStatus;
}

export class ResearchRunsRepository extends BaseRepository<ResearchRunRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "research_runs");
  }

  listByDomain(options: ResearchRunListOptions): ListResult<ResearchRunRow> {
    const { domainId, status, limit = 50, offset = 0 } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (domainId) {
      conditions.push("domain_id = ?");
      params.push(domainId);
    }
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    const where = conditions.length > 0 ? conditions.join(" AND ") : undefined;
    return this.list({ where, params, limit, offset, orderBy: "started_at", orderDir: "DESC" });
  }

  countByDomainToday(domainId: string): number {
    const today = new Date().toISOString().slice(0, 10);
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as cnt FROM research_runs WHERE domain_id = ? AND date(started_at) = ?`,
      )
      .get(domainId, today) as { cnt: number };
    return row.cnt;
  }

  sumCostByDomainSince(domainId: string, sinceDate: string): number {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(cost_usd), 0) as total FROM research_runs WHERE domain_id = ? AND started_at >= ?`,
      )
      .get(domainId, sinceDate) as { total: number };
    return row.total;
  }
}
