import { create } from 'zustand';
import type { DomainInfo } from '@/lib/ipc/channels';
import { useAppStore } from './app-store';

interface DomainState {
  domains: DomainInfo[];
  loading: boolean;
  error: string | null;
}

interface DomainActions {
  fetchDomains: () => Promise<void>;
  createDomain: (req: {
    name: string;
    description: string;
    color: string;
    icon: string;
    template?: string;
  }) => Promise<DomainInfo>;
  updateDomain: (req: {
    id: string;
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
  }) => Promise<void>;
  deleteDomain: (id: string) => Promise<void>;
}

export const useDomainStore = create<DomainState & DomainActions>()(
  (set) => ({
    domains: [],
    loading: false,
    error: null,

    fetchDomains: async () => {
      if (typeof window === 'undefined' || !window.api) {
        set({ loading: false, error: 'Electron API not available' });
        return;
      }
      set({ loading: true, error: null });
      try {
        const result = await window.api.domain.list();
        set({ domains: result.domains, loading: false });
        const currentId = useAppStore.getState().currentDomainId;
        if (!currentId && result.domains.length > 0) {
          useAppStore.getState().setCurrentDomain(result.domains[0].id);
        }
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    createDomain: async (req) => {
      if (typeof window === 'undefined' || !window.api) {
        throw new Error('Electron API not available');
      }
      set({ loading: true, error: null });
      try {
        const domain = await window.api.domain.create(req);
        set((s) => ({
          domains: [...s.domains, domain],
          loading: false,
        }));
        return domain;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        throw err;
      }
    },

    updateDomain: async (req) => {
      if (typeof window === 'undefined' || !window.api) {
        throw new Error('Electron API not available');
      }
      set({ loading: true, error: null });
      try {
        const updated = await window.api.domain.update(req);
        set((s) => ({
          domains: s.domains.map((d) => (d.id === updated.id ? updated : d)),
          loading: false,
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        throw err;
      }
    },

    deleteDomain: async (id) => {
      if (typeof window === 'undefined' || !window.api) {
        throw new Error('Electron API not available');
      }
      set({ loading: true, error: null });
      try {
        await window.api.domain.delete({ id });
        set((s) => ({
          domains: s.domains.filter((d) => d.id !== id),
          loading: false,
        }));
        if (useAppStore.getState().currentDomainId === id) {
          useAppStore.getState().setCurrentDomain(null);
        }
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        throw err;
      }
    },
  }),
);
