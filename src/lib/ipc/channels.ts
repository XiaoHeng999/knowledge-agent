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
export interface KnowledgeSearchRequest {
  query: string;
  domainId?: string;
  limit?: number;
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
  [KNOWLEDGE_CHANNELS.CREATE_NODE]: { request: KnowledgeCreateNodeRequest; response: KnowledgeNode };
  [KNOWLEDGE_CHANNELS.UPDATE_NODE]: { request: KnowledgeUpdateNodeRequest; response: KnowledgeNode };
  [KNOWLEDGE_CHANNELS.DELETE_NODE]: { request: Pick<KnowledgeNode, "id">; response: void };
  [KNOWLEDGE_CHANNELS.GET_NODE]: { request: Pick<KnowledgeNode, "id">; response: KnowledgeNode };
  [KNOWLEDGE_CHANNELS.LIST_NODES]: { request: KnowledgeListRequest; response: KnowledgeListResponse };
  [KNOWLEDGE_CHANNELS.CREATE_EDGE]: { request: KnowledgeCreateEdgeRequest; response: KnowledgeEdge };
  [KNOWLEDGE_CHANNELS.DELETE_EDGE]: { request: KnowledgeDeleteEdgeRequest; response: void };
  [KNOWLEDGE_CHANNELS.GET_GRAPH]: { request: KnowledgeGraphRequest; response: KnowledgeGraphResponse };
  [KNOWLEDGE_CHANNELS.SEARCH]: { request: KnowledgeSearchRequest; response: KnowledgeSearchResponse };
  // Inbox
  [INBOX_CHANNELS.ADD_ITEM]: { request: InboxAddRequest; response: InboxItem };
  [INBOX_CHANNELS.LIST_ITEMS]: { request: InboxListRequest; response: InboxListResponse };
  [INBOX_CHANNELS.PROCESS_ITEM]: { request: InboxProcessRequest; response: InboxItem };
  [INBOX_CHANNELS.REJECT_ITEM]: { request: InboxRejectRequest; response: void };
  [INBOX_CHANNELS.GET_STATS]: { request: void; response: InboxStatsResponse };
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
