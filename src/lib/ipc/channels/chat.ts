import type { ConversationInfo, MessageInfo, ConversationTree } from "./shared";

export const CHAT_CHANNELS = {
  CREATE_CONVERSATION: "chat:createConversation",
  LIST_CONVERSATIONS: "chat:listConversations",
  GET_CONVERSATION: "chat:getConversation",
  DELETE_CONVERSATION: "chat:deleteConversation",
  GET_TREE: "chat:getTree",
  SEND_MESSAGE: "chat:sendMessage",
  ABORT_STREAM: "chat:abortStream",
  ADD_MESSAGE: "chat:addMessage",
  BRANCH_FROM_MESSAGE: "chat:branchFromMessage",
} as const;

export interface ChatCreateConversationRequest {
  domainId: string;
  modelId?: string;
  title?: string;
}
export interface ChatListConversationsRequest {
  domainId: string;
  status?: string;
  limit?: number;
  offset?: number;
}
export interface ChatListConversationsResponse {
  conversations: ConversationInfo[];
  total: number;
}
export interface ChatGetTreeRequest {
  conversationId: string;
}
export interface ChatSendMessageRequest {
  conversationId: string;
  content: string;
  modelId: string;
}
export interface ChatBranchRequest {
  parentMessageId: string;
  content: string;
}
export interface ChatAddMessageRequest {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  parentId?: string;
  modelId?: string;
}
