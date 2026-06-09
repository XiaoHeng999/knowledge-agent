import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be before import of the module under test
// ---------------------------------------------------------------------------

const mockRegisterTool = vi.fn();
const mockOn = vi.fn();
const mockSetTitle = vi.fn();
const mockGetSessionId = vi.fn(() => "session-1");

const mockConsumePendingDomain = vi.fn<() => string | undefined>();
const mockRegisterSession = vi.fn<(sessionId: string, domainId: string) => void>();
const mockGetDomainContext = vi.fn<(sessionId: string) => DomainContext | null>();
const mockCreateTurnEndHandler = vi.fn();
const mockGetPiMonoWrapper = vi.fn();

vi.mock("@mariozechner/pi-coding-agent", () => ({
  // ToolDefinition is just an object — timelineAnalyzeTool passes through
}));
vi.mock("@server/pi-mono/tools/timeline-analyze", () => ({
  timelineAnalyzeTool: { name: "timeline_analyze" },
}));
vi.mock("@server/pi-mono/extensions/session-context", () => ({
  consumePendingDomain: (...a: unknown[]) => mockConsumePendingDomain(...a),
  registerSession: (...a: unknown[]) => mockRegisterSession(...a as [string, string]),
  getDomainContext: (...a: unknown[]) => mockGetDomainContext(...a as [string]),
}));
vi.mock("@server/pi-mono/extensions/turn-end-handler", () => ({
  createTurnEndHandler: (...a: unknown[]) => mockCreateTurnEndHandler(...a),
}));
vi.mock("@server/pi-mono/instance", () => ({
  getPiMonoWrapper: (...a: unknown[]) => mockGetPiMonoWrapper(...a),
}));

import { researchAgentExtension } from "@server/pi-mono/extensions/research-agent-extension";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DomainContext {
  domainId: string;
  name: string;
  description: string | null;
  knowledgeNodeCount: number;
}

interface MockPI {
  registerTool: Mock;
  on: Mock;
}

function createMockPI(): MockPI {
  return { registerTool: mockRegisterTool, on: mockOn };
}

function setupExtension(): MockPI {
  const pi = createMockPI();
  mockRegisterTool.mockReset();
  mockOn.mockReset();
  mockSetTitle.mockReset();
  researchAgentExtension(pi as unknown as Parameters<typeof researchAgentExtension>[0]);
  return pi;
}

/** Get the callback registered for a given event name. */
function getHook(event: string): (...args: unknown[]) => Promise<unknown> {
  const calls = mockOn.mock.calls.filter((c: unknown[]) => c[0] === event);
  if (calls.length === 0) throw new Error(`No hook registered for "${event}"`);
  return calls[calls.length - 1][1];
}

