/**
 * SearchEngine service — hybrid search combining vector similarity and BM25
 * full-text search with Reciprocal Rank Fusion (RRF).
 *
 * Components:
 *  - VectorIndex (server/db/vector.ts) for embedding similarity search
 *  - FTS5 (fts_knowledge table) for BM25 text search
 *  - RRF fusion to merge and re-rank results
 *  - Domain filtering + optional tag/date/source filters
 */
import { getDatabaseService } from "../db/index";
import type { VectorSearchResult } from "../db/vector";
import type {
  KnowledgeNode,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
} from "../../src/lib/ipc/channels";
import { generateEmbedding } from "./embedding-service";
import { rowToNode } from "./knowledge-graph";

// ---------------------------------------------------------------------------
// Hybrid search
// ---------------------------------------------------------------------------

export async function search(
  req: KnowledgeSearchRequest,
): Promise<{ results: KnowledgeSearchResult[]; total: number }> {
  const db = getDatabaseService();
  const limit = req.limit ?? 20;
  const offset = req.offset ?? 0;

  if (!req.query.trim()) {
    return { results: [], total: 0 };
  }

  // 1. Vector search — generate query embedding and search
  const queryEmbedding = await generateEmbedding(req.query);
  let vectorResults = db.vectorIndex.search(queryEmbedding, limit * 3);

  // 2. BM25 full-text search
  let ftsResults: VectorSearchResult[] = [];
  try {
    ftsResults = db.vectorIndex.fullTextSearch(sanitizeFtsQuery(req.query), limit * 3);
  } catch {
    // FTS5 may throw on malformed queries — degrade to vector-only
  }

  // 3. Apply domain filter to both result sets
  if (req.domainId) {
    const domainNodeIds = getDomainNodeIds(req.domainId);
    const domainSet = new Set(domainNodeIds);
    vectorResults = vectorResults.filter((r) => domainSet.has(r.nodeId));
    ftsResults = ftsResults.filter((r) => domainSet.has(r.nodeId));
  }

  // 4. RRF fusion
  const fused = db.vectorIndex.hybridSearch(vectorResults, ftsResults, limit * 3);

  // 5. Load node data + determine match type
  const allNodeIds = fused.map((r) => r.nodeId);
  const nodes = loadNodesByIds(allNodeIds);

  // 6. Apply optional filters
  let results: KnowledgeSearchResult[] = fused
    .map((r) => {
      const node = nodes.get(r.nodeId);
      if (!node) return null;
      const matchType = determineMatchType(r.nodeId, vectorResults, ftsResults);
      return { node, score: r.distance, matchType };
    })
    .filter((r): r is KnowledgeSearchResult => r !== null);

  results = applyFilters(results, req.filters);

  const total = results.length;
  const paged = results.slice(offset, offset + limit);

  return { results: paged, total };
}

// ---------------------------------------------------------------------------
// Vector indexing pipeline — index a single node
// ---------------------------------------------------------------------------

export async function indexNode(nodeId: string, content: string): Promise<void> {
  const db = getDatabaseService();
  const embedding = await generateEmbedding(content);
  db.vectorIndex.upsert(nodeId, embedding);
}

export async function removeFromIndex(nodeId: string): Promise<void> {
  const db = getDatabaseService();
  db.vectorIndex.remove(nodeId);
}

export async function reindexDomain(domainId: string): Promise<number> {
  const db = getDatabaseService();
  const nodeRows = db.knowledgeNodes.listByDomain({
    domainId,
    limit: 10000,
    offset: 0,
  });

  let indexed = 0;
  for (const row of nodeRows.items) {
    const text = [row.title, row.content, row.summary].filter(Boolean).join(" ");
    if (text.trim()) {
      const embedding = await generateEmbedding(text);
      db.vectorIndex.upsert(row.id, embedding);
      indexed++;
    }
  }
  return indexed;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFtsQuery(query: string): string {
  // Escape special FTS5 characters and ensure safe query
  return query
    .replace(/"/g, '""')
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => `"${t}"`)
    .join(" OR ");
}

function getDomainNodeIds(domainId: string): string[] {
  const db = getDatabaseService();
  const rows = db.db
    .prepare("SELECT id FROM knowledge_nodes WHERE domain_id = ?")
    .all(domainId) as { id: string }[];
  return rows.map((r) => r.id);
}

function loadNodesByIds(ids: string[]): Map<string, KnowledgeNode> {
  const db = getDatabaseService();
  const map = new Map<string, KnowledgeNode>();

  if (ids.length === 0) return map;

  // Batch load in chunks to avoid SQL variable limit
  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = db.db
      .prepare(`SELECT * FROM knowledge_nodes WHERE id IN (${placeholders})`)
      .all(...chunk) as Record<string, unknown>[];

    for (const row of rows) {
      const node = rowToNode(row as import("../db/schema").KnowledgeNodeRow);
      map.set(node.id, node);
    }
  }
  return map;
}

type VectorOrFts = "vector" | "fulltext" | "hybrid";

function determineMatchType(
  nodeId: string,
  vectorResults: VectorSearchResult[],
  ftsResults: VectorSearchResult[],
): VectorOrFts {
  const inVector = vectorResults.some((r) => r.nodeId === nodeId);
  const inFts = ftsResults.some((r) => r.nodeId === nodeId);
  if (inVector && inFts) return "hybrid";
  if (inVector) return "vector";
  return "fulltext";
}

function applyFilters(
  results: KnowledgeSearchResult[],
  filters?: KnowledgeSearchRequest["filters"],
): KnowledgeSearchResult[] {
  if (!filters) return results;

  let filtered = results;

  if (filters.dateFrom) {
    filtered = filtered.filter((r) => r.node.createdAt >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    filtered = filtered.filter((r) => r.node.createdAt <= filters.dateTo!);
  }
  if (filters.source) {
    filtered = filtered.filter((r) =>
      r.node.sources.some((s) => s.includes(filters.source!)),
    );
  }
  if (filters.tags && filters.tags.length > 0) {
    // Tags are stored in frontmatter; for now, filter by content/title match
    // A more robust approach would parse tags from frontmatter
    filtered = filtered.filter((r) =>
      filters.tags!.some((tag) => r.node.content.includes(tag)),
    );
  }

  return filtered;
}
