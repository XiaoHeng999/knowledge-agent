import { route, type ChannelRoute } from "./router";
import {
  VC_CHANNELS,
  SEARCH_CHANNELS,
  RESEARCH_CHANNELS,
  IMPORT_CHANNELS,
  TIMELINE_CHANNELS,
  SKILL_CHANNELS,
  MODEL_CHANNELS,
  INBOX_CHANNELS,
  FRAMEWORK_CHANNELS,
  DOMAIN_CHANNELS,
  SECURITY_CHANNELS,
  CHAT_CHANNELS,
  KNOWLEDGE_CHANNELS,
  SETTINGS_CHANNELS,
  UPDATE_CHANNELS,
  WORKER_CHANNELS,
} from "../../src/lib/ipc/channels";

// ---------------------------------------------------------------------------
// Version Control routes
// ---------------------------------------------------------------------------

export const vcRoutes = [
  route({ channel: VC_CHANNELS.INIT, service: "version-control", method: "initRepo" }),
  route({ channel: VC_CHANNELS.GET_STATUS, service: "version-control", method: "getStatus" }),
  route({
    channel: VC_CHANNELS.GET_HISTORY,
    service: "version-control",
    method: "getHistory",
    params(req) {
      return [req.filePath, req.limit];
    },
    wrap: "commits",
  }),
  route({
    channel: VC_CHANNELS.GET_DIFF,
    service: "version-control",
    method: "getDiff",
    params(req) {
      return [req.fromHash, req.toHash, req.filePath];
    },
  }),
  route({
    channel: VC_CHANNELS.ROLLBACK,
    service: "version-control",
    method: "rollbackFile",
    params(req) {
      return [req.filePath, req.targetHash];
    },
  }),
];

// ---------------------------------------------------------------------------
// Search routes
// ---------------------------------------------------------------------------

export const searchRoutes = [
  route({ channel: SEARCH_CHANNELS.SEARCH, service: "search-engine", method: "search" }),
  route({
    channel: SEARCH_CHANNELS.REINDEX_DOMAIN,
    service: "search-engine",
    method: "reindexDomain",
    params(req) {
      return [req.domainId];
    },
    wrap: "indexed",
  }),
];

// ---------------------------------------------------------------------------
// Research routes
// ---------------------------------------------------------------------------

export const researchRoutes = [
  route({
    channel: RESEARCH_CHANNELS.TRIGGER,
    service: "research-scheduler",
    method: "triggerResearch",
    params(req) {
      return [req.domainId, "manual"];
    },
  }),
  route({
    channel: RESEARCH_CHANNELS.GET_STATUS,
    service: "research-scheduler",
    method: "getResearchStatus",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: RESEARCH_CHANNELS.LIST_HISTORY,
    service: "research-scheduler",
    method: "listResearchHistory",
    params(req) {
      return [req.domainId];
    },
  }),
  route({ channel: RESEARCH_CHANNELS.GET_DASHBOARD, service: "research-scheduler", method: "getResearchDashboard" }),
  route({
    channel: RESEARCH_CHANNELS.CANCEL,
    service: "research-scheduler",
    method: "cancelResearch",
    params(req) {
      return [req.id];
    },
  }),
];

// ---------------------------------------------------------------------------
// Import routes
// ---------------------------------------------------------------------------

export const importRoutes = [
  route({ channel: IMPORT_CHANNELS.IMPORT_URL, service: "import-pipeline", method: "importUrl" }),
  route({ channel: IMPORT_CHANNELS.IMPORT_FILE, service: "import-pipeline", method: "importFile" }),
  route({
    channel: IMPORT_CHANNELS.GET_STATUS,
    service: "import-pipeline",
    method: "getImportStatus",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: IMPORT_CHANNELS.LIST,
    service: "import-pipeline",
    method: "listImports",
    params(req) {
      const page = req.page ?? 1;
      const pageSize = req.pageSize ?? 20;
      const offset = (page - 1) * pageSize;
      return [req.domainId, req.status, pageSize, offset];
    },
  }),
  route({
    channel: IMPORT_CHANNELS.RETRY,
    service: "import-pipeline",
    method: "retryImport",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: IMPORT_CHANNELS.CANCEL,
    service: "import-pipeline",
    method: "cancelImport",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: IMPORT_CHANNELS.POLL_RSS,
    service: "import-pipeline",
    method: "pollRssFeed",
    params(req) {
      return [req.feedUrl, req.domainId];
    },
  }),
];

