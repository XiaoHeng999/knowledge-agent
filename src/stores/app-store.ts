import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedStorage } from './base';

export type AppView =
  | 'dashboard'
  | 'knowledge'
  | 'chat'
  | 'timeline'
  | 'research'
  | 'inbox'
  | 'settings';

export type AppTheme = 'tokyo-night' | 'linear' | 'cursor' | 'notion' | 'posthog';

interface AppState {
  currentDomainId: string | null;
  currentView: AppView;
  theme: AppTheme;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
}

interface AppActions {
  setCurrentDomain: (id: string | null) => void;
  setCurrentView: (view: AppView) => void;
  setTheme: (theme: AppTheme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      currentDomainId: null,
      currentView: 'dashboard',
      theme: 'tokyo-night',
      sidebarCollapsed: false,
      commandPaletteOpen: false,

      setCurrentDomain: (id) => set({ currentDomainId: id }),
      setCurrentView: (view) => set({ currentView: view }),
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'app-store',
      storage: persistedStorage,
      partialize: (state) => ({
        currentDomainId: state.currentDomainId,
        currentView: state.currentView,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);
