// ---------------------------------------------------------------------------
// Shared domain data types used across multiple channel domains
// ---------------------------------------------------------------------------

export interface ProviderInfo {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  costPerMillion: number;
  available: boolean;
  contextWindow: number;
}

export interface DomainInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  knowledgeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DomainConfig {
  models: Record<string, string>;
  sources: string[];
  frameworks: string[];
  skills: string[];
  tags: string[];
}

export interface KnowledgeNode {
  id: string;
  domainId: string;
  title: string;
  type: string;
  content: string;
  comprehensionLevel: number;
  sources: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
}

export interface InboxItem {
  id: string;
  title: string;
  content: string;
  source: string;
  status: "pending" | "processing" | "accepted" | "rejected";
  domainId: string | null;
  summary: string | null;
  createdAt: string;
}

export interface ResearchStatus {
  id: string;
  domainId: string;
  status: "running" | "completed" | "failed" | "cancelled" | "over_budget";
  progress: number;
  startedAt: string;
  completedAt: string | null;
}

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
  role: "user" | "assistant" | "system";
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
