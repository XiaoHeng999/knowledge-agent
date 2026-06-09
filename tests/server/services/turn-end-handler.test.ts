import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startTracking,
  getAggregatedUsage,
  resetTracking,
} from "@server/services/research-cost-tracker";
import { createTurnEndHandler } from "@server/pi-mono/extensions/turn-end-handler";

// ---------------------------------------------------------------------------
// turn_end handler — extracts usage from SDK event
// ---------------------------------------------------------------------------

describe("turn_end handler", () => {
  const sessionId = "sess-test";
  const pricing = {
    costPerMillionInput: 3.0,
    costPerMillionOutput: 15.0,
  };

  beforeEach(() => resetTracking());

  it("extracts usage from an assistant message and accumulates tokens", async () => {
    startTracking(sessionId, "run-1");

    const getModelPricing = vi.fn().mockResolvedValue(pricing);
    const handler = createTurnEndHandler(sessionId, getModelPricing);

    const event = {
      type: "turn_end" as const,
      turnIndex: 0,
      message: {
        role: "assistant" as const,
        model: "deepseek-chat",
        content: [],
        usage: { input: 5000, output: 2000 },
      },
      toolResults: [],
    };

    await handler(event);

    expect(getModelPricing).toHaveBeenCalledWith("deepseek-chat");
    const agg = getAggregatedUsage(sessionId)!;
    expect(agg.inputTokens).toBe(5000);
    expect(agg.outputTokens).toBe(2000);
    expect(agg.costUsd).toBeCloseTo(0.045, 10);
  });

  it("skips non-assistant messages", async () => {
    startTracking(sessionId, "run-2");

    const getModelPricing = vi.fn().mockResolvedValue(pricing);
    const handler = createTurnEndHandler(sessionId, getModelPricing);

    const event = {
      type: "turn_end" as const,
      turnIndex: 0,
      message: {
        role: "user" as const,
        content: "hello",
      },
      toolResults: [],
    };

    await handler(event);

    const agg = getAggregatedUsage(sessionId)!;
    expect(agg.inputTokens).toBe(0);
    expect(agg.outputTokens).toBe(0);
  });

  it("handles missing pricing gracefully (no accumulation)", async () => {
    startTracking(sessionId, "run-3");

    const getModelPricing = vi.fn().mockResolvedValue(null);
    const handler = createTurnEndHandler(sessionId, getModelPricing);

    const event = {
      type: "turn_end" as const,
      turnIndex: 0,
      message: {
        role: "assistant" as const,
        model: "unknown-model",
        content: [],
        usage: { input: 1000, output: 500 },
      },
      toolResults: [],
    };

    await handler(event);

    const agg = getAggregatedUsage(sessionId)!;
    expect(agg.inputTokens).toBe(0);
    expect(agg.costUsd).toBe(0);
  });
});
