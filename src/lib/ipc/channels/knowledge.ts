import type { KnowledgeNode, KnowledgeEdge } from "./shared";
import type { RiskAssessment } from "./security";

export const KNOWLEDGE_CHANNELS = {
  CREATE_NODE: "knowledge:createNode",
  UPDATE_NODE: "knowledge:updateNode",
  DELETE_NODE: "knowledge:deleteNode",
  GET_NODE: "knowledge:getNode",
  LIST_NODES: "knowledge:listNodes",
  CREATE_EDGE: "knowledge:createEdge",
  DELETE_EDGE: "knowledge:deleteEdge",
  GET_GRAPH: "knowledge:getGraph",
} as const;

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
export interface KnowledgeSearchResult {
  node: KnowledgeNode;
  score: number;
  matchType: "vector" | "fulltext" | "hybrid";
}

export type KnowledgeWriteResponse<T> =
  | { result: T; pendingAudit: false }
  | { result: null; pendingAudit: true; auditId: string; risk: RiskAssessment };

export type KnowledgeWriteVoidResponse =
  | { pendingAudit: false }
  | { pendingAudit: true; auditId: string; risk: RiskAssessment };
