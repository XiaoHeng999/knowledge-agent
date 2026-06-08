/**
 * IPC Channel Registry — type-safe channel definitions grouped by domain.
 * Naming convention: `module:action` (e.g. `knowledge:import`).
 *
 * Each channel entry maps to { request, response } types so that both the
 * preload bridge and the main-process handler share a single source of truth.
 */

// ---------------------------------------------------------------------------
// Channel name constants
// ---------------------------------------------------------------------------

export const APP_CHANNELS = {
  PING: "app:ping",
  GET_VERSION: "app:getVersion",
  GET_PLATFORM: "app:getPlatform",
} as const;

export const DB_CHANNELS = {
  INITIALIZE: "db:initialize",
  MIGRATE: "db:migrate",
  GET_VERSION: "db:getVersion",
  BACKUP: "db:backup",
} as const;

export const MODEL_CHANNELS = {
  LIST_PROVIDERS: "model:listProviders",
  LIST_MODELS: "model:listModels",
  ADD_API_KEY: "model:addApiKey",
  VALIDATE_API_KEY: "model:validateApiKey",
  REMOVE_API_KEY: "model:removeApiKey",
  SET_DEFAULT: "model:setDefault",
  GET_DEFAULT: "model:getDefault",
} as const;

export const DOMAIN_CHANNELS = {
  CREATE: "domain:create",
  LIST: "domain:list",
  GET: "domain:get",
  UPDATE: "domain:update",
  DELETE: "domain:delete",
  GET_CONFIG: "domain:getConfig",
  UPDATE_CONFIG: "domain:updateConfig",
} as const;

export const KNOWLEDGE_CHANNELS = {
  CREATE_NODE: "knowledge:createNode",
  UPDATE_NODE: "knowledge:updateNode",
  DELETE_NODE: "knowledge:deleteNode",
  GET_NODE: "knowledge:getNode",
  LIST_NODES: "knowledge:listNodes",
  CREATE_EDGE: "knowledge:createEdge",
  DELETE_EDGE: "knowledge:deleteEdge",
  GET_GRAPH: "knowledge:getGraph",
  SEARCH: "knowledge:search",
} as const;

export const INBOX_CHANNELS = {
  ADD_ITEM: "inbox:addItem",
  LIST_ITEMS: "inbox:listItems",
  PROCESS_ITEM: "inbox:processItem",
  REJECT_ITEM: "inbox:rejectItem",
  GET_STATS: "inbox:getStats",
  SUGGEST_DOMAINS: "inbox:suggestDomains",
} as const;

export const RESEARCH_CHANNELS = {
  TRIGGER: "research:trigger",
  GET_STATUS: "research:getStatus",
  LIST_HISTORY: "research:listHistory",
  GET_DASHBOARD: "research:getDashboard",
  CANCEL: "research:cancel",
} as const;

export const SETTINGS_CHANNELS = {
  GET: "settings:get",
  SET: "settings:set",
  GET_THEME: "settings:getTheme",
  SET_THEME: "settings:setTheme",
} as const;

export const IMPORT_CHANNELS = {
  IMPORT_URL: "import:importUrl",
  IMPORT_FILE: "import:importFile",
  GET_STATUS: "import:getStatus",
  LIST: "import:list",
  RETRY: "import:retry",
  CANCEL: "import:cancel",
  POLL_RSS: "import:pollRss",
} as const;

export const FRAMEWORK_CHANNELS = {
  LIST_FRAMEWORKS: "framework:listFrameworks",
  EXECUTE: "framework:execute",
  LIST_RESULTS: "framework:listResults",
  GET_RESULT: "framework:getResult",
  GENERATE_SUMMARY: "framework:generateSummary",
  GET_MEMORY_STATS: "framework:getMemoryStats",
  LIST_DECISIONS: "framework:listDecisions",
  GET_DECISION: "framework:getDecision",
  CREATE_DECISION: "framework:createDecision",
  UPDATE_DECISION: "framework:updateDecision",
  RETRIEVE_RELATED: "framework:retrieveRelatedDecisions",
} as const;

export const WINDOW_CHANNELS = {
  MINIMIZE: "window:minimize",
  MAXIMIZE: "window:maximize",
  CLOSE: "window:close",
  IS_MAXIMIZED: "window:isMaximized",
  TOGGLE_MAXIMIZE: "window:toggleMaximize",
} as const;

export const VC_CHANNELS = {
  INIT: "vc:init",
  GET_STATUS: "vc:getStatus",
  GET_HISTORY: "vc:getHistory",
  GET_DIFF: "vc:getDiff",
  ROLLBACK: "vc:rollback",
} as const;

export const SEARCH_CHANNELS = {
  SEARCH: "search:search",
  REINDEX_DOMAIN: "search:reindexDomain",
} as const;

