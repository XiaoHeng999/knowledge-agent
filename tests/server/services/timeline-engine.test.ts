import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

// External collaborators — still mocked, only DB mock is eliminated
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
vi.mock("@server/pi-mono/tools/timeline-analyze", () => ({
  setTimelineAnalyzeExecutor: vi.fn(),
}));

// NO vi.mock("@server/db/index") — DB is injected via factory

import { createTimelineEngine } from "@server/services/timeline-engine";

// ---------------------------------------------------------------------------
// Mock DB factory
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    predictions: {
      list: vi.fn(),
      listByDomain: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findExpired: vi.fn(),
    },
    knowledgeNodes: {
      listByDomain: vi.fn(),
    },
    domains: {
      findById: vi.fn(),
    },
  } as unknown as import("@server/db/index").DatabaseService;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString();

function makePredictionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "pred-1",
    domain_id: "dom-1",
    content: "Something will happen",
    confidence: 0.8,
    predicted_date: "2027-01-01",
    status: "pending",
    actual_outcome: null,
    source_node_ids: JSON.stringify(["n-1"]),
    reasoning: "Based on analysis",
    verified_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeNodeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "n-1",
    domain_id: "dom-1",
    title: "Test Node",
    node_type: "fact",
    comprehension_score: 3,
    content: "Some content",
    summary: "Some summary",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeNodes(count: number, overrides: Record<string, unknown> = {}) {
  return Array.from({ length: count }, (_, i) =>
    makeNodeRow({ id: `n-${i}`, title: `Node ${i}`, ...overrides }),
  );
}

const TREND_RESPONSE = [
  "## Trend Report",
  "The domain shows increasing activity in AI adoption.",
  "",
  "## Emerging Topics",
  "- LLM integration",
  "- RAG pipelines",
  "",
  "## Declining Topics",
  "- Manual testing",
  "",
  "## Predictions",
  "PREDICT: LLM agents will dominate by 2027 | CONFIDENCE: 75% | DATE: 2027-01-01",
].join("\n");

const PREDICTION_RESPONSE = [
  "PREDICT: RAG pipelines become standard | CONFIDENCE: 80% | DATE: 2027-06-01",
  "PREDICT: Manual testing declines further | CONFIDENCE: 65% | DATE: none",
].join("\n");

// ---------------------------------------------------------------------------
// listPredictions
// ---------------------------------------------------------------------------

describe("createTimelineEngine — listPredictions", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("lists predictions for a domain without status filter", () => {
    mockDb.predictions.listByDomain.mockReturnValue({
      items: [makePredictionRow(), makePredictionRow({ id: "pred-2" })],
      total: 2,
    });

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.listPredictions("dom-1");

    expect(mockDb.predictions.listByDomain).toHaveBeenCalledWith("dom-1", 50, 0);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.items[0].id).toBe("pred-1");
  });

  it("lists predictions with status filter", () => {
    mockDb.predictions.list.mockReturnValue({
      items: [makePredictionRow({ status: "confirmed" })],
      total: 1,
    });

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.listPredictions("dom-1", { status: "confirmed" });

    expect(mockDb.predictions.list).toHaveBeenCalledWith(
      expect.objectContaining({
        where: "domain_id = ? AND status = ?",
        params: ["dom-1", "confirmed"],
      }),
    );
    expect(result.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getPrediction
// ---------------------------------------------------------------------------

describe("createTimelineEngine — getPrediction", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("returns a prediction by id", () => {
    mockDb.predictions.findById.mockReturnValue(makePredictionRow());

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.getPrediction("pred-1");

    expect(mockDb.predictions.findById).toHaveBeenCalledWith("pred-1");
    expect(result.id).toBe("pred-1");
    expect(result.content).toBe("Something will happen");
  });

  it("throws when prediction not found", () => {
    mockDb.predictions.findById.mockReturnValue(null);

    const engine = createTimelineEngine({ db: mockDb });
    expect(() => engine.getPrediction("missing")).toThrow("Prediction not found: missing");
  });
});

// ---------------------------------------------------------------------------
// createPrediction
// ---------------------------------------------------------------------------

describe("createTimelineEngine — createPrediction", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    mockDb.predictions.create.mockImplementation((data: Record<string, unknown>) => ({
      id: "pred-new",
      domain_id: data.domain_id,
      content: data.content,
      confidence: data.confidence,
      predicted_date: data.predicted_date,
      status: data.status,
      actual_outcome: data.actual_outcome,
      source_node_ids: data.source_node_ids,
      reasoning: data.reasoning,
      verified_at: null,
      created_at: NOW,
      updated_at: NOW,
    }));
  });

  it("creates a prediction and returns mapped result", () => {
    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.createPrediction({
      domainId: "dom-1",
      content: "AI will evolve",
      confidence: 0.9,
      predictedDate: "2027-06-01",
      reasoning: "Based on trends",
      sourceNodeIds: ["n-1", "n-2"],
    });

    expect(mockDb.predictions.create).toHaveBeenCalledOnce();
    expect(result.id).toBe("pred-new");
    expect(result.domainId).toBe("dom-1");
    expect(result.confidence).toBe(0.9);
  });
});

