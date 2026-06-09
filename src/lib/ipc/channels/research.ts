import type { ResearchStatus } from "./shared";

export const RESEARCH_CHANNELS = {
  TRIGGER: "research:trigger",
  GET_STATUS: "research:getStatus",
  LIST_HISTORY: "research:listHistory",
  GET_DASHBOARD: "research:getDashboard",
  CANCEL: "research:cancel",
} as const;

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
