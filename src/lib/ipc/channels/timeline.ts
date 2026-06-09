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
