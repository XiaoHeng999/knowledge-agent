"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import type { MessageInfo } from "@/lib/ipc/channels";
import { useChatStore } from "@/stores/chat-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreeNode {
  message: MessageInfo;
  children: TreeNode[][];
  depth: number;
}

interface FlatItem {
  message: MessageInfo;
  depth: number;
  hasChildren: boolean;
  totalBranches: number;
  activeBranchIdx: number;
}

interface ConversationTreeProps {
  messages: MessageInfo[];
  rootId: string | null;
  streaming?: boolean;
  streamingContent?: string;
  streamingMessageId?: string | null;
}

// Virtual scroll threshold
const VIRTUAL_SCROLL_THRESHOLD = 50;
const OVERSCAN_BEFORE = 5;
const OVERSCAN_AFTER = 10;
const ESTIMATED_ITEM_HEIGHT = 120;
const AUTO_SCROLL_THRESHOLD = 150;

// ---------------------------------------------------------------------------
// Tree building utilities
// ---------------------------------------------------------------------------

function buildTree(messages: MessageInfo[], rootId: string | null): TreeNode | null {
  if (!rootId) return null;

  const msgMap = new Map<string, MessageInfo>();
  const childrenMap = new Map<string, Map<number, MessageInfo[]>>();

  for (const msg of messages) {
    msgMap.set(msg.id, msg);
    if (msg.parentId) {
      if (!childrenMap.has(msg.parentId)) {
        childrenMap.set(msg.parentId, new Map());
      }
      const parentChildren = childrenMap.get(msg.parentId)!;
      if (!parentChildren.has(msg.branchIndex)) {
        parentChildren.set(msg.branchIndex, []);
      }
      parentChildren.get(msg.branchIndex)!.push(msg);
    }
  }

  function buildNode(msgId: string, depth: number): TreeNode {
    const message = msgMap.get(msgId)!;
    const branchMap = childrenMap.get(msgId);
    const children: TreeNode[][] = [];

    if (branchMap) {
      const sortedBranches = Array.from(branchMap.entries()).sort(([a], [b]) => a - b);
      for (const [, branchMessages] of sortedBranches) {
        const branchNodes: TreeNode[] = [];
        let currentId: string | undefined = branchMessages[0]?.id;

        while (currentId) {
          const currentMsg = msgMap.get(currentId);
          if (!currentMsg) break;

          branchNodes.push(buildNode(currentId, depth + 1));

          // Find next message in this branch
          const nextChildren = childrenMap.get(currentId);
          if (nextChildren && nextChildren.size > 0) {
            const firstBranch = nextChildren.values().next().value;
            currentId = firstBranch?.[0]?.id;
          } else {
            currentId = undefined;
          }
        }

        if (branchNodes.length > 0) {
          children.push(branchNodes);
        }
      }
    }

    return { message, children, depth };
  }

  return buildNode(rootId, 0);
}

