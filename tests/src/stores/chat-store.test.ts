import { describe, it, expect, beforeEach, vi } from "vitest";
import { useChatStore } from "@/stores/chat-store";
import type { StreamChunk } from "@/lib/ipc/channels";

// Capture the stream event handler so we can emit chunks manually
let capturedHandler: ((...args: unknown[]) => void) | null = null;
let capturedChannel: string | null = null;

function mockWindowApi() {
  const on = vi.fn((channel: string, handler: (...args: unknown[]) => void) => {
    capturedChannel = channel;
    capturedHandler = handler;
  });
  const removeListener = vi.fn();
  const sendMessage = vi.fn().mockResolvedValue(undefined);
  const abortStream = vi.fn();

  // @ts-expect-error — test mock
  window.api = {
    on,
    removeListener,
    chat: {
      sendMessage,
      abortStream,
      listConversations: vi.fn(),
      createConversation: vi.fn(),
      deleteConversation: vi.fn(),
      getTree: vi.fn(),
      branchFromMessage: vi.fn(),
    },
  };

  return { on, removeListener, sendMessage, abortStream };
}

function emitChunk(chunk: StreamChunk) {
  if (!capturedHandler) throw new Error("No handler subscribed");
  capturedHandler(undefined, chunk);
}

describe("useChatStore — stream error recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedHandler = null;
    capturedChannel = null;
    useChatStore.setState({
      conversations: [],
      currentConversationId: "conv-1",
      currentConversation: { id: "conv-1" } as any,
      messages: [],
      rootId: null,
      totalConversations: 0,
      loading: false,
      error: null,
      streaming: false,
      streamingMessageId: null,
      streamingContent: "",
      streamError: null,
      streamingUserMsgId: null,
      activeBranchPaths: {},
      collapsedNodeIds: new Set(),
    });
  });

  it("saves partial content as incomplete message on stream error", async () => {
    const mocks = mockWindowApi();

    // Start sending a message
    const sendPromise = useChatStore.getState().sendMessage("Hello AI", "model-1");

    // Simulate server emitting chunks
    emitChunk({
      type: "start",
      content: "",
      userMessageId: "user-msg-1",
      assistantMessageId: "asst-msg-1",
    });

    emitChunk({ type: "token", content: "Hello! " });
    emitChunk({ type: "token", content: "I was saying..." });

    // Stream errors out
    emitChunk({ type: "error", content: "API rate limit exceeded" });

    await sendPromise;

    const state = useChatStore.getState();

    // Streaming state cleaned up
    expect(state.streaming).toBe(false);
    expect(state.streamingContent).toBe("");
    expect(state.streamError).toBe("API rate limit exceeded");

    // Incomplete assistant message saved
    const incompleteMsg = state.messages.find((m) => m.id === "asst-msg-1");
    expect(incompleteMsg).toBeDefined();
    expect(incompleteMsg!.status).toBe("incomplete");
    expect(incompleteMsg!.content).toContain("⚠️ Response interrupted");
    expect(incompleteMsg!.content).toContain("Hello! I was saying...");
  });

  it("retryLastMessage resends original user content for incomplete message", async () => {
    const mocks = mockWindowApi();

    // Seed: user message + incomplete assistant message
    useChatStore.setState({
      messages: [
        {
          id: "user-msg-1",
          conversationId: "conv-1",
          parentId: null,
          role: "user",
          content: "What is AI?",
          modelId: null,
          tokenCount: null,
          costUsd: null,
          metadata: null,
          branchIndex: 0,
          status: "complete" as const,
          createdAt: new Date().toISOString(),
        },
        {
          id: "asst-msg-1",
          conversationId: "conv-1",
          parentId: "user-msg-1",
          role: "assistant",
          content: "⚠️ Response interrupted\n\nAI is...",
          modelId: "model-1",
          tokenCount: null,
          costUsd: null,
          metadata: null,
          branchIndex: 0,
          status: "incomplete" as const,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    // Start retry
    const retryPromise = useChatStore.getState().retryLastMessage("model-1");

    // The retry should call sendMessage via IPC with the original user content
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      conversationId: "conv-1",
      content: "What is AI?",
      modelId: "model-1",
    });

    await retryPromise;
  });

  it("streaming state is clean after error, allows subsequent send", async () => {
    const mocks = mockWindowApi();

    // First message: error out
    const first = useChatStore.getState().sendMessage("Hello", "model-1");
    emitChunk({ type: "start", content: "", userMessageId: "u1", assistantMessageId: "a1" });
    emitChunk({ type: "error", content: "timeout" });
    await first;

    expect(useChatStore.getState().streaming).toBe(false);

    // Second message should not be blocked
    const second = useChatStore.getState().sendMessage("Try again", "model-1");
    emitChunk({ type: "start", content: "", userMessageId: "u2", assistantMessageId: "a2" });
    emitChunk({ type: "token", content: "OK!" });
    emitChunk({ type: "done", content: "" });
    await second;

    const state = useChatStore.getState();
    expect(state.streaming).toBe(false);
    expect(state.streamError).toBeNull();
    // Should have user msgs + incomplete assistant + new complete assistant
    expect(state.messages.length).toBeGreaterThanOrEqual(3);
  });
});