// ---------------------------------------------------------------------------
// Timeline routes
// ---------------------------------------------------------------------------

export const timelineRoutes = [
  route({
    channel: TIMELINE_CHANNELS.LIST_PREDICTIONS,
    service: "timeline-engine",
    method: "listPredictions",
    params(req) {
      return [req.domainId, { status: req.status, limit: req.limit, offset: req.offset }];
    },
  }),
  route({
    channel: TIMELINE_CHANNELS.GET_PREDICTION,
    service: "timeline-engine",
    method: "getPrediction",
    params(req) {
      return [req.id];
    },
  }),
  route({ channel: TIMELINE_CHANNELS.CREATE_PREDICTION, service: "timeline-engine", method: "createPrediction" }),
  route({
    channel: TIMELINE_CHANNELS.UPDATE_PREDICTION,
    service: "timeline-engine",
    method: "updatePrediction",
    params(req) {
      return [req.id, req];
    },
  }),
  route({
    channel: TIMELINE_CHANNELS.VERIFY_PREDICTION,
    service: "timeline-engine",
    method: "verifyPrediction",
    params(req) {
      return [req.id, req.status, req.actualOutcome];
    },
  }),
  route({
    channel: TIMELINE_CHANNELS.DELETE_PREDICTION,
    service: "timeline-engine",
    method: "deletePrediction",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: TIMELINE_CHANNELS.ANALYZE_TRENDS,
    service: "timeline-engine",
    method: "analyzeTrends",
    params(req) {
      return [req.domainId, req.period, req.modelId];
    },
  }),
  route({
    channel: TIMELINE_CHANNELS.GENERATE_PREDICTIONS,
    service: "timeline-engine",
    method: "generatePredictions",
    params(req) {
      return [req.domainId, req.modelId];
    },
    wrap: "predictions",
  }),
  route({
    channel: TIMELINE_CHANNELS.GET_ACCURACY,
    service: "timeline-engine",
    method: "getPredictionAccuracy",
    params(req) {
      return [req.domainId];
    },
  }),
  route({
    channel: TIMELINE_CHANNELS.EXPIRE_OVERDUE,
    service: "timeline-engine",
    method: "expireOverduePredictions",
    wrap: "expired",
  }),
  route({
    channel: TIMELINE_CHANNELS.GET_EVENTS,
    service: "timeline-engine",
    method: "extractTimelineEvents",
    params(req) {
      return [req.domainId, { limit: req.limit, offset: req.offset }];
    },
  }),
];

// ---------------------------------------------------------------------------
// Skill routes
// ---------------------------------------------------------------------------

export const skillRoutes = [
  route({
    channel: SKILL_CHANNELS.LIST,
    service: "skill-engine",
    method: "listSkills",
    params(req) {
      return [req.domainId];
    },
    wrap: "items",
  }),
  route({
    channel: SKILL_CHANNELS.GET,
    service: "skill-engine",
    method: "getSkill",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: SKILL_CHANNELS.TOGGLE,
    service: "skill-engine",
    method: "toggleSkill",
    params(req) {
      return [req.id, req.enabled];
    },
  }),
  route({
    channel: SKILL_CHANNELS.EXECUTE,
    service: "skill-engine",
    method: "executeSkill",
    params(req) {
      return [req.skillId, req.domainId, req.input, req.modelId];
    },
  }),
  route({
    channel: SKILL_CHANNELS.CANCEL,
    service: "skill-engine",
    method: "cancelExecution",
    params(req) {
      return [req.id];
    },
    wrap: "cancelled",
  }),
  route({
    channel: SKILL_CHANNELS.METRICS,
    service: "skill-engine",
    method: "getSkillMetrics",
    params(req) {
      return [req.skillId];
    },
  }),
  route({
    channel: SKILL_CHANNELS.RATE,
    service: "skill-engine",
    method: "rateSkill",
    params(req) {
      return [req.skillId, req.rating];
    },
  }),
  route({
    channel: SKILL_CHANNELS.REGISTER_DOMAIN,
    service: "skill-engine",
    method: "registerDomainSkills",
    params(req) {
      return [req.domainId, req.domainSlug];
    },
    wrap: "registered",
  }),
];

