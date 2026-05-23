import { create } from 'zustand';
import type { DomainInfo } from '@/lib/ipc/channels';

interface DomainState {
  domains: DomainInfo[];
  currentDomainId: string | null;
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
  setCurrentDomain: (id: string | null) => void;
  getCurrentDomain: () => DomainInfo | null;
}

export const useDomainStore = create<DomainState & DomainActions>()(
  (set, get) => ({
    domains: [],
    currentDomainId: null,
    loading: false,
    error: null,

    fetchDomains: async () => {
      set({ loading: true, error: null });
      try {
        const result = await window.api.domain.list();
        set({ domains: result.domains, loading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    createDomain: async (req) => {
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
      set({ loading: true, error: null });
      try {
        await window.api.domain.delete({ id });
        set((s) => ({
          domains: s.domains.filter((d) => d.id !== id),
          currentDomainId: s.currentDomainId === id ? null : s.currentDomainId,
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

    setCurrentDomain: (id) => set({ currentDomainId: id }),

    getCurrentDomain: () => {
      const { domains, currentDomainId } = get();
      return domains.find((d) => d.id === currentDomainId) ?? null;
    },
  }),
);