function mockCtx() {
  return {
    sessionManager: { getSessionId: mockGetSessionId },
    ui: { setTitle: mockSetTitle },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("researchAgentExtension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Extension setup
  // -------------------------------------------------------------------------

  it("registers the timeline_analyze tool", () => {
    setupExtension();
    expect(mockRegisterTool).toHaveBeenCalledTimes(1);
    expect(mockRegisterTool.mock.calls[0][0]).toHaveProperty("name", "timeline_analyze");
  });

  it("registers four event hooks", () => {
    setupExtension();
    const events = mockOn.mock.calls.map((c: unknown[]) => c[0]);
    expect(events).toContain("session_start");
    expect(events).toContain("before_agent_start");
    expect(events).toContain("turn_end");
    expect(events).toContain("tool_call");
  });

  // -------------------------------------------------------------------------
  // session_start
  // -------------------------------------------------------------------------

  describe("session_start hook", () => {
    let hook: (...args: unknown[]) => Promise<unknown>;

    beforeEach(() => {
      setupExtension();
      hook = getHook("session_start");
    });

    it("registers session and sets title when a pending domain exists", async () => {
      mockConsumePendingDomain.mockReturnValue("domain-42");
      mockGetDomainContext.mockReturnValue({
        domainId: "domain-42",
        name: "Test Domain",
        description: "desc",
        knowledgeNodeCount: 5,
      });

      await hook({}, mockCtx());

      expect(mockRegisterSession).toHaveBeenCalledWith("session-1", "domain-42");
      expect(mockSetTitle).toHaveBeenCalledWith("Research: Test Domain");
    });

    it("does nothing when no pending domain", async () => {
      mockConsumePendingDomain.mockReturnValue(undefined);
      await hook({}, mockCtx());
      expect(mockRegisterSession).not.toHaveBeenCalled();
      expect(mockSetTitle).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // before_agent_start
  // -------------------------------------------------------------------------

  describe("before_agent_start hook", () => {
    let hook: (...args: unknown[]) => Promise<unknown>;

    beforeEach(() => {
      setupExtension();
      hook = getHook("before_agent_start");
    });

    it("appends domain context block to system prompt", async () => {
      mockGetDomainContext.mockReturnValue({
        domainId: "d1",
        name: "My Research",
        description: "AI agents",
        knowledgeNodeCount: 12,
      });

      const result = await hook({ systemPrompt: "You are helpful." }, mockCtx());
      expect(result).toEqual({
        systemPrompt: expect.stringContaining("Research Domain Context"),
      });
      const prompt = (result as { systemPrompt: string }).systemPrompt;
      expect(prompt).toContain("My Research");
      expect(prompt).toContain("AI agents");
      expect(prompt).toContain("12");
    });

    it("returns undefined when no domain context", async () => {
      mockGetDomainContext.mockReturnValue(null);
      const result = await hook({ systemPrompt: "base" }, mockCtx());
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // turn_end
  // -------------------------------------------------------------------------

  describe("turn_end hook", () => {
    let hook: (...args: unknown[]) => Promise<unknown>;

    beforeEach(() => {
      setupExtension();
      hook = getHook("turn_end");
    });

    it("creates handler and delegates the event", async () => {
      const fakeHandler = vi.fn();
      mockCreateTurnEndHandler.mockReturnValue(fakeHandler);
      mockGetPiMonoWrapper.mockReturnValue({
        listAvailableModels: vi.fn().mockResolvedValue([
          { id: "model-a", costPerMillionInput: 3, costPerMillionOutput: 15 },
        ]),
      });

      const event = { type: "turn_end", message: { model: "model-a" } };
      await hook(event, mockCtx());

      expect(mockCreateTurnEndHandler).toHaveBeenCalledWith("session-1", expect.any(Function));
      expect(fakeHandler).toHaveBeenCalledWith(event);
    });

    it("getModelPricing returns pricing when model is found", async () => {
      const fakeHandler = vi.fn();
      mockCreateTurnEndHandler.mockImplementation((_sid: string, getPricing: (m: string) => Promise<unknown>) => {
        // Call getPricing immediately to verify it works
        getPricing("model-x").then((r) => {
          expect(r).toEqual({ costPerMillionInput: 5, costPerMillionOutput: 20 });
        });
        return fakeHandler;
      });
      mockGetPiMonoWrapper.mockReturnValue({
        listAvailableModels: vi.fn().mockResolvedValue([
          { id: "model-x", costPerMillionInput: 5, costPerMillionOutput: 20 },
          { id: "other", costPerMillionInput: 1, costPerMillionOutput: 2 },
        ]),
      });

      await hook({}, mockCtx());
    });
  });

  // -------------------------------------------------------------------------
  // tool_call
  // -------------------------------------------------------------------------

  describe("tool_call hook", () => {
    let hook: (...args: unknown[]) => Promise<unknown>;

    beforeEach(() => {
      setupExtension();
      hook = getHook("tool_call");
    });

    it("blocks timeline_analyze with period=year", async () => {
      const result = await hook({ toolName: "timeline_analyze", input: { period: "year" } });
      expect(result).toEqual({
        block: true,
        reason: expect.stringContaining("Year-wide"),
      });
    });

    it("allows timeline_analyze with period=month", async () => {
      const result = await hook({ toolName: "timeline_analyze", input: { period: "month" } });
      expect(result).toBeUndefined();
    });

    it("ignores non-timeline_analyze tools", async () => {
      const result = await hook({ toolName: "other_tool", input: {} });
      expect(result).toBeUndefined();
    });
  });
});
