import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock electron before any imports that reference it
vi.mock("electron", () => ({
  BrowserWindow: {},
}));

import type { DatabaseService } from "@server/db/index";
import type { PiMonoWrapper } from "@server/services/pi-mono-wrapper";
import { createConversationService } from "@server/services/conversation-service";

// --- Mocks ---

function makeMockDb(): DatabaseService {
  return {
    conversations: {
      create: vi.fn(),
      findById: vi.fn(),
      listByDomain: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    messages: {
      create: vi.fn(),
      listByConversation: vi.fn(),
      findById: vi.fn(),
      getRootMessage: vi.fn(),
      getMaxBranchIndex: vi.fn(() => 0),
      update: vi.fn(),
      deleteByConversation: vi.fn(),
    },
    knowledgeNodes: {
      listByDomain: vi.fn(() => ({ items: [], total: 0 })),
    },
    decisionRecords: {
      list: vi.fn(() => ({ items: [], total: 0 })),
    },
  } as unknown as DatabaseService;
}

function makeMockPiMono(): PiMonoWrapper {
  return {
    createExpertSession: vi.fn(),
    destroySession: vi.fn(),
  } as unknown as PiMonoWrapper;
}

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

// --- Shared setup ---

let db: ReturnType<typeof makeMockDb>;
let piMono: ReturnType<typeof makeMockPiMono>;

beforeEach(() => {
  db = makeMockDb();
  piMono = makeMockPiMono();
});

// --- Tests ---

describe("createConversationService", () => {
  it("returns an object with all public methods", () => {
    const service = createConversationService({ db, piMono });

    expect(service).toHaveProperty("createConversation");
    expect(service).toHaveProperty("listConversations");
    expect(service).toHaveProperty("getConversation");
    expect(service).toHaveProperty("deleteConversation");
    expect(service).toHaveProperty("getConversationTree");
    expect(service).toHaveProperty("getConversationMessages");
    expect(service).toHaveProperty("addMessage");
    expect(service).toHaveProperty("branchFromMessage");
    expect(service).toHaveProperty("sendMessageStream");
    expect(service).toHaveProperty("abortStream");
    expect(service).toHaveProperty("listActiveStreams");
  });
});

describe("createConversation", () => {
  it("creates a conversation with defaults", () => {
    (db.conversations.create as ReturnType<typeof vi.fn>).mockReturnValue(makeConvRow());
    const service = createConversationService({ db, piMono });
    const conv = service.createConversation("d1", null);

    expect(conv.id).toBe("conv1");
    expect(db.conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({ domain_id: "d1", session_type: "expert", status: "active" }),
    );
  });

  it("passes title when provided", () => {
    (db.conversations.create as ReturnType<typeof vi.fn>).mockReturnValue(makeConvRow());
    const service = createConversationService({ db, piMono });
    service.createConversation("d1", null, "My Chat");

    expect(db.conversations.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My Chat" }),
    );
  });
});

describe("listConversations", () => {
  it("returns mapped conversations with total", () => {
    const rows = [makeConvRow(), makeConvRow({ id: "conv2" })];
    (db.conversations.listByDomain as ReturnType<typeof vi.fn>).mockReturnValue({ items: rows, total: 2 });
    const service = createConversationService({ db, piMono });
    const result = service.listConversations("d1");

    expect(result.conversations).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("passes options through", () => {
    (db.conversations.listByDomain as ReturnType<typeof vi.fn>).mockReturnValue({ items: [], total: 0 });
    const service = createConversationService({ db, piMono });
    service.listConversations("d1", { status: "active", limit: 10 });

    expect(db.conversations.listByDomain).toHaveBeenCalledWith("d1", {
      status: "active",
      limit: 10,
    });
  });
});

describe("getConversation", () => {
  it("returns conversation when found", () => {
    (db.conversations.findById as ReturnType<typeof vi.fn>).mockReturnValue(makeConvRow());
    const service = createConversationService({ db, piMono });
    const conv = service.getConversation("conv1");

    expect(conv.id).toBe("conv1");
  });

  it("throws when not found", () => {
    (db.conversations.findById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const service = createConversationService({ db, piMono });

    expect(() => service.getConversation("missing")).toThrow("not found");
  });
});

describe("deleteConversation", () => {
  it("deletes messages then conversation", () => {
    const service = createConversationService({ db, piMono });
    service.deleteConversation("conv1");

    expect(db.messages.deleteByConversation).toHaveBeenCalledWith("conv1");
    expect(db.conversations.delete).toHaveBeenCalledWith("conv1");
  });
});

describe("addMessage", () => {
  it("creates a message with branch index 0 when no parent", () => {
    (db.messages.create as ReturnType<typeof vi.fn>).mockReturnValue(makeMsgRow());
    const service = createConversationService({ db, piMono });
    const msg = service.addMessage("conv1", "user", "hello", null);

    expect(msg.id).toBe("msg1");
    expect(db.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: null, branch_index: 0 }),
    );
  });

  it("calculates branch index from parent", () => {
    (db.messages.getMaxBranchIndex as ReturnType<typeof vi.fn>).mockReturnValue(2);
    (db.messages.create as ReturnType<typeof vi.fn>).mockReturnValue(makeMsgRow({ branch_index: 3 }));
    const service = createConversationService({ db, piMono });
    service.addMessage("conv1", "user", "hello", "parent1");

    expect(db.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ branch_index: 3, parent_id: "parent1" }),
    );
  });
});

