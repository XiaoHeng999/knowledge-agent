import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFrameworkStore } from "@/stores/framework-store";

function mockWindowApi() {
  const fns = {
    listFrameworks: vi.fn().mockResolvedValue({ frameworks: [] }),
    listResults: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    execute: vi.fn(),
    getResult: vi.fn(),
    listDecisions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    createDecision: vi.fn(),
    updateDecision: vi.fn(),
    generateSummary: vi.fn(),
    getMemoryStats: vi.fn(),
  };

  // @ts-expect-error -- test mock
  window.api = { framework: fns };
  return fns;
}

const initialState = {
  loading: false,
  error: null as string | null,
  frameworks: [] as unknown[],
  analysisResults: [] as unknown[],
  resultsTotal: 0,
  activeAnalysis: null as unknown,
  decisions: [] as unknown[],
  decisionsTotal: 0,
  summary: null as unknown,
  memoryStats: null as unknown,
};

beforeEach(() => {
  vi.clearAllMocks();
  useFrameworkStore.setState(initialState);
});

describe("fetchFrameworks", () => {
  it("loads frameworks from API", async () => {
    const api = mockWindowApi();
    const frameworks = [{ type: "trl", name: "TRL" }];
    api.listFrameworks.mockResolvedValue({ frameworks });

    await useFrameworkStore.getState().fetchFrameworks();

    expect(useFrameworkStore.getState().frameworks).toEqual(frameworks);
  });

  it("passes domainId to listFrameworks for conditional custom", async () => {
    const api = mockWindowApi();
    const frameworks = [{ type: "trl", name: "TRL" }, { type: "custom", name: "My Custom" }];
    api.listFrameworks.mockResolvedValue({ frameworks });

    await useFrameworkStore.getState().fetchFrameworks("domain-123");

    expect(api.listFrameworks).toHaveBeenCalledWith({ domainId: "domain-123" });
    expect(useFrameworkStore.getState().frameworks).toEqual(frameworks);
  });
});

describe("fetchResults", () => {
  it("loads analysis results with total", async () => {
    const api = mockWindowApi();
    const results = [{ id: "r1" }];
    api.listResults.mockResolvedValue({ items: results, total: 1 });

    await useFrameworkStore.getState().fetchResults("d1");

    expect(useFrameworkStore.getState().analysisResults).toEqual(results);
    expect(useFrameworkStore.getState().resultsTotal).toBe(1);
  });
});

describe("executeAnalysis", () => {
  it("executes and prepends result", async () => {
    const api = mockWindowApi();
    const result = { id: "r1", frameworkType: "trl" };
    api.execute.mockResolvedValue(result);

    await useFrameworkStore.getState().executeAnalysis("d1", "trl");

    expect(useFrameworkStore.getState().activeAnalysis).toEqual(result);
    expect(useFrameworkStore.getState().analysisResults[0]).toEqual(result);
  });
});

describe("getResult", () => {
  it("fetches and sets activeAnalysis", async () => {
    const api = mockWindowApi();
    const result = { id: "r1" };
    api.getResult.mockResolvedValue(result);

    await useFrameworkStore.getState().getResult("r1");

    expect(useFrameworkStore.getState().activeAnalysis).toEqual(result);
  });
});

describe("fetchDecisions", () => {
  it("loads decisions", async () => {
    const api = mockWindowApi();
    const decisions = [{ id: "dec1" }];
    api.listDecisions.mockResolvedValue({ items: decisions, total: 1 });

    await useFrameworkStore.getState().fetchDecisions("d1");

    expect(useFrameworkStore.getState().decisions).toEqual(decisions);
    expect(useFrameworkStore.getState().decisionsTotal).toBe(1);
  });
});

describe("clearError", () => {
  it("clears error state", () => {
    useFrameworkStore.setState({ error: "something" });
    useFrameworkStore.getState().clearError();
    expect(useFrameworkStore.getState().error).toBeNull();
  });
});
