import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@server/ipc/handler", () => ({
  registerHandler: vi.fn(),
}));

import { dispatch, createServiceRegistry } from "@server/ipc/router";
import {
  vcRoutes,
  searchRoutes,
  researchRoutes,
  importRoutes,
  timelineRoutes,
  skillRoutes,
  modelRoutes,
  inboxRoutes,
  frameworkRoutes,
  domainRoutes,
  securityRoutes,
  chatRoutes,
  knowledgeReadRoutes,
  settingsRoutes,
  updateRoutes,
  workerRoutes,
  getAutoRoutes,
} from "@server/ipc/routes";

// ---------------------------------------------------------------------------
// Helper — build a registry with mock services for all domains
// ---------------------------------------------------------------------------

function makeMockRegistry() {
  const registry = createServiceRegistry();

  registry.set("version-control", {
    initRepo: vi.fn(async () => ({ initialized: true, branch: "main", uncommittedChanges: 0 })),
    getStatus: vi.fn(async () => ({ initialized: true, branch: "main", uncommittedChanges: 0 })),
    getHistory: vi.fn(async () => [{ hash: "abc", shortHash: "a", message: "init", author: "t", date: "2025-01-01" }]),
    getDiff: vi.fn(async () => ({ diffs: [], hasChanges: false })),
    rollbackFile: vi.fn(async () => ({ success: true, newCommitHash: "def" })),
  });

  registry.set("search-engine", {
    search: vi.fn(async () => ({ results: [], total: 0 })),
    reindexDomain: vi.fn(async () => 42),
  });

  registry.set("research-scheduler", {
    triggerResearch: vi.fn(async () => ({ id: "r1", status: "running" })),
    getResearchStatus: vi.fn(() => ({ id: "r1", status: "running" })),
    listResearchHistory: vi.fn(() => ({ items: [], total: 0 })),
    getResearchDashboard: vi.fn(() => ({ active: 0, completed: 0 })),
    cancelResearch: vi.fn(),
  });

  registry.set("import-pipeline", {
    importUrl: vi.fn(async () => ({ id: "i1", status: "pending" })),
    importFile: vi.fn(async () => ({ id: "i2", status: "pending" })),
    getImportStatus: vi.fn(() => ({ id: "i1", status: "completed" })),
    listImports: vi.fn(() => []),
    retryImport: vi.fn(async () => ({ id: "i1", status: "retrying" })),
    cancelImport: vi.fn(),
    pollRssFeed: vi.fn(async () => ({ imported: 5 })),
  });

  registry.set("timeline-engine", {
    listPredictions: vi.fn(() => ({ items: [], total: 0 })),
    getPrediction: vi.fn(() => ({ id: "p1", domainId: "d1" })),
    createPrediction: vi.fn(() => ({ id: "p1" })),
    updatePrediction: vi.fn(() => ({ id: "p1" })),
    verifyPrediction: vi.fn(),
    deletePrediction: vi.fn(),
    analyzeTrends: vi.fn(async () => ({ trends: [] })),
    generatePredictions: vi.fn(async () => [{ id: "p2" }]),
    getPredictionAccuracy: vi.fn(() => ({ total: 10, correct: 7 })),
    expireOverduePredictions: vi.fn(() => 3),
    extractTimelineEvents: vi.fn(() => ({ items: [], total: 0 })),
  });

  registry.set("skill-engine", {
    listSkills: vi.fn(() => [{ id: "s1" }]),
    getSkill: vi.fn(() => ({ id: "s1", name: "test" })),
    toggleSkill: vi.fn(),
    executeSkill: vi.fn(async () => ({ id: "e1", status: "running" })),
    cancelExecution: vi.fn(() => true),
    getSkillMetrics: vi.fn(() => ({ runs: 5, successRate: 0.9 })),
    rateSkill: vi.fn(),
    registerDomainSkills: vi.fn(async () => 3),
  });

  registry.set("model-manager", {
    listProviders: vi.fn(async () => [{ id: "openai" }]),
    listModels: vi.fn(async () => [{ id: "gpt-4" }]),
    addApiKey: vi.fn(async () => ({ providerId: "openai" })),
    validateApiKey: vi.fn(async () => ({ valid: true, models: [{ id: "gpt-4" }] })),
    removeApiKey: vi.fn(),
    setDefaultModel: vi.fn(),
    getDefaultModel: vi.fn(() => ({ providerId: "openai", modelId: "gpt-4" })),
  });

  registry.set("inbox-processor", {
    addItem: vi.fn(() => ({ id: "item1" })),
    listItems: vi.fn(() => ({ items: [], total: 0 })),
    processItem: vi.fn(() => ({ id: "item1", status: "processed" })),
    rejectItem: vi.fn(),
    getStats: vi.fn(() => ({ pending: 0, processed: 0 })),
  });

  registry.set("framework-engine", {
    listFrameworks: vi.fn(async () => [{ type: "swot", name: "SWOT" }]),
    executeFrameworkAnalysis: vi.fn(async () => ({ id: "a1" })),
    listFrameworkResults: vi.fn(() => ({ items: [], total: 0 })),
    getFrameworkResult: vi.fn(() => ({ id: "a1" })),
  });

  registry.set("decision-service", {
    listDecisionRecords: vi.fn(() => []),
    getDecisionRecord: vi.fn(() => ({ id: "dec1" })),
    generateDecisionRecord: vi.fn(() => ({ id: "dec1" })),
    updateDecisionStatus: vi.fn(),
    retrieveRelevantDecisions: vi.fn(() => []),
  });

  registry.set("domain-summary-service", {
    generateDomainSummary: vi.fn(async () => ({ summary: "test" })),
    getMemoryLayerStats: vi.fn(() => ({ hot: 1, warm: 2, cold: 3, total: 6 })),
  });

  registry.set("domain-manager", {
    listDomains: vi.fn(() => [{ id: "d1" }]),
    getDomain: vi.fn(() => ({ id: "d1", name: "test" })),
    updateDomain: vi.fn(async () => ({ id: "d1" })),
    deleteDomain: vi.fn(async () => {}),
    getDomainConfig: vi.fn(async () => ({ theme: "dark" })),
  });

  registry.set("security-gate", {
    resolveAudit: vi.fn(),
    bulkResolve: vi.fn(),
    getAuditLog: vi.fn(() => ({ entries: [], total: 0 })),
  });

  registry.set("diff-service", {
    generateDiff: vi.fn(() => ({ hunks: [] })),
  });

  registry.set("conversation-service", {
    createConversation: vi.fn(() => ({ id: "c1" })),
    listConversations: vi.fn(() => ({ conversations: [], total: 0 })),
    getConversation: vi.fn(() => ({ id: "c1" })),
    deleteConversation: vi.fn(),
    getConversationTree: vi.fn(() => ({ id: "c1", messages: [] })),
    abortStream: vi.fn(),
    addMessage: vi.fn(() => ({ id: "m1" })),
    branchFromMessage: vi.fn(() => ({ id: "m2" })),
  });

  registry.set("knowledge-graph", {
    getNode: vi.fn(() => ({ id: "n1", title: "test" })),
    listNodes: vi.fn(() => ({ nodes: [], total: 0 })),
    getGraph: vi.fn(() => ({ nodes: [], edges: [] })),
  });

  registry.set("db-settings", {
    get: vi.fn((_key: string) => "dark"),
    set: vi.fn(),
  });

  registry.set("auto-updater", {
    getUpdateStatus: vi.fn(() => ({ checking: false, available: true, downloading: false, downloaded: false, version: "1.2.3", error: null })),
    downloadUpdate: vi.fn(async () => {}),
    quitAndInstall: vi.fn(),
  });

  registry.set("worker-bridge", {
    submitTask: vi.fn(() => "task-123"),
    cancelTask: vi.fn(),
    getStatus: vi.fn(() => ({ pendingCount: 5 })),
  });

  return registry;
}

