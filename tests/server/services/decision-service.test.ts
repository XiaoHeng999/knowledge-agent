import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron before anything that depends on it
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDecisionFindById = vi.fn();
const mockDecisionsListByDomain = vi.fn();
const mockDecisionsNextNumber = vi.fn();
const mockDecisionsCreate = vi.fn();
const mockDecisionsUpdate = vi.fn();
const mockDomainFindById = vi.fn();

vi.mock("@server/db/index", () => ({
  getDatabaseService: () => ({
    domains: { findById: mockDomainFindById },
    decisionRecords: {
      findById: mockDecisionFindById,
      listByDomain: mockDecisionsListByDomain,
      nextDecisionNumber: mockDecisionsNextNumber,
      create: mockDecisionsCreate,
      update: mockDecisionsUpdate,
    },
  }),
}));

// ---------------------------------------------------------------------------
// Import SUT (after mocks)
// ---------------------------------------------------------------------------

import {
  getDecisionRecord,
  listDecisionRecords,
  updateDecisionStatus,
  generateDecisionRecord,
  retrieveRelevantDecisions,
} from "@server/services/decision-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDecisionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "dec-1",
    domain_id: "dom-1",
    title: "Use React for frontend",
    decision_number: 1,
    context: "Need a modern UI framework",
    decision_text: "We will use React with TypeScript",
    rationale: "Strong ecosystem and type safety",
    expected_outcome: "Faster development cycles",
    status: "proposed",
    created_at: "2026-01-15T10:00:00Z",
    superseded_by: null,
    source_node_ids: null,
    file_path: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("decision-service: getDecisionRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a mapped decision when found", () => {
    mockDecisionFindById.mockReturnValue(makeDecisionRow());

    const result = getDecisionRecord("dec-1");

    expect(mockDecisionFindById).toHaveBeenCalledWith("dec-1");
    expect(result).toEqual({
      id: "dec-1",
      domainId: "dom-1",
      title: "Use React for frontend",
      decisionNumber: 1,
      context: "Need a modern UI framework",
      decisionText: "We will use React with TypeScript",
      rationale: "Strong ecosystem and type safety",
      expectedOutcome: "Faster development cycles",
      status: "proposed",
      createdAt: "2026-01-15T10:00:00Z",
    });
  });

  it("throws when decision not found", () => {
    mockDecisionFindById.mockReturnValue(undefined);

    expect(() => getDecisionRecord("nonexistent")).toThrow(
      "Decision record not found: nonexistent",
    );
  });
});

describe("decision-service: listDecisionRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped items with total count", () => {
    mockDecisionsListByDomain.mockReturnValue({
      items: [
        makeDecisionRow({ id: "dec-1", decision_number: 1 }),
        makeDecisionRow({ id: "dec-2", decision_number: 2, title: "Use Zustand" }),
      ],
      total: 2,
    });

    const result = listDecisionRecords("dom-1");

    expect(mockDecisionsListByDomain).toHaveBeenCalledWith("dom-1");
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      id: "dec-1",
      domainId: "dom-1",
      title: "Use React for frontend",
      decisionNumber: 1,
      context: "Need a modern UI framework",
      decisionText: "We will use React with TypeScript",
      rationale: "Strong ecosystem and type safety",
      expectedOutcome: "Faster development cycles",
      status: "proposed",
      createdAt: "2026-01-15T10:00:00Z",
    });
  });

  it("returns empty list when no decisions exist", () => {
    mockDecisionsListByDomain.mockReturnValue({ items: [], total: 0 });

    const result = listDecisionRecords("dom-1");

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("decision-service: updateDecisionStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates status and returns mapped result", () => {
    mockDecisionFindById.mockReturnValue(makeDecisionRow());
    mockDecisionsUpdate.mockReturnValue(
      makeDecisionRow({ status: "accepted" }),
    );

    const result = updateDecisionStatus("dec-1", "accepted");

    expect(mockDecisionsUpdate).toHaveBeenCalledWith("dec-1", { status: "accepted" });
    expect(result.status).toBe("accepted");
  });

  it("includes supersededBy when provided", () => {
    mockDecisionFindById.mockReturnValue(makeDecisionRow());
    mockDecisionsUpdate.mockReturnValue(
      makeDecisionRow({ status: "superseded", superseded_by: "dec-2" }),
    );

    const result = updateDecisionStatus("dec-1", "superseded", "dec-2");

    expect(mockDecisionsUpdate).toHaveBeenCalledWith("dec-1", {
      status: "superseded",
      superseded_by: "dec-2",
    });
    expect(result.status).toBe("superseded");
  });

  it("throws when decision not found", () => {
    mockDecisionFindById.mockReturnValue(undefined);

    expect(() => updateDecisionStatus("nonexistent", "accepted")).toThrow(
      "Decision record not found: nonexistent",
    );
  });
});