// ---------------------------------------------------------------------------
// Model routes
// ---------------------------------------------------------------------------

export const modelRoutes = [
  route({
    channel: MODEL_CHANNELS.LIST_PROVIDERS,
    service: "model-manager",
    method: "listProviders",
    wrap: "providers",
  }),
  route({
    channel: MODEL_CHANNELS.LIST_MODELS,
    service: "model-manager",
    method: "listModels",
    params(req) {
      return [req.providerId];
    },
    wrap: "models",
  }),
  route({
    channel: MODEL_CHANNELS.ADD_API_KEY,
    service: "model-manager",
    method: "addApiKey",
    params(req) {
      return [req.providerId, req.apiKey];
    },
    transform: (result) => ({ success: true, providerId: (result as { providerId: string }).providerId }),
  }),
  route({
    channel: MODEL_CHANNELS.VALIDATE_API_KEY,
    service: "model-manager",
    method: "validateApiKey",
    params(req) {
      return [req.providerId, req.apiKey];
    },
  }),
  route({
    channel: MODEL_CHANNELS.REMOVE_API_KEY,
    service: "model-manager",
    method: "removeApiKey",
    params(req) {
      return [req.providerId];
    },
  }),
  route({
    channel: MODEL_CHANNELS.SET_DEFAULT,
    service: "model-manager",
    method: "setDefaultModel",
  }),
  route({
    channel: MODEL_CHANNELS.GET_DEFAULT,
    service: "model-manager",
    method: "getDefaultModel",
    transform: (result) => result ?? { providerId: "", modelId: "" },
  }),
];

// ---------------------------------------------------------------------------
// Inbox routes (passthrough only — suggestDomains stays explicit)
// ---------------------------------------------------------------------------

export const inboxRoutes = [
  route({ channel: INBOX_CHANNELS.ADD_ITEM, service: "inbox-processor", method: "addItem" }),
  route({ channel: INBOX_CHANNELS.LIST_ITEMS, service: "inbox-processor", method: "listItems" }),
  route({
    channel: INBOX_CHANNELS.PROCESS_ITEM,
    service: "inbox-processor",
    method: "processItem",
    params(req) {
      return [req.id, req.domainId];
    },
  }),
  route({
    channel: INBOX_CHANNELS.REJECT_ITEM,
    service: "inbox-processor",
    method: "rejectItem",
    params(req) {
      return [req.id];
    },
  }),
  route({ channel: INBOX_CHANNELS.GET_STATS, service: "inbox-processor", method: "getStats" }),
];

// ---------------------------------------------------------------------------
// Framework routes (all passthrough across 3 services)
// ---------------------------------------------------------------------------

