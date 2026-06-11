import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron before anything that depends on it
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

// ---------------------------------------------------------------------------
// Mocks for direct imports (not part of DbDeps)
// ---------------------------------------------------------------------------

const mockRunPrompt = vi.fn();

vi.mock("@server/services/session-runner", () => ({
  createSessionRunner: () => ({ runPrompt: mockRunPrompt }),
}));

vi.mock("@server/lib/model-resolver", () => ({
  resolveModelId: vi.fn().mockResolvedValue("model-1"),
}));

vi.mock("@server/services/knowledge-graph", () => ({
  createNode: vi.fn().mockReturnValue({ id: "kn-new" }),
}));

vi.mock("@server/services/domain-config", () => ({
  readConfig: vi.fn().mockResolvedValue(null),
  extractSlugFromConfigPath: vi.fn().mockReturnValue("test-domain"),
}));

// ---------------------------------------------------------------------------
// Import SUT (after mocks)
// ---------------------------------------------------------------------------

import { createFrameworkEngine } from "@server/services/framework-engine";

// ---------------------------------------------------------------------------
// Mock DB builder — zero vi.mock("@server/db/index")
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    domains: { findById: vi.fn() },
    knowledgeNodes: { listByDomain: vi.fn() },
    decisionRecords: { listByDomain: vi.fn() },
    frameworkResults: {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      listByType: vi.fn(),
      listByDomain: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Cycle 1: Tracer bullet — factory structure
// ---------------------------------------------------------------------------

describe("createFrameworkEngine", () => {
  it("returns an engine with all 4 public methods", () => {
    const engine = createFrameworkEngine({ db: createMockDb() as never });

    expect(typeof engine.listFrameworks).toBe("function");
    expect(typeof engine.executeFrameworkAnalysis).toBe("function");
    expect(typeof engine.listFrameworkResults).toBe("function");
    expect(typeof engine.getFrameworkResult).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Cycle 2: listFrameworks
// ---------------------------------------------------------------------------

describe("listFrameworks", () => {
  it("returns built-in frameworks when no domainId given", async () => {
    const engine = createFrameworkEngine({ db: createMockDb() as never });
    const result = await engine.listFrameworks();

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((f) => f.type && f.name && f.description && typeof f.minNodes === "number")).toBe(true);
  });

  it("includes custom framework when domain has one configured", async () => {
    const mockDb = createMockDb();
    (mockDb.domains.findById as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "dom-1",
      name: "Test Domain",
      config_path: "/path/to/domains/test-domain/config.yaml",
    });

    vi.mocked(await import("@server/services/domain-config")).readConfig
      .mockResolvedValue({
        customFramework: {
          name: "My Custom Framework",
          description: "Custom analysis",
          promptTemplate: "Analyze: {{domain}}",
          outputFormat: "text",
        },
      });

    const engine = createFrameworkEngine({ db: mockDb as never });
    const result = await engine.listFrameworks("dom-1");

    const custom = result.find((f) => f.type === "custom");
    expect(custom).toBeDefined();
    expect(custom!.name).toBe("My Custom Framework");
  });
});

// ---------------------------------------------------------------------------
// Fixtures for executeFrameworkAnalysis
// ---------------------------------------------------------------------------

const LLM_RESPONSE = [
  "## Overall TRL Assessment",
  "Average TRL: 6.5",
  "",
  "## Technology Breakdown",
  "Test technology at TRL 6.",
  "",
  "## Key Gaps & Recommendations",
  "Need more integration testing.",
].join("\n");

function setupAnalysisMocks() {
  const mockDb = createMockDb();

  (mockDb.domains.findById as ReturnType<typeof vi.fn>).mockReturnValue({
    id: "dom-1",
    name: "Test Domain",
    config_path: "/path/to/domains/test-domain/config.yaml",
  });

  (mockDb.knowledgeNodes.listByDomain as ReturnType<typeof vi.fn>).mockReturnValue({
    items: [
      { id: "n-1", title: "Node 1", node_type: "fact", comprehension_score: 0.8 },
      { id: "n-2", title: "Node 2", node_type: "concept", comprehension_score: 0.9 },
      { id: "n-3", title: "Node 3", node_type: "event", comprehension_score: 0.7 },
    ],
    total: 3,
  });

  (mockDb.decisionRecords.listByDomain as ReturnType<typeof vi.fn>).mockReturnValue({ items: [], total: 0 });

  mockRunPrompt.mockResolvedValue({
    content: LLM_RESPONSE,
    estimatedTokens: 150,
    estimatedCost: 0.003,
  });

  const baseRow = {
    id: "result-1",
    domain_id: "dom-1",
    framework_type: "trl",
    title: "TRL Analysis — Level 6.5",
    analysis_data: JSON.stringify({ raw: LLM_RESPONSE, parsed: {} }),
    source_node_ids: JSON.stringify(["n-1", "n-2", "n-3"]),
    knowledge_node_ids: null,
    model_id: "model-1",
    cost_usd: 0.003,
    created_at: new Date().toISOString(),
  };

  (mockDb.frameworkResults.create as ReturnType<typeof vi.fn>).mockReturnValue(baseRow);
  (mockDb.frameworkResults.update as ReturnType<typeof vi.fn>).mockReturnValue({ ...baseRow, knowledge_node_ids: JSON.stringify(["kn-new"]) });
  (mockDb.frameworkResults.findById as ReturnType<typeof vi.fn>).mockReturnValue({ ...baseRow, knowledge_node_ids: JSON.stringify(["kn-new"]) });

  return mockDb;
}

// ---------------------------------------------------------------------------
// Cycle 4: executeFrameworkAnalysis — critical path
// ---------------------------------------------------------------------------

describe("executeFrameworkAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns FrameworkAnalysisResult with cost from SessionRunner", async () => {
    const mockDb = setupAnalysisMocks();
    const engine = createFrameworkEngine({ db: mockDb as never });
    const result = await engine.executeFrameworkAnalysis("dom-1", "trl");

    expect(result.id).toBe("result-1");
    expect(result.domainId).toBe("dom-1");
    expect(result.frameworkType).toBe("trl");
    expect(result.costUsd).toBe(0.003);
    expect(result.modelId).toBe("model-1");
  });

  it("delegates LLM call to SessionRunner.runPrompt with domain context", async () => {
    const mockDb = setupAnalysisMocks();
    const engine = createFrameworkEngine({ db: mockDb as never });
    await engine.executeFrameworkAnalysis("dom-1", "trl");

    expect(mockRunPrompt).toHaveBeenCalledOnce();
    const [domainId, modelId, prompt] = mockRunPrompt.mock.calls[0];
    expect(domainId).toBe("dom-1");
    expect(modelId).toBe("model-1");
    expect(prompt).toContain("Test Domain");
  });
});

// ---------------------------------------------------------------------------
// Cycle 5: listFrameworkResults
// ---------------------------------------------------------------------------

describe("listFrameworkResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped results from db", () => {
    const mockDb = createMockDb();
    const row = {
      id: "r-1",
      domain_id: "dom-1",
      framework_type: "trl",
      title: "Test Result",
      analysis_data: "{}",
      source_node_ids: JSON.stringify(["n-1"]),
      knowledge_node_ids: JSON.stringify(["kn-1"]),
      model_id: "model-1",
      cost_usd: 0.001,
      created_at: "2026-01-01T00:00:00Z",
    };
    (mockDb.frameworkResults.listByDomain as ReturnType<typeof vi.fn>).mockReturnValue({ items: [row], total: 1 });

    const engine = createFrameworkEngine({ db: mockDb as never });
    const result = engine.listFrameworkResults("dom-1");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("r-1");
    expect(result.items[0].domainId).toBe("dom-1");
    expect(result.total).toBe(1);
  });

  it("filters by framework type when provided", () => {
    const mockDb = createMockDb();
    (mockDb.frameworkResults.listByType as ReturnType<typeof vi.fn>).mockReturnValue({ items: [], total: 0 });

    const engine = createFrameworkEngine({ db: mockDb as never });
    engine.listFrameworkResults("dom-1", "swot");

    expect(mockDb.frameworkResults.listByType).toHaveBeenCalledWith("dom-1", "swot");
    expect(mockDb.frameworkResults.listByDomain).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Cycle 6: getFrameworkResult
// ---------------------------------------------------------------------------

describe("getFrameworkResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns single result by id", () => {
    const mockDb = createMockDb();
    const row = {
      id: "r-1",
      domain_id: "dom-1",
      framework_type: "trl",
      title: "Test",
      analysis_data: "{}",
      source_node_ids: null,
      knowledge_node_ids: null,
      model_id: null,
      cost_usd: 0,
      created_at: "2026-01-01T00:00:00Z",
    };
    (mockDb.frameworkResults.findById as ReturnType<typeof vi.fn>).mockReturnValue(row);

    const engine = createFrameworkEngine({ db: mockDb as never });
    const result = engine.getFrameworkResult("r-1");

    expect(result.id).toBe("r-1");
  });

  it("throws when result not found", () => {
    const mockDb = createMockDb();
    (mockDb.frameworkResults.findById as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const engine = createFrameworkEngine({ db: mockDb as never });
    expect(() => engine.getFrameworkResult("missing")).toThrow("Framework result not found: missing");
  });
});
