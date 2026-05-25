'use client';

import { create } from "zustand";
import type {
  TimelinePrediction,
  TrendAnalysisResult,
  PredictionAccuracy,
  TimelineEntry,
  PredictionStatus,
} from "@/lib/ipc/channels";

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

interface TimelineState {
  loading: boolean;
  error: string | null;

  predictions: TimelinePrediction[];
  predictionsTotal: number;
  events: TimelineEntry[];
  eventsTotal: number;
  trendAnalysis: TrendAnalysisResult | null;
  accuracy: PredictionAccuracy | null;

  fetchPredictions: (domainId: string, status?: PredictionStatus) => Promise<void>;
  createPrediction: (params: {
    domainId: string;
    content: string;
    confidence: number;
    predictedDate?: string;
    reasoning?: string;
    sourceNodeIds?: string[];
  }) => Promise<TimelinePrediction | null>;
  updatePrediction: (id: string, data: {
    content?: string;
    confidence?: number;
    predictedDate?: string;
    reasoning?: string;
  }) => Promise<void>;
  verifyPrediction: (id: string, status: "confirmed" | "refuted" | "expired", actualOutcome?: string) => Promise<void>;
  deletePrediction: (id: string) => Promise<void>;
  analyzeTrends: (domainId: string, period?: "month" | "quarter" | "year", modelId?: string) => Promise<TrendAnalysisResult | null>;
  generatePredictions: (domainId: string, modelId?: string) => Promise<void>;
  fetchAccuracy: (domainId: string) => Promise<void>;
  fetchEvents: (domainId: string) => Promise<void>;
  expireOverdue: () => Promise<void>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTimelineStore = create<TimelineState>((set) => ({
  loading: false,
  error: null,

  predictions: [],
  predictionsTotal: 0,
  events: [],
  eventsTotal: 0,
  trendAnalysis: null,
  accuracy: null,

  fetchPredictions: async (domainId, status) => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.timeline.listPredictions({ domainId, status });
      set({ predictions: data.items, predictionsTotal: data.total, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load predictions", loading: false });
    }
  },

  createPrediction: async (params) => {
    set({ error: null });
    try {
      const prediction = await window.api.timeline.createPrediction(params);
      set((state) => ({
        predictions: [prediction, ...state.predictions],
        predictionsTotal: state.predictionsTotal + 1,
      }));
      return prediction;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to create prediction" });
      return null;
    }
  },

  updatePrediction: async (id, data) => {
    set({ error: null });
    try {
      const updated = await window.api.timeline.updatePrediction({ id, ...data });
      set((state) => ({
        predictions: state.predictions.map((p) => (p.id === id ? updated : p)),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update prediction" });
    }
  },

  verifyPrediction: async (id, status, actualOutcome) => {
    set({ error: null });
    try {
      const updated = await window.api.timeline.verifyPrediction({ id, status, actualOutcome });
      set((state) => ({
        predictions: state.predictions.map((p) => (p.id === id ? updated : p)),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to verify prediction" });
    }
  },

  deletePrediction: async (id) => {
    set({ error: null });
    try {
      await window.api.timeline.deletePrediction({ id });
      set((state) => ({
        predictions: state.predictions.filter((p) => p.id !== id),
        predictionsTotal: state.predictionsTotal - 1,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete prediction" });
    }
  },

  analyzeTrends: async (domainId, period, modelId) => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.timeline.analyzeTrends({ domainId, period, modelId });
      set({ trendAnalysis: result, loading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Trend analysis failed", loading: false });
      return null;
    }
  },

  generatePredictions: async (domainId, modelId) => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.timeline.generatePredictions({ domainId, modelId });
      set((state) => ({
        predictions: [...data.predictions, ...state.predictions],
        predictionsTotal: state.predictionsTotal + data.predictions.length,
        loading: false,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Prediction generation failed", loading: false });
    }
  },

  fetchAccuracy: async (domainId) => {
    try {
      const accuracy = await window.api.timeline.getAccuracy({ domainId });
      set({ accuracy });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load accuracy" });
    }
  },

  fetchEvents: async (domainId) => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.timeline.getEvents({ domainId });
      set({ events: data.items, eventsTotal: data.total, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load timeline events", loading: false });
    }
  },

  expireOverdue: async () => {
    try {
      const result = await window.api.timeline.expireOverdue();
      if (result.expired > 0) {
        set((state) => ({
          predictions: state.predictions.map((p) =>
            p.status === "pending" && p.predictedDate && new Date(p.predictedDate) < new Date()
              ? { ...p, status: "expired" as const }
              : p
          ),
        }));
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to expire predictions" });
    }
  },

  clearError: () => set({ error: null }),
}));