export const SECURITY_CHANNELS = {
  ASSESS_WRITE: "security:assessWrite",
  GET_PENDING: "security:getPendingAudits",
  RESOLVE_AUDIT: "security:resolveAudit",
  BULK_RESOLVE: "security:bulkResolve",
  GET_AUDIT_LOG: "security:getAuditLog",
  GENERATE_DIFF: "security:generateDiff",
} as const;

export const TIMELINE_CHANNELS = {
  LIST_PREDICTIONS: "timeline:listPredictions",
  GET_PREDICTION: "timeline:getPrediction",
  CREATE_PREDICTION: "timeline:createPrediction",
  UPDATE_PREDICTION: "timeline:updatePrediction",
  VERIFY_PREDICTION: "timeline:verifyPrediction",
  DELETE_PREDICTION: "timeline:deletePrediction",
  ANALYZE_TRENDS: "timeline:analyzeTrends",
  GENERATE_PREDICTIONS: "timeline:generatePredictions",
  GET_ACCURACY: "timeline:getAccuracy",
  EXPIRE_OVERDUE: "timeline:expireOverdue",
  GET_EVENTS: "timeline:getEvents",
} as const;

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

export const SKILL_CHANNELS = {
  LIST: "skill:list",
  GET: "skill:get",
  TOGGLE: "skill:toggle",
  EXECUTE: "skill:execute",
  CANCEL: "skill:cancel",
  METRICS: "skill:metrics",
  RATE: "skill:rate",
  REGISTER_DOMAIN: "skill:registerDomain",
} as const;

export const WORKER_CHANNELS = {
  SUBMIT_TASK: "worker:submitTask",
  CANCEL_TASK: "worker:cancelTask",
  GET_STATUS: "worker:getStatus",
} as const;

export const UPDATE_CHANNELS = {
  CHECK: "update:check",
  DOWNLOAD: "update:download",
  INSTALL: "update:install",
  GET_STATUS: "update:getStatus",
} as const;

// ---------------------------------------------------------------------------
// Domain data types (shared between request/response)
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
  status: "pending" | "processed" | "rejected";
  domainId: string | null;
  summary: string | null;
  createdAt: string;
}

export interface ResearchStatus {
  id: string;
  domainId: string;
  status: "running" | "completed" | "failed";
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
// Request / Response pairs per channel
// ---------------------------------------------------------------------------

// --- App ---
export interface AppPingResponse {
  message: string;
}
export interface AppVersionResponse {
  version: string;
}
export interface AppPlatformResponse {
  platform: string;
}

// --- Database ---
export interface DbInitializeRequest {
  dbPath?: string;
}
export interface DbInitializeResponse {
  success: boolean;
  version: number;
}
export interface DbMigrateResponse {
  success: boolean;
  fromVersion: number;
  toVersion: number;
}
export interface DbGetVersionResponse {
  version: number;
}
export interface DbBackupRequest {
  targetPath: string;
}
export interface DbBackupResponse {
  success: boolean;
  path: string;
}

// --- Models ---
export interface ModelListProvidersResponse {
  providers: ProviderInfo[];
}
export interface ModelListModelsRequest {
  providerId?: string;
}
export interface ModelListModelsResponse {
  models: ModelInfo[];
}
export interface ModelAddApiKeyRequest {
  providerId: string;
  apiKey: string;
}
export interface ModelAddApiKeyResponse {
  success: boolean;
  providerId: string;
}
export interface ModelValidateApiKeyRequest {
  providerId: string;
  apiKey: string;
}
export interface ModelValidateApiKeyResponse {
  valid: boolean;
  models: ModelInfo[];
}
export interface ModelRemoveApiKeyRequest {
  providerId: string;
}
export interface ModelSetDefaultRequest {
  providerId: string;
  modelId: string;
  scope: "global" | "domain";
  domainId?: string;
  role?: string;
}
export interface ModelGetDefaultRequest {
  scope: "global" | "domain";
  domainId?: string;
  role?: string;
}
export interface ModelGetDefaultResponse {
  providerId: string;
  modelId: string;
}

// --- Domains ---
export interface DomainCreateRequest {
  name: string;
  description: string;
  color: string;
  icon: string;
  template?: string;
}
export interface DomainUpdateRequest {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}
export interface DomainListResponse {
  domains: DomainInfo[];
}
export interface DomainGetConfigResponse {
  config: DomainConfig;
}
export interface DomainUpdateConfigRequest {
  id: string;
  config: Partial<DomainConfig>;
}

// --- Knowledge ---
export interface KnowledgeCreateNodeRequest {
  domainId: string;
  title: string;
  type: string;
  content: string;
  sources?: string[];
}
export interface KnowledgeUpdateNodeRequest {
  id: string;
  title?: string;
  content?: string;
  comprehensionLevel?: number;
}
export interface KnowledgeListRequest {
  domainId: string;
  type?: string;
  status?: string;
  comprehensionLevel?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}
export interface KnowledgeListResponse {
  nodes: KnowledgeNode[];
  total: number;
}
export interface KnowledgeCreateEdgeRequest {
  sourceId: string;
  targetId: string;
  type: string;
  weight?: number;
}
export interface KnowledgeDeleteEdgeRequest {
  id: string;
}
export interface KnowledgeGraphRequest {
  domainId: string;
}
export interface KnowledgeGraphResponse {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}
export interface KnowledgeSearchFilters {
  tags?: string[];
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}
export interface KnowledgeSearchRequest {
  query: string;
  domainId?: string;
  limit?: number;
  offset?: number;
  filters?: KnowledgeSearchFilters;
}
export interface KnowledgeSearchResult {
  node: KnowledgeNode;
  score: number;
  matchType: "vector" | "fulltext" | "hybrid";
}
export interface KnowledgeSearchResponse {
  results: KnowledgeSearchResult[];
}

// --- Inbox ---
export interface InboxAddRequest {
  title: string;
  content: string;
  source: string;
}
export interface InboxListRequest {
  status?: "pending" | "processed" | "rejected";
  page?: number;
  pageSize?: number;
}
export interface InboxListResponse {
  items: InboxItem[];
  total: number;
}
export interface InboxProcessRequest {
  id: string;
  domainId: string;
}
export interface InboxRejectRequest {
  id: string;
}
export interface InboxStatsResponse {
  pending: number;
  processed: number;
  rejected: number;
}

export interface DomainSuggestion {
  domainId: string;
  domainName: string;
  domainColor: string;
  confidence: number;
}

export interface InboxSuggestDomainsRequest {
  itemId: string;
}

export interface InboxSuggestDomainsResponse {
  suggestions: DomainSuggestion[];
}

// --- Research ---
export interface ResearchTriggerRequest {
  domainId: string;
  sourceType?: string;
}
export interface ResearchHistoryResponse {
  items: ResearchStatus[];
  total: number;
}
export interface ResearchDashboardResponse {
  todaySummary: string;
  recentResearch: ResearchStatus[];
  costTracking: {
    totalCost: number;
    modelDistribution: Record<string, number>;
  };
}

// --- Settings ---
export interface SettingsGetRequest {
  key: string;
}
export interface SettingsSetRequest {
  key: string;
  value: unknown;
}

// --- Import ---
export interface ImportUrlRequest {
  url: string;
  domainId?: string;
}
export interface ImportFileRequest {
  filePath: string;
  domainId?: string;
}
export interface ImportStatusResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
}
export interface ImportListRequest {
  domainId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}
