'use client';

import { create } from "zustand";
import type { ResearchStatus, ResearchDashboardResponse } from "@/lib/ipc/channels";

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

interface ResearchState {
  loading: boolean;
  error: string | null;

  dashboard: ResearchDashboardResponse | null;
  history: ResearchStatus[];
  historyTotal: number;
  activeRun: ResearchStatus | null;

  fetchDashboard: () => Promise<void>;
  fetchHistory: (domainId: string) => Promise<void>;
  triggerResearch: (domainId: string) => Promise<ResearchStatus | null>;
  cancelRun: (runId: string) => Promise<void>;
  refreshStatus: (runId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useResearchStore = create<ResearchState>((set) => ({
  loading: false,
  error: null,
  dashboard: null,
  history: [],
  historyTotal: 0,
  activeRun: null,

  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.research.getDashboard();
      set({ dashboard: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load dashboard", loading: false });
    }
  },

  fetchHistory: async (domainId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await window.api.research.listHistory({ domainId });
      set({ history: data.items, historyTotal: data.total, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load history", loading: false });
    }
  },

  triggerResearch: async (domainId: string) => {
    set({ error: null });
    try {
      const status = await window.api.research.trigger({ domainId });
      set({ activeRun: status });
      return status;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to trigger research" });
      return null;
    }
  },

  cancelRun: async (runId: string) => {
    try {
      await window.api.research.cancel({ id: runId });
      set({ activeRun: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to cancel" });
    }
  },

  refreshStatus: async (runId: string) => {
    try {
      const status = await window.api.research.getStatus({ id: runId });
      set({ activeRun: status });
    } catch {
      // Status lookup failed — run may have been cleaned up
    }
  },
}));