function findRoute(routes: ReturnType<typeof getAutoRoutes>, channel: string) {
  return routes.find((r) => r.channel === channel)!;
}

// ---------------------------------------------------------------------------
// VC routes
// ---------------------------------------------------------------------------

describe("VC routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("vc:init dispatches to initRepo", async () => {
    const result = await dispatch(findRoute(vcRoutes, "vc:init"), {}, registry);
    expect(result).toEqual({ initialized: true, branch: "main", uncommittedChanges: 0 });
    expect(registry.get("version-control")!.initRepo).toHaveBeenCalled();
  });

  it("vc:getHistory extracts params and wraps in { commits }", async () => {
    const result = await dispatch(findRoute(vcRoutes, "vc:getHistory"), { filePath: "a.ts", limit: 5 }, registry);
    expect(registry.get("version-control")!.getHistory).toHaveBeenCalledWith("a.ts", 5);
    expect(result).toEqual({ commits: [{ hash: "abc", shortHash: "a", message: "init", author: "t", date: "2025-01-01" }] });
  });
});

// ---------------------------------------------------------------------------
// Search routes
// ---------------------------------------------------------------------------

describe("Search routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("search:search passes full req", async () => {
    await dispatch(findRoute(searchRoutes, "search:search"), { query: "test" }, registry);
    expect(registry.get("search-engine")!.search).toHaveBeenCalledWith({ query: "test" });
  });

  it("search:reindexDomain extracts domainId and wraps", async () => {
    const result = await dispatch(findRoute(searchRoutes, "search:reindexDomain"), { domainId: "d1" }, registry);
    expect(registry.get("search-engine")!.reindexDomain).toHaveBeenCalledWith("d1");
    expect(result).toEqual({ indexed: 42 });
  });
});

