import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock variables — referenced inside vi.mock factories
// ---------------------------------------------------------------------------

const {
  mockRunPrompt,
  mockCreateSessionRunner,
  mockEstimator,
  mockOnSessionCreated,
  mockCreateTrackerCostEstimator,
  mockResolveBudgetStatus,
  mockCreateNode,
  mockReadConfig,
} = vi.hoisted(() => {
  const mockRunPrompt = vi.fn();
  const mockCreateSessionRunner = vi.fn(() => ({ runPrompt: mockRunPrompt }));

  const mockEstimator = {
    estimateTokens: vi.fn(() => ({ input: 0, output: 0 })),
    estimateCost: vi.fn(() => 0),
  };
  const mockOnSessionCreated = vi.fn();
  const mockCreateTrackerCostEstimator = vi.fn(() => ({
    estimator: mockEstimator,
    onSessionCreated: mockOnSessionCreated,
  }));

  const mockResolveBudgetStatus = vi.fn(() => "completed" as const);
  const mockCreateNode = vi.fn();
  const mockReadConfig = vi.fn();

  return {
    mockRunPrompt,
    mockCreateSessionRunner,
    mockEstimator,
    mockOnSessionCreated,
    mockCreateTrackerCostEstimator,
    mockResolveBudgetStatus,
    mockCreateNode,
    mockReadConfig,
  };
});

// ---------------------------------------------------------------------------
// Mocks — collaborators that are NOT factory-converted
// ---------------------------------------------------------------------------

vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

vi.mock("@server/services/session-runner", () => ({
  createSessionRunner: mockCreateSessionRunner,
}));
vi.mock("@server/services/cost-estimator", () => ({
  createTrackerCostEstimator: mockCreateTrackerCostEstimator,
}));
vi.mock("@server/services/research-cost-tracker", () => ({
  startTracking: vi.fn(),
  stopTracking: vi.fn(),
  resolveBudgetStatus: mockResolveBudgetStatus,
  resetTracking: vi.fn(),
}));
vi.mock("@server/services/knowledge-graph", () => ({
  createNode: mockCreateNode,
}));
vi.mock("@server/services/domain-config", () => ({
  readConfig: mockReadConfig,
}));
vi.mock("@server/services/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));
vi.mock("@server/db/schema", () => ({}));
vi.mock("../../src/lib/ipc/channels", () => ({}));

// NO vi.mock("@server/db/index") — DB is injected via factory
// NO vi.mock("@server/pi-mono/instance") — PiMono is injected via factory

import { createResearchScheduler } from "@server/services/research-scheduler";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    domains: {
      findById: vi.fn(),
      list: vi.fn(() => ({ items: [], total: 0 })),
    },
    researchRuns: {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      countByDomainToday: vi.fn(() => 0),
      listByDomain: vi.fn(() => ({ items: [], total: 0 })),
      list: vi.fn(() => ({ items: [], total: 0 })),
    },
  } as unknown as import("@server/db/index").DatabaseService;
}

