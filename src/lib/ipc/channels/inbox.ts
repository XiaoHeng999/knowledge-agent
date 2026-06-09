import type { InboxItem } from "./shared";

export const INBOX_CHANNELS = {
  ADD_ITEM: "inbox:addItem",
  LIST_ITEMS: "inbox:listItems",
  PROCESS_ITEM: "inbox:processItem",
  REJECT_ITEM: "inbox:rejectItem",
  GET_STATS: "inbox:getStats",
  SUGGEST_DOMAINS: "inbox:suggestDomains",
} as const;

export interface InboxAddRequest {
  title: string;
  content: string;
  source: string;
}
export interface InboxListRequest {
  status?: "pending" | "processing" | "accepted" | "rejected";
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
  processing: number;
  accepted: number;
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
