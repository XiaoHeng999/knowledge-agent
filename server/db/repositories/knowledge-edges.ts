import type { BetterSqlite3Database } from "../connection";
import type { KnowledgeEdgeRow } from "../schema";
import { BaseRepository } from "./base";

export class KnowledgeEdgesRepository extends BaseRepository<KnowledgeEdgeRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "knowledge_edges");
  }

  findBySourceNodeId(nodeId: string): KnowledgeEdgeRow[] {
    return this.db
      .prepare("SELECT * FROM knowledge_edges WHERE source_node_id = ?")
      .all(nodeId) as KnowledgeEdgeRow[];
  }

  findByTargetNodeId(nodeId: string): KnowledgeEdgeRow[] {
    return this.db
      .prepare("SELECT * FROM knowledge_edges WHERE target_node_id = ?")
      .all(nodeId) as KnowledgeEdgeRow[];
  }

  findByDomainNodeIds(nodeIds: string[]): KnowledgeEdgeRow[] {
    if (nodeIds.length === 0) return [];
    const placeholders = nodeIds.map(() => "?").join(",");
    return this.db
      .prepare(
        `SELECT * FROM knowledge_edges WHERE source_node_id IN (${placeholders}) OR target_node_id IN (${placeholders})`,
      )
      .all(...nodeIds, ...nodeIds) as KnowledgeEdgeRow[];
  }

  deleteByNodeIds(nodeIds: string[]): void {
    if (nodeIds.length === 0) return;
    const placeholders = nodeIds.map(() => "?").join(",");
    this.db
      .prepare(
        `DELETE FROM knowledge_edges WHERE source_node_id IN (${placeholders}) OR target_node_id IN (${placeholders})`,
      )
      .run(...nodeIds, ...nodeIds);
  }
}
