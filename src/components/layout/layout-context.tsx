'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

export type PanelContentType =
  | 'diff-preview'
  | 'diff-review'
  | 'knowledge-detail'
  | 'event-detail'
  | 'inbox-detail'
  | 'domain-overview'
  | 'settings-section'
  | 'source-detail'
  | 'framework-result'
  | 'decision-detail';

type ViewportBreakpoint = 'compact' | 'medium' | 'full';

interface LayoutContextValue {
  sidebarCollapsed: boolean;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  panelOpen: boolean;
  panelWidth: number;
  panelContentType: PanelContentType | null;
  panelContent: ReactNode | null;
  openPanel: (type: PanelContentType, width?: number, content?: ReactNode) => void;
  closePanel: () => void;
  setPanelWidth: (width: number) => void;
  setPanelContent: (content: ReactNode | null) => void;
  viewportBreakpoint: ViewportBreakpoint;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}

const PANEL_DEFAULT_WIDTHS: Record<PanelContentType, number> = {
  'diff-preview': 400,
  'diff-review': 420,
  'knowledge-detail': 320,
  'event-detail': 280,
  'inbox-detail': 280,
  'domain-overview': 280,
  'settings-section': 320,
  'source-detail': 280,
  'framework-result': 400,
  'decision-detail': 400,
};

function useViewportBreakpoint(): ViewportBreakpoint {
  const [breakpoint, setBreakpoint] = useState<ViewportBreakpoint>('full');

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 900) setBreakpoint('compact');
      else if (w < 1200) setBreakpoint('medium');
      else setBreakpoint('full');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return breakpoint;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(320);
  const [panelContentType, setPanelContentType] = useState<PanelContentType | null>(null);
  const [panelContent, setPanelContent] = useState<ReactNode | null>(null);
  const viewportBreakpoint = useViewportBreakpoint();

  const isSidebarCollapsed = sidebarCollapsed || viewportBreakpoint === 'compact';

  const toggleSidebar = useCallback(() => setSidebarCollapsed(c => !c), []);

  const openPanel = useCallback((type: PanelContentType, width?: number, content?: ReactNode) => {
    setPanelContentType(type);
    setPanelWidth(width ?? PANEL_DEFAULT_WIDTHS[type]);
    setPanelContent(content ?? null);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setPanelContentType(null);
    setPanelContent(null);
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        sidebarCollapsed,
        isSidebarCollapsed,
        toggleSidebar,
        panelOpen,
        panelWidth,
        panelContentType,
        panelContent,
        openPanel,
        closePanel,
        setPanelWidth,
        setPanelContent,
        viewportBreakpoint,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}
