import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CostEstimator, TokenUsage } from "@server/services/cost-estimator";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDestroySession = vi.fn();
const mockSubscribe = vi.fn();
const mockPrompt = vi.fn();

const mockSession = {
  subscribe: mockSubscribe,
  prompt: mockPrompt,
};

const mockCreateExpertSession = vi.fn();

vi.mock("@server/pi-mono/instance", () => ({
  getPiMonoWrapper: () => ({
    createExpertSession: mockCreateExpertSession,
    destroySession: mockDestroySession,
  }),
}));

const mockCreateHeuristic = vi.fn();

vi.mock("@server/services/cost-estimator", () => ({
  createHeuristicCostEstimator: mockCreateHeuristic,
}));

const mockEstimateTokens = vi.fn<(input: string, output: string) => TokenUsage>();
const mockEstimateCost = vi.fn<(usage: TokenUsage, modelId: string) => number>();

const mockCostEstimator: CostEstimator = {
  estimateTokens: mockEstimateTokens,
  estimateCost: mockEstimateCost,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createSessionRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDestroySession.mockReturnValue(undefined);
    mockSubscribe.mockReturnValue(() => {}); // unsubscribe noop
    mockPrompt.mockResolvedValue(undefined);
    mockCreateExpertSession.mockResolvedValue({
      sessionId: "sess-1",
      session: mockSession,
    });
    mockEstimateTokens.mockReturnValue({
      input: 10,
      output: 20,
    });
    mockEstimateCost.mockReturnValue(0.05);
    mockCreateHeuristic.mockReturnValue(mockCostEstimator);
  });

  async function getRunner() {
    const { createSessionRunner } = await import(
      "@server/services/session-runner"
    );
    return createSessionRunner();
  }

  it("runs full lifecycle and returns collected content", async () => {
    // Simulate subscribe collecting textDelta events
    mockSubscribe.mockImplementation((callback: (event: unknown) => void) => {
      callback({
        type: "message_update",
        assistantMessageEvent: { textDelta: "Hello " },
      });
      callback({
        type: "message_update",
        assistantMessageEvent: { textDelta: "world" },
      });
      return () => {};
    });

    const runner = await getRunner();
    const result = await runner.runPrompt("domain-1", "model-1", "test prompt");

    // Content collected from textDelta events
    expect(result.content).toBe("Hello world");

    // Session lifecycle was followed
    expect(mockCreateExpertSession).toHaveBeenCalledWith("domain-1", "model-1");
    expect(mockPrompt).toHaveBeenCalledWith("test prompt");
    expect(mockDestroySession).toHaveBeenCalledWith("sess-1");
  });

  it("uses cost estimator for tokens and cost in return value", async () => {
    mockSubscribe.mockImplementation((callback: (event: unknown) => void) => {
      callback({
        type: "message_update",
        assistantMessageEvent: { textDelta: "response text" },
      });
      return () => {};
    });

    mockEstimateTokens.mockReturnValue({
      input: 100,
      output: 50,
    });
    mockEstimateCost.mockReturnValue(0.0125);

    const runner = await getRunner();
    const result = await runner.runPrompt("d-1", "claude-sonnet-4-20250514", "my prompt");

    // estimator called with prompt as input and collected content as output
    expect(mockCostEstimator.estimateTokens).toHaveBeenCalledWith(
      "my prompt",
      "response text",
    );
    expect(mockCostEstimator.estimateCost).toHaveBeenCalledWith(
      { input: 100, output: 50 },
      "claude-sonnet-4-20250514",
    );

    // return value reflects estimator output
    expect(result.estimatedTokens).toBe(150); // input + output
    expect(result.estimatedCost).toBe(0.0125);
  });

  it("destroys session even when prompt() throws", async () => {
    mockPrompt.mockRejectedValue(new Error("API timeout"));

    const runner = await getRunner();

    await expect(
      runner.runPrompt("d-1", "model-1", "prompt"),
    ).rejects.toThrow("API timeout");

    expect(mockDestroySession).toHaveBeenCalledWith("sess-1");
  });

  it("defaults to HeuristicCostEstimator when none provided", async () => {
    const { createSessionRunner } = await import(
      "@server/services/session-runner"
    );
    createSessionRunner(); // no costEstimator arg

    expect(mockCreateHeuristic).toHaveBeenCalled();
  });

  it("uses injected CostEstimator when provided", async () => {
    const injected: CostEstimator = {
      estimateTokens: vi.fn().mockReturnValue({ input: 5, output: 5 }),
      estimateCost: vi.fn().mockReturnValue(0.99),
    };

    const { createSessionRunner } = await import(
      "@server/services/session-runner"
    );
    createSessionRunner(injected);

    // Heuristic should NOT be called when injecting
    expect(mockCreateHeuristic).not.toHaveBeenCalled();
  });

  it("produces result from injected estimator through runPrompt", async () => {
    const injectedEstimateTokens = vi.fn().mockReturnValue({ input: 42, output: 7 });
    const injectedEstimateCost = vi.fn().mockReturnValue(1.23);

    const injected: CostEstimator = {
      estimateTokens: injectedEstimateTokens,
      estimateCost: injectedEstimateCost,
    };

    mockSubscribe.mockImplementation((cb: (e: unknown) => void) => {
      cb({
        type: "message_update",
        assistantMessageEvent: { textDelta: "injected response" },
      });
      return () => {};
    });

    const { createSessionRunner } = await import(
      "@server/services/session-runner"
    );
    const runner = createSessionRunner(injected);
    const result = await runner.runPrompt("d-1", "model-x", "injected prompt");

    // Content comes from subscribe, not estimator
    expect(result.content).toBe("injected response");

    // Estimator was called with the right args
    expect(injectedEstimateTokens).toHaveBeenCalledWith("injected prompt", "injected response");
    expect(injectedEstimateCost).toHaveBeenCalledWith({ input: 42, output: 7 }, "model-x");

    // Final result uses injected estimator's numbers
    expect(result.estimatedTokens).toBe(49);
    expect(result.estimatedCost).toBe(1.23);
  });

  it("propagates error when session creation fails without calling destroy", async () => {
    mockCreateExpertSession.mockRejectedValue(new Error("no capacity"));

    const runner = await getRunner();

    await expect(
      runner.runPrompt("d-1", "model-1", "prompt"),
    ).rejects.toThrow("no capacity");

    // No session was created, so destroy should not be called
    expect(mockDestroySession).not.toHaveBeenCalled();
  });

  it("calls onSessionCreated callback with sessionId after creating session", async () => {
    const onSessionCreated = vi.fn();
    mockSubscribe.mockImplementation((callback: (event: unknown) => void) => {
      callback({
        type: "message_update",
        assistantMessageEvent: { textDelta: "tracked" },
      });
      return () => {};
    });

    const { createSessionRunner } = await import(
      "@server/services/session-runner"
    );
    const runner = createSessionRunner(mockCostEstimator, onSessionCreated);
    await runner.runPrompt("d-1", "model-1", "prompt");

    expect(onSessionCreated).toHaveBeenCalledTimes(1);
    expect(onSessionCreated).toHaveBeenCalledWith("sess-1");
  });

  it("works without onSessionCreated callback (backward compat)", async () => {
    mockSubscribe.mockImplementation((callback: (event: unknown) => void) => {
      callback({
        type: "message_update",
        assistantMessageEvent: { textDelta: "ok" },
      });
      return () => {};
    });

    const { createSessionRunner } = await import(
      "@server/services/session-runner"
    );
    const runner = createSessionRunner(mockCostEstimator); // no callback
    const result = await runner.runPrompt("d-1", "model-1", "prompt");

    expect(result.content).toBe("ok");
    expect(mockDestroySession).toHaveBeenCalledWith("sess-1");
  });
});