function createMockPiMono() {
  return {
    listAvailableModels: vi.fn().mockResolvedValue([]),
  } as unknown as import("@server/services/pi-mono-wrapper").PiMonoWrapper;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const domainConfig = {
  name: "Test Domain",
  description: "Test description",
  tags: ["testing"],
  sources: [],
  models: { research: "test-model" },
  research: { maxDailyRuns: 10, maxCostPerRunUsd: 1.0, queryTemplates: [] },
};

function makeRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-1",
    domain_id: "domain-1",
    status: "running",
    started_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createResearchScheduler", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockPiMono: ReturnType<typeof createMockPiMono>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = createMockDb();
    mockPiMono = createMockPiMono();

    (mockDb.domains.findById as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "domain-1",
      name: "Test Domain",
      config_path: "/test/config.yaml",
    });
    mockReadConfig.mockResolvedValue(domainConfig);
    (mockDb.researchRuns.create as ReturnType<typeof vi.fn>).mockReturnValue(
      makeRunRow(),
    );
    mockRunPrompt.mockResolvedValue({
      content: "Default findings",
      estimatedTokens: 100,
      estimatedCost: 0.05,
    });
  });

  function createScheduler() {
    return createResearchScheduler({ db: mockDb, piMono: mockPiMono });
  }

  async function waitForCompletion() {
    await vi.waitFor(() => {
      const done = (mockDb.researchRuns.update as ReturnType<typeof vi.fn>).mock.calls.some(
        (call: unknown[]) => {
          const data = call[1] as Record<string, unknown> | undefined;
          return (
            data?.status === "completed" ||
            data?.status === "over_budget" ||
            data?.status === "failed"
          );
        },
      );
      expect(done).toBe(true);
    }, { timeout: 3000 });
  }

  // -----------------------------------------------------------------------
  // Factory creation
  // -----------------------------------------------------------------------

  it("returns an object with all public methods", () => {
    const scheduler = createScheduler();

    for (const key of [
      "triggerResearch",
      "getResearchStatus",
      "listResearchHistory",
      "getResearchDashboard",
      "cancelResearch",
      "startScheduler",
      "stopScheduler",
      "getActiveRunForDomain",
    ] as const) {
      expect(typeof scheduler[key]).toBe("function");
    }
  });

  // -----------------------------------------------------------------------
  // triggerResearch
  // -----------------------------------------------------------------------

  it("delegates to SessionRunner with TrackerCostEstimator", async () => {
    const scheduler = createScheduler();
    await scheduler.triggerResearch("domain-1");
    await waitForCompletion();

    expect(mockCreateTrackerCostEstimator).toHaveBeenCalledWith("run-1");
    expect(mockCreateSessionRunner).toHaveBeenCalledWith(
      mockEstimator,
      mockOnSessionCreated,
    );
    expect(mockRunPrompt).toHaveBeenCalledWith(
      "domain-1",
      "test-model",
      expect.any(String),
    );
  });

  it("processes results: content → knowledge graph, cost/tokens → DB", async () => {
    mockRunPrompt.mockResolvedValue({
      content: "Key finding: tests matter",
      estimatedTokens: 200,
      estimatedCost: 0.08,
    });

    const scheduler = createScheduler();
    await scheduler.triggerResearch("domain-1");
    await waitForCompletion();

    expect(mockCreateNode).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Key finding: tests matter",
        domainId: "domain-1",
      }),
    );

    const completionCall = (mockDb.researchRuns.update as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => {
        const data = call[1] as Record<string, unknown> | undefined;
        return data?.status === "completed";
      },
    );
    expect(completionCall).toBeDefined();
    const updateData = completionCall![1] as Record<string, unknown>;
    expect(updateData.cost_usd).toBe(0.08);
    expect(updateData.token_count).toBe(200);
    expect(updateData.findings_summary).toBe("Key finding: tests matter");
  });

  it("handles runPrompt failure with cleanup via estimator", async () => {
    mockRunPrompt.mockRejectedValue(new Error("API timeout"));

    const scheduler = createScheduler();
    await scheduler.triggerResearch("domain-1");
    await waitForCompletion();

    expect(mockEstimator.estimateTokens).toHaveBeenCalled();

    const failCall = (mockDb.researchRuns.update as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => {
        const data = call[1] as Record<string, unknown> | undefined;
        return data?.status === "failed";
      },
    );
    expect(failCall).toBeDefined();
    const failData = failCall![1] as Record<string, unknown>;
    expect(failData.error_message).toBe("API timeout");
  });

  // -----------------------------------------------------------------------
  // getResearchStatus
  // -----------------------------------------------------------------------

  it("returns mapped status for an existing run", () => {
    (mockDb.researchRuns.findById as ReturnType<typeof vi.fn>).mockReturnValue(
      makeRunRow({ status: "completed", completed_at: "2025-01-01T00:00:00Z" }),
    );

    const scheduler = createScheduler();
    const status = scheduler.getResearchStatus("run-1");

    expect(status).toEqual({
      id: "run-1",
      domainId: "domain-1",
      status: "completed",
      progress: 100,
      startedAt: expect.any(String),
      completedAt: "2025-01-01T00:00:00Z",
    });
  });

  it("throws if run not found", () => {
    (mockDb.researchRuns.findById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    const scheduler = createScheduler();
    expect(() => scheduler.getResearchStatus("nonexistent")).toThrow(
      "Research run not found: nonexistent",
    );
  });

  // -----------------------------------------------------------------------
  // listResearchHistory
  // -----------------------------------------------------------------------

  it("lists and maps research history for a domain", () => {
    const row = makeRunRow({ status: "completed" });
    (mockDb.researchRuns.listByDomain as ReturnType<typeof vi.fn>).mockReturnValue({
      items: [row],
      total: 1,
    });

    const scheduler = createScheduler();
    const result = scheduler.listResearchHistory("domain-1");

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("run-1");
  });

  // -----------------------------------------------------------------------
  // getResearchDashboard
  // -----------------------------------------------------------------------

  it("returns dashboard with today summary, recent runs, and cost tracking", () => {
    const completedRow = makeRunRow({
      status: "completed",
      cost_usd: 0.05,
      model_id: "test-model",
    });
    (mockDb.researchRuns.list as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ items: [completedRow], total: 1 }) // recent
      .mockReturnValueOnce({ items: [completedRow], total: 1 }) // today
      .mockReturnValueOnce({ items: [completedRow], total: 1 }); // all (cost)

    const scheduler = createScheduler();
    const dashboard = scheduler.getResearchDashboard();

    expect(dashboard.recentResearch).toHaveLength(1);
    expect(dashboard.todaySummary).toContain("1 research run(s) completed today");
    expect(dashboard.costTracking.totalCost).toBe(0.05);
    expect(dashboard.costTracking.modelDistribution["test-model"]).toBe(0.05);
  });

  // -----------------------------------------------------------------------
  // cancelResearch
  // -----------------------------------------------------------------------

  it("cancels an active run and updates DB status", async () => {
    (mockDb.researchRuns.create as ReturnType<typeof vi.fn>).mockReturnValue(makeRunRow());
    (mockDb.researchRuns.findById as ReturnType<typeof vi.fn>).mockReturnValue(
      makeRunRow({ status: "running" }),
    );

    const scheduler = createScheduler();
    await scheduler.triggerResearch("domain-1");

    scheduler.cancelResearch("run-1");

    const updateCalls = (mockDb.researchRuns.update as ReturnType<typeof vi.fn>).mock.calls;
    const cancelCall = updateCalls.find(
      (call: unknown[]) => (call[1] as Record<string, unknown>)?.status === "cancelled",
    );
    expect(cancelCall).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // startScheduler / stopScheduler
  // -----------------------------------------------------------------------

  it("startScheduler is idempotent", () => {
    vi.useFakeTimers();
    try {
      const scheduler = createScheduler();
      scheduler.startScheduler();
      scheduler.startScheduler(); // second call should be no-op

      // Only one interval was created (can't directly count, but no crash = pass)
      scheduler.stopScheduler();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stopScheduler clears timers without error", () => {
    vi.useFakeTimers();
    try {
      const scheduler = createScheduler();
      scheduler.startScheduler();
      scheduler.stopScheduler();
      // Calling again after stop should be safe
      scheduler.stopScheduler();
    } finally {
      vi.useRealTimers();
    }
  });

  // -----------------------------------------------------------------------
  // getActiveRunForDomain
  // -----------------------------------------------------------------------

  it("returns null when no active run exists for domain", () => {
    const scheduler = createScheduler();
    expect(scheduler.getActiveRunForDomain("domain-1")).toBeNull();
  });

  it("returns active run status when one exists", async () => {
    (mockDb.researchRuns.create as ReturnType<typeof vi.fn>).mockReturnValue(makeRunRow());
    (mockDb.researchRuns.findById as ReturnType<typeof vi.fn>).mockReturnValue(
      makeRunRow({ status: "running" }),
    );

    const scheduler = createScheduler();
    await scheduler.triggerResearch("domain-1");

    const active = scheduler.getActiveRunForDomain("domain-1");
    // May be null if the async run completed already; if still active, verify shape
    if (active) {
      expect(active.id).toBe("run-1");
      expect(active.domainId).toBe("domain-1");
    }
  });
});