export interface ImportListResponse {
  items: ImportStatusResponse[];
  total: number;
}
export interface ImportRetryRequest {
  id: string;
}
export interface ImportCancelRequest {
  id: string;
}
export interface ImportPollRssRequest {
  feedUrl: string;
  domainId: string;
}
export interface ImportPollRssResponse {
  newItems: number;
  errors: number;
}
// --- Window ---
export interface WindowSimpleResponse { success: boolean }
export interface WindowIsMaximizedResponse { maximized: boolean }

// --- Version Control ---
export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

export interface VcGetHistoryRequest {
  filePath: string;
  limit?: number;
}

export interface VcGetHistoryResponse {
  commits: CommitInfo[];
}

export interface VcGetDiffRequest {
  fromHash: string;
  toHash: string;
  filePath?: string;
}

export interface VcGetDiffResponse {
  diffs: FileDiff[];
  hasChanges: boolean;
}

export interface VcRollbackRequest {
  filePath: string;
  targetHash: string;
}

export interface VcRollbackResponse {
  success: boolean;
  newCommitHash: string;
}

export interface VcStatusResponse {
  initialized: boolean;
  branch: string;
  uncommittedChanges: number;
}

// --- Search ---
export type SearchRequest = KnowledgeSearchRequest;
export interface SearchResponse {
  results: KnowledgeSearchResult[];
  total: number;
}
export interface SearchReindexRequest {
  domainId: string;
}
export interface SearchReindexResponse {
  indexed: number;
}

// --- Knowledge write (pending-audit union) ---
export type KnowledgeWriteResponse<T> =
  | { result: T; pendingAudit: false }
  | { result: null; pendingAudit: true; auditId: string; risk: RiskAssessment };

export type KnowledgeWriteVoidResponse =
  | { pendingAudit: false }
  | { pendingAudit: true; auditId: string; risk: RiskAssessment };

// --- Security ---
export type RiskLevel = "low" | "medium" | "high" | "blocked";

export interface WriteOperation {
  type: "create" | "update" | "delete";
  targetPath: string;
  domainId: string;
  newContent?: string;
  bulkCount?: number;
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
  autoApprove: boolean;
  requireExplicit: boolean;
}

export interface SecurityAssessWriteRequest {
  operation: WriteOperation;
}

