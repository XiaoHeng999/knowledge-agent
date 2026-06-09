import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (hoisted) ---

const mockConversations = {
  create: vi.fn(),
  findById: vi.fn(),
  listByDomain: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockMessages = {
  create: vi.fn(),
  listByConversation: vi.fn(),
  findById: vi.fn(),
  getRootMessage: vi.fn(),
  getMaxBranchIndex: vi.fn(() => 0),
  update: vi.fn(),
  deleteByConversation: vi.fn(),
};

const mockKnowledgeNodes = {
  listByDomain: vi.fn(() => ({ items: [], total: 0 })),
};

const mockDecisionRecords = {
  list: vi.fn(() => ({ items: [], total: 0 })),
};

vi.mock("@server/db/index", () => ({
  getDatabaseService: () => ({
    conversations: mockConversations,
    messages: mockMessages,
    knowledgeNodes: mockKnowledgeNodes,
    decisionRecords: mockDecisionRecords,
  }),
}));

const mockSubscribe = vi.fn(() => vi.fn());
const mockPrompt = vi.fn(() => Promise.resolve());
const mockDestroySession = vi.fn();

vi.mock("@server/pi-mono/instance", () => ({
  getPiMonoWrapper: () => ({
    createExpertSession: vi.fn(() =>
      Promise.resolve({
        sessionId: "sess1",
        session: { subscribe: mockSubscribe, prompt: mockPrompt },
      }),
    ),
    destroySession: mockDestroySession,
  }),
}));

vi.mock("electron", () => ({
  BrowserWindow: {},
}));

// Must import AFTER mocks are set up.
// Use vi.resetModules per describe for streaming isolation.
let svc: typeof import("@server/services/conversation-service");

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  svc = await import("@server/services/conversation-service");
});

// --- Fixtures ---

function makeConvRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv1",
    domain_id: "d1",
    title: "Test Chat",
    model_id: "m1",
    session_type: "expert" as const,
    status: "active" as const,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeMsgRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg1",
    conversation_id: "conv1",
    parent_id: null,
    role: "user" as const,
    content: "hello",
    model_id: null,
    token_count: null,
    cost_usd: null,
    metadata: null,
    branch_index: 0,
    status: "complete" as const,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeSender() {
  return { webContents: { send: vi.fn() } } as unknown as import("electron").BrowserWindow;
}

// --- Tests ---

describe("createConversation", () => {
  it("creates a conversation with defaults", () => {
    mockConversations.create.mockReturnValue(makeConvRow());
    const conv = svc.createConversation("d1", null);
    expect(conv.id).toBe("conv1");
    expect(mockConversations.create).toHaveBeenCalledWith(
      expect.objectContaining({ domain_id: "d1", session_type: "expert", status: "active" }),
    );
  });

  it("passes title when provided", () => {
    mockConversations.create.mockReturnValue(makeConvRow());
    svc.createConversation("d1", null, "My Chat");
    expect(mockConversations.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My Chat" }),
    );
  });
});

describe("listConversations", () => {
  it("returns mapped conversations with total", () => {
    const rows = [makeConvRow(), makeConvRow({ id: "conv2" })];
    mockConversations.listByDomain.mockReturnValue({ items: rows, total: 2 });
    const result = svc.listConversations("d1");
    expect(result.conversations).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("passes options through", () => {
    mockConversations.listByDomain.mockReturnValue({ items: [], total: 0 });
    svc.listConversations("d1", { status: "active", limit: 10 });
    expect(mockConversations.listByDomain).toHaveBeenCalledWith("d1", {
      status: "active",
      limit: 10,
    });
  });
});

describe("getConversation", () => {
  it("returns conversation when found", () => {
    mockConversations.findById.mockReturnValue(makeConvRow());
    const conv = svc.getConversation("conv1");
    expect(conv.id).toBe("conv1");
  });

  it("throws when not found", () => {
    mockConversations.findById.mockReturnValue(undefined);
    expect(() => svc.getConversation("missing")).toThrow("not found");
  });
});

describe("deleteConversation", () => {
  it("deletes messages then conversation", () => {
    svc.deleteConversation("conv1");
    expect(mockMessages.deleteByConversation).toHaveBeenCalledWith("conv1");
    expect(mockConversations.delete).toHaveBeenCalledWith("conv1");
  });
});

describe("addMessage", () => {
  it("creates a message with branch index 0 when no parent", () => {
    mockMessages.create.mockReturnValue(makeMsgRow());
    mockConversations.update.mockReturnValue(undefined);
    const msg = svc.addMessage("conv1", "user", "hello", null);
    expect(msg.id).toBe("msg1");
    expect(mockMessages.create).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: null, branch_index: 0 }),
    );
  });

  it("calculates branch index from parent", () => {
    mockMessages.getMaxBranchIndex.mockReturnValue(2);
    mockMessages.create.mockReturnValue(makeMsgRow({ branch_index: 3 }));
    mockConversations.update.mockReturnValue(undefined);
    svc.addMessage("conv1", "user", "hello", "parent1");
    expect(mockMessages.create).toHaveBeenCalledWith(
      expect.objectContaining({ branch_index: 3, parent_id: "parent1" }),
    );
  });
});

