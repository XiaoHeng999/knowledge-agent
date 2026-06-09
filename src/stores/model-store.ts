import { create } from "zustand";
import type { ProviderInfo, ModelInfo } from "@/lib/ipc/channels";

interface ModelState {
  providers: ProviderInfo[];
  models: ModelInfo[];
  globalDefault: { providerId: string; modelId: string } | null;
  domainDefaults: Record<string, Record<string, { providerId: string; modelId: string } | null>>;
  loading: boolean;
  error: string | null;
}

interface ModelActions {
  fetchProviders: () => Promise<void>;
  fetchModels: (providerId?: string) => Promise<void>;
  addApiKey: (providerId: string, apiKey: string) => Promise<boolean>;
  validateApiKey: (providerId: string, apiKey: string) => Promise<{ valid: boolean; models: ModelInfo[] }>;
  removeApiKey: (providerId: string) => Promise<void>;
  setDefaultModel: (params: {
    providerId: string;
    modelId: string;
    scope: "global" | "domain";
    domainId?: string;
    role?: string;
  }) => Promise<void>;
  fetchDefaultModel: (scope: "global" | "domain", domainId?: string, role?: string) => Promise<void>;
}

export const useModelStore = create<ModelState & ModelActions>()(
  (set, get) => ({
    providers: [],
    models: [],
    globalDefault: null,
    domainDefaults: {},
    loading: false,
    error: null,

    fetchProviders: async () => {
      set({ loading: true, error: null });
      try {
        const result = await window.api.model.listProviders();
        set({ providers: result.providers, loading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    fetchModels: async (providerId?: string) => {
      set({ loading: true, error: null });
      try {
        const result = await window.api.model.listModels({ providerId });
        set({ models: result.models, loading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    addApiKey: async (providerId, apiKey) => {
      set({ loading: true, error: null });
      try {
        await window.api.model.addApiKey({ providerId, apiKey });
        // Refresh providers to reflect the new key
        const result = await window.api.model.listProviders();
        set({ providers: result.providers, loading: false });
        return true;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        return false;
      }
    },

    validateApiKey: async (providerId, apiKey) => {
      try {
        const result = await window.api.model.validateApiKey({ providerId, apiKey });
        // Refresh models if valid
        if (result.valid) {
          await get().fetchModels();
        }
        return result;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
        });
        return { valid: false, models: [] };
      }
    },

    removeApiKey: async (providerId) => {
      set({ loading: true, error: null });
      try {
        await window.api.model.removeApiKey({ providerId });
        // Refresh providers
        const result = await window.api.model.listProviders();
        set({ providers: result.providers, loading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    setDefaultModel: async (params) => {
      try {
        await window.api.model.setDefault(params);
        if (params.scope === "global") {
          set({ globalDefault: { providerId: params.providerId, modelId: params.modelId } });
        } else if (params.domainId) {
          set((s) => ({
            domainDefaults: {
              ...s.domainDefaults,
              [params.domainId!]: {
                ...s.domainDefaults[params.domainId!],
                [params.role ?? "expert"]: { providerId: params.providerId, modelId: params.modelId },
              },
            },
          }));
        }
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    },

    fetchDefaultModel: async (scope, domainId, role) => {
      try {
        const result = await window.api.model.getDefault({ scope, domainId, role });
        if (scope === "global") {
          set({ globalDefault: result.providerId ? result : null });
        } else if (domainId) {
          set((s) => ({
            domainDefaults: {
              ...s.domainDefaults,
              [domainId]: {
                ...s.domainDefaults[domainId],
                [role ?? "expert"]: result.providerId ? result : null,
              },
            },
          }));
        }
      } catch (err) {
        console.warn('[ModelStore] Failed to load default model:', err);
      }
    },
  }),
);
