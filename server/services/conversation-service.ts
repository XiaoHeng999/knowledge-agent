/**
 * Conversation service — manages expert chat sessions, message persistence,
 * domain context auto-loading, and streaming response integration.
 */
import type { ConversationRow, MessageRow, MessageRole } from "../db/schema";
import type { FullDeps } from "./types";
import type { BrowserWindow } from "electron";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationInfo {
  id: string;
  domainId: string;
  title: string | null;
  modelId: string | null;
  sessionType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageInfo {
  id: string;
  conversationId: string;
  parentId: string | null;
  role: MessageRole;
  content: string;
  modelId: string | null;
  tokenCount: number | null;
  costUsd: number | null;
  metadata: Record<string, unknown> | null;
  branchIndex: number;
  status: "complete" | "incomplete";
  createdAt: string;
}

export interface ConversationTree {
  conversation: ConversationInfo;
  messages: MessageInfo[];
  rootId: string | null;
}

export interface StreamChunk {
  type: "start" | "token" | "tool_call" | "tool_result" | "done" | "error";
  content: string;
  userMessageId?: string;
  assistantMessageId?: string;
  messageId?: string;
}

// ---------------------------------------------------------------------------
// Row → IPC type mappers
// ---------------------------------------------------------------------------

function rowToConversation(row: ConversationRow): ConversationInfo {
  return {
    id: row.id,
    domainId: row.domain_id,
    title: row.title,
    modelId: row.model_id,
    sessionType: row.session_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToMessage(row: MessageRow): MessageInfo {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    parentId: row.parent_id,
    role: row.role,
    content: row.content,
    modelId: row.model_id,
    tokenCount: row.token_count,
    costUsd: row.cost_usd,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    branchIndex: row.branch_index,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createConversationService(deps: FullDeps) {
  const { db, piMono } = deps;
  const activeStreams = new Map<string, { abortController: AbortController }>();

  // -------------------------------------------------------------------------
  // Domain context builder
  // -------------------------------------------------------------------------

  function buildDomainContext(domainId: string): string {
    const recentNodes = db.knowledgeNodes.listByDomain({
      domainId,
      limit: 20,
      offset: 0,
    });

    const recentDecisions = db.decisionRecords.list({
      limit: 5,
      offset: 0,
      where: "domain_id = ? AND status = 'accepted'",
      params: [domainId],
    });

    const parts: string[] = [];

    if (recentNodes.items.length > 0) {
      parts.push("## Domain Knowledge (recent nodes)\n");
      for (const node of recentNodes.items) {
        parts.push(`- **${node.title}** [${node.node_type}] (comprehension: ${node.comprehension_score}/5)`);
        if (node.summary) {
          parts.push(`  ${node.summary}`);
        }
      }
    }

    if (recentDecisions.items.length > 0) {
      parts.push("\n## Recent Decisions\n");
      for (const dec of recentDecisions.items) {
        parts.push(`- **${dec.title}** (#${dec.decision_number}): ${dec.decision_text}`);
      }
    }

    if (parts.length === 0) {
      return "This domain has no existing knowledge or decisions yet. This is a fresh conversation.";
    }

    return parts.join("\n");
  }

  // -------------------------------------------------------------------------
  // Public service methods
  // -------------------------------------------------------------------------

  function createConversation(
    domainId: string,
    modelId: string | null,
    title?: string,
  ): ConversationInfo {
    const row = db.conversations.create({
      domain_id: domainId,
      title: title ?? "New conversation",
      model_id: modelId,
      session_type: "expert",
      status: "active",
    } as unknown as Partial<ConversationRow> & Record<string, unknown>);

    return rowToConversation(row);
  }

  function listConversations(
    domainId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): { conversations: ConversationInfo[]; total: number } {
    const result = db.conversations.listByDomain(domainId, options);
    return {
      conversations: result.items.map(rowToConversation),
      total: result.total,
    };
  }

  function getConversation(conversationId: string): ConversationInfo {
    const row = db.conversations.findById(conversationId);
    if (!row) throw new Error(`Conversation not found: ${conversationId}`);
    return rowToConversation(row);
  }

  function deleteConversation(conversationId: string): void {
    db.messages.deleteByConversation(conversationId);
    db.conversations.delete(conversationId);

    const stream = activeStreams.get(conversationId);
    if (stream) {
      stream.abortController.abort();
      activeStreams.delete(conversationId);
    }
  }

  function getConversationTree(conversationId: string): ConversationTree {
    const conv = db.conversations.findById(conversationId);
    if (!conv) throw new Error(`Conversation not found: ${conversationId}`);

    const messages = db.messages.listByConversation(conversationId);
    const root = db.messages.getRootMessage(conversationId);

    return {
      conversation: rowToConversation(conv),
      messages: messages.map(rowToMessage),
      rootId: root?.id ?? null,
    };
  }

  function getConversationMessages(conversationId: string): MessageInfo[] {
    return db.messages.listByConversation(conversationId).map(rowToMessage);
  }

  function addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    parentId: string | null,
    modelId?: string,
  ): MessageInfo {
    let branchIndex = 0;
    if (parentId) {
      branchIndex = db.messages.getMaxBranchIndex(parentId) + 1;
    }

    const row = db.messages.create({
      conversation_id: conversationId,
      parent_id: parentId,
      role,
      content,
      model_id: modelId ?? null,
      token_count: null,
      cost_usd: null,
      metadata: null,
      branch_index: branchIndex,
      status: "complete",
    } as unknown as Partial<MessageRow> & Record<string, unknown>);

    db.conversations.update(conversationId, {});

    return rowToMessage(row);
  }

  function branchFromMessage(
    parentMessageId: string,
    content: string,
  ): MessageInfo {
    const parentMsg = db.messages.findById(parentMessageId);
    if (!parentMsg) throw new Error(`Message not found: ${parentMessageId}`);

    return addMessage(
      parentMsg.conversation_id,
      "user",
      content,
      parentMsg.id,
    );
  }

  // -------------------------------------------------------------------------
  // Streaming response via pi-mono agent session
  // -------------------------------------------------------------------------

  async function sendMessageStream(
    sender: BrowserWindow,
    conversationId: string,
    content: string,
    modelId: string,
  ): Promise<void> {
    const conv = db.conversations.findById(conversationId);
    if (!conv) throw new Error(`Conversation not found: ${conversationId}`);

    const lastMessages = db.messages.listByConversation(conversationId);
    const lastMsg = lastMessages.length > 0 ? lastMessages[lastMessages.length - 1] : null;
    const userMessage = addMessage(conversationId, "user", content, lastMsg?.id ?? null);

    const domainContext = buildDomainContext(conv.domain_id);
    const _systemPrompt = `You are an expert research assistant for this domain.\n\n${domainContext}`;

    const { sessionId, session } = await piMono.createExpertSession(conv.domain_id, modelId);

    const abortController = new AbortController();
    activeStreams.set(conversationId, { abortController });

    try {
      const assistantMsg = addMessage(conversationId, "assistant", "", userMessage.id, modelId);

      sender.webContents.send(`chat:stream:${conversationId}`, {
        type: "start",
        content: "",
        userMessageId: userMessage.id,
        assistantMessageId: assistantMsg.id,
      } as StreamChunk);

      let fullContent = "";

      const unsubscribe = session.subscribe((event) => {
        if (abortController.signal.aborted) return;

        switch (event.type) {
          case "message_update": {
            const assistantEvent = event.assistantMessageEvent;
            if (assistantEvent && "textDelta" in assistantEvent) {
              const delta = (assistantEvent as { textDelta: string }).textDelta;
              if (delta) {
                fullContent += delta;
                sender.webContents.send(`chat:stream:${conversationId}`, {
                  type: "token",
                  content: delta,
                  messageId: assistantMsg.id,
                } as StreamChunk);
              }
            }
            break;
          }
          case "tool_execution_start":
            sender.webContents.send(`chat:stream:${conversationId}`, {
              type: "tool_call",
              content: event.toolName,
              messageId: assistantMsg.id,
            } as StreamChunk);
            break;
          case "tool_execution_end":
            sender.webContents.send(`chat:stream:${conversationId}`, {
              type: "tool_result",
              content: typeof event.result === "string" ? event.result : JSON.stringify(event.result),
              messageId: assistantMsg.id,
            } as StreamChunk);
            break;
        }
      });

      await session.prompt(content);

      unsubscribe();

      db.messages.update(assistantMsg.id, {
        content: fullContent,
      });

      sender.webContents.send(`chat:stream:${conversationId}`, {
        type: "done",
        content: "",
        messageId: assistantMsg.id,
      } as StreamChunk);

      piMono.destroySession(sessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      sender.webContents.send(`chat:stream:${conversationId}`, {
        type: "error",
        content: errorMessage,
      } as StreamChunk);
    } finally {
      activeStreams.delete(conversationId);
    }
  }

  function abortStream(conversationId: string): void {
    const stream = activeStreams.get(conversationId);
    if (stream) {
      stream.abortController.abort();
      activeStreams.delete(conversationId);
    }
  }

  function listActiveStreams(): string[] {
    return Array.from(activeStreams.keys());
  }

  return {
    createConversation,
    listConversations,
    getConversation,
    deleteConversation,
    getConversationTree,
    getConversationMessages,
    addMessage,
    branchFromMessage,
    sendMessageStream,
    abortStream,
    listActiveStreams,
  };
}

export type ConversationService = ReturnType<typeof createConversationService>;
