import { create } from 'zustand';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeListRequest,
} from '@/lib/ipc/channels';

interface KnowledgeState {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  total: number;
  loading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  filters: {
    type?: string;
    status?: string;
    comprehensionLevel?: number;
    search?: string;
    page: number;
    pageSize: number;
  };
}

interface KnowledgeActions {
  fetchNodes: (domainId: string, filters?: Partial<KnowledgeState['filters']>) => Promise<void>;
  createNode: (req: {
    domainId: string;
    title: string;
    type: string;
    content: string;
    sources?: string[];
  }) => Promise<KnowledgeNode>;
  updateNode: (req: {
    id: string;
    title?: string;
    content?: string;
    comprehensionLevel?: number;
  }) => Promise<KnowledgeNode>;
  deleteNode: (id: string) => Promise<void>;
  selectNode: (id: string | null) => void;
  setFilters: (filters: Partial<KnowledgeState['filters']>) => void;
  fetchGraph: (domainId: string) => Promise<void>;
  createEdge: (req: {
    sourceId: string;
    targetId: string;
    type: string;
    weight?: number;
  }) => Promise<KnowledgeEdge>;
  deleteEdge: (id: string) => Promise<void>;
  getNodeById: (id: string) => KnowledgeNode | undefined;
}

export const useKnowledgeStore = create<KnowledgeState & KnowledgeActions>()(
  (set, get) => ({
    nodes: [],
    edges: [],
    total: 0,
    loading: false,
    error: null,
    selectedNodeId: null,
    filters: {
      page: 1,
      pageSize: 20,
    },

    fetchNodes: async (domainId, filters) => {
      set({ loading: true, error: null });
      try {
        const currentFilters = { ...get().filters, ...filters };
        set({ filters: currentFilters });

        const req: KnowledgeListRequest = {
          domainId,
          type: currentFilters.type,
          status: currentFilters.status,
          comprehensionLevel: currentFilters.comprehensionLevel,
          search: currentFilters.search,
          page: currentFilters.page,
          pageSize: currentFilters.pageSize,
        };

        const result = await window.api.knowledge.listNodes(req);
        set({ nodes: result.nodes, total: result.total, loading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    createNode: async (req) => {
      set({ loading: true, error: null });
      try {
        const node = await window.api.knowledge.createNode(req);
        set((s) => ({
          nodes: [node, ...s.nodes],
          total: s.total + 1,
          loading: false,
        }));
        return node;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        throw err;
      }
    },

    updateNode: async (req) => {
      set({ loading: true, error: null });
      try {
        const updated = await window.api.knowledge.updateNode(req);
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === updated.id ? updated : n)),
          loading: false,
        }));
        return updated;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        throw err;
      }
    },

    deleteNode: async (id) => {
      set({ loading: true, error: null });
      try {
        await window.api.knowledge.deleteNode({ id });
        set((s) => ({
          nodes: s.nodes.filter((n) => n.id !== id),
          total: s.total - 1,
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
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

    selectNode: (id) => set({ selectedNodeId: id }),

    setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),

    fetchGraph: async (domainId) => {
      set({ loading: true, error: null });
      try {
        const graph = await window.api.knowledge.getGraph({ domainId });
        set({
          nodes: graph.nodes,
          edges: graph.edges,
          total: graph.nodes.length,
          loading: false,
        });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
      }
    },

    createEdge: async (req) => {
      set({ loading: true, error: null });
      try {
        const edge = await window.api.knowledge.createEdge(req);
        set((s) => ({
          edges: [...s.edges, edge],
          loading: false,
        }));
        return edge;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : String(err),
          loading: false,
        });
        throw err;
      }
    },

    deleteEdge: async (id) => {
      set({ loading: true, error: null });
      try {
        await window.api.knowledge.deleteEdge({ id });
        set((s) => ({
          edges: s.edges.filter((e) => e.id !== id),
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

    getNodeById: (id) => {
      return get().nodes.find((n) => n.id === id);
    },
  }),
);
