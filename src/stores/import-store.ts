'use client';

import { create } from "zustand";
import type {
  ImportStatusResponse,
  ImportListResponse,
} from "../lib/ipc/channels";

interface ImportState {
  loading: boolean;
  error: string | null;
  activeImport: ImportStatusResponse | null;
  history: ImportStatusResponse[];
  historyTotal: number;

  importUrl: (url: string, domainId?: string) => Promise<ImportStatusResponse | null>;
  importFile: (filePath: string, domainId?: string) => Promise<ImportStatusResponse | null>;
  fetchStatus: (id: string) => Promise<void>;
  fetchHistory: (domainId?: string) => Promise<void>;
  retryImport: (id: string) => Promise<ImportStatusResponse | null>;
  cancelImport: (id: string) => Promise<void>;
  pollRssFeed: (feedUrl: string, domainId: string) => Promise<{ newItems: number; errors: number } | null>;
  clearError: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  loading: false,
  error: null,
  activeImport: null,
  history: [],
  historyTotal: 0,

  importUrl: async (url, domainId) => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.import.importUrl({ url, domainId });
      set({ activeImport: result, loading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to import URL", loading: false });
      return null;
    }
  },

  importFile: async (filePath, domainId) => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.import.importFile({ filePath, domainId });
      set({ activeImport: result, loading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to import file", loading: false });
      return null;
    }
  },

  fetchStatus: async (id) => {
    try {
      const status = await window.api.import.getStatus({ id });
      set({ activeImport: status });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to get status" });
    }
  },

  fetchHistory: async (domainId) => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.import.list({ domainId });
      set({ history: result.items, historyTotal: result.total, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load history", loading: false });
    }
  },

  retryImport: async (id) => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.import.retry({ id });
      set({ activeImport: result, loading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to retry", loading: false });
      return null;
    }
  },

  cancelImport: async (id) => {
    try {
      await window.api.import.cancel({ id });
      set({ activeImport: null });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to cancel" });
    }
  },

  pollRssFeed: async (feedUrl, domainId) => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.import.pollRss({ feedUrl, domainId });
      set({ loading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to poll RSS feed", loading: false });
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