describe("branchFromMessage", () => {
  it("creates a user message branched from parent", () => {
    const parent = makeMsgRow({ id: "p1", conversation_id: "conv1" });
    (db.messages.findById as ReturnType<typeof vi.fn>).mockReturnValue(parent);
    (db.messages.getMaxBranchIndex as ReturnType<typeof vi.fn>).mockReturnValue(0);
    (db.messages.create as ReturnType<typeof vi.fn>).mockReturnValue(makeMsgRow({ id: "msg2", parent_id: "p1" }));
    const service = createConversationService({ db, piMono });
    const msg = service.branchFromMessage("p1", "new branch");

    expect(msg.parentId).toBe("p1");
    expect(db.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", content: "new branch" }),
    );
  });

  it("throws if parent not found", () => {
    (db.messages.findById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const service = createConversationService({ db, piMono });

    expect(() => service.branchFromMessage("missing", "x")).toThrow("not found");
  });
});

describe("getConversationTree", () => {
  it("returns tree with root id", () => {
    (db.conversations.findById as ReturnType<typeof vi.fn>).mockReturnValue(makeConvRow());
    const msgs = [makeMsgRow(), makeMsgRow({ id: "msg2" })];
    (db.messages.listByConversation as ReturnType<typeof vi.fn>).mockReturnValue(msgs);
    (db.messages.getRootMessage as ReturnType<typeof vi.fn>).mockReturnValue(makeMsgRow({ id: "root1" }));
    const service = createConversationService({ db, piMono });
    const tree = service.getConversationTree("conv1");

    expect(tree.conversation.id).toBe("conv1");
    expect(tree.messages).toHaveLength(2);
    expect(tree.rootId).toBe("root1");
  });

  it("throws if conversation not found", () => {
    (db.conversations.findById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const service = createConversationService({ db, piMono });

    expect(() => service.getConversationTree("missing")).toThrow("not found");
  });
});

describe("getConversationMessages", () => {
  it("returns mapped messages", () => {
    const msgs = [makeMsgRow()];
    (db.messages.listByConversation as ReturnType<typeof vi.fn>).mockReturnValue(msgs);
    const service = createConversationService({ db, piMono });
    const result = service.getConversationMessages("conv1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("msg1");
  });
});

describe("sendMessageStream", () => {
  it("sends streaming chunks and finalizes content", async () => {
    const sender = makeSender();
    const service = createConversationService({ db, piMono });

    (db.conversations.findById as ReturnType<typeof vi.fn>).mockReturnValue(makeConvRow());
    (db.messages.listByConversation as ReturnType<typeof vi.fn>).mockReturnValue([]);

    let msgCounter = 0;
    (db.messages.create as ReturnType<typeof vi.fn>).mockImplementation((data: Record<string, unknown>) => {
      msgCounter++;
      return makeMsgRow({
        id: `msg_${msgCounter}`,
        role: data.role,
        content: data.content ?? "",
        parent_id: data.parent_id,
      });
    });

    let eventCallback: ((e: unknown) => void) | null = null;
    (piMono.createExpertSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessionId: "sess1",
      session: {
        subscribe: vi.fn((cb: (e: unknown) => void) => {
          eventCallback = cb;
          return vi.fn();
        }),
        prompt: vi.fn(async () => {
          if (eventCallback) {
            eventCallback({ type: "message_update", assistantMessageEvent: { textDelta: "Hello " } });
            eventCallback({ type: "message_update", assistantMessageEvent: { textDelta: "world" } });
            eventCallback({ type: "tool_execution_start", toolName: "search" });
            eventCallback({ type: "tool_execution_end", result: "found" });
          }
        }),
      },
    });

    await service.sendMessageStream(sender, "conv1", "hi", "m1");

    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "start" }),
    );

    const tokenCalls = (sender.webContents.send as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[1]?.type === "token",
    );
    expect(tokenCalls).toHaveLength(2);

    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "tool_call", content: "search" }),
    );
    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "tool_result", content: "found" }),
    );

    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "done" }),
    );

    expect(db.messages.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ content: "Hello world" }),
    );

    expect(piMono.destroySession).toHaveBeenCalledWith("sess1");
  });

  it("sends error chunk on failure", async () => {
    const sender = makeSender();
    const service = createConversationService({ db, piMono });

    (db.conversations.findById as ReturnType<typeof vi.fn>).mockReturnValue(makeConvRow());
    (db.messages.listByConversation as ReturnType<typeof vi.fn>).mockReturnValue([]);
    (db.messages.create as ReturnType<typeof vi.fn>).mockImplementation((data: Record<string, unknown>) =>
      makeMsgRow({ role: data.role, content: data.content ?? "" }),
    );

    (piMono.createExpertSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      sessionId: "sess1",
      session: {
        subscribe: vi.fn(() => vi.fn()),
        prompt: vi.fn(() => Promise.reject(new Error("Agent failed"))),
      },
    });

    await service.sendMessageStream(sender, "conv1", "hi", "m1");

    expect(sender.webContents.send).toHaveBeenCalledWith(
      "chat:stream:conv1",
      expect.objectContaining({ type: "error", content: "Agent failed" }),
    );
  });

  it("throws if conversation not found", async () => {
    (db.conversations.findById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const service = createConversationService({ db, piMono });

    await expect(
      service.sendMessageStream(makeSender(), "missing", "hi", "m1"),
    ).rejects.toThrow("not found");
  });
});

describe("abortStream / listActiveStreams", () => {
  it("listActiveStreams returns empty when no streams", () => {
    const service = createConversationService({ db, piMono });
    expect(service.listActiveStreams()).toEqual([]);
  });
});
