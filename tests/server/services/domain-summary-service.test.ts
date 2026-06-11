import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron before anything that depends on it
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRunPrompt = vi.fn();

vi.mock("@server/services/session-runner", () => ({
  createSessionRunner: () => ({ runPrompt: mockRunPrompt }),
}));

const mockDomainFindById = vi.fn();
const mockNodesListByDomain = vi.fn();
const mockDecisionsListByDomain = vi.fn();

vi.mock("@server/db/index", () => ({
  getDatabaseService: () => ({
    domains: { findById: mockDomainFindById },
    knowledgeNodes: { listByDomain: mockNodesListByDomain },
    decisionRecords: { listByDomain: mockDecisionsListByDomain },
  }),
}));

vi.mock("@server/services/knowledge-graph", () => ({
  createNode: vi.fn().mockReturnValue({ id: "kn-summary-1" }),
}));

vi.mock("@server/pi-mono/instance", () => ({
  getPiMonoWrapper: () => ({
    listAvailableModels: vi.fn().mockResolvedValue([
      { id: "deepseek-model", provider: "deepseek", costPerMillionInput: 0.1, costPerMillionOutput: 0.2 },
    ]),
  }),
}));

// ---------------------------------------------------------------------------
// Import SUT (after mocks)
// ---------------------------------------------------------------------------

import { generateDomainSummary, getMemoryLayerStats } from "@server/services/domain-summary-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUMMARY_RESPONSE = [
  "## Executive Summary",
  "The domain shows steady growth in knowledge accumulation.",
  "",
  "## Key Findings",
  "- Finding A",
  "- Finding B",
  "",
  "## Active Predictions",
  "- Prediction X",
  "",
  "## Decision Log",
  "- Decision 1 accepted",
  "",
  "## Recommended Actions",
  "- Action 1",
  "- Action 2",
].join("\n");

function setupMocks() {
  mockDomainFindById.mockReturnValue({
    id: "dom-1",
    name: "Test Domain",
    config_path: "/path/to/domains/test-domain/config.yaml",
  });

  mockNodesListByDomain.mockReturnValue({
    items: [],
    total: 0,
  });

  mockDecisionsListByDomain.mockReturnValue({ items: [], total: 0 });

  mockRunPrompt.mockResolvedValue({
    content: SUMMARY_RESPONSE,
    estimatedTokens: 200,
    estimatedCost: 0.004,
  });
}

// ---------------------------------------------------------------------------
// Tests: generateDomainSummary
// ---------------------------------------------------------------------------

describe("generateDomainSummary (domain-summary-service)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("returns parsed DomainSummaryResult from LLM output", async () => {
    const result = await generateDomainSummary("dom-1");

    expect(result.domainId).toBe("dom-1");
    expect(result.domainName).toBe("Test Domain");
    expect(result.executiveSummary).toContain("steady growth");
    expect(result.keyFindings).toContain("Finding A");
    expect(result.recommendedActions).toContain("Action 1");
    expect(result.generatedAt).toBeTruthy();
  });

  it("delegates LLM call to SessionRunner.runPrompt with domain context", async () => {
    await generateDomainSummary("dom-1");

    expect(mockRunPrompt).toHaveBeenCalledOnce();
    const [domainId, modelId, prompt] = mockRunPrompt.mock.calls[0];
    expect(domainId).toBe("dom-1");
    expect(modelId).toBeTruthy();
    expect(prompt).toContain("Test Domain");
  });
});

// ---------------------------------------------------------------------------
// Tests: getMemoryLayerStats
// ---------------------------------------------------------------------------

describe("getMemoryLayerStats (domain-summary-service)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("classifies nodes into hot/warm/cold layers by timestamp", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    mockNodesListByDomain.mockReturnValue({
      items: [
        { id: "hot-1", created_at: oneHourAgo, updated_at: oneHourAgo },
        { id: "warm-1", created_at: tenDaysAgo, updated_at: tenDaysAgo },
        { id: "cold-1", created_at: sixtyDaysAgo, updated_at: sixtyDaysAgo },
      ],
      total: 3,
    });

    const stats = getMemoryLayerStats("dom-1");

    expect(stats.hot).toBe(1);
    expect(stats.warm).toBe(1);
    expect(stats.cold).toBe(1);
    expect(stats.total).toBe(3);
  });

  it("returns all zeros for empty domain", () => {
    mockNodesListByDomain.mockReturnValue({ items: [], total: 0 });

    const stats = getMemoryLayerStats("dom-1");

    expect(stats).toEqual({ hot: 0, warm: 0, cold: 0, total: 0 });
  });
});