// ---------------------------------------------------------------------------
// updatePrediction
// ---------------------------------------------------------------------------

describe("createTimelineEngine — updatePrediction", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("updates prediction fields", () => {
    mockDb.predictions.update.mockReturnValue(makePredictionRow({
      content: "Updated content",
      confidence: 0.7,
    }));

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.updatePrediction("pred-1", {
      content: "Updated content",
      confidence: 0.7,
    });

    expect(mockDb.predictions.update).toHaveBeenCalledWith("pred-1", expect.objectContaining({
      content: "Updated content",
      confidence: 0.7,
    }));
    expect(result.content).toBe("Updated content");
  });

  it("throws when prediction not found", () => {
    mockDb.predictions.update.mockReturnValue(null);

    const engine = createTimelineEngine({ db: mockDb });
    expect(() => engine.updatePrediction("missing", { content: "x" })).toThrow("Prediction not found: missing");
  });
});

// ---------------------------------------------------------------------------
// verifyPrediction
// ---------------------------------------------------------------------------

describe("createTimelineEngine — verifyPrediction", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("verifies a prediction as confirmed with outcome", () => {
    mockDb.predictions.findById.mockReturnValue(makePredictionRow());
    mockDb.predictions.update.mockReturnValue(makePredictionRow({
      status: "confirmed",
      actual_outcome: "It happened",
      verified_at: NOW,
    }));

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.verifyPrediction("pred-1", "confirmed", "It happened");

    expect(mockDb.predictions.update).toHaveBeenCalledWith("pred-1", expect.objectContaining({
      status: "confirmed",
      actual_outcome: "It happened",
      verified_at: expect.any(String),
    }));
    expect(result.status).toBe("confirmed");
  });

  it("throws when prediction not found", () => {
    mockDb.predictions.findById.mockReturnValue(null);

    const engine = createTimelineEngine({ db: mockDb });
    expect(() => engine.verifyPrediction("missing", "refuted")).toThrow("Prediction not found: missing");
  });
});

// ---------------------------------------------------------------------------
// deletePrediction
// ---------------------------------------------------------------------------

describe("createTimelineEngine — deletePrediction", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("deletes a prediction", () => {
    mockDb.predictions.delete.mockReturnValue(true);

    const engine = createTimelineEngine({ db: mockDb });
    engine.deletePrediction("pred-1");

    expect(mockDb.predictions.delete).toHaveBeenCalledWith("pred-1");
  });

  it("throws when prediction not found", () => {
    mockDb.predictions.delete.mockReturnValue(false);

    const engine = createTimelineEngine({ db: mockDb });
    expect(() => engine.deletePrediction("missing")).toThrow("Prediction not found: missing");
  });
});

// ---------------------------------------------------------------------------
// extractTimelineEvents
// ---------------------------------------------------------------------------

