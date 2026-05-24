import { CHAT_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  getConversationTree,
  sendMessageStream,
  abortStream,
  addMessage,
  branchFromMessage,
} from "../../services/conversation-service";

export function registerChatHandlers(): void {
  registerHandler(CHAT_CHANNELS.CREATE_CONVERSATION, async (_event, req) => {
    return createConversation(req.domainId, req.modelId ?? null, req.title);
  });

  registerHandler(CHAT_CHANNELS.LIST_CONVERSATIONS, async (_event, req) => {
    return listConversations(req.domainId, {
      status: req.status,
      limit: req.limit,
      offset: req.offset,
    });
  });

  registerHandler(CHAT_CHANNELS.GET_CONVERSATION, async (_event, req) => {
    return getConversation(req.id);
  });

  registerHandler(CHAT_CHANNELS.DELETE_CONVERSATION, async (_event, req) => {
    deleteConversation(req.id);
  });

  registerHandler(CHAT_CHANNELS.GET_TREE, async (_event, req) => {
    return getConversationTree(req.conversationId);
  });

  registerHandler(CHAT_CHANNELS.SEND_MESSAGE, async (event, req) => {
    const { BrowserWindow } = await import("electron");
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (!sender) throw new Error("No browser window found");
    // Fire-and-forget streaming — handler returns immediately
    sendMessageStream(sender, req.conversationId, req.content, req.modelId).catch((err) => {
      console.error("[Chat] Stream error:", err);
    });
  });

  registerHandler(CHAT_CHANNELS.ABORT_STREAM, async (_event, req) => {
    abortStream(req.id);
  });

  registerHandler(CHAT_CHANNELS.ADD_MESSAGE, async (_event, req) => {
    return addMessage(req.conversationId, req.role, req.content, req.parentId ?? null, req.modelId);
  });

  registerHandler(CHAT_CHANNELS.BRANCH_FROM_MESSAGE, async (_event, req) => {
    return branchFromMessage(req.parentMessageId, req.content);
  });
}
