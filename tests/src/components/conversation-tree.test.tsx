import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConversationTree } from "@/components/chat/conversation-tree";
import type { MessageInfo } from "@/lib/ipc/channels";
import { useChatStore } from "@/stores/chat-store";

// jsdom lacks ResizeObserver & scrollIntoView
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = vi.fn();

function makeMessage(overrides: Partial<MessageInfo> = {}): MessageInfo {
  return {
    id: "user-1",
    conversationId: "conv-1",
    parentId: null,
    role: "user",
    content: "Hello",
    modelId: null,
    tokenCount: null,
    costUsd: null,
    metadata: null,
    branchIndex: 0,
    status: "complete",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

afterEach(cleanup);

describe("ConversationTree — empty state", () => {
  beforeEach(() => {
    useChatStore.setState({
      activeBranchPaths: {},
      collapsedNodeIds: new Set(),
      switchBranch: vi.fn(),
      toggleCollapse: vi.fn(),
      branchFromMessage: vi.fn().mockResolvedValue(makeMessage()),
      retryLastMessage: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("shows placeholder when rootId is null", () => {
    render(
      <ConversationTree messages={[]} rootId={null} streaming={false} />,
    );

    expect(
      screen.getByText("No messages yet. Start the conversation!"),
    ).toBeInTheDocument();
  });

  it("shows messages when rootId is provided", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "Hi" }),
    ];

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    expect(screen.getByText("Hi")).toBeInTheDocument();
  });
});

describe("ConversationTree — folding / collapsing", () => {
  const toggleCollapseSpy = vi.fn();

  beforeEach(() => {
    toggleCollapseSpy.mockClear();
    useChatStore.setState({
      activeBranchPaths: {},
      collapsedNodeIds: new Set(),
      switchBranch: vi.fn(),
      toggleCollapse: toggleCollapseSpy,
      branchFromMessage: vi.fn().mockResolvedValue(makeMessage()),
      retryLastMessage: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("shows collapse button for messages with children", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "What is AI?" }),
      makeMessage({
        id: "asst-1",
        parentId: "user-1",
        role: "assistant",
        content: "AI is...",
      }),
    ];

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    expect(
      screen.getByRole("button", { name: /collapse/i }),
    ).toBeInTheDocument();
  });

  it("calls toggleCollapse when collapse button is clicked", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "What is AI?" }),
      makeMessage({
        id: "asst-1",
        parentId: "user-1",
        role: "assistant",
        content: "AI is...",
      }),
    ];

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /collapse/i }));
    expect(toggleCollapseSpy).toHaveBeenCalledWith("user-1");
  });

  it("hides children when node is collapsed", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "What is AI?" }),
      makeMessage({
        id: "asst-1",
        parentId: "user-1",
        role: "assistant",
        content: "AI is an amazing field.",
      }),
    ];

    useChatStore.setState({ collapsedNodeIds: new Set(["user-1"]) });

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    // The child message should NOT be visible
    expect(screen.queryByText("AI is an amazing field.")).not.toBeInTheDocument();
    // The collapsed indicator should be visible
    expect(screen.getByText(/collapsed/)).toBeInTheDocument();
  });
});

describe("ConversationTree — branching", () => {
  const switchBranchSpy = vi.fn();
  const branchFromMsgSpy = vi.fn().mockResolvedValue(makeMessage());

  beforeEach(() => {
    switchBranchSpy.mockClear();
    branchFromMsgSpy.mockClear();
    useChatStore.setState({
      activeBranchPaths: {},
      collapsedNodeIds: new Set(),
      switchBranch: switchBranchSpy,
      toggleCollapse: vi.fn(),
      branchFromMessage: branchFromMsgSpy,
      retryLastMessage: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("shows Branch button on user messages", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "Hello" }),
    ];

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    expect(
      screen.getByRole("button", { name: /create new branch/i }),
    ).toBeInTheDocument();
  });

  it("calls branchFromMessage when Branch button is clicked", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "Hello" }),
    ];

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create new branch/i }));
    expect(branchFromMsgSpy).toHaveBeenCalledWith("user-1", "Hello");
  });

  it("shows branch selector when multiple branches exist", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "Hello" }),
      makeMessage({
        id: "asst-1a",
        parentId: "user-1",
        role: "assistant",
        content: "Reply A",
        branchIndex: 0,
      }),
      makeMessage({
        id: "asst-1b",
        parentId: "user-1",
        role: "assistant",
        content: "Reply B",
        branchIndex: 1,
      }),
    ];

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    expect(screen.getByText(/Branch 1\/2/)).toBeInTheDocument();
  });

  it("calls switchBranch when branch selector next button is clicked", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "Hello" }),
      makeMessage({
        id: "asst-1a",
        parentId: "user-1",
        role: "assistant",
        content: "Reply A",
        branchIndex: 0,
      }),
      makeMessage({
        id: "asst-1b",
        parentId: "user-1",
        role: "assistant",
        content: "Reply B",
        branchIndex: 1,
      }),
    ];

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /next branch/i }));
    expect(switchBranchSpy).toHaveBeenCalledWith("user-1", 1);
  });
});

