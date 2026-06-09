/**
 * IPC Channel Registry — type-safe channel definitions grouped by domain.
 * Naming convention: `module:action` (e.g. `knowledge:import`).
 *
 * Each channel entry maps to { request, response } types so that both the
 * preload bridge and the main-process handler share a single source of truth.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type {
  ProviderInfo,
  ModelInfo,
  DomainInfo,
  DomainConfig,
  KnowledgeNode,
  KnowledgeEdge,
  InboxItem,
  ResearchStatus,
  ConversationInfo,
  MessageInfo,
  ConversationTree,
  StreamChunk,
} from "./shared";

// ---------------------------------------------------------------------------
// Domain channel constants + request/response types
// ---------------------------------------------------------------------------

export { APP_CHANNELS } from "./app";
export type { AppPingResponse, AppVersionResponse, AppPlatformResponse } from "./app";

export { DB_CHANNELS } from "./db";
export type {
  DbInitializeRequest,
  DbInitializeResponse,
  DbMigrateResponse,
  DbGetVersionResponse,
  DbBackupRequest,
  DbBackupResponse,
} from "./db";

export { MODEL_CHANNELS } from "./model";
export type {
  ModelListProvidersResponse,
  ModelListModelsRequest,
  ModelListModelsResponse,
  ModelAddApiKeyRequest,
  ModelAddApiKeyResponse,
  ModelValidateApiKeyRequest,
  ModelValidateApiKeyResponse,
  ModelRemoveApiKeyRequest,
  ModelSetDefaultRequest,
  ModelGetDefaultRequest,
  ModelGetDefaultResponse,
} from "./model";

export { DOMAIN_CHANNELS } from "./domain";
export type {
  DomainCreateRequest,
  DomainUpdateRequest,
  DomainListResponse,
  DomainGetConfigResponse,
  DomainUpdateConfigRequest,
} from "./domain";

export { KNOWLEDGE_CHANNELS } from "./knowledge";
export type {
  KnowledgeCreateNodeRequest,
  KnowledgeUpdateNodeRequest,
  KnowledgeListRequest,
  KnowledgeListResponse,
  KnowledgeCreateEdgeRequest,
  KnowledgeDeleteEdgeRequest,
  KnowledgeGraphRequest,
  KnowledgeGraphResponse,
  KnowledgeSearchFilters,
  KnowledgeSearchResult,
  KnowledgeWriteResponse,
  KnowledgeWriteVoidResponse,
} from "./knowledge";

export { INBOX_CHANNELS } from "./inbox";
export type {
  InboxAddRequest,
  InboxListRequest,
  InboxListResponse,
  InboxProcessRequest,
  InboxRejectRequest,
  InboxStatsResponse,
  DomainSuggestion,
  InboxSuggestDomainsRequest,
  InboxSuggestDomainsResponse,
} from "./inbox";

export { RESEARCH_CHANNELS } from "./research";
export type {
  ResearchTriggerRequest,
  ResearchHistoryResponse,
  ResearchDashboardResponse,
} from "./research";

export { SETTINGS_CHANNELS } from "./settings";
export type { SettingsGetRequest, SettingsSetRequest } from "./settings";

export { IMPORT_CHANNELS } from "./import";
export type {
  ImportUrlRequest,
  ImportFileRequest,
  ImportStatusResponse,
  ImportListRequest,
  ImportListResponse,
  ImportRetryRequest,
  ImportCancelRequest,
  ImportPollRssRequest,
  ImportPollRssResponse,
} from "./import";

export { FRAMEWORK_CHANNELS } from "./framework";
export type {
  FrameworkInfo,
  FrameworkAnalysisResult,
  FrameworkExecuteRequest,
  FrameworkListResultsRequest,
  FrameworkListResultsResponse,
  DecisionRecordResult,
  CreateDecisionRequest,
  UpdateDecisionRequest,
  DomainSummaryResult,
  MemoryLayerStats,
  RetrieveRelatedDecisionsRequest,
  RetrieveRelatedDecisionsResponse,
} from "./framework";

export { WINDOW_CHANNELS } from "./window";
export type { WindowSimpleResponse, WindowIsMaximizedResponse } from "./window";

export { VC_CHANNELS } from "./vc";
export type {
  CommitInfo,
  DiffLine,
  DiffHunk,
  FileDiff,
  VcGetHistoryRequest,
  VcGetHistoryResponse,
  VcGetDiffRequest,
  VcGetDiffResponse,
  VcRollbackRequest,
  VcRollbackResponse,
  VcStatusResponse,
} from "./vc";

export { SEARCH_CHANNELS } from "./search";
export type {
  SearchRequest,
  SearchResponse,
  SearchReindexRequest,
  SearchReindexResponse,
} from "./search";

export { SECURITY_CHANNELS } from "./security";
export type {
  RiskLevel,
  WriteOperation,
  RiskAssessment,
  SecurityAssessWriteRequest,
  SecurityAssessWriteResponse,
  PendingAudit,
  SecurityGetPendingResponse,
  SecurityResolveAuditRequest,
  SecurityBulkResolveRequest,
  AuditTrailEntry,
  SecurityGetAuditLogRequest,
  SecurityGetAuditLogResponse,
  DiffGenerateRequest,
  DiffLineResult,
  DiffHunkResult,
  DiffGenerateResponse,
} from "./security";

export { TIMELINE_CHANNELS } from "./timeline";
export type {
  PredictionStatus,
  TimelinePrediction,
  TrendAnalysisResult,
  PredictionAccuracy,
  TimelineEntry,
  TimelineListPredictionsRequest,
  TimelineListPredictionsResponse,
  TimelineCreatePredictionRequest,
  TimelineUpdatePredictionRequest,
  TimelineVerifyPredictionRequest,
  TimelineAnalyzeTrendsRequest,
  TimelineGeneratePredictionsRequest,
  TimelineGeneratePredictionsResponse,
  TimelineGetEventsRequest,
  TimelineGetEventsResponse,
  TimelineExpireOverdueResponse,
} from "./timeline";

export { CHAT_CHANNELS } from "./chat";
export type {
  ChatCreateConversationRequest,
  ChatListConversationsRequest,
  ChatListConversationsResponse,
  ChatGetTreeRequest,
  ChatSendMessageRequest,
  ChatBranchRequest,
  ChatAddMessageRequest,
} from "./chat";

export { SKILL_CHANNELS } from "./skill";
export type {
  SkillType,
  SkillInputField,
  SkillDefinition,
  SkillInfo,
  SkillExecution,
  SkillMetrics,
  SkillListRequest,
  SkillListResponse,
  SkillExecuteRequest,
  SkillToggleRequest,
  SkillRateRequest,
  SkillRegisterDomainRequest,
} from "./skill";

export { WORKER_CHANNELS } from "./worker";
export type {
  WorkerSubmitTaskRequest,
  WorkerTaskStatus,
  WorkerCancelTaskRequest,
  WorkerStatusResponse,
} from "./worker";

export { UPDATE_CHANNELS } from "./update";
export type {
  UpdateStatusResponse,
  UpdateCheckResponse,
  UpdateDownloadResponse,
  UpdateInstallResponse,
} from "./update";

// ---------------------------------------------------------------------------
// Channel → { request, response } type map
// ---------------------------------------------------------------------------

import { APP_CHANNELS } from "./app";
import { DB_CHANNELS } from "./db";
import { MODEL_CHANNELS } from "./model";
import { DOMAIN_CHANNELS } from "./domain";
import { KNOWLEDGE_CHANNELS } from "./knowledge";
import { INBOX_CHANNELS } from "./inbox";
import { RESEARCH_CHANNELS } from "./research";
import { SETTINGS_CHANNELS } from "./settings";
import { IMPORT_CHANNELS } from "./import";
import { FRAMEWORK_CHANNELS } from "./framework";
import { WINDOW_CHANNELS } from "./window";
import { VC_CHANNELS } from "./vc";
import { SEARCH_CHANNELS } from "./search";
import { SECURITY_CHANNELS } from "./security";
import { TIMELINE_CHANNELS } from "./timeline";
import { CHAT_CHANNELS } from "./chat";
import { SKILL_CHANNELS } from "./skill";
import { WORKER_CHANNELS } from "./worker";
import { UPDATE_CHANNELS } from "./update";

import type { AppPingResponse, AppVersionResponse, AppPlatformResponse } from "./app";
import type { DbInitializeRequest, DbInitializeResponse, DbMigrateResponse, DbGetVersionResponse, DbBackupRequest, DbBackupResponse } from "./db";
import type { ModelListProvidersResponse, ModelListModelsRequest, ModelListModelsResponse, ModelAddApiKeyRequest, ModelAddApiKeyResponse, ModelValidateApiKeyRequest, ModelValidateApiKeyResponse, ModelRemoveApiKeyRequest, ModelSetDefaultRequest, ModelGetDefaultRequest, ModelGetDefaultResponse } from "./model";
import type { DomainCreateRequest, DomainUpdateRequest, DomainListResponse, DomainGetConfigResponse, DomainUpdateConfigRequest } from "./domain";
import type { KnowledgeCreateNodeRequest, KnowledgeUpdateNodeRequest, KnowledgeListRequest, KnowledgeListResponse, KnowledgeCreateEdgeRequest, KnowledgeDeleteEdgeRequest, KnowledgeGraphRequest, KnowledgeGraphResponse, KnowledgeWriteResponse, KnowledgeWriteVoidResponse } from "./knowledge";
import type { KnowledgeNode, KnowledgeEdge, DomainInfo, ConversationInfo, MessageInfo, ConversationTree, InboxItem, ResearchStatus } from "./shared";
import type { InboxAddRequest, InboxListRequest, InboxListResponse, InboxProcessRequest, InboxRejectRequest, InboxStatsResponse, InboxSuggestDomainsRequest, InboxSuggestDomainsResponse } from "./inbox";
import type { ResearchTriggerRequest, ResearchHistoryResponse, ResearchDashboardResponse } from "./research";
import type { SettingsGetRequest, SettingsSetRequest } from "./settings";
import type { ImportUrlRequest, ImportFileRequest, ImportStatusResponse, ImportListRequest, ImportListResponse, ImportRetryRequest, ImportCancelRequest, ImportPollRssRequest, ImportPollRssResponse } from "./import";
import type { FrameworkInfo, FrameworkExecuteRequest, FrameworkListResultsRequest, FrameworkListResultsResponse, FrameworkAnalysisResult, DomainSummaryResult, MemoryLayerStats, DecisionRecordResult, CreateDecisionRequest, UpdateDecisionRequest, RetrieveRelatedDecisionsRequest, RetrieveRelatedDecisionsResponse } from "./framework";
import type { WindowSimpleResponse, WindowIsMaximizedResponse } from "./window";
import type { VcGetHistoryRequest, VcGetHistoryResponse, VcGetDiffRequest, VcGetDiffResponse, VcRollbackRequest, VcRollbackResponse, VcStatusResponse } from "./vc";
import type { SearchRequest, SearchResponse, SearchReindexRequest, SearchReindexResponse } from "./search";
import type { SecurityAssessWriteRequest, SecurityAssessWriteResponse, SecurityGetPendingResponse, SecurityResolveAuditRequest, SecurityBulkResolveRequest, SecurityGetAuditLogRequest, SecurityGetAuditLogResponse, DiffGenerateRequest, DiffGenerateResponse } from "./security";
import type { TimelineListPredictionsRequest, TimelineListPredictionsResponse, TimelineCreatePredictionRequest, TimelineUpdatePredictionRequest, TimelineVerifyPredictionRequest, TimelineAnalyzeTrendsRequest, TimelineGeneratePredictionsRequest, TimelineGeneratePredictionsResponse, TimelineGetEventsRequest, TimelineGetEventsResponse, TimelineExpireOverdueResponse, TimelinePrediction, TrendAnalysisResult, PredictionAccuracy, TimelineEntry } from "./timeline";
import type { ChatCreateConversationRequest, ChatListConversationsRequest, ChatListConversationsResponse, ChatGetTreeRequest, ChatSendMessageRequest, ChatBranchRequest, ChatAddMessageRequest } from "./chat";
import type { SkillListRequest, SkillListResponse, SkillInfo, SkillExecuteRequest, SkillExecution, SkillToggleRequest, SkillMetrics, SkillRateRequest, SkillRegisterDomainRequest } from "./skill";
import type { WorkerSubmitTaskRequest, WorkerTaskStatus, WorkerCancelTaskRequest, WorkerStatusResponse } from "./worker";
import type { UpdateCheckResponse, UpdateDownloadResponse, UpdateInstallResponse, UpdateStatusResponse } from "./update";

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
  [FRAMEWORK_CHANNELS.LIST_FRAMEWORKS]: { request: { domainId?: string }; response: { frameworks: FrameworkInfo[] } };
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