// ---------------------------------------------------------------------------
// Research routes
// ---------------------------------------------------------------------------

describe("Research routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("research:trigger passes domainId + hardcoded 'manual'", async () => {
    await dispatch(findRoute(researchRoutes, "research:trigger"), { domainId: "d1" }, registry);
    expect(registry.get("research-scheduler")!.triggerResearch).toHaveBeenCalledWith("d1", "manual");
  });

  it("research:getDashboard calls with no args", async () => {
    await dispatch(findRoute(researchRoutes, "research:getDashboard"), {}, registry);
    expect(registry.get("research-scheduler")!.getResearchDashboard).toHaveBeenCalledWith({});
  });
});

// ---------------------------------------------------------------------------
// Import routes
// ---------------------------------------------------------------------------

describe("Import routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("import:list computes pagination from page/pageSize", async () => {
    await dispatch(findRoute(importRoutes, "import:list"), { domainId: "d1", page: 2, pageSize: 10 }, registry);
    expect(registry.get("import-pipeline")!.listImports).toHaveBeenCalledWith("d1", undefined, 10, 10);
  });

  it("import:list uses defaults when page/pageSize omitted", async () => {
    await dispatch(findRoute(importRoutes, "import:list"), { domainId: "d1" }, registry);
    expect(registry.get("import-pipeline")!.listImports).toHaveBeenCalledWith("d1", undefined, 20, 0);
  });
});

// ---------------------------------------------------------------------------
// Timeline routes
// ---------------------------------------------------------------------------

describe("Timeline routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("timeline:generatePredictions wraps in { predictions }", async () => {
    const result = await dispatch(findRoute(timelineRoutes, "timeline:generatePredictions"), { domainId: "d1" }, registry);
    expect(result).toEqual({ predictions: [{ id: "p2" }] });
  });

  it("timeline:expireOverdue wraps in { expired }", async () => {
    const result = await dispatch(findRoute(timelineRoutes, "timeline:expireOverdue"), {}, registry);
    expect(result).toEqual({ expired: 3 });
  });

  it("timeline:listPredictions passes options object", async () => {
    await dispatch(findRoute(timelineRoutes, "timeline:listPredictions"), { domainId: "d1", status: "active", limit: 5, offset: 10 }, registry);
    expect(registry.get("timeline-engine")!.listPredictions).toHaveBeenCalledWith("d1", { status: "active", limit: 5, offset: 10 });
  });
});