describe("ConversationTree — streaming indicator", () => {
  beforeEach(() => {
    useChatStore.setState({
      activeBranchPaths: {},
      collapsedNodeIds: new Set(),
      switchBranch: vi.fn(),
      toggleCollapse: vi.fn(),
      branchFromMessage: vi.fn().mockResolvedValue(makeMessage()),
      retryLastMessage: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("shows streaming indicator when streaming is active", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "Hello" }),
    ];

    render(
      <ConversationTree
        messages={messages}
        rootId="user-1"
        streaming={true}
        streamingContent="Thinking..."
        streamingMessageId="asst-stream"
      />,
    );

    expect(screen.getByText("typing...")).toBeInTheDocument();
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("does not show streaming indicator when not streaming", () => {
    const messages = [
      makeMessage({ id: "user-1", role: "user", content: "Hello" }),
    ];

    render(
      <ConversationTree messages={messages} rootId="user-1" streaming={false} />,
    );

    expect(screen.queryByText("typing...")).not.toBeInTheDocument();
  });
});

describe("ConversationTree — retry button for incomplete messages", () => {
  beforeEach(() => {
    useChatStore.setState({
      activeBranchPaths: {},
      collapsedNodeIds: new Set(),
      switchBranch: vi.fn(),
      toggleCollapse: vi.fn(),
      branchFromMessage: vi.fn().mockResolvedValue(makeMessage()),
      retryLastMessage: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("shows Retry button for incomplete assistant messages", () => {
    const messages: MessageInfo[] = [
      makeMessage({ id: "user-1", role: "user", content: "What is AI?", status: "complete" }),
      makeMessage({
        id: "asst-1",
        parentId: "user-1",
        role: "assistant",
        content: "⚠️ Response interrupted\n\nPartial...",
        status: "incomplete",
      }),
    ];

    render(
      <ConversationTree
        messages={messages}
        rootId="user-1"
        streaming={false}
        streamingContent=""
        streamingMessageId={null}
      />,
    );

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("does not show Retry button for complete messages", () => {
    const messages: MessageInfo[] = [
      makeMessage({ id: "user-1", role: "user", content: "What is AI?", status: "complete" }),
      makeMessage({
        id: "asst-1",
        parentId: "user-1",
        role: "assistant",
        content: "AI is...",
        status: "complete",
      }),
    ];

    render(
      <ConversationTree
        messages={messages}
        rootId="user-1"
        streaming={false}
        streamingContent=""
        streamingMessageId={null}
      />,
    );

    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });

  it("calls retryLastMessage when Retry button is clicked", () => {
    const retrySpy = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({ retryLastMessage: retrySpy });

    const messages: MessageInfo[] = [
      makeMessage({ id: "user-1", role: "user", content: "What is AI?", status: "complete" }),
      makeMessage({
        id: "asst-1",
        parentId: "user-1",
        role: "assistant",
        content: "⚠️ Response interrupted",
        status: "incomplete",
        modelId: "model-1",
      }),
    ];

    render(
      <ConversationTree
        messages={messages}
        rootId="user-1"
        streaming={false}
        streamingContent=""
        streamingMessageId={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(retrySpy).toHaveBeenCalledWith("model-1");
  });
});