export interface SecurityAssessWriteResponse {
  risk: RiskAssessment;
}

export interface PendingAudit {
  id: string;
  operation: WriteOperation;
  risk: RiskAssessment;
  createdAt: string;
}

export interface SecurityGetPendingResponse {
  audits: PendingAudit[];
  count: number;
}

export interface SecurityResolveAuditRequest {
  auditId: string;
  action: "approve" | "reject" | "edit_and_approve";
  editedContent?: string;
}

export interface SecurityBulkResolveRequest {
  auditIds: string[];
  action: "approve_all" | "reject_all";
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  operation: WriteOperation;
  riskLevel: RiskLevel;
  decision: "auto_approved" | "user_approved" | "user_rejected" | "blocked";
  reviewer?: string;
  commitHash?: string;
}

export interface SecurityGetAuditLogRequest {
  limit?: number;
  offset?: number;
}

export interface SecurityGetAuditLogResponse {
  entries: AuditTrailEntry[];
  total: number;
}

export interface DiffGenerateRequest {
  oldContent: string | null;
  newContent: string | null;
}

export interface DiffLineResult {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunkResult {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLineResult[];
}

export interface DiffGenerateResponse {
  hunks: DiffHunkResult[];
  stats: { added: number; removed: number; unchanged: number };
}

// --- Chat ---
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

// --- Framework ---
export interface FrameworkInfo {
  type: string;
  name: string;
  description: string;
  minNodes: number;
}

export interface FrameworkAnalysisResult {
  id: string;
  domainId: string;
  frameworkType: string;
  title: string;
  analysisData: string;
  sourceNodeIds: string[];
  knowledgeNodeIds: string[];
  modelId: string | null;
  costUsd: number;
  createdAt: string;
}

export interface FrameworkExecuteRequest {
  domainId: string;
  frameworkType: string;
  modelId?: string;
}

export interface FrameworkListResultsRequest {
  domainId: string;
  frameworkType?: string;
}

export interface FrameworkListResultsResponse {
  items: FrameworkAnalysisResult[];
  total: number;
}

export interface DecisionRecordResult {
  id: string;
  domainId: string;
  title: string;
  decisionNumber: number;
  context: string;
  decisionText: string;
  rationale: string | null;
  expectedOutcome: string | null;
  status: string;
  createdAt: string;
}

export interface CreateDecisionRequest {
  domainId: string;
  title: string;
  context: string;
  decisionText: string;
  rationale?: string;
  expectedOutcome?: string;
}

export interface UpdateDecisionRequest {
  decisionId: string;
  status: string;
  supersededBy?: string;
}

export interface DomainSummaryResult {
  domainId: string;
  domainName: string;
  executiveSummary: string;
  keyFindings: string[];
  activePredictions: string[];
  decisionLog: string[];
  recommendedActions: string[];
  hotLayerCount: number;
  warmLayerCount: number;
  coldLayerCount: number;
  generatedAt: string;
}

export interface MemoryLayerStats {
  hot: number;
  warm: number;
  cold: number;
  total: number;
}

export interface RetrieveRelatedDecisionsRequest {
  domainId: string;
  queryText: string;
  limit?: number;
}

export interface RetrieveRelatedDecisionsResponse {
  decisions: DecisionRecordResult[];
}

// --- Timeline ---
export type PredictionStatus = "pending" | "confirmed" | "refuted" | "expired";

export interface TimelinePrediction {
  id: string;
  domainId: string;
  content: string;
  confidence: number;
  predictedDate: string | null;
  status: PredictionStatus;
  actualOutcome: string | null;
  sourceNodeIds: string[];
  reasoning: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrendAnalysisResult {
  domainId: string;
  period: "month" | "quarter" | "year";
  report: string;
  emergingTopics: string[];
  decliningTopics: string[];
  knowledgeVelocity: number;
  predictionSuggestions: Array<{
    content: string;
    confidence: number;
    predictedDate: string | null;
  }>;
  analyzedAt: string;
  costUsd: number;
}

export interface PredictionAccuracy {
  domainId: string;
  total: number;
  confirmed: number;
  missed: number;
  pending: number;
  confirmedRate: number;
  missedRate: number;
  avgConfirmedConfidence: number;
  avgMissedConfidence: number;
}

export interface TimelineEntry {
  id: string;
  domainId: string;
  type: "event" | "prediction" | "milestone";
  title: string;
  description: string;
  date: string;
  importance: "high" | "medium" | "low";
  sourceNodeId: string | null;
  metadata: Record<string, unknown>;
}

export interface TimelineListPredictionsRequest {
  domainId: string;
  status?: PredictionStatus;
  limit?: number;
  offset?: number;
}

export interface TimelineListPredictionsResponse {
  items: TimelinePrediction[];
  total: number;
}

export interface TimelineCreatePredictionRequest {
  domainId: string;
  content: string;
  confidence: number;
  predictedDate?: string;
  reasoning?: string;
  sourceNodeIds?: string[];
}

export interface TimelineUpdatePredictionRequest {
  id: string;
  content?: string;
  confidence?: number;
  predictedDate?: string;
  reasoning?: string;
}

export interface TimelineVerifyPredictionRequest {
  id: string;
  status: "confirmed" | "refuted" | "expired";
  actualOutcome?: string;
}

export interface TimelineAnalyzeTrendsRequest {
  domainId: string;
  period?: "month" | "quarter" | "year";
  modelId?: string;
}

export interface TimelineGeneratePredictionsRequest {
  domainId: string;
  modelId?: string;
}

export interface TimelineGeneratePredictionsResponse {
  predictions: TimelinePrediction[];
}

export interface TimelineGetEventsRequest {
  domainId: string;
  limit?: number;
  offset?: number;
}

export interface TimelineGetEventsResponse {
  items: TimelineEntry[];
  total: number;
}

export interface TimelineExpireOverdueResponse {
  expired: number;
}

// --- Skill System ---
export type SkillType = "builtin" | "custom" | "domain";

export interface SkillInputField {
  name: string;
  type: "text" | "url" | "file" | "select";
  label: string;
  required: boolean;
  options?: string[];
}

export interface SkillDefinition {
  name: string;
  description: string;
  triggerConditions: string[];
  inputSchema: SkillInputField[];
  outputFormat: string;
  promptTemplate: string;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string | null;
  skillType: SkillType;
  source: "builtin" | "domain";
  isEnabled: boolean;
  executionCount: number;
  successRate: number;
  domainId: string | null;
  filePath: string | null;
  definition: SkillDefinition | null;
}

export interface SkillExecution {
  id: string;
  skillId: string;
  domainId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  input: string;
  output: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  costUsd: number;
}

export interface SkillMetrics {
  skillId: string;
  invocationCount: number;
  successCount: number;
  successRate: number;
  avgExecutionTimeMs: number | null;
  avgCostUsd: number | null;
  avgUserRating: number | null;
}

export interface SkillListRequest {
  domainId?: string;
}

export interface SkillListResponse {
  items: SkillInfo[];
}

export interface SkillExecuteRequest {
  skillId: string;
  domainId: string;
  input: string;
  modelId?: string;
}

export interface SkillToggleRequest {
  id: string;
  enabled: boolean;
}

export interface SkillRateRequest {
  skillId: string;
  rating: number;
}

export interface SkillRegisterDomainRequest {
  domainId: string;
  domainSlug: string;
}

// --- Worker ---
export interface WorkerSubmitTaskRequest {
  type: string;
  priority?: "high" | "normal" | "low";
  payload: unknown;
  timeout?: number;
}

export interface WorkerTaskStatus {
  taskId: string;
  status: "submitted" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  message?: string;
}

export interface WorkerCancelTaskRequest {
  taskId: string;
}

export interface WorkerStatusResponse {
  pendingCount: number;
  isReady: boolean;
}

// --- Auto-Update ---
export interface UpdateStatusResponse {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  version: string | null;
  error: string | null;
}

export interface UpdateCheckResponse {
  available: boolean;
  version: string | null;
}

export interface UpdateDownloadResponse {
  started: boolean;
}

export interface UpdateInstallResponse {
  started: boolean;
}

// ---------------------------------------------------------------------------
// Channel → { request, response } type map
// ---------------------------------------------------------------------------

export interface IpcChannelMap {
  // App
  [APP_CHANNELS.PING]: { request: void; response: AppPingResponse };
  [APP_CHANNELS.GET_VERSION]: { request: void; response: AppVersionResponse };
  [APP_CHANNELS.GET_PLATFORM]: { request: void; response: AppPlatformResponse };
  // Database
  [DB_CHANNELS.INITIALIZE]: { request: DbInitializeRequest; response: DbInitializeResponse };
  [DB_CHANNELS.MIGRATE]: { request: void; response: DbMigrateResponse };
  [DB_CHANNELS.GET_VERSION]: { request: void; response: DbGetVersionResponse };
  [DB_CHANNELS.BACKUP]: { request: DbBackupRequest; response: DbBackupResponse };
  // Models
  [MODEL_CHANNELS.LIST_PROVIDERS]: { request: void; response: ModelListProvidersResponse };
  [MODEL_CHANNELS.LIST_MODELS]: { request: ModelListModelsRequest; response: ModelListModelsResponse };
  [MODEL_CHANNELS.ADD_API_KEY]: { request: ModelAddApiKeyRequest; response: ModelAddApiKeyResponse };
  [MODEL_CHANNELS.VALIDATE_API_KEY]: { request: ModelValidateApiKeyRequest; response: ModelValidateApiKeyResponse };
  [MODEL_CHANNELS.REMOVE_API_KEY]: { request: ModelRemoveApiKeyRequest; response: void };
  [MODEL_CHANNELS.SET_DEFAULT]: { request: ModelSetDefaultRequest; response: void };
  [MODEL_CHANNELS.GET_DEFAULT]: { request: ModelGetDefaultRequest; response: ModelGetDefaultResponse };
  // Domains
  [DOMAIN_CHANNELS.CREATE]: { request: DomainCreateRequest; response: DomainInfo };
  [DOMAIN_CHANNELS.LIST]: { request: void; response: DomainListResponse };
  [DOMAIN_CHANNELS.GET]: { request: Pick<DomainInfo, "id">; response: DomainInfo };
  [DOMAIN_CHANNELS.UPDATE]: { request: DomainUpdateRequest; response: DomainInfo };
  [DOMAIN_CHANNELS.DELETE]: { request: Pick<DomainInfo, "id">; response: void };
  [DOMAIN_CHANNELS.GET_CONFIG]: { request: Pick<DomainInfo, "id">; response: DomainGetConfigResponse };
  [DOMAIN_CHANNELS.UPDATE_CONFIG]: { request: DomainUpdateConfigRequest; response: DomainGetConfigResponse };
  // Knowledge
  [KNOWLEDGE_CHANNELS.CREATE_NODE]: { request: KnowledgeCreateNodeRequest; response: KnowledgeWriteResponse<KnowledgeNode> };
  [KNOWLEDGE_CHANNELS.UPDATE_NODE]: { request: KnowledgeUpdateNodeRequest; response: KnowledgeWriteResponse<KnowledgeNode> };
  [KNOWLEDGE_CHANNELS.DELETE_NODE]: { request: Pick<KnowledgeNode, "id">; response: KnowledgeWriteVoidResponse };
  [KNOWLEDGE_CHANNELS.GET_NODE]: { request: Pick<KnowledgeNode, "id">; response: KnowledgeNode };
  [KNOWLEDGE_CHANNELS.LIST_NODES]: { request: KnowledgeListRequest; response: KnowledgeListResponse };
  [KNOWLEDGE_CHANNELS.CREATE_EDGE]: { request: KnowledgeCreateEdgeRequest; response: KnowledgeWriteResponse<KnowledgeEdge> };
  [KNOWLEDGE_CHANNELS.DELETE_EDGE]: { request: KnowledgeDeleteEdgeRequest; response: KnowledgeWriteVoidResponse };
  [KNOWLEDGE_CHANNELS.GET_GRAPH]: { request: KnowledgeGraphRequest; response: KnowledgeGraphResponse };
  [KNOWLEDGE_CHANNELS.SEARCH]: { request: KnowledgeSearchRequest; response: KnowledgeSearchResponse };
  // Inbox
  [INBOX_CHANNELS.ADD_ITEM]: { request: InboxAddRequest; response: InboxItem };
  [INBOX_CHANNELS.LIST_ITEMS]: { request: InboxListRequest; response: InboxListResponse };
  [INBOX_CHANNELS.PROCESS_ITEM]: { request: InboxProcessRequest; response: InboxItem };
  [INBOX_CHANNELS.REJECT_ITEM]: { request: InboxRejectRequest; response: void };
  [INBOX_CHANNELS.GET_STATS]: { request: void; response: InboxStatsResponse };
  [INBOX_CHANNELS.SUGGEST_DOMAINS]: { request: InboxSuggestDomainsRequest; response: InboxSuggestDomainsResponse };
  // Research
  [RESEARCH_CHANNELS.TRIGGER]: { request: ResearchTriggerRequest; response: ResearchStatus };
  [RESEARCH_CHANNELS.GET_STATUS]: { request: Pick<ResearchStatus, "id">; response: ResearchStatus };
  [RESEARCH_CHANNELS.LIST_HISTORY]: { request: Pick<ResearchStatus, "domainId">; response: ResearchHistoryResponse };
  [RESEARCH_CHANNELS.GET_DASHBOARD]: { request: void; response: ResearchDashboardResponse };
  [RESEARCH_CHANNELS.CANCEL]: { request: Pick<ResearchStatus, "id">; response: void };
  // Settings
  [SETTINGS_CHANNELS.GET]: { request: SettingsGetRequest; response: unknown };
  [SETTINGS_CHANNELS.SET]: { request: SettingsSetRequest; response: void };
  [SETTINGS_CHANNELS.GET_THEME]: { request: void; response: string };
  [SETTINGS_CHANNELS.SET_THEME]: { request: Pick<SettingsSetRequest, "value">; response: void };
  // Import
  [IMPORT_CHANNELS.IMPORT_URL]: { request: ImportUrlRequest; response: ImportStatusResponse };
  [IMPORT_CHANNELS.IMPORT_FILE]: { request: ImportFileRequest; response: ImportStatusResponse };
  [IMPORT_CHANNELS.GET_STATUS]: { request: Pick<ImportStatusResponse, "id">; response: ImportStatusResponse };
  [IMPORT_CHANNELS.LIST]: { request: ImportListRequest; response: ImportListResponse };
  [IMPORT_CHANNELS.RETRY]: { request: ImportRetryRequest; response: ImportStatusResponse };
  [IMPORT_CHANNELS.CANCEL]: { request: ImportCancelRequest; response: void };
  [IMPORT_CHANNELS.POLL_RSS]: { request: ImportPollRssRequest; response: ImportPollRssResponse };
  // Window
  [WINDOW_CHANNELS.MINIMIZE]: { request: void; response: WindowSimpleResponse };
  [WINDOW_CHANNELS.MAXIMIZE]: { request: void; response: WindowSimpleResponse };
  [WINDOW_CHANNELS.CLOSE]: { request: void; response: WindowSimpleResponse };
  [WINDOW_CHANNELS.IS_MAXIMIZED]: { request: void; response: WindowIsMaximizedResponse };
  [WINDOW_CHANNELS.TOGGLE_MAXIMIZE]: { request: void; response: WindowSimpleResponse };
  // Version Control
  [VC_CHANNELS.INIT]: { request: void; response: VcStatusResponse };
  [VC_CHANNELS.GET_STATUS]: { request: void; response: VcStatusResponse };
  [VC_CHANNELS.GET_HISTORY]: { request: VcGetHistoryRequest; response: VcGetHistoryResponse };
  [VC_CHANNELS.GET_DIFF]: { request: VcGetDiffRequest; response: VcGetDiffResponse };
  [VC_CHANNELS.ROLLBACK]: { request: VcRollbackRequest; response: VcRollbackResponse };
  // Search
  [SEARCH_CHANNELS.SEARCH]: { request: SearchRequest; response: SearchResponse };
  [SEARCH_CHANNELS.REINDEX_DOMAIN]: { request: SearchReindexRequest; response: SearchReindexResponse };
  // Security
  [SECURITY_CHANNELS.ASSESS_WRITE]: { request: SecurityAssessWriteRequest; response: SecurityAssessWriteResponse };
  [SECURITY_CHANNELS.GET_PENDING]: { request: void; response: SecurityGetPendingResponse };
  [SECURITY_CHANNELS.RESOLVE_AUDIT]: { request: SecurityResolveAuditRequest; response: void };
  [SECURITY_CHANNELS.BULK_RESOLVE]: { request: SecurityBulkResolveRequest; response: void };
  [SECURITY_CHANNELS.GET_AUDIT_LOG]: { request: SecurityGetAuditLogRequest; response: SecurityGetAuditLogResponse };
  [SECURITY_CHANNELS.GENERATE_DIFF]: { request: DiffGenerateRequest; response: DiffGenerateResponse };
  // Chat
  [CHAT_CHANNELS.CREATE_CONVERSATION]: { request: ChatCreateConversationRequest; response: ConversationInfo };
  [CHAT_CHANNELS.LIST_CONVERSATIONS]: { request: ChatListConversationsRequest; response: ChatListConversationsResponse };
  [CHAT_CHANNELS.GET_CONVERSATION]: { request: Pick<ConversationInfo, "id">; response: ConversationInfo };
  [CHAT_CHANNELS.DELETE_CONVERSATION]: { request: Pick<ConversationInfo, "id">; response: void };
  [CHAT_CHANNELS.GET_TREE]: { request: ChatGetTreeRequest; response: ConversationTree };
  [CHAT_CHANNELS.SEND_MESSAGE]: { request: ChatSendMessageRequest; response: void };
  [CHAT_CHANNELS.ABORT_STREAM]: { request: Pick<ConversationInfo, "id">; response: void };
  [CHAT_CHANNELS.ADD_MESSAGE]: { request: ChatAddMessageRequest; response: MessageInfo };
  [CHAT_CHANNELS.BRANCH_FROM_MESSAGE]: { request: ChatBranchRequest; response: MessageInfo };
  // Framework
  [FRAMEWORK_CHANNELS.LIST_FRAMEWORKS]: { request: void; response: { frameworks: FrameworkInfo[] } };
  [FRAMEWORK_CHANNELS.EXECUTE]: { request: FrameworkExecuteRequest; response: FrameworkAnalysisResult };
  [FRAMEWORK_CHANNELS.LIST_RESULTS]: { request: FrameworkListResultsRequest; response: FrameworkListResultsResponse };
  [FRAMEWORK_CHANNELS.GET_RESULT]: { request: Pick<FrameworkAnalysisResult, "id">; response: FrameworkAnalysisResult };
  [FRAMEWORK_CHANNELS.GENERATE_SUMMARY]: { request: Pick<DomainSummaryResult, "domainId">; response: DomainSummaryResult };
  [FRAMEWORK_CHANNELS.GET_MEMORY_STATS]: { request: Pick<DomainSummaryResult, "domainId">; response: MemoryLayerStats };
  [FRAMEWORK_CHANNELS.LIST_DECISIONS]: { request: Pick<DecisionRecordResult, "domainId">; response: { items: DecisionRecordResult[]; total: number } };
  [FRAMEWORK_CHANNELS.GET_DECISION]: { request: Pick<DecisionRecordResult, "id">; response: DecisionRecordResult };
  [FRAMEWORK_CHANNELS.CREATE_DECISION]: { request: CreateDecisionRequest; response: DecisionRecordResult };
  [FRAMEWORK_CHANNELS.UPDATE_DECISION]: { request: UpdateDecisionRequest; response: DecisionRecordResult };
  [FRAMEWORK_CHANNELS.RETRIEVE_RELATED]: { request: RetrieveRelatedDecisionsRequest; response: RetrieveRelatedDecisionsResponse };
  // Timeline
  [TIMELINE_CHANNELS.LIST_PREDICTIONS]: { request: TimelineListPredictionsRequest; response: TimelineListPredictionsResponse };
  [TIMELINE_CHANNELS.GET_PREDICTION]: { request: Pick<TimelinePrediction, "id">; response: TimelinePrediction };
  [TIMELINE_CHANNELS.CREATE_PREDICTION]: { request: TimelineCreatePredictionRequest; response: TimelinePrediction };
  [TIMELINE_CHANNELS.UPDATE_PREDICTION]: { request: TimelineUpdatePredictionRequest; response: TimelinePrediction };
  [TIMELINE_CHANNELS.VERIFY_PREDICTION]: { request: TimelineVerifyPredictionRequest; response: TimelinePrediction };
  [TIMELINE_CHANNELS.DELETE_PREDICTION]: { request: Pick<TimelinePrediction, "id">; response: void };
  [TIMELINE_CHANNELS.ANALYZE_TRENDS]: { request: TimelineAnalyzeTrendsRequest; response: TrendAnalysisResult };
  [TIMELINE_CHANNELS.GENERATE_PREDICTIONS]: { request: TimelineGeneratePredictionsRequest; response: TimelineGeneratePredictionsResponse };
  [TIMELINE_CHANNELS.GET_ACCURACY]: { request: Pick<TrendAnalysisResult, "domainId">; response: PredictionAccuracy };
  [TIMELINE_CHANNELS.EXPIRE_OVERDUE]: { request: void; response: TimelineExpireOverdueResponse };
  [TIMELINE_CHANNELS.GET_EVENTS]: { request: TimelineGetEventsRequest; response: TimelineGetEventsResponse };
  // Skill
  [SKILL_CHANNELS.LIST]: { request: SkillListRequest; response: SkillListResponse };
  [SKILL_CHANNELS.GET]: { request: Pick<SkillInfo, "id">; response: SkillInfo };
  [SKILL_CHANNELS.TOGGLE]: { request: SkillToggleRequest; response: void };
  [SKILL_CHANNELS.EXECUTE]: { request: SkillExecuteRequest; response: SkillExecution };
  [SKILL_CHANNELS.CANCEL]: { request: Pick<SkillExecution, "id">; response: { cancelled: boolean } };
  [SKILL_CHANNELS.METRICS]: { request: Pick<SkillMetrics, "skillId">; response: SkillMetrics };
  [SKILL_CHANNELS.RATE]: { request: SkillRateRequest; response: void };
  [SKILL_CHANNELS.REGISTER_DOMAIN]: { request: SkillRegisterDomainRequest; response: { registered: number } };
  // Worker
  [WORKER_CHANNELS.SUBMIT_TASK]: { request: WorkerSubmitTaskRequest; response: WorkerTaskStatus };
  [WORKER_CHANNELS.CANCEL_TASK]: { request: WorkerCancelTaskRequest; response: void };
  [WORKER_CHANNELS.GET_STATUS]: { request: void; response: WorkerStatusResponse };
  // Update
  [UPDATE_CHANNELS.CHECK]: { request: void; response: UpdateCheckResponse };
  [UPDATE_CHANNELS.DOWNLOAD]: { request: void; response: UpdateDownloadResponse };
  [UPDATE_CHANNELS.INSTALL]: { request: void; response: UpdateInstallResponse };
  [UPDATE_CHANNELS.GET_STATUS]: { request: void; response: UpdateStatusResponse };
}

// ---------------------------------------------------------------------------
// Utility types derived from the channel map
// ---------------------------------------------------------------------------

/** All channel name literals */
export type ChannelName = keyof IpcChannelMap;

/** Extract the request type for a given channel */
export type ChannelRequest<C extends ChannelName> = IpcChannelMap[C]["request"];

/** Extract the response type for a given channel */
export type ChannelResponse<C extends ChannelName> = IpcChannelMap[C]["response"];