function flattenActiveBranch(
  tree: TreeNode | null,
  activePaths: Record<string, number>,
  collapsedIds: Set<string>,
): FlatItem[] {
  if (!tree) return [];
  const result: FlatItem[] = [];
  const activeIdx = activePaths[tree.message.id] ?? 0;

  result.push({
    message: tree.message,
    depth: tree.depth,
    hasChildren: tree.children.length > 0,
    totalBranches: tree.children.length,
    activeBranchIdx: Math.min(activeIdx, tree.children.length - 1),
  });

  if (collapsedIds.has(tree.message.id) || tree.children.length === 0) {
    return result;
  }

  const branchIdx = Math.min(activeIdx, tree.children.length - 1);
  const activeBranch = tree.children[branchIdx];
  for (const child of activeBranch) {
    result.push(...flattenActiveBranch(child, activePaths, collapsedIds));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Branch Selector component
// ---------------------------------------------------------------------------

function BranchSelector({
  totalBranches,
  currentIndex,
  onSelect,
}: {
  parentId: string;
  totalBranches: number;
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="branch-selector" role="group" aria-label={`Branch selector, ${totalBranches} branches`}>
      <button
        className="branch-selector__btn"
        onClick={() => onSelect(Math.max(0, currentIndex - 1))}
        disabled={currentIndex <= 0}
        aria-label="Previous branch"
        aria-keyshortcuts="ArrowLeft"
      >
        &#x25C4;
      </button>
      <span className="branch-selector__counter" aria-live="polite">
        Branch {currentIndex + 1}/{totalBranches}
      </span>
      <button
        className="branch-selector__btn"
        onClick={() => onSelect(Math.min(totalBranches - 1, currentIndex + 1))}
        disabled={currentIndex >= totalBranches - 1}
        aria-label="Next branch"
        aria-keyshortcuts="ArrowRight"
      >
        &#x25BA;
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single message node in the tree
// ---------------------------------------------------------------------------

function MessageNode({
  node,
  activePaths,
  collapsedIds,
  onSwitchBranch,
  onToggleCollapse,
  onBranch,
  onRetry,
  streaming,
  streamingContent,
  streamingMessageId,
}: {
  node: TreeNode;
  activePaths: Record<string, number>;
  collapsedIds: Set<string>;
  onSwitchBranch: (parentId: string, index: number) => void;
  onToggleCollapse: (nodeId: string) => void;
  onBranch: (parentMessageId: string) => void;
  onRetry?: (messageId: string) => void;
  streaming?: boolean;
  streamingContent?: string;
  streamingMessageId?: string | null;
}) {
  const { message, children, depth } = node;
  const isUser = message.role === "user";
  const isCollapsed = collapsedIds.has(message.id);
  const activeBranchIdx = activePaths[message.id] ?? 0;
  const hasBranches = children.length > 1;

  // Get hidden count for collapsed node
  const hiddenCount = useMemo(() => {
    if (!isCollapsed || children.length === 0) return 0;
    let count = 0;
    const activeBranch = children[Math.min(activeBranchIdx, children.length - 1)];
    for (const child of activeBranch) {
      count += countDescendants(child);
    }
    return count;
  }, [isCollapsed, children, activeBranchIdx]);

  return (
    <div className="tree-node" style={{ marginLeft: depth > 0 ? "24px" : "0" }}>
      <div
        className={`tree-node__message ${isUser ? "tree-node__message--user" : "tree-node__message--assistant"}`}
        role="treeitem"
        aria-expanded={!isCollapsed}
        aria-selected={false}
      >
        <div className="tree-node__bubble">
          <div className="tree-node__avatar">
            {isUser ? (
              <span role="img" aria-label="User avatar">&#x1F464;</span>
            ) : (
              <span role="img" aria-label="AI assistant avatar">&#x1F916;</span>
            )}
          </div>
          <div className="tree-node__content">
            <div
              className="tree-node__text"
              dangerouslySetInnerHTML={{ __html: escapeAndFormat(message.content) }}
            />
          </div>
          <div className="tree-node__meta">
            <span className="tree-node__time">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isUser && (
              <button
                className="tree-node__branch-btn"
                onClick={() => onBranch(message.id)}
                aria-label="Create new branch from this message"
                title="Create a sibling branch"
              >
                &#x21BB; Branch
              </button>
            )}
            {children.length > 0 && (
              <button
                className="tree-node__collapse-btn"
                onClick={() => onToggleCollapse(message.id)}
                aria-label={isCollapsed ? "Expand messages" : "Collapse messages"}
              >
                {isCollapsed ? "&#x25B6;" : "&#x25BC;"}
              </button>
            )}
            {!isUser && message.status === "incomplete" && onRetry && (
              <button
                className="tree-node__retry-btn"
                onClick={() => onRetry(message.id)}
                aria-label="Retry generating response"
                title="Retry"
              >
                &#x21BB; Retry
              </button>
            )}
          </div>
        </div>

        {isCollapsed && hiddenCount > 0 && (
          <button
            className="tree-node__hidden"
            onClick={() => onToggleCollapse(message.id)}
          >
            ... {hiddenCount} hidden messages
          </button>
        )}
      </div>

      {/* Branch selector when multiple branches exist */}
      {hasBranches && !isCollapsed && (
        <BranchSelector
          parentId={message.id}
          totalBranches={children.length}
          currentIndex={Math.min(activeBranchIdx, children.length - 1)}
          onSelect={(idx) => onSwitchBranch(message.id, idx)}
        />
      )}

      {/* Render active branch children */}
      {!isCollapsed && children.length > 0 && (() => {
        const activeBranch = children[Math.min(activeBranchIdx, children.length - 1)];
        return (
          <div className="tree-node__children">
            {activeBranch.map((child) => (
              <MessageNode
                key={child.message.id}
                node={child}
                activePaths={activePaths}
                collapsedIds={collapsedIds}
                onSwitchBranch={onSwitchBranch}
                onToggleCollapse={onToggleCollapse}
                onBranch={onBranch}
                streaming={streaming}
                streamingContent={streamingContent}
                streamingMessageId={streamingMessageId}
              />
            ))}
          </div>
        );
      })()}

      {/* Streaming indicator at the end */}
      {streaming && streamingMessageId && node.message.id !== streamingMessageId && !isCollapsed &&
        children.length === 0 && isLastInBranch(node) && (
        <div className="tree-node tree-node--streaming" style={{ marginLeft: `${(depth + 1) * 24}px` }}>
          <div className="tree-node__message tree-node__message--assistant">
            <div className="tree-node__avatar">
              <span role="img" aria-label="AI assistant avatar">&#x1F916;</span>
            </div>
            <div className="tree-node__content">
              <div className="tree-node__header">
                <span className="tree-node__role">Expert</span>
                <span className="tree-node__typing">typing...</span>
              </div>
              {streamingContent && (
                <div
                  className="tree-node__text"
                  dangerouslySetInnerHTML={{ __html: escapeAndFormat(streamingContent) }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isLastInBranch(node: TreeNode): boolean {
  return node.children.length === 0;
}

function countDescendants(node: TreeNode): number {
  let count = 1;
  for (const branch of node.children) {
    for (const child of branch) {
      count += countDescendants(child);
    }
  }
  return count;
}

function escapeAndFormat(content: string): string {
  let html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
    `<pre class="msg-code-block"><code class="lang-${lang || "text"}">${code.trim()}</code></pre>`
  );
  html = html.replace(/`([^`]+)`/g, '<code class="msg-inline-code">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/\n/g, "<br />");
  return html;
}

// ---------------------------------------------------------------------------
// Virtual scroll hook
// ---------------------------------------------------------------------------

function useVirtualScroll(items: unknown[], containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => setScrollOffset(el.scrollTop);
    const handleResize = () => setViewportHeight(el.clientHeight);

    handleResize();
    el.addEventListener("scroll", handleScroll, { passive: true });
    const observer = new ResizeObserver(handleResize);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [containerRef]);

  const shouldVirtualize = items.length > VIRTUAL_SCROLL_THRESHOLD;
  if (!shouldVirtualize) {
    return { startIndex: 0, endIndex: items.length - 1, shouldVirtualize: false };
  }

  const startIndex = Math.max(0, Math.floor(scrollOffset / ESTIMATED_ITEM_HEIGHT) - OVERSCAN_BEFORE);
  const visibleCount = Math.ceil(viewportHeight / ESTIMATED_ITEM_HEIGHT);
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + OVERSCAN_AFTER);

  return { startIndex, endIndex, shouldVirtualize: true };
}

// ---------------------------------------------------------------------------
// Flat message item renderer (used by virtualized path)
// ---------------------------------------------------------------------------

function FlatMessageItem({
  item,
  isCollapsed,
  onSwitchBranch,
  onToggleCollapse,
  onBranch,
  onRetry,
  streaming,
  streamingContent,
  streamingMessageId,
  isLast,
}: {
  item: FlatItem;
  isCollapsed: boolean;
  onSwitchBranch: (parentId: string, index: number) => void;
  onToggleCollapse: (nodeId: string) => void;
  onBranch: (parentMessageId: string) => void;
  onRetry?: (messageId: string) => void;
  streaming?: boolean;
  streamingContent?: string;
  streamingMessageId?: string | null;
  isLast: boolean;
}) {
  const { message, depth, hasChildren, totalBranches, activeBranchIdx } = item;
  const isUser = message.role === "user";
  const hasBranches = totalBranches > 1;

  return (
    <div className="tree-node" style={{ marginLeft: depth > 0 ? "24px" : "0" }}>
      <div
        className={`tree-node__message ${isUser ? "tree-node__message--user" : "tree-node__message--assistant"}`}
        role="treeitem"
        aria-expanded={!isCollapsed}
        aria-selected={false}
      >
        <div className="tree-node__bubble">
          <div className="tree-node__avatar">
            {isUser ? (
              <span role="img" aria-label="User avatar">&#x1F464;</span>
            ) : (
              <span role="img" aria-label="AI assistant avatar">&#x1F916;</span>
            )}
          </div>
          <div className="tree-node__content">
            <div
              className="tree-node__text"
              dangerouslySetInnerHTML={{ __html: escapeAndFormat(message.content) }}
            />
          </div>
          <div className="tree-node__meta">
            <span className="tree-node__time">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isUser && (
              <button
                className="tree-node__branch-btn"
                onClick={() => onBranch(message.id)}
                aria-label="Create new branch from this message"
                title="Create a sibling branch"
              >
                &#x21BB; Branch
              </button>
            )}
            {hasChildren && (
              <button
                className="tree-node__collapse-btn"
                onClick={() => onToggleCollapse(message.id)}
                aria-label={isCollapsed ? "Expand messages" : "Collapse messages"}
              >
                {isCollapsed ? "&#x25B6;" : "&#x25BC;"}
              </button>
            )}
            {!isUser && message.status === "incomplete" && onRetry && (
              <button
                className="tree-node__retry-btn"
                onClick={() => onRetry(message.id)}
                aria-label="Retry generating response"
                title="Retry"
              >
                &#x21BB; Retry
              </button>
            )}
          </div>
        </div>

        {isCollapsed && (
          <button
            className="tree-node__hidden"
            onClick={() => onToggleCollapse(message.id)}
          >
            ... collapsed
          </button>
        )}
      </div>

      {hasBranches && !isCollapsed && (
        <BranchSelector
          parentId={message.id}
          totalBranches={totalBranches}
          currentIndex={activeBranchIdx}
          onSelect={(idx) => onSwitchBranch(message.id, idx)}
        />
      )}

      {streaming && isLast && (
        <div className="tree-node tree-node--streaming" style={{ marginLeft: `${(depth + 1) * 24}px` }}>
          <div className="tree-node__message tree-node__message--assistant">
            <div className="tree-node__avatar">
              <span role="img" aria-label="AI assistant avatar">&#x1F916;</span>
            </div>
            <div className="tree-node__content">
              <div className="tree-node__header">
                <span className="tree-node__role">Expert</span>
                <span className="tree-node__typing">typing...</span>
              </div>
              {streamingContent && (
                <div
                  className="tree-node__text"
                  dangerouslySetInnerHTML={{ __html: escapeAndFormat(streamingContent) }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ConversationTree component
// ---------------------------------------------------------------------------

export function ConversationTree({
  messages,
  rootId,
  streaming,
  streamingContent,
  streamingMessageId,
}: ConversationTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activePaths = useChatStore((s) => s.activeBranchPaths);
  const collapsedIds = useChatStore((s) => s.collapsedNodeIds);
  const switchBranch = useChatStore((s) => s.switchBranch);
  const toggleCollapse = useChatStore((s) => s.toggleCollapse);
  const branchFromMessage = useChatStore((s) => s.branchFromMessage);
  const retryLastMessage = useChatStore((s) => s.retryLastMessage);

  const tree = useMemo(() => buildTree(messages, rootId), [messages, rootId]);
  const flatItems = useMemo(
    () => flattenActiveBranch(tree, activePaths, collapsedIds),
    [tree, activePaths, collapsedIds],
  );

  const { startIndex, endIndex, shouldVirtualize } = useVirtualScroll(flatItems, containerRef);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      const container = containerRef.current;
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < AUTO_SCROLL_THRESHOLD) {
          bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [flatItems.length, streamingContent]);

  const handleSwitchBranch = useCallback(
    (parentId: string, index: number) => {
      switchBranch(parentId, index);
    },
    [switchBranch],
  );

  const handleToggleCollapse = useCallback(
    (nodeId: string) => {
      toggleCollapse(nodeId);
    },
    [toggleCollapse],
  );

  const handleBranch = useCallback(
    (parentMessageId: string) => {
      const msg = messages.find((m) => m.id === parentMessageId);
      if (msg) {
        branchFromMessage(parentMessageId, msg.content);
      }
    },
    [messages, branchFromMessage],
  );

  const handleRetry = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (msg?.modelId) {
        retryLastMessage(msg.modelId);
      }
    },
    [messages, retryLastMessage],
  );

  if (!tree) {
    return (
      <div className="conversation-tree conversation-tree--empty">
        <p className="conversation-tree__placeholder">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  // Render the visible slice of the flat list
  const collapsedSet = collapsedIds;
  const renderItem = (item: FlatItem, index: number) => (
    <FlatMessageItem
      key={item.message.id}
      item={item}
      isCollapsed={collapsedSet.has(item.message.id)}
      onSwitchBranch={handleSwitchBranch}
      onToggleCollapse={handleToggleCollapse}
      onBranch={handleBranch}
      onRetry={handleRetry}
      streaming={streaming}
      streamingContent={streamingContent}
      streamingMessageId={streamingMessageId}
      isLast={index === flatItems.length - 1}
    />
  );

  return (
    <div
      className="conversation-tree"
      ref={containerRef}
      role="tree"
      aria-label="Conversation branches"
    >
      {shouldVirtualize ? (
        <>
          <div style={{ height: startIndex * ESTIMATED_ITEM_HEIGHT }} />
          {flatItems.slice(startIndex, endIndex + 1).map((item, i) =>
            renderItem(item, startIndex + i),
          )}
          <div style={{ height: Math.max(0, (flatItems.length - endIndex - 1) * ESTIMATED_ITEM_HEIGHT) }} />
        </>
      ) : (
        flatItems.map((item, i) => renderItem(item, i))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
