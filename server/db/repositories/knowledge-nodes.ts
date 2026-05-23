import type { BetterSqlite3Database } from "../connection";
import type { KnowledgeNodeRow } from "../schema";
import { BaseRepository, type ListOptions, type ListResult } from "./base";

export interface KnowledgeNodeListOptions extends ListOptions {
  domainId?: string;
  nodeType?: string;
  status?: string;
  comprehensionScore?: number;
  search?: string;
}

export class KnowledgeNodesRepository extends BaseRepository<KnowledgeNodeRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "knowledge_nodes");
  }

  listByDomain(options: KnowledgeNodeListOptions): ListResult<KnowledgeNodeRow> {
    const { domainId, nodeType, status, search, limit = 50, offset = 0 } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (domainId) {
      conditions.push("domain_id = ?");
      params.push(domainId);
    }
    if (nodeType) {
      conditions.push("node_type = ?");
      params.push(nodeType);
    }
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    if (search) {
      conditions.push("title LIKE ?");
      params.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? conditions.join(" AND ") : undefined;
    return this.list({ where, params, limit, offset, orderBy: "updated_at", orderDir: "DESC" });
  }

  countByDomain(domainId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as cnt FROM knowledge_nodes WHERE domain_id = ?")
      .get(domainId) as { cnt: number };
    return row.cnt;
  }
}
