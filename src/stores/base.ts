import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const STORE_PREFIX = 'agentclaw:';

/**
 * Hybrid storage adapter for Zustand persist middleware.
 * Uses IPC (settings:get/set) as primary, localStorage as fallback.
 * Will automatically use SQLite once the main-process handlers are ready (task 1.5).
 */
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const key = `${STORE_PREFIX}${name}`;
    if (typeof window === 'undefined' || !window.api) {
      return localStorage.getItem(key);
    }
    try {
      const result = await window.api.settings.get({ key });
      if (result == null) return null;
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch {
      return localStorage.getItem(key);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const key = `${STORE_PREFIX}${name}`;
    if (typeof window === 'undefined' || !window.api) {
      localStorage.setItem(key, value);
      return;
    }
    try {
      await window.api.settings.set({ key, value });
    } catch {
      localStorage.setItem(key, value);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    const key = `${STORE_PREFIX}${name}`;
    if (typeof window === 'undefined' || !window.api) {
      localStorage.removeItem(key);
      return;
    }
    try {
      await window.api.settings.set({ key, value: null });
    } catch {
      localStorage.removeItem(key);
    }
  },
};

/** Pre-configured JSON storage ready for Zustand persist middleware. */
export const persistedStorage = createJSONStorage(() => storage);
