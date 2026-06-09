import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (hoisted) ---

const mockVectorIndex = {
  search: vi.fn(() => []),
  fullTextSearch: vi.fn(() => []),
  hybridSearch: vi.fn(() => []),
  upsert: vi.fn(),
  remove: vi.fn(),
};

const mockKnowledgeNodes = {
  listByDomain: vi.fn(() => ({ items: [], total: 0 })),
};

const mockDbPrepare = vi.fn(() => ({ all: vi.fn(() => []) }));

vi.mock("@server/db/index", () => ({
  getDatabaseService: () => ({
    vectorIndex: mockVectorIndex,
    knowledgeNodes: mockKnowledgeNodes,
    db: { prepare: mockDbPrepare },
  }),
}));

vi.mock("@server/services/embedding-service", () => ({
  generateEmbedding: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
}));

vi.mock("@server/services/knowledge-graph", () => ({
  rowToNode: vi.fn((row: Record<string, unknown>) => ({
    id: row.id,
    domainId: row.domain_id,
    title: row.title,
    type: row.node_type,
    content: row.content ?? "",
    comprehensionLevel: row.comprehension_score ?? 0,
    sources: row.source_ids ? JSON.parse(row.source_ids as string) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })),
}));

vi.mock("@server/lib/lru-cache", () => {
  const map = new Map<string, unknown>();
  return {
    LRUCache: class {
      get(key: string) { return map.get(key); }
      set(key: string, value: unknown) { map.set(key, value); }
      clear() { map.clear(); }
    },
  };
});

const mockSubmitTaskAsync = vi.fn();

vi.mock("@server/worker/worker-bridge", () => ({
  getWorkerBridge: () => ({ submitTaskAsync: mockSubmitTaskAsync }),
}));

import { search, indexNode, removeFromIndex, reindexDomain } from "@server/services/search-engine";

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Fixtures ---

function makeSearchResult(nodeId: string, distance: number) {
  return { nodeId, distance };
}

function makeNodeRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    domain_id: "d1",
    title: "Test Node",
    content: "content",
    summary: null,
    node_type: "concept",
    status: "active",
    comprehension_score: 0,
    frontmatter: null,
    source_ids: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- Tests ---

describe("search", () => {
  it("returns empty for empty query", async () => {
    const result = await search({ query: "  " });
    expect(result.results).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("runs vector + FTS search and fuses results", async () => {
    const vecResults = [makeSearchResult("n1", 0.9)];
    const ftsResults = [makeSearchResult("n2", 0.8)];
    const fusedResults = [makeSearchResult("n1", 0.95), makeSearchResult("n2", 0.85)];

    mockVectorIndex.search.mockReturnValue(vecResults);
    mockVectorIndex.fullTextSearch.mockReturnValue(ftsResults);
    mockVectorIndex.hybridSearch.mockReturnValue(fusedResults);
    mockDbPrepare.mockReturnValue({
      all: vi.fn(() => [makeNodeRow("n1"), makeNodeRow("n2")]),
    });

    const result = await search({ query: "knowledge", domainId: "d1" });

    expect(mockVectorIndex.search).toHaveBeenCalled();
    expect(mockVectorIndex.fullTextSearch).toHaveBeenCalled();
    expect(mockVectorIndex.hybridSearch).toHaveBeenCalledWith(vecResults, ftsResults, expect.any(Number));
  });

  it("paginates results", async () => {
    const fused = Array.from({ length: 5 }, (_, i) => makeSearchResult(`n${i}`, 1 - i * 0.1));
    mockVectorIndex.search.mockReturnValue([]);
    mockVectorIndex.fullTextSearch.mockReturnValue([]);
    mockVectorIndex.hybridSearch.mockReturnValue(fused);
    mockDbPrepare.mockReturnValue({
      all: vi.fn(() => fused.map((f) => makeNodeRow(f.nodeId))),
    });

    const result = await search({ query: "test", limit: 2, offset: 0 });
    expect(result.results.length).toBeLessThanOrEqual(2);
    expect(result.total).toBe(5);
  });

  it("falls back to vector-only when FTS fails", async () => {
    const vecResults = [makeSearchResult("n1", 0.9)];
    mockVectorIndex.search.mockReturnValue(vecResults);
    mockVectorIndex.fullTextSearch.mockImplementation(() => {
      throw new Error("FTS error");
    });
    mockVectorIndex.hybridSearch.mockReturnValue(vecResults);
    mockDbPrepare.mockReturnValue({
      all: vi.fn(() => [makeNodeRow("n1")]),
    });

    const result = await search({ query: "test" });
    expect(result.results).toHaveLength(1);
  });
});

describe("indexNode", () => {
  it("uses worker bridge when available", async () => {
    mockSubmitTaskAsync.mockResolvedValue({
      vector: [0.1, 0.2],
    });

    await indexNode("n1", "some content");

    expect(mockSubmitTaskAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: "EMBEDDING_GENERATION" }),
    );
    expect(mockVectorIndex.upsert).toHaveBeenCalledWith("n1", [0.1, 0.2]);
  });

  it("falls back to direct embedding when worker fails", async () => {
    mockSubmitTaskAsync.mockRejectedValue(new Error("worker down"));

    await indexNode("n1", "some content");

    expect(mockVectorIndex.upsert).toHaveBeenCalledWith("n1", [0.1, 0.2, 0.3]);
  });
});

describe("removeFromIndex", () => {
  it("removes node from vector index", async () => {
    await removeFromIndex("n1");
    expect(mockVectorIndex.remove).toHaveBeenCalledWith("n1");
  });
});

describe("reindexDomain", () => {
  it("reindexes via worker when available", async () => {
    const rows = [
      makeNodeRow("n1", { content: "content 1" }),
      makeNodeRow("n2", { content: "content 2" }),
    ];
    mockKnowledgeNodes.listByDomain.mockReturnValue({ items: rows, total: 2 });
    mockSubmitTaskAsync.mockResolvedValue({
      vectors: [
        { nodeId: "n1", vector: [0.1] },
        { nodeId: "n2", vector: [0.2] },
      ],
      indexedCount: 2,
    });

    const count = await reindexDomain("d1");
    expect(count).toBe(2);
    expect(mockVectorIndex.upsert).toHaveBeenCalledTimes(2);
  });

  it("falls back to sequential embedding when worker fails", async () => {
    const rows = [makeNodeRow("n1", { content: "content 1" })];
    mockKnowledgeNodes.listByDomain.mockReturnValue({ items: rows, total: 1 });
    mockSubmitTaskAsync.mockRejectedValue(new Error("worker down"));

    const count = await reindexDomain("d1");
    expect(count).toBe(1);
    expect(mockVectorIndex.upsert).toHaveBeenCalledWith("n1", [0.1, 0.2, 0.3]);
  });

  it("skips nodes with empty text", async () => {
    const rows = [makeNodeRow("n1", { content: "   ", title: "   ", summary: null })];
    mockKnowledgeNodes.listByDomain.mockReturnValue({ items: rows, total: 1 });
    mockSubmitTaskAsync.mockRejectedValue(new Error("worker down"));

    const count = await reindexDomain("d1");
    expect(count).toBe(0);
    expect(mockVectorIndex.upsert).not.toHaveBeenCalled();
  });
});