// ---------------------------------------------------------------------------
// Skill routes
// ---------------------------------------------------------------------------

describe("Skill routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("skill:list wraps in { items }", async () => {
    const result = await dispatch(findRoute(skillRoutes, "skill:list"), { domainId: "d1" }, registry);
    expect(result).toEqual({ items: [{ id: "s1" }] });
  });

  it("skill:cancel wraps in { cancelled }", async () => {
    const result = await dispatch(findRoute(skillRoutes, "skill:cancel"), { id: "e1" }, registry);
    expect(result).toEqual({ cancelled: true });
  });
});

// ---------------------------------------------------------------------------
// Model routes
// ---------------------------------------------------------------------------

describe("Model routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("model:listProviders wraps in { providers }", async () => {
    const result = await dispatch(findRoute(modelRoutes, "model:listProviders"), {}, registry);
    expect(result).toEqual({ providers: [{ id: "openai" }] });
  });

  it("model:addApiKey transforms to { success, providerId }", async () => {
    const result = await dispatch(findRoute(modelRoutes, "model:addApiKey"), { providerId: "openai", apiKey: "key" }, registry);
    expect(result).toEqual({ success: true, providerId: "openai" });
  });

  it("model:getDefault transforms null to empty defaults", async () => {
    (registry.get("model-manager")!.getDefaultModel as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
    const result = await dispatch(findRoute(modelRoutes, "model:getDefault"), {}, registry);
    expect(result).toEqual({ providerId: "", modelId: "" });
  });
});

// ---------------------------------------------------------------------------
// Inbox routes (passthrough subset)
// ---------------------------------------------------------------------------

describe("Inbox passthrough routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("inbox:addItem passes full req", async () => {
    await dispatch(findRoute(inboxRoutes, "inbox:addItem"), { content: "test" }, registry);
    expect(registry.get("inbox-processor")!.addItem).toHaveBeenCalledWith({ content: "test" });
  });

  it("inbox:processItem extracts id and domainId", async () => {
    await dispatch(findRoute(inboxRoutes, "inbox:processItem"), { id: "i1", domainId: "d1" }, registry);
    expect(registry.get("inbox-processor")!.processItem).toHaveBeenCalledWith("i1", "d1");
  });
});

// ---------------------------------------------------------------------------
// Framework routes
// ---------------------------------------------------------------------------

describe("Framework routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("framework:listFrameworks wraps in { frameworks }", async () => {
    const result = await dispatch(findRoute(frameworkRoutes, "framework:listFrameworks"), { domainId: "d1" }, registry);
    expect(result).toEqual({ frameworks: [{ type: "swot", name: "SWOT" }] });
  });

  it("framework:createDecision extracts 6 fields", async () => {
    await dispatch(findRoute(frameworkRoutes, "framework:createDecision"), {
      domainId: "d1", title: "t", context: "c", decisionText: "d", rationale: "r", expectedOutcome: "o",
    }, registry);
    expect(registry.get("decision-service")!.generateDecisionRecord).toHaveBeenCalledWith("d1", "t", "c", "d", "r", "o");
  });

  it("framework:retrieveRelated wraps in { decisions }", async () => {
    const result = await dispatch(findRoute(frameworkRoutes, "framework:retrieveRelatedDecisions"), { domainId: "d1", queryText: "q" }, registry);
    expect(result).toEqual({ decisions: [] });
  });
});

// ---------------------------------------------------------------------------
// Domain routes (passthrough subset)
// ---------------------------------------------------------------------------

