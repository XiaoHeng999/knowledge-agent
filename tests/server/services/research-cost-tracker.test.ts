import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  calculateCost,
  startTracking,
  accumulateUsage,
  getAggregatedUsage,
  stopTracking,
  resetTracking,
} from "@server/services/research-cost-tracker";

// ---------------------------------------------------------------------------
// calculateCost — pure function
// ---------------------------------------------------------------------------

describe("calculateCost", () => {
  it("calculates cost from input/output tokens and pricing", () => {
    const usage = { input: 1000, output: 500 };
    const pricing = {
      costPerMillionInput: 3.0,
      costPerMillionOutput: 15.0,
    };

    const cost = calculateCost(usage, pricing);

    // (1000 / 1_000_000) * 3.0 + (500 / 1_000_000) * 15.0
    // = 0.003 + 0.0075 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 10);
  });
});

// ---------------------------------------------------------------------------
// accumulateUsage — multi-turn accumulation
// ---------------------------------------------------------------------------

describe("accumulateUsage", () => {
  beforeEach(() => resetTracking());

  it("accumulates tokens and cost across multiple turns", () => {
    const sessionId = "sess-1";
    const pricing = { costPerMillionInput: 3.0, costPerMillionOutput: 15.0 };

    startTracking(sessionId, "run-1");

    accumulateUsage(sessionId, { input: 1000, output: 500 }, pricing);
    accumulateUsage(sessionId, { input: 2000, output: 800 }, pricing);
    accumulateUsage(sessionId, { input: 500, output: 200 }, pricing);

    const agg = getAggregatedUsage(sessionId)!;
    expect(agg.inputTokens).toBe(3500);
    expect(agg.outputTokens).toBe(1500);
    // Each turn: 0.0105 + 0.018 + 0.0045 = 0.033
    expect(agg.costUsd).toBeCloseTo(0.033, 10);
  });

  it("returns null for unknown session", () => {
    expect(getAggregatedUsage("no-such-session")).toBeNull();
  });

  it("stopTracking returns final usage and clears state", () => {
    const sessionId = "sess-2";
    const pricing = { costPerMillionInput: 3.0, costPerMillionOutput: 15.0 };

    startTracking(sessionId, "run-2");
    accumulateUsage(sessionId, { input: 100, output: 50 }, pricing);

    const final = stopTracking(sessionId);
    expect(final?.inputTokens).toBe(100);
    expect(final?.outputTokens).toBe(50);

    expect(getAggregatedUsage(sessionId)).toBeNull();
  });
});
