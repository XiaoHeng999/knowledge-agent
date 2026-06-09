import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (hoisted before imports) ---

const mockNodes = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listByDomain: vi.fn(),
};

const mockEdges = {
  create: vi.fn(),
  findById: vi.fn(),
  delete: vi.fn(),
  deleteByNodeIds: vi.fn(),
  findBySourceNodeId: vi.fn(() => []),
  findByDomainNodeIds: vi.fn(() => []),
};

vi.mock("@server/db/index", () => ({
  getDatabaseService: () => ({
    knowledgeNodes: mockNodes,
    knowledgeEdges: mockEdges,
  }),
}));

vi.mock("@server/services/search-engine", () => ({
  indexNode: vi.fn(() => Promise.resolve()),
  removeFromIndex: vi.fn(() => Promise.resolve()),
}));

vi.mock("@server/services/logger", () => ({
  createLogger: () => ({ warn: vi.fn() }),
}));

import {
  rowToNode,
  createNode,
  updateNode,
  deleteNode,
  getNode,
  listNodes,
  createEdge,
  deleteEdge,
  getGraph,
  searchNodes,
  getStats,
} from "@server/services/knowledge-graph";

// --- Fixtures ---

function makeNodeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "n1",
    domain_id: "d1",
    title: "Test Node",
    content: "Some content",
    summary: null,
    node_type: "concept" as const,
    status: "active" as const,
    comprehension_score: 0,
    frontmatter: null,
    source_ids: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeEdgeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "e1",
    source_node_id: "n1",
    target_node_id: "n2",
    edge_type: "related" as const,
    weight: 0.5,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Tests ---

describe("rowToNode", () => {
  it("maps a DB row to IPC type", () => {
    const row = makeNodeRow({ source_ids: '["s1","s2"]' });
    const node = rowToNode(row);
    expect(node.id).toBe("n1");
    expect(node.domainId).toBe("d1");
    expect(node.sources).toEqual(["s1", "s2"]);
  });

  it("handles null source_ids", () => {
    const node = rowToNode(makeNodeRow({ source_ids: null }));
    expect(node.sources).toEqual([]);
  });
});

describe("createNode", () => {
  it("creates a node and auto-indexes it", () => {
    const row = makeNodeRow();
    mockNodes.create.mockReturnValue(row);

    const result = createNode({ domainId: "d1", title: "Test Node" });

    expect(result.id).toBe("n1");
    expect(mockNodes.create).toHaveBeenCalledWith(
      expect.objectContaining({ domain_id: "d1", title: "Test Node" }),
    );
  });

  it("defaults type to concept and status to active", () => {
    mockNodes.create.mockReturnValue(makeNodeRow());
    createNode({ domainId: "d1", title: "T" });
    expect(mockNodes.create).toHaveBeenCalledWith(
      expect.objectContaining({ node_type: "concept", status: "active" }),
    );
  });

  it("serializes sources to JSON", () => {
    mockNodes.create.mockReturnValue(makeNodeRow());
    createNode({ domainId: "d1", title: "T", sources: ["s1"] });
    expect(mockNodes.create).toHaveBeenCalledWith(expect.objectContaining({ source_ids: '["s1"]' }));
  });
});

describe("updateNode", () => {
  it("updates a node and returns it", () => {
    const existing = makeNodeRow();
    const updated = makeNodeRow({ title: "Updated" });
    mockNodes.findById.mockReturnValue(existing);
    mockNodes.update.mockReturnValue(updated);

    const result = updateNode({ id: "n1", title: "Updated" });
    expect(result.title).toBe("Updated");
  });

  it("throws if node not found", () => {
    mockNodes.findById.mockReturnValue(undefined);
    expect(() => updateNode({ id: "missing" })).toThrow("not found");
  });
});

describe("deleteNode", () => {
  it("deletes node and its edges", () => {
    mockNodes.findById.mockReturnValue(makeNodeRow());
    deleteNode("n1");
    expect(mockEdges.deleteByNodeIds).toHaveBeenCalledWith(["n1"]);
    expect(mockNodes.delete).toHaveBeenCalledWith("n1");
  });

  it("throws if node not found", () => {
    mockNodes.findById.mockReturnValue(undefined);
    expect(() => deleteNode("missing")).toThrow("not found");
  });
});

describe("getNode", () => {
  it("returns a node by id", () => {
    mockNodes.findById.mockReturnValue(makeNodeRow());
    const node = getNode("n1");
    expect(node.id).toBe("n1");
  });

  it("throws if not found", () => {
    mockNodes.findById.mockReturnValue(undefined);
    expect(() => getNode("missing")).toThrow("not found");
  });
});