describe("Domain passthrough routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("domain:list wraps in { domains }", async () => {
    const result = await dispatch(findRoute(domainRoutes, "domain:list"), {}, registry);
    expect(result).toEqual({ domains: [{ id: "d1" }] });
  });

  it("domain:getConfig wraps in { config }", async () => {
    const result = await dispatch(findRoute(domainRoutes, "domain:getConfig"), { id: "d1" }, registry);
    expect(result).toEqual({ config: { theme: "dark" } });
  });
});

// ---------------------------------------------------------------------------
// Knowledge read routes (passthrough subset — write handlers stay explicit)
// ---------------------------------------------------------------------------

describe("Knowledge read routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("knowledge:getNode extracts id", async () => {
    await dispatch(findRoute(knowledgeReadRoutes, "knowledge:getNode"), { id: "n1" }, registry);
    expect(registry.get("knowledge-graph")!.getNode).toHaveBeenCalledWith("n1");
  });

  it("knowledge:getGraph extracts domainId", async () => {
    await dispatch(findRoute(knowledgeReadRoutes, "knowledge:getGraph"), { domainId: "d1" }, registry);
    expect(registry.get("knowledge-graph")!.getGraph).toHaveBeenCalledWith("d1");
  });

  it("knowledge:listNodes passes full req", async () => {
    await dispatch(findRoute(knowledgeReadRoutes, "knowledge:listNodes"), { domainId: "d1" }, registry);
    expect(registry.get("knowledge-graph")!.listNodes).toHaveBeenCalledWith({ domainId: "d1" });
  });
});

// ---------------------------------------------------------------------------
// Security routes (passthrough subset)
// ---------------------------------------------------------------------------

describe("Security passthrough routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("security:resolveAudit extracts 3 fields", async () => {
    await dispatch(findRoute(securityRoutes, "security:resolveAudit"), { auditId: "a1", action: "approve", editedContent: "x" }, registry);
    expect(registry.get("security-gate")!.resolveAudit).toHaveBeenCalledWith("a1", "approve", "x");
  });
});

// ---------------------------------------------------------------------------
// Chat routes (passthrough subset)
// ---------------------------------------------------------------------------

describe("Chat passthrough routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("chat:createConversation null-coalesces modelId", async () => {
    await dispatch(findRoute(chatRoutes, "chat:createConversation"), { domainId: "d1" }, registry);
    expect(registry.get("conversation-service")!.createConversation).toHaveBeenCalledWith("d1", null, undefined);
  });

  it("chat:addMessage null-coalesces parentId", async () => {
    await dispatch(findRoute(chatRoutes, "chat:addMessage"), { conversationId: "c1", role: "user", content: "hi" }, registry);
    expect(registry.get("conversation-service")!.addMessage).toHaveBeenCalledWith("c1", "user", "hi", null, undefined);
  });
});

// ---------------------------------------------------------------------------
// Settings routes
// ---------------------------------------------------------------------------

describe("Settings routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("settings:get extracts key", async () => {
    await dispatch(findRoute(settingsRoutes, "settings:get"), { key: "theme" }, registry);
    expect(registry.get("db-settings")!.get).toHaveBeenCalledWith("theme");
  });

  it("settings:set extracts key and value", async () => {
    await dispatch(findRoute(settingsRoutes, "settings:set"), { key: "theme", value: "light" }, registry);
    expect(registry.get("db-settings")!.set).toHaveBeenCalledWith("theme", "light");
  });

  it("settings:getTheme hardcodes 'theme' key and transforms null to default", async () => {
    (registry.get("db-settings")!.get as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
    const result = await dispatch(findRoute(settingsRoutes, "settings:getTheme"), {}, registry);
    expect(registry.get("db-settings")!.get).toHaveBeenCalledWith("theme");
    expect(result).toBe("tokyo-night");
  });

  it("settings:setTheme extracts value and hardcodes key", async () => {
    await dispatch(findRoute(settingsRoutes, "settings:setTheme"), { value: "monokai" }, registry);
    expect(registry.get("db-settings")!.set).toHaveBeenCalledWith("theme", "monokai");
  });
});

