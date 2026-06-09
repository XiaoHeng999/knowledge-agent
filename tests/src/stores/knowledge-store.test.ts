import { describe, it, expect, beforeEach, vi } from "vitest";
import { useKnowledgeStore } from "@/stores/knowledge-store";

function mockWindowApi() {
  const fns = {
    listNodes: vi.fn().mockResolvedValue({ nodes: [], total: 0 }),
    createNode: vi.fn(),
    updateNode: vi.fn(),
    deleteNode: vi.fn(),
    getGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    createEdge: vi.fn(),
    deleteEdge: vi.fn(),
  };

  // @ts-expect-error -- test mock
  window.api = { knowledge: fns };
  return fns;
}

const initialState = {
  nodes: [] as unknown[],
  edges: [] as unknown[],
  total: 0,
  loading: false,
  error: null as string | null,
  selectedNodeId: null as string | null,
  filters: { page: 1, pageSize: 20 },
};

beforeEach(() => {
  vi.clearAllMocks();
  useKnowledgeStore.setState(initialState);
});

describe("fetchNodes", () => {
  it("loads nodes from API", async () => {
    const api = mockWindowApi();
    const nodes = [{ id: "n1", title: "Test" }];
    api.listNodes.mockResolvedValue({ nodes, total: 1 });

    await useKnowledgeStore.getState().fetchNodes("d1");

    expect(useKnowledgeStore.getState().nodes).toEqual(nodes);
    expect(useKnowledgeStore.getState().total).toBe(1);
  });

  it("merges filters into request", async () => {
    const api = mockWindowApi();
    api.listNodes.mockResolvedValue({ nodes: [], total: 0 });

    await useKnowledgeStore.getState().fetchNodes("d1", { type: "concept" });

    expect(api.listNodes).toHaveBeenCalledWith(
      expect.objectContaining({ domainId: "d1", type: "concept" }),
    );
  });
});

describe("createNode", () => {
  it("creates and prepends node", async () => {
    const api = mockWindowApi();
    const node = { id: "n1", title: "New" };
    api.createNode.mockResolvedValue({ result: node });

    const result = await useKnowledgeStore.getState().createNode({ domainId: "d1", title: "New", type: "concept", content: "" });

    expect(result).toEqual(node);
    expect(useKnowledgeStore.getState().nodes[0]).toEqual(node);
  });

  it("returns null and sets error for pendingAudit response", async () => {
    const api = mockWindowApi();
    api.createNode.mockResolvedValue({ pendingAudit: true, auditId: "a1" });

    const result = await useKnowledgeStore.getState().createNode({ domainId: "d1", title: "X", type: "concept", content: "" });

    expect(result).toBeNull();
    expect(useKnowledgeStore.getState().error).toContain("pending review");
  });
});

describe("deleteNode", () => {
  it("removes node from list", async () => {
    const api = mockWindowApi();
    useKnowledgeStore.setState({ nodes: [{ id: "n1" }, { id: "n2" }], total: 2 });
    api.deleteNode.mockResolvedValue({});

    await useKnowledgeStore.getState().deleteNode("n1");

    expect(useKnowledgeStore.getState().nodes).toHaveLength(1);
    expect(useKnowledgeStore.getState().nodes[0].id).toBe("n2");
  });

  it("clears selectedNodeId if deleted node was selected", async () => {
    const api = mockWindowApi();
    useKnowledgeStore.setState({ nodes: [{ id: "n1" }], selectedNodeId: "n1", total: 1 });
    api.deleteNode.mockResolvedValue({});

    await useKnowledgeStore.getState().deleteNode("n1");

    expect(useKnowledgeStore.getState().selectedNodeId).toBeNull();
  });
});

describe("selectNode", () => {
  it("sets selectedNodeId", () => {
    useKnowledgeStore.getState().selectNode("n1");
    expect(useKnowledgeStore.getState().selectedNodeId).toBe("n1");
  });
});

describe("fetchGraph", () => {
  it("loads nodes and edges for graph view", async () => {
    const api = mockWindowApi();
    const nodes = [{ id: "n1" }];
    const edges = [{ id: "e1" }];
    api.getGraph.mockResolvedValue({ nodes, edges });

    await useKnowledgeStore.getState().fetchGraph("d1");

    expect(useKnowledgeStore.getState().nodes).toEqual(nodes);
    expect(useKnowledgeStore.getState().edges).toEqual(edges);
  });
});

describe("createEdge", () => {
  it("creates and appends edge", async () => {
    const api = mockWindowApi();
    const edge = { id: "e1", sourceId: "n1", targetId: "n2" };
    api.createEdge.mockResolvedValue({ result: edge });

    const result = await useKnowledgeStore.getState().createEdge({
      sourceId: "n1",
      targetId: "n2",
      type: "related",
    });

    expect(result).toEqual(edge);
    expect(useKnowledgeStore.getState().edges).toContainEqual(edge);
  });
});