describe("listNodes", () => {
  it("returns paginated results", () => {
    const rows = [makeNodeRow(), makeNodeRow({ id: "n2" })];
    mockNodes.listByDomain.mockReturnValue({ items: rows, total: 2 });

    const result = listNodes({ domainId: "d1", page: 1, pageSize: 20 });
    expect(result.nodes).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("defaults page to 1 and pageSize to 20", () => {
    mockNodes.listByDomain.mockReturnValue({ items: [], total: 0 });
    listNodes({ domainId: "d1" });
    expect(mockNodes.listByDomain).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 }),
    );
  });
});

describe("createEdge", () => {
  it("creates an edge between two existing nodes", () => {
    mockNodes.findById.mockImplementation((id: string) =>
      id === "n1" ? makeNodeRow() : id === "n2" ? makeNodeRow({ id: "n2" }) : undefined,
    );
    mockEdges.findBySourceNodeId.mockReturnValue([]);
    mockEdges.create.mockReturnValue(makeEdgeRow());

    const result = createEdge({ sourceId: "n1", targetId: "n2", type: "related" });
    expect(result.id).toBe("e1");
  });

  it("throws if source node missing", () => {
    mockNodes.findById.mockReturnValue(undefined);
    expect(() => createEdge({ sourceId: "x", targetId: "n2", type: "related" })).toThrow(
      "Source node not found",
    );
  });

  it("throws if target node missing", () => {
    mockNodes.findById.mockImplementation((id: string) =>
      id === "n1" ? makeNodeRow() : undefined,
    );
    expect(() => createEdge({ sourceId: "n1", targetId: "x", type: "related" })).toThrow(
      "Target node not found",
    );
  });

  it("throws on duplicate edge", () => {
    mockNodes.findById.mockReturnValue(makeNodeRow());
    mockEdges.findBySourceNodeId.mockReturnValue([
      makeEdgeRow({ target_node_id: "n2", edge_type: "related" }),
    ]);
    expect(() => createEdge({ sourceId: "n1", targetId: "n2", type: "related" })).toThrow(
      "already exists",
    );
  });

  it("defaults weight to 0.5", () => {
    mockNodes.findById.mockReturnValue(makeNodeRow());
    mockEdges.findBySourceNodeId.mockReturnValue([]);
    mockEdges.create.mockReturnValue(makeEdgeRow());
    createEdge({ sourceId: "n1", targetId: "n2", type: "related" });
    expect(mockEdges.create).toHaveBeenCalledWith(
      expect.objectContaining({ weight: 0.5 }),
    );
  });
});

describe("deleteEdge", () => {
  it("deletes an edge", () => {
    mockEdges.findById.mockReturnValue(makeEdgeRow());
    deleteEdge("e1");
    expect(mockEdges.delete).toHaveBeenCalledWith("e1");
  });

  it("throws if not found", () => {
    mockEdges.findById.mockReturnValue(undefined);
    expect(() => deleteEdge("missing")).toThrow("not found");
  });
});

describe("getGraph", () => {
  it("returns all nodes and edges for a domain", () => {
    const rows = [makeNodeRow()];
    mockNodes.listByDomain.mockReturnValue({ items: rows, total: 1 });
    mockEdges.findByDomainNodeIds.mockReturnValue([makeEdgeRow()]);

    const graph = getGraph("d1");
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
  });

  it("skips edge lookup when no nodes exist", () => {
    mockNodes.listByDomain.mockReturnValue({ items: [], total: 0 });
    const graph = getGraph("d1");
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
    expect(mockEdges.findByDomainNodeIds).not.toHaveBeenCalled();
  });
});

describe("searchNodes", () => {
  it("returns matching nodes with score", () => {
    mockNodes.listByDomain.mockReturnValue({ items: [makeNodeRow()], total: 1 });
    const results = searchNodes("test", "d1");
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(1.0);
    expect(results[0].matchType).toBe("fulltext");
  });
});

describe("getStats", () => {
  it("computes aggregate statistics", () => {
    const rows = [
      makeNodeRow({ node_type: "concept", status: "active", comprehension_score: 0.5 }),
      makeNodeRow({ id: "n2", node_type: "technology", status: "active", comprehension_score: 0.8 }),
    ];
    mockNodes.listByDomain.mockReturnValue({ items: rows, total: 2 });
    mockEdges.findByDomainNodeIds.mockReturnValue([makeEdgeRow()]);

    const stats = getStats("d1");
    expect(stats.totalNodes).toBe(2);
    expect(stats.nodesByType).toEqual({ concept: 1, technology: 1 });
    expect(stats.nodesByStatus).toEqual({ active: 2 });
    expect(stats.totalEdges).toBe(1);
    expect(stats.avgComprehension).toBeCloseTo(0.65);
  });

  it("handles empty domain", () => {
    mockNodes.listByDomain.mockReturnValue({ items: [], total: 0 });
    const stats = getStats("empty");
    expect(stats.totalNodes).toBe(0);
    expect(stats.avgComprehension).toBe(0);
  });
});