describe("decision-service: generateDecisionRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a decision with auto-numbering", async () => {
    mockDomainFindById.mockReturnValue({ id: "dom-1", name: "Test" });
    mockDecisionsNextNumber.mockReturnValue(3);
    mockDecisionsListByDomain.mockReturnValue({ items: [], total: 0 });
    mockDecisionsCreate.mockReturnValue(
      makeDecisionRow({ id: "dec-new", decision_number: 3, status: "proposed" }),
    );

    const result = await generateDecisionRecord(
      "dom-1",
      "Use React for frontend",
      "Need a UI framework",
      "We will use React",
    );

    expect(mockDecisionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        domain_id: "dom-1",
        decision_number: 3,
        status: "proposed",
      }),
    );
    expect(result.id).toBe("dec-new");
    expect(result.decisionNumber).toBe(3);
  });

  it("links to related decisions with matching title words", async () => {
    mockDomainFindById.mockReturnValue({ id: "dom-1", name: "Test" });
    mockDecisionsNextNumber.mockReturnValue(2);
    mockDecisionsListByDomain.mockReturnValue({
      items: [
        makeDecisionRow({ id: "dec-old", title: "React routing strategy" }),
      ],
      total: 1,
    });
    mockDecisionsCreate.mockReturnValue(
      makeDecisionRow({ id: "dec-new", decision_number: 2 }),
    );

    await generateDecisionRecord(
      "dom-1",
      "React state management",
      "Need state management",
      "Use Zustand",
    );

    expect(mockDecisionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        source_node_ids: JSON.stringify(["dec-old"]),
      }),
    );
  });

  it("throws when domain not found", async () => {
    mockDomainFindById.mockReturnValue(undefined);

    await expect(
      generateDecisionRecord("bad-domain", "Title", "ctx", "text"),
    ).rejects.toThrow("Domain not found: bad-domain");
  });

  it("passes optional rationale and expectedOutcome", async () => {
    mockDomainFindById.mockReturnValue({ id: "dom-1", name: "Test" });
    mockDecisionsNextNumber.mockReturnValue(1);
    mockDecisionsListByDomain.mockReturnValue({ items: [], total: 0 });
    mockDecisionsCreate.mockReturnValue(
      makeDecisionRow({
        id: "dec-new",
        rationale: "because",
        expected_outcome: "faster dev",
      }),
    );

    const result = await generateDecisionRecord(
      "dom-1", "Title", "ctx", "text", "because", "faster dev",
    );

    expect(mockDecisionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        rationale: "because",
        expected_outcome: "faster dev",
      }),
    );
    expect(result.rationale).toBe("because");
    expect(result.expectedOutcome).toBe("faster dev");
  });
});

describe("decision-service: retrieveRelevantDecisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scores and ranks decisions by query word overlap", () => {
    mockDecisionsListByDomain.mockReturnValue({
      items: [
        makeDecisionRow({ id: "dec-1", title: "React routing strategy", context: "", decision_text: "" }),
        makeDecisionRow({ id: "dec-2", title: "Database migration plan", context: "", decision_text: "" }),
        makeDecisionRow({ id: "dec-3", title: "React state management", context: "", decision_text: "" }),
      ],
      total: 3,
    });

    const results = retrieveRelevantDecisions("dom-1", "React state pattern");

    expect(results.map((r) => r.id)).toEqual(["dec-3", "dec-1"]);
    expect(mockDecisionsListByDomain).toHaveBeenCalledWith("dom-1", 50, 0);
  });

  it("excludes decisions with zero relevance score", () => {
    mockDecisionsListByDomain.mockReturnValue({
      items: [
        makeDecisionRow({ id: "dec-1", title: "React routing strategy", context: "", decision_text: "" }),
        makeDecisionRow({ id: "dec-2", title: "Database migration plan", context: "", decision_text: "" }),
      ],
      total: 2,
    });

    const results = retrieveRelevantDecisions("dom-1", "Database schema design");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("dec-2");
  });

  it("respects the limit parameter", () => {
    mockDecisionsListByDomain.mockReturnValue({
      items: Array.from({ length: 10 }, (_, i) =>
        makeDecisionRow({ id: `dec-${i}`, title: `React pattern ${i}`, context: "", decision_text: "" }),
      ),
      total: 10,
    });

    const results = retrieveRelevantDecisions("dom-1", "React pattern matching", 2);

    expect(results).toHaveLength(2);
  });

  it("returns empty when no decisions match", () => {
    mockDecisionsListByDomain.mockReturnValue({
      items: [
        makeDecisionRow({ id: "dec-1", title: "Database migration plan", context: "", decision_text: "" }),
      ],
      total: 1,
    });

    const results = retrieveRelevantDecisions("dom-1", "React state management");

    expect(results).toEqual([]);
  });
});