describe("branchFromMessage", () => {
  it("creates a user message branched from parent", () => {
    const parent = makeMsgRow({ id: "p1", conversation_id: "conv1" });
    mockMessages.findById.mockReturnValue(parent);
    mockMessages.getMaxBranchIndex.mockReturnValue(0);
    mockMessages.create.mockReturnValue(makeMsgRow({ id: "msg2", parent_id: "p1" }));
    mockConversations.update.mockReturnValue(undefined);

    const msg = svc.branchFromMessage("p1", "new branch");
    expect(msg.parentId).toBe("p1");
    expect(mockMessages.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", content: "new branch" }),
    );
  });

  it("throws if parent not found", () => {
    mockMessages.findById.mockReturnValue(undefined);
    expect(() => svc.branchFromMessage("missing", "x")).toThrow("not found");
  });
});

describe("getConversationTree", () => {
  it("returns tree with root id", () => {
    mockConversations.findById.mockReturnValue(makeConvRow());
    const msgs = [makeMsgRow(), makeMsgRow({ id: "msg2" })];
    mockMessages.listByConversation.mockReturnValue(msgs);
    mockMessages.getRootMessage.mockReturnValue(makeMsgRow({ id: "root1" }));

    const tree = svc.getConversationTree("conv1");
    expect(tree.conversation.id).toBe("conv1");
    expect(tree.messages).toHaveLength(2);
    expect(tree.rootId).toBe("root1");
  });

  it("throws if conversation not found", () => {
    mockConversations.findById.mockReturnValue(undefined);
    expect(() => svc.getConversationTree("missing")).toThrow("not found");
  });
});

describe("getConversationMessages", () => {
  it("returns mapped messages", () => {
    const msgs = [makeMsgRow()];
    mockMessages.listByConversation.mockReturnValue(msgs);
    const result = svc.getConversationMessages("conv1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("msg1");
  });
});

describe("sendMessageStream", () => {
  it("sends streaming chunks and finalizes content", async () => {
    const sender = makeSender();

    // Conversation lookup
    mockConversations.findById.mockReturnValue(makeConvRow());

    // Empty message list (new conversation)
    mockMessages.listByConversation.mockReturnValue([]);

    // Message creation sequence: user msg, then assistant msg
    let msgCounter = 0;
    mockMessages.create.mockImplementation((data: Record<string, unknown>) => {
      msgCounter++;
      return makeMsgRow({
        id: `msg_${msgCounter}`,
        role: data.role,
        content: data.content ?? "",
        parent_id: data.parent_id,
      });
    });
    mockConversations.update.mockReturnValue(undefined);
    mockMessages.getMaxBranchIndex.mockReturnValue(0);
    mockMessages.update.mockReturnValue(undefined);

    // Simulate agent session events
    let eventCallback: ((e: unknown) => void) | null = null;
    mockSubscribe.mockImplementation((cb: (e: unknown) => void) => {
      eventCallback = cb;
      return vi.fn(); // unsubscribe
    });

    mockPrompt.mockImplementation(async () => {
      // Simulate a text delta event
      if (eventCallback) {
        eventCallback({
          type: "message_update",
          assistantMessageEvent: { textDelta: "Hello " },
        });
        eventCallback({
          type: "message_update",
          assistantMessageEvent: { textDelta: "world" },
        });
        eventCallback({
          type: "tool_execution_start",
          toolName: "search",
        });
        eventCallback({
          type: "tool_execution_end",
          result: "found",
        });
      }
    });

    await svc.sendMessageStream(sender, "conv1", "hi", "m1");

    // Verify stream start was sent
    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "start" }),
    );

    // Verify token events
    const tokenCalls = (sender.webContents.send as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[1]?.type === "token",
    );
    expect(tokenCalls).toHaveLength(2);

    // Verify tool_call and tool_result
    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "tool_call", content: "search" }),
    );
    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "tool_result", content: "found" }),
    );

    // Verify done
    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "done" }),
    );

    // Verify assistant message updated with full content
    expect(mockMessages.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ content: "Hello world" }),
    );

    // Verify session cleaned up
    expect(mockDestroySession).toHaveBeenCalledWith("sess1");
  });

  it("sends error chunk on failure", async () => {
    const sender = makeSender();
    mockConversations.findById.mockReturnValue(makeConvRow());
    mockMessages.listByConversation.mockReturnValue([]);
    mockMessages.create.mockImplementation((data: Record<string, unknown>) =>
      makeMsgRow({ role: data.role, content: data.content ?? "" }),
    );
    mockConversations.update.mockReturnValue(undefined);
    mockMessages.getMaxBranchIndex.mockReturnValue(0);

    mockSubscribe.mockReturnValue(vi.fn());
    mockPrompt.mockRejectedValue(new Error("Agent failed"));

    await svc.sendMessageStream(sender, "conv1", "hi", "m1");

    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "error", content: "Agent failed" }),
    );
  });

  it("throws if conversation not found", async () => {
    mockConversations.findById.mockReturnValue(undefined);
    await expect(
      svc.sendMessageStream(makeSender(), "missing", "hi", "m1"),
    ).rejects.toThrow("not found");
  });
});

describe("abortStream / listActiveStreams", () => {
  it("listActiveStreams returns empty when no streams", () => {
    expect(svc.listActiveStreams()).toEqual([]);
  });
});
