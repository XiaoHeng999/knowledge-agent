import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTimelineStore } from "@/stores/timeline-store";

function mockWindowApi() {
  const fns = {
    listPredictions: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    createPrediction: vi.fn(),
    updatePrediction: vi.fn(),
    verifyPrediction: vi.fn(),
    deletePrediction: vi.fn(),
    analyzeTrends: vi.fn(),
    generatePredictions: vi.fn().mockResolvedValue({ predictions: [] }),
    getAccuracy: vi.fn(),
    getEvents: vi.fn().mockResolvedValue({ events: [], total: 0 }),
    expireOverdue: vi.fn().mockResolvedValue({ expired: 0 }),
  };

  // @ts-expect-error -- test mock
  window.api = { timeline: fns };
  return fns;
}

const initialState = {
  loading: false,
  error: null as string | null,
  predictions: [] as unknown[],
  predictionsTotal: 0,
  events: [] as unknown[],
  eventsTotal: 0,
  trendAnalysis: null as unknown,
  accuracy: null as unknown,
};

beforeEach(() => {
  vi.clearAllMocks();
  useTimelineStore.setState(initialState);
});

describe("fetchPredictions", () => {
  it("loads predictions with optional status filter", async () => {
    const api = mockWindowApi();
    const predictions = [{ id: "p1" }];
    api.listPredictions.mockResolvedValue({ items: predictions, total: 1 });

    await useTimelineStore.getState().fetchPredictions("d1", "pending");

    expect(api.listPredictions).toHaveBeenCalledWith({ domainId: "d1", status: "pending" });
    expect(useTimelineStore.getState().predictions).toEqual(predictions);
  });
});

describe("createPrediction", () => {
  it("creates and prepends prediction", async () => {
    const api = mockWindowApi();
    const pred = { id: "p1", content: "X will happen" };
    api.createPrediction.mockResolvedValue(pred);

    await useTimelineStore.getState().createPrediction({
      domainId: "d1",
      content: "X will happen",
      confidence: 0.8,
    });

    expect(useTimelineStore.getState().predictions[0]).toEqual(pred);
  });
});

describe("verifyPrediction", () => {
  it("updates prediction in list", async () => {
    const api = mockWindowApi();
    useTimelineStore.setState({
      predictions: [{ id: "p1", status: "pending" }],
    });
    const updated = { id: "p1", status: "confirmed" };
    api.verifyPrediction.mockResolvedValue(updated);

    await useTimelineStore.getState().verifyPrediction("p1", "confirmed", "outcome");

    expect(api.verifyPrediction).toHaveBeenCalledWith({
      id: "p1",
      status: "confirmed",
      actualOutcome: "outcome",
    });
  });
});

describe("deletePrediction", () => {
  it("removes prediction from list", async () => {
    const api = mockWindowApi();
    useTimelineStore.setState({ predictions: [{ id: "p1" }, { id: "p2" }] });
    api.deletePrediction.mockResolvedValue(undefined);

    await useTimelineStore.getState().deletePrediction("p1");

    expect(useTimelineStore.getState().predictions).toHaveLength(1);
  });
});

describe("fetchEvents", () => {
  it("loads timeline events", async () => {
    const api = mockWindowApi();
    const events = [{ id: "e1" }];
    api.getEvents.mockResolvedValue({ items: events, total: 1 });

    await useTimelineStore.getState().fetchEvents("d1");

    expect(useTimelineStore.getState().events).toEqual(events);
    expect(useTimelineStore.getState().eventsTotal).toBe(1);
  });
});

describe("clearError", () => {
  it("clears error state", () => {
    useTimelineStore.setState({ error: "x" });
    useTimelineStore.getState().clearError();
    expect(useTimelineStore.getState().error).toBeNull();
  });
});
