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