// ---------------------------------------------------------------------------
// Update routes
// ---------------------------------------------------------------------------

describe("Update routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("update:check transforms to { available, version }", async () => {
    const result = await dispatch(findRoute(updateRoutes, "update:check"), {}, registry);
    expect(result).toEqual({ available: true, version: "1.2.3" });
  });

  it("update:download transforms to { started: true }", async () => {
    const result = await dispatch(findRoute(updateRoutes, "update:download"), {}, registry);
    expect(result).toEqual({ started: true });
    expect(registry.get("auto-updater")!.downloadUpdate).toHaveBeenCalled();
  });

  it("update:install transforms to { started: true }", async () => {
    const result = await dispatch(findRoute(updateRoutes, "update:install"), {}, registry);
    expect(result).toEqual({ started: true });
    expect(registry.get("auto-updater")!.quitAndInstall).toHaveBeenCalled();
  });

  it("update:getStatus returns raw status", async () => {
    const result = await dispatch(findRoute(updateRoutes, "update:getStatus"), {}, registry);
    expect(result).toEqual({ checking: false, available: true, downloading: false, downloaded: false, version: "1.2.3", error: null });
  });
});

// ---------------------------------------------------------------------------
// Worker routes
// ---------------------------------------------------------------------------

describe("Worker routes — dispatch behavior", () => {
  let registry: ReturnType<typeof makeMockRegistry>;
  beforeEach(() => { registry = makeMockRegistry(); });

  it("worker:submitTask transforms result to { taskId, status, progress }", async () => {
    const result = await dispatch(findRoute(workerRoutes, "worker:submitTask"), { type: "research", payload: {} }, registry);
    expect(result).toEqual({ taskId: "task-123", status: "submitted", progress: 0 });
    expect(registry.get("worker-bridge")!.submitTask).toHaveBeenCalledWith({ type: "research", payload: {} });
  });

  it("worker:cancelTask extracts taskId", async () => {
    await dispatch(findRoute(workerRoutes, "worker:cancelTask"), { taskId: "t1" }, registry);
    expect(registry.get("worker-bridge")!.cancelTask).toHaveBeenCalledWith("t1");
  });

  it("worker:getStatus transforms to { pendingCount, isReady }", async () => {
    const result = await dispatch(findRoute(workerRoutes, "worker:getStatus"), {}, registry);
    expect(result).toEqual({ pendingCount: 5, isReady: true });
  });
});

// ---------------------------------------------------------------------------
// Completeness — getAutoRoutes covers all expected channels
// ---------------------------------------------------------------------------

describe("Auto-routes completeness", () => {
  it("has no duplicate channel names", () => {
    const routes = getAutoRoutes();
    const channels = routes.map((r) => r.channel);
    const unique = new Set(channels);
    expect(unique.size).toBe(channels.length);
  });

  it("covers all expected passthrough domains", () => {
    const routes = getAutoRoutes();
    const channels = routes.map((r) => r.channel);
    // Spot-check key channels from each domain
    expect(channels).toContain("vc:init");
    expect(channels).toContain("search:search");
    expect(channels).toContain("research:trigger");
    expect(channels).toContain("import:list");
    expect(channels).toContain("timeline:generatePredictions");
    expect(channels).toContain("skill:list");
    expect(channels).toContain("model:listProviders");
    expect(channels).toContain("inbox:addItem");
    expect(channels).toContain("framework:listFrameworks");
    expect(channels).toContain("domain:list");
    expect(channels).toContain("security:resolveAudit");
    expect(channels).toContain("chat:createConversation");
    expect(channels).toContain("knowledge:getNode");
    expect(channels).toContain("settings:get");
    expect(channels).toContain("update:check");
    expect(channels).toContain("worker:submitTask");
  });
});
