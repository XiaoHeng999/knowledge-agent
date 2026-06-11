import { describe, it, expect, beforeEach } from "vitest";
import {
  createHeuristicCostEstimator,
  createTrackerCostEstimator,
} from "@server/services/cost-estimator";
import {
  accumulateUsage,
  resetTracking,
} from "@server/services/research-cost-tracker";

describe("HeuristicCostEstimator", () => {
  const estimator = createHeuristicCostEstimator();

  describe("estimateTokens", () => {
    it("estimates input/output tokens using chars/4", () => {
      const result = estimator.estimateTokens(
        "Hello world",   // 11 chars → ceil(11/4) = 3
        "Hi there bye",  // 12 chars → ceil(12/4) = 3
      );

      expect(result).toEqual({ input: 3, output: 3 });
    });
  });

  describe("estimateCost", () => {
    it("calculates cost using known model pricing", () => {
      // claude-sonnet-4-20250514: input $3/M, output $15/M
      const usage = { input: 1000, output: 500 };

      const cost = estimator.estimateCost(usage, "claude-sonnet-4-20250514");

      // (1000 / 1_000_000) * 3 + (500 / 1_000_000) * 15 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 10);
    });

    it("returns 0 for unknown model", () => {
      const usage = { input: 1000, output: 500 };
      expect(estimator.estimateCost(usage, "nonexistent-model")).toBe(0);
    });
  });

  it("returns zero tokens for empty strings", () => {
    expect(estimator.estimateTokens("", "")).toEqual({ input: 0, output: 0 });
  });
});

describe("TrackerCostEstimator", () => {
  beforeEach(() => {
    resetTracking();
  });

  it("starts tracking via onSessionCreated callback", () => {
    const { onSessionCreated } = createTrackerCostEstimator("run-1");
    onSessionCreated("sess-1");

    // accumulateUsage works because startTracking was called
    accumulateUsage("sess-1", { input: 100, output: 50 }, {
      costPerMillionInput: 3,
      costPerMillionOutput: 15,
    });
    // verified indirectly — stopTracking below will return this data
  });

  it("estimateTokens returns real usage from stopTracking", () => {
    const { estimator, onSessionCreated } = createTrackerCostEstimator("run-1");
    onSessionCreated("sess-1");
    accumulateUsage("sess-1", { input: 200, output: 80 }, {
      costPerMillionInput: 3,
      costPerMillionOutput: 15,
    });

    const usage = estimator.estimateTokens("ignored", "ignored");
    expect(usage).toEqual({ input: 200, output: 80 });
  });

  it("estimateCost returns real tracked cost", () => {
    const { estimator, onSessionCreated } = createTrackerCostEstimator("run-1");
    onSessionCreated("sess-1");
    accumulateUsage("sess-1", { input: 1000, output: 500 }, {
      costPerMillionInput: 3,
      costPerMillionOutput: 15,
    });

    estimator.estimateTokens("ignored", "ignored"); // triggers stopTracking
    const cost = estimator.estimateCost({ input: 1000, output: 500 }, "any-model");
    // (1000 / 1M) * 3 + (500 / 1M) * 15 = 0.003 + 0.0075 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 10);
  });

  it("returns zero tokens when no session was tracked", () => {
    const { estimator } = createTrackerCostEstimator("run-1");
    const usage = estimator.estimateTokens("text", "text");
    expect(usage).toEqual({ input: 0, output: 0 });
  });
});
