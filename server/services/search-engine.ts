/**
 * SearchEngine service — hybrid search combining vector similarity and BM25
 * full-text search with Reciprocal Rank Fusion (RRF).
 *
 * Performance optimizations:
 *  - LRU result cache keyed by query + domainId + filters hash
 *  - Embedding cache (in embedding-service.ts) avoids re-computing vectors
 *  - Prepared statements for hot queries (domain node IDs, node batch load)
 *  - Early domain filtering pushed to SQL where possible
 */
import { createHash } from "crypto";
import { getDatabaseService } from "../db/index";
import type { VectorSearchResult } from "../db/vector";
import type {
  KnowledgeNode,
  SearchRequest,
  KnowledgeSearchResult,
} from "../../src/lib/ipc/channels";
import { generateEmbedding } from "./embedding-service";
import { rowToNode } from "./knowledge-graph";
import { LRUCache } from "../lib/lru-cache";

// ---------------------------------------------------------------------------
// Result cache — keyed by normalized query + domain + filter hash
// ---------------------------------------------------------------------------

const resultCache = new LRUCache<{ results: KnowledgeSearchResult[]; total: number }>({
  maxSize: 100,
  ttlMs: 30_000, // 30s TTL for search results
});

function buildCacheKey(req: SearchRequest): string {
  const raw = JSON.stringify({
    q: req.query.trim().toLowerCase(),
    d: req.domainId ?? "",
    l: req.limit ?? 20,
    o: req.offset ?? 0,
    f: req.filters ?? {},
  });
  return createHash("sha256").update(raw).digest("hex");
}

// ---------------------------------------------------------------------------
// Hybrid search
// ---------------------------------------------------------------------------

export async function search(
  req: SearchRequest,
): Promise<{ results: KnowledgeSearchResult[]; total: number }> {
  const limit = req.limit ?? 20;
  const offset = req.offset ?? 0;

  if (!req.query.trim()) {
    return { results: [], total: 0 };
  }

  // Check result cache
  const cacheKey = buildCacheKey(req);
  const cached = resultCache.get(cacheKey);
  if (cached) return cached;

  const db = getDatabaseService();

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
    const domainSet = getDomainNodeIdSet(req.domainId);
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

  const result = { results: paged, total };
  resultCache.set(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// Vector indexing pipeline — index a single node
// ---------------------------------------------------------------------------

export async function indexNode(nodeId: string, content: string): Promise<void> {
  const db = getDatabaseService();

  // Invalidate result cache when index changes
  resultCache.clear();

  // Try worker for single embedding
  try {
    const { getWorkerBridge } = await import("../worker/worker-bridge");
    const bridge = getWorkerBridge();
    const result = await bridge.submitTaskAsync<{ vector: number[] }>({
      type: "EMBEDDING_GENERATION",
      priority: "high",
      payload: { text: content, model: "hash-embedding", domainId: "", nodeId },
      timeout: 30_000,
    });
    db.vectorIndex.upsert(nodeId, result.vector);
    return;
  } catch {
    // Worker unavailable or timed out — fallback
  }

  const embedding = await generateEmbedding(content);
  db.vectorIndex.upsert(nodeId, embedding);
}

export async function removeFromIndex(nodeId: string): Promise<void> {
  const db = getDatabaseService();
  resultCache.clear();
  db.vectorIndex.remove(nodeId);
}

export async function reindexDomain(domainId: string): Promise<number> {
  const db = getDatabaseService();
  resultCache.clear();

  const nodeRows = db.knowledgeNodes.listByDomain({
    domainId,
    limit: 10000,
    offset: 0,
  });

  const nodes = nodeRows.items.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    summary: row.summary,
  }));

  // Try to use worker for batch embedding generation
  try {
    const { getWorkerBridge } = await import("../worker/worker-bridge");
    const bridge = getWorkerBridge();
    const result = await bridge.submitTaskAsync<{
      vectors: Array<{ nodeId: string; vector: number[] }>;
      indexedCount: number;
    }>({
      type: "VECTOR_INDEX_BUILD",
      priority: "normal",
      payload: { domainId, model: "hash-embedding", nodes },
    });

    // Upsert all vectors returned by worker
    for (const { nodeId, vector } of result.vectors) {
      db.vectorIndex.upsert(nodeId, vector);
    }
    return result.indexedCount;
  } catch {
    // Worker unavailable — fallback to direct generation
  }

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

// Cache domain node ID sets for 60 seconds (avoid repeated full-table scans)
const domainSetCache = new LRUCache<Set<string>>({ maxSize: 50, ttlMs: 60_000 });

function getDomainNodeIdSet(domainId: string): Set<string> {
  const cached = domainSetCache.get(domainId);
  if (cached) return cached;

  const db = getDatabaseService();
  const rows = db.db.prepare("SELECT id FROM knowledge_nodes WHERE domain_id = ?").all(domainId) as { id: string }[];
  const set = new Set(rows.map((r) => r.id));
  domainSetCache.set(domainId, set);
  return set;
}

function sanitizeFtsQuery(query: string): string {
  return query
    .replace(/"/g, '""')
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => `"${t}"`)
    .join(" OR ");
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
    const sql = `SELECT * FROM knowledge_nodes WHERE id IN (${placeholders})`;
    const rows = db.db.prepare(sql).all(...chunk) as Record<string, unknown>[];

    for (const row of rows) {
      const node = rowToNode(row as unknown as import("../db/schema").KnowledgeNodeRow);
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
  filters?: SearchRequest["filters"],
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
    filtered = filtered.filter((r) =>
      filters.tags!.some((tag) => r.node.content.includes(tag)),
    );
  }

  return filtered;
}