export const frameworkRoutes = [
  route({
    channel: FRAMEWORK_CHANNELS.LIST_FRAMEWORKS,
    service: "framework-engine",
    method: "listFrameworks",
    params(req) {
      return [req.domainId];
    },
    wrap: "frameworks",
  }),
  route({
    channel: FRAMEWORK_CHANNELS.EXECUTE,
    service: "framework-engine",
    method: "executeFrameworkAnalysis",
    params(req) {
      return [req.domainId, req.frameworkType, req.modelId];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.LIST_RESULTS,
    service: "framework-engine",
    method: "listFrameworkResults",
    params(req) {
      return [req.domainId, req.frameworkType];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.GET_RESULT,
    service: "framework-engine",
    method: "getFrameworkResult",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.GENERATE_SUMMARY,
    service: "domain-summary-service",
    method: "generateDomainSummary",
    params(req) {
      return [req.domainId];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.GET_MEMORY_STATS,
    service: "domain-summary-service",
    method: "getMemoryLayerStats",
    params(req) {
      return [req.domainId];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.LIST_DECISIONS,
    service: "decision-service",
    method: "listDecisionRecords",
    params(req) {
      return [req.domainId];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.GET_DECISION,
    service: "decision-service",
    method: "getDecisionRecord",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.CREATE_DECISION,
    service: "decision-service",
    method: "generateDecisionRecord",
    params(req) {
      return [
        req.domainId,
        req.title,
        req.context,
        req.decisionText,
        req.rationale,
        req.expectedOutcome,
      ];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.UPDATE_DECISION,
    service: "decision-service",
    method: "updateDecisionStatus",
    params(req) {
      return [req.decisionId, req.status, req.supersededBy];
    },
  }),
  route({
    channel: FRAMEWORK_CHANNELS.RETRIEVE_RELATED,
    service: "decision-service",
    method: "retrieveRelevantDecisions",
    params(req) {
      return [req.domainId, req.queryText, req.limit];
    },
    wrap: "decisions",
  }),
];

// ---------------------------------------------------------------------------
// Domain routes (passthrough only — create/updateConfig stay explicit)
// ---------------------------------------------------------------------------

export const domainRoutes = [
  route({
    channel: DOMAIN_CHANNELS.LIST,
    service: "domain-manager",
    method: "listDomains",
    wrap: "domains",
  }),
  route({
    channel: DOMAIN_CHANNELS.GET,
    service: "domain-manager",
    method: "getDomain",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: DOMAIN_CHANNELS.UPDATE,
    service: "domain-manager",
    method: "updateDomain",
  }),
  route({
    channel: DOMAIN_CHANNELS.DELETE,
    service: "domain-manager",
    method: "deleteDomain",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: DOMAIN_CHANNELS.GET_CONFIG,
    service: "domain-manager",
    method: "getDomainConfig",
    params(req) {
      return [req.id];
    },
    wrap: "config",
  }),
];

// ---------------------------------------------------------------------------
// Security routes (passthrough only — assessWrite/getPendingAudits stay explicit)
// ---------------------------------------------------------------------------

export const securityRoutes = [
  route({
    channel: SECURITY_CHANNELS.RESOLVE_AUDIT,
    service: "security-gate",
    method: "resolveAudit",
    params(req) {
      return [req.auditId, req.action, req.editedContent];
    },
  }),
  route({
    channel: SECURITY_CHANNELS.BULK_RESOLVE,
    service: "security-gate",
    method: "bulkResolve",
    params(req) {
      return [req.auditIds, req.action];
    },
  }),
  route({
    channel: SECURITY_CHANNELS.GET_AUDIT_LOG,
    service: "security-gate",
    method: "getAuditLog",
    params(req) {
      return [req.limit, req.offset];
    },
  }),
  route({
    channel: SECURITY_CHANNELS.GENERATE_DIFF,
    service: "diff-service",
    method: "generateDiff",
    params(req) {
      return [req.oldContent, req.newContent];
    },
  }),
];

// ---------------------------------------------------------------------------
// Chat routes (passthrough only — sendMessage stays explicit)
// ---------------------------------------------------------------------------

export const chatRoutes = [
  route({
    channel: CHAT_CHANNELS.CREATE_CONVERSATION,
    service: "conversation-service",
    method: "createConversation",
    params(req) {
      return [req.domainId, req.modelId ?? null, req.title];
    },
  }),
  route({
    channel: CHAT_CHANNELS.LIST_CONVERSATIONS,
    service: "conversation-service",
    method: "listConversations",
    params(req) {
      return [req.domainId, { status: req.status, limit: req.limit, offset: req.offset }];
    },
  }),
  route({
    channel: CHAT_CHANNELS.GET_CONVERSATION,
    service: "conversation-service",
    method: "getConversation",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: CHAT_CHANNELS.DELETE_CONVERSATION,
    service: "conversation-service",
    method: "deleteConversation",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: CHAT_CHANNELS.GET_TREE,
    service: "conversation-service",
    method: "getConversationTree",
    params(req) {
      return [req.conversationId];
    },
  }),
  route({
    channel: CHAT_CHANNELS.ABORT_STREAM,
    service: "conversation-service",
    method: "abortStream",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: CHAT_CHANNELS.ADD_MESSAGE,
    service: "conversation-service",
    method: "addMessage",
    params(req) {
      return [req.conversationId, req.role, req.content, req.parentId ?? null, req.modelId];
    },
  }),
  route({
    channel: CHAT_CHANNELS.BRANCH_FROM_MESSAGE,
    service: "conversation-service",
    method: "branchFromMessage",
    params(req) {
      return [req.parentMessageId, req.content];
    },
  }),
];

// ---------------------------------------------------------------------------
// Knowledge read routes (write handlers stay explicit — security gate logic)
// ---------------------------------------------------------------------------

export const knowledgeReadRoutes = [
  route({
    channel: KNOWLEDGE_CHANNELS.GET_NODE,
    service: "knowledge-graph",
    method: "getNode",
    params(req) {
      return [req.id];
    },
  }),
  route({
    channel: KNOWLEDGE_CHANNELS.LIST_NODES,
    service: "knowledge-graph",
    method: "listNodes",
  }),
  route({
    channel: KNOWLEDGE_CHANNELS.GET_GRAPH,
    service: "knowledge-graph",
    method: "getGraph",
    params(req) {
      return [req.domainId];
    },
  }),
];

// ---------------------------------------------------------------------------
// Settings routes (inline → declarative)
// ---------------------------------------------------------------------------

export const settingsRoutes = [
  route({
    channel: SETTINGS_CHANNELS.GET,
    service: "db-settings",
    method: "get",
    params(req) {
      return [req.key];
    },
  }),
  route({
    channel: SETTINGS_CHANNELS.SET,
    service: "db-settings",
    method: "set",
    params(req) {
      return [req.key, req.value];
    },
  }),
  route({
    channel: SETTINGS_CHANNELS.GET_THEME,
    service: "db-settings",
    method: "get",
    params() {
      return ["theme"];
    },
    transform: (result) => result ?? "tokyo-night",
  }),
  route({
    channel: SETTINGS_CHANNELS.SET_THEME,
    service: "db-settings",
    method: "set",
    params(req) {
      return ["theme", req.value];
    },
  }),
];

// ---------------------------------------------------------------------------
// Update routes (inline → declarative)
// ---------------------------------------------------------------------------

export const updateRoutes = [
  route({
    channel: UPDATE_CHANNELS.CHECK,
    service: "auto-updater",
    method: "getUpdateStatus",
    transform: (result) => ({ available: (result as { available: boolean }).available, version: (result as { version: string }).version }),
  }),
  route({
    channel: UPDATE_CHANNELS.DOWNLOAD,
    service: "auto-updater",
    method: "downloadUpdate",
    transform: () => ({ started: true }),
  }),
  route({
    channel: UPDATE_CHANNELS.INSTALL,
    service: "auto-updater",
    method: "quitAndInstall",
    transform: () => ({ started: true }),
  }),
  route({
    channel: UPDATE_CHANNELS.GET_STATUS,
    service: "auto-updater",
    method: "getUpdateStatus",
  }),
];

// ---------------------------------------------------------------------------
// Worker routes (inline → declarative)
// ---------------------------------------------------------------------------

export const workerRoutes = [
  route({
    channel: WORKER_CHANNELS.SUBMIT_TASK,
    service: "worker-bridge",
    method: "submitTask",
    transform: (taskId) => ({ taskId, status: "submitted" as const, progress: 0 }),
  }),
  route({
    channel: WORKER_CHANNELS.CANCEL_TASK,
    service: "worker-bridge",
    method: "cancelTask",
    params(req) {
      return [req.taskId];
    },
  }),
  route({
    channel: WORKER_CHANNELS.GET_STATUS,
    service: "worker-bridge",
    method: "getStatus",
    transform: (result) => ({
      pendingCount: (result as { pendingCount: number }).pendingCount,
      isReady: true,
    }),
  }),
];

// ---------------------------------------------------------------------------
// All auto-routes — merged for registration
// ---------------------------------------------------------------------------

export function getAutoRoutes(): ChannelRoute[] {
  return [
    ...vcRoutes,
    ...searchRoutes,
    ...researchRoutes,
    ...importRoutes,
    ...timelineRoutes,
    ...skillRoutes,
    ...modelRoutes,
    ...inboxRoutes,
    ...frameworkRoutes,
    ...domainRoutes,
    ...securityRoutes,
    ...chatRoutes,
    ...knowledgeReadRoutes,
    ...settingsRoutes,
    ...updateRoutes,
    ...workerRoutes,
  ];
}