describe("createTimelineEngine — extractTimelineEvents", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("extracts events from event-type nodes and predictions", () => {
    const eventNodes = makeNodes(2, { node_type: "event" });
    const decisionNodes = makeNodes(1, {
      id: "n-dec",
      node_type: "decision",
      title: "Big Decision",
    });
    mockDb.knowledgeNodes.listByDomain.mockReturnValue({
      items: [...eventNodes, ...decisionNodes],
      total: 3,
    });
    mockDb.predictions.listByDomain.mockReturnValue({
      items: [makePredictionRow()],
      total: 1,
    });

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.extractTimelineEvents("dom-1");

    // 2 events + 1 milestone + 1 prediction = 4
    expect(result.items).toHaveLength(4);
    expect(result.total).toBe(4);

    const types = result.items.map((e) => e.type);
    expect(types).toContain("event");
    expect(types).toContain("milestone");
    expect(types).toContain("prediction");
  });

  it("returns entries sorted by date descending", () => {
    mockDb.knowledgeNodes.listByDomain.mockReturnValue({
      items: [
        makeNodeRow({ id: "n-old", created_at: "2024-01-01T00:00:00.000Z" }),
      ],
      total: 1,
    });
    mockDb.predictions.listByDomain.mockReturnValue({
      items: [makePredictionRow({ predicted_date: "2025-06-01T00:00:00.000Z" })],
      total: 1,
    });

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.extractTimelineEvents("dom-1");

    // Prediction (2025) should come before node (2024)
    expect(result.items[0].type).toBe("prediction");
  });
});

// ---------------------------------------------------------------------------
// getPredictionAccuracy
// ---------------------------------------------------------------------------

