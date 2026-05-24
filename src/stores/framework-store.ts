'use client';

import { create } from "zustand";
import type {
  FrameworkInfo,
  FrameworkAnalysisResult,
  DecisionRecordResult,
  DomainSummaryResult,
  MemoryLayerStats,
} from "@/lib/ipc/channels";

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

interface FrameworkState {
  loading: boolean;
  error: string | null;

  frameworks: FrameworkInfo[];
  analysisResults: FrameworkAnalysisResult[];
  resultsTotal: number;
  activeAnalysis: FrameworkAnalysisResult | null;
  decisions: DecisionRecordResult[];
  decisionsTotal: number;
  summary: DomainSummaryResult | null;
  memoryStats: MemoryLayerStats | null;

  fetchFrameworks: () => Promise<void>;
  fetchResults: (domainId: string, frameworkType?: string) => Promise<void>;
  executeAnalysis: (domainId: string, frameworkType: string, modelId?: string) => Promise<FrameworkAnalysisResult | null>;
  getResult: (id: string) => Promise<void>;
  fetchDecisions: (domainId: string) => Promise<void>;
  createDecision: (params: {
    domainId: string;
    title: string;
    context: string;
    decisionText: string;
    rationale?: string;
    expectedOutcome?: string;
  }) => Promise<DecisionRecordResult | null>;
  updateDecision: (decisionId: string, status: string, supersededBy?: string) => Promise<void>;
  generateSummary: (domainId: string) => Promise<void>;
  fetchMemoryStats: (domainId: string) => Promise<void>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFrameworkStore = create<FrameworkState>((set) => ({
  loading: false,
  error: null,

  frameworks: [],
  analysisResults: [],
  resultsTotal: 0,
  activeAnalysis: null,
  decisions: [],
  decisionsTotal: 0,
  summary: null,
  memoryStats: null,

  fetchFrameworks: async () => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.framework.listFrameworks();
      set({ frameworks: data.frameworks, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load frameworks", loading: false });
    }
  },

  fetchResults: async (domainId, frameworkType) => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.framework.listResults({ domainId, frameworkType });
      set({ analysisResults: data.items, resultsTotal: data.total, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load results", loading: false });
    }
  },

  executeAnalysis: async (domainId, frameworkType, modelId) => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.framework.execute({ domainId, frameworkType, modelId });
      set((state) => ({
        activeAnalysis: result,
        analysisResults: [result, ...state.analysisResults],
        resultsTotal: state.resultsTotal + 1,
        loading: false,
      }));
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Analysis failed", loading: false });
      return null;
    }
  },

  getResult: async (id) => {
    try {
      const result = await window.api.framework.getResult({ id });
      set({ activeAnalysis: result });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load result" });
    }
  },

  fetchDecisions: async (domainId) => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.framework.listDecisions({ domainId });
      set({ decisions: data.items, decisionsTotal: data.total, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load decisions", loading: false });
    }
  },

  createDecision: async (params) => {
    set({ error: null });
    try {
      const decision = await window.api.framework.createDecision(params);
      set((state) => ({
        decisions: [decision, ...state.decisions],
        decisionsTotal: state.decisionsTotal + 1,
      }));
      return decision;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to create decision" });
      return null;
    }
  },

  updateDecision: async (decisionId, status, supersededBy) => {
    set({ error: null });
    try {
      const updated = await window.api.framework.updateDecision({ decisionId, status, supersededBy });
      set((state) => ({
        decisions: state.decisions.map((d) => (d.id === decisionId ? updated : d)),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update decision" });
    }
  },

  generateSummary: async (domainId) => {
    set({ loading: true, error: null });
    try {
      const summary = await window.api.framework.generateSummary({ domainId });
      set({ summary, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Summary generation failed", loading: false });
    }
  },

  fetchMemoryStats: async (domainId) => {
    try {
      const stats = await window.api.framework.getMemoryStats({ domainId });
      set({ memoryStats: stats });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load memory stats" });
    }
  },

  clearError: () => set({ error: null }),
}));
