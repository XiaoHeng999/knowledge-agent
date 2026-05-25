import type { BetterSqlite3Database } from "./connection";

export interface VectorSearchResult {
  nodeId: string;
  distance: number;
}

export class VectorIndex {
  constructor(private db: BetterSqlite3Database) {}

  initialize(): void {
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vss_nodes USING vss0(
        embedding(1536) factory (flat, metric=cosine)
      );
    `);
  }

  upsert(nodeId: string, embedding: number[]): void {
    const row = this.db
      .prepare("SELECT rowid FROM knowledge_nodes WHERE id = ?")
      .get(nodeId) as { rowid: number } | undefined;
    if (!row) {
      throw new Error(`Knowledge node ${nodeId} not found — cannot upsert vector`);
    }

    this.db.prepare("DELETE FROM vss_nodes WHERE rowid = ?").run(row.rowid);
    const buf = this.embeddingToBuffer(embedding);
    this.db.prepare("INSERT INTO vss_nodes (rowid, embedding) VALUES (?, ?)").run(row.rowid, buf);
  }

  remove(nodeId: string): void {
    const row = this.db
      .prepare("SELECT rowid FROM knowledge_nodes WHERE id = ?")
      .get(nodeId) as { rowid: number } | undefined;
    if (row) {
      this.db.prepare("DELETE FROM vss_nodes WHERE rowid = ?").run(row.rowid);
    }
  }

  search(queryEmbedding: number[], topK = 20): VectorSearchResult[] {
    const buf = this.embeddingToBuffer(queryEmbedding);

    const rows = this.db
      .prepare(
        `SELECT v.rowid, v.distance
         FROM vss_nodes v
         WHERE v.embedding MATCH ?
         ORDER BY v.distance
         LIMIT ?`,
      )
      .all(buf, topK) as { rowid: number; distance: number }[];

    if (rows.length === 0) return [];
    return this.resolveNodeIds(rows);
  }

  fullTextSearch(query: string, limit = 20): VectorSearchResult[] {
    const rows = this.db
      .prepare(
        `SELECT fts.rowid, fts.rank
         FROM fts_knowledge fts
         WHERE fts_knowledge MATCH ?
         ORDER BY fts.rank
         LIMIT ?`,
      )
      .all(query, limit) as { rowid: number; rank: number }[];

    if (rows.length === 0) return [];
    return this.resolveNodeIds(rows.map((r) => ({ rowid: r.rowid, distance: r.rank })));
  }

  hybridSearch(
    vectorResults: VectorSearchResult[],
    ftsResults: VectorSearchResult[],
    topK = 20,
  ): VectorSearchResult[] {
    const k = 60;
    const scores = new Map<string, number>();

    for (let i = 0; i < vectorResults.length; i++) {
      const r = vectorResults[i];
      scores.set(r.nodeId, 1 / (k + i + 1));
    }

    for (let i = 0; i < ftsResults.length; i++) {
      const r = ftsResults[i];
      const prev = scores.get(r.nodeId) ?? 0;
      scores.set(r.nodeId, prev + 1 / (k + i + 1));
    }

    return Array.from(scores.entries())
      .map(([nodeId, score]) => ({ nodeId, distance: score }))
      .sort((a, b) => b.distance - a.distance)
      .slice(0, topK);
  }

  private resolveNodeIds(rows: Array<{ rowid: number; distance: number }>): VectorSearchResult[] {
    const rowids = rows.map((r) => r.rowid);
    const placeholders = rowids.map(() => "?").join(",");

    const nodeRows = this.db
      .prepare(`SELECT rowid, id FROM knowledge_nodes WHERE rowid IN (${placeholders})`)
      .all(...rowids) as { rowid: number; id: string }[];

    const rowidToId = new Map(nodeRows.map((n) => [n.rowid, n.id]));

    return rows
      .map((r) => {
        const id = rowidToId.get(r.rowid);
        if (!id) return null;
        return { nodeId: id, distance: r.distance };
      })
      .filter((r): r is VectorSearchResult => r !== null);
  }

  private embeddingToBuffer(embedding: number[]): Buffer {
    const buf = Buffer.alloc(embedding.length * 4);
    for (let i = 0; i < embedding.length; i++) {
      buf.writeFloatLE(embedding[i], i * 4);
    }
    return buf;
  }
}