describe("createTimelineEngine — getPredictionAccuracy", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("computes accuracy metrics from prediction statuses", () => {
    mockDb.predictions.list.mockReturnValue({
      items: [
        makePredictionRow({ id: "p1", status: "confirmed", confidence: 0.9 }),
        makePredictionRow({ id: "p2", status: "confirmed", confidence: 0.7 }),
        makePredictionRow({ id: "p3", status: "refuted", confidence: 0.6 }),
        makePredictionRow({ id: "p4", status: "pending", confidence: 0.5 }),
      ],
      total: 4,
    });

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.getPredictionAccuracy("dom-1");

    expect(result.total).toBe(4);
    expect(result.confirmed).toBe(2);
    expect(result.missed).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.confirmedRate).toBe(0.5);
    expect(result.missedRate).toBe(0.25);
    expect(result.avgConfirmedConfidence).toBe(0.8);
  });

  it("returns zeroes when no predictions exist", () => {
    mockDb.predictions.list.mockReturnValue({ items: [], total: 0 });

    const engine = createTimelineEngine({ db: mockDb });
    const result = engine.getPredictionAccuracy("dom-1");

    expect(result.total).toBe(0);
    expect(result.confirmedRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// expireOverduePredictions
// ---------------------------------------------------------------------------

describe("createTimelineEngine — expireOverduePredictions", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("expires overdue predictions and returns count", () => {
    mockDb.predictions.findExpired.mockReturnValue([
      makePredictionRow({ id: "p-exp-1" }),
      makePredictionRow({ id: "p-exp-2" }),
    ]);

    const engine = createTimelineEngine({ db: mockDb });
    const count = engine.expireOverduePredictions();

    expect(count).toBe(2);
    expect(mockDb.predictions.update).toHaveBeenCalledTimes(2);
    expect(mockDb.predictions.update).toHaveBeenCalledWith("p-exp-1", expect.objectContaining({
      status: "expired",
    }));
  });

  it("returns 0 when no expired predictions", () => {
    mockDb.predictions.findExpired.mockReturnValue([]);

    const engine = createTimelineEngine({ db: mockDb });
    expect(engine.expireOverduePredictions()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// analyzeTrends
// ---------------------------------------------------------------------------

describe("createTimelineEngine — analyzeTrends", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    mockDb.domains.findById.mockReturnValue({
      id: "dom-1",
      name: "Test Domain",
      config_path: "/path/to/config.yaml",
    });
    mockDb.knowledgeNodes.listByDomain.mockReturnValue({
      items: makeNodes(15),
      total: 15,
    });
    mockDb.predictions.listByDomain.mockReturnValue({ items: [], total: 0 });
    mockDb.predictions.create.mockReturnValue({});
    mockRunPrompt.mockResolvedValue({
      content: TREND_RESPONSE,
      estimatedCost: 0.006,
    });
  });

  it("returns TrendAnalysisResult with cost from SessionRunner", async () => {
    const engine = createTimelineEngine({ db: mockDb });
    const result = await engine.analyzeTrends("dom-1", "quarter");

    expect(result.domainId).toBe("dom-1");
    expect(result.period).toBe("quarter");
    expect(result.costUsd).toBe(0.006);
    expect(result.emergingTopics).toContain("LLM integration");
    expect(result.decliningTopics).toContain("Manual testing");
    expect(result.report).toBeTruthy();
  });

  it("delegates LLM call to SessionRunner.runPrompt", async () => {
    const engine = createTimelineEngine({ db: mockDb });
    await engine.analyzeTrends("dom-1");

    expect(mockRunPrompt).toHaveBeenCalledOnce();
    const [domainId, modelId, prompt] = mockRunPrompt.mock.calls[0];
    expect(domainId).toBe("dom-1");
    expect(modelId).toBe("model-1");
    expect(prompt).toContain("Test Domain");
  });

  it("throws when domain not found", async () => {
    mockDb.domains.findById.mockReturnValue(null);

    const engine = createTimelineEngine({ db: mockDb });
    await expect(engine.analyzeTrends("missing")).rejects.toThrow("Domain not found: missing");
  });

  it("throws when insufficient knowledge nodes", async () => {
    mockDb.knowledgeNodes.listByDomain.mockReturnValue({
      items: makeNodes(3),
      total: 3,
    });

    const engine = createTimelineEngine({ db: mockDb });
    await expect(engine.analyzeTrends("dom-1")).rejects.toThrow("Insufficient data");
  });
});

// ---------------------------------------------------------------------------
// generatePredictions
// ---------------------------------------------------------------------------

describe("createTimelineEngine — generatePredictions", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    mockDb.domains.findById.mockReturnValue({
      id: "dom-1",
      name: "Test Domain",
      config_path: "/path/to/config.yaml",
    });
    mockDb.knowledgeNodes.listByDomain.mockReturnValue({
      items: makeNodes(10),
      total: 10,
    });
    mockDb.predictions.listByDomain.mockReturnValue({ items: [], total: 0 });
    mockRunPrompt.mockResolvedValue({
      content: PREDICTION_RESPONSE,
      estimatedCost: 0.002,
    });
    mockDb.predictions.create.mockImplementation((data: Record<string, unknown>) => ({
      id: `pred-${Date.now()}`,
      domain_id: data.domain_id,
      content: data.content,
      confidence: data.confidence,
      predicted_date: data.predicted_date,
      status: data.status,
      actual_outcome: data.actual_outcome,
      source_node_ids: data.source_node_ids,
      reasoning: data.reasoning,
      verified_at: null,
      created_at: NOW,
      updated_at: NOW,
    }));
  });

  it("returns predictions parsed from SessionRunner output", async () => {
    const engine = createTimelineEngine({ db: mockDb });
    const results = await engine.generatePredictions("dom-1");

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].content).toContain("RAG pipelines");
    expect(results[0].confidence).toBe(0.8);
    expect(results[0].domainId).toBe("dom-1");
  });

  it("delegates LLM call to SessionRunner.runPrompt", async () => {
    const engine = createTimelineEngine({ db: mockDb });
    await engine.generatePredictions("dom-1");

    expect(mockRunPrompt).toHaveBeenCalledOnce();
    const [domainId, modelId, prompt] = mockRunPrompt.mock.calls[0];
    expect(domainId).toBe("dom-1");
    expect(prompt).toContain("Test Domain");
  });

  it("throws when insufficient knowledge nodes", async () => {
    mockDb.knowledgeNodes.listByDomain.mockReturnValue({
      items: makeNodes(2),
      total: 2,
    });

    const engine = createTimelineEngine({ db: mockDb });
    await expect(engine.generatePredictions("dom-1")).rejects.toThrow("Insufficient data");
  });
});

// ---------------------------------------------------------------------------
// initializeTimelineExecutor
// ---------------------------------------------------------------------------

describe("createTimelineEngine — initializeTimelineExecutor", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
  });

  it("registers an executor with setTimelineAnalyzeExecutor", async () => {
    const { setTimelineAnalyzeExecutor } = await import("@server/pi-mono/tools/timeline-analyze");

    const engine = createTimelineEngine({ db: mockDb });
    engine.initializeTimelineExecutor();

    expect(setTimelineAnalyzeExecutor).toHaveBeenCalledOnce();
    expect(setTimelineAnalyzeExecutor).toHaveBeenCalledWith(expect.any(Function));
  });
});
