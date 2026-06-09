import type { KnowledgeSearchFilters, KnowledgeSearchResult } from "./knowledge";

export const SEARCH_CHANNELS = {
  SEARCH: "search:search",
  REINDEX_DOMAIN: "search:reindexDomain",
} as const;

export interface SearchRequest {
  query: string;
  domainId?: string;
  limit?: number;
  offset?: number;
  filters?: KnowledgeSearchFilters;
}
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
