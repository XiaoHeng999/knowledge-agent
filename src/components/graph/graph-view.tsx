'use client';

import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useKnowledgeStore } from '@/stores/knowledge-store';
import { useDomainStore } from '@/stores/domain-store';
import { useLayout } from '@/components/layout/layout-context';
import { KnowledgeCard } from '@/components/knowledge/knowledge-card';
import { KnowledgeDetail } from '@/components/knowledge/knowledge-detail';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { GraphControlPanel, type LayoutMode, type GraphFilters } from './graph-controls';

// Lazy-load heavy graph renderers — they are only needed when viewing the graph tab
const ForceGraph = lazy(() =>
  import('./force-graph').then((m) => ({ default: m.ForceGraph }))
);
const WebGLGraph = lazy(() =>
  import('./webgl-graph').then((m) => ({ default: m.WebGLGraph }))
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type ViewMode = 'graph' | 'list';

const WEBGL_THRESHOLD = 1000;

const VIEW_SEGMENTS = [
  { value: 'graph' as const, label: 'Graph' },
  { value: 'list' as const, label: 'List' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GraphView() {
  const searchParams = useSearchParams();
  const domainId = searchParams.get('id') ?? '';

  const { openPanel, closePanel } = useLayout();

  const nodes = useKnowledgeStore((s) => s.nodes);
  const edges = useKnowledgeStore((s) => s.edges);
  const loading = useKnowledgeStore((s) => s.loading);
  const selectedNodeId = useKnowledgeStore((s) => s.selectedNodeId);
  const fetchGraph = useKnowledgeStore((s) => s.fetchGraph);
  const fetchNodes = useKnowledgeStore((s) => s.fetchNodes);
  const selectNode = useKnowledgeStore((s) => s.selectNode);
  const deleteNode = useKnowledgeStore((s) => s.deleteNode);

  const domains = useDomainStore((s) => s.domains);
  const fetchDomains = useDomainStore((s) => s.fetchDomains);

  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [layout, setLayout] = useState<LayoutMode>('force');
  const [filters, setFilters] = useState<GraphFilters>({});

  const currentDomain = domains.find((d) => d.id === domainId);

  useEffect(() => {
    if (domains.length === 0) fetchDomains();
  }, [domains.length, fetchDomains]);

  useEffect(() => {
    if (domainId) {
      fetchGraph(domainId);
    }
  }, [domainId, fetchGraph]);

  // Apply filters client-side
  const filteredNodes = useMemo(() => {
    let result = nodes;
    if (filters.type) {
      result = result.filter((n) => n.type === filters.type);
    }
    if (filters.minComprehension !== undefined) {
      result = result.filter((n) => n.comprehensionLevel >= (filters.minComprehension ?? 0));
    }
    if (filters.domainId) {
      result = result.filter((n) => n.domainId === filters.domainId);
    }
    return result;
  }, [nodes, filters]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId));
  }, [edges, filteredNodes]);

  const uniqueTypes = useMemo(
    () => [...new Set(nodes.map((n) => n.type))].sort(),
    [nodes],
  );

  const useWebGL = filteredNodes.length > WEBGL_THRESHOLD;

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      const state = useKnowledgeStore.getState();
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) {
        openPanel('knowledge-detail', 320, (
          <KnowledgeDetail
            node={node}
            edges={state.edges}
            onEdit={() => {}}
            onDelete={async () => {
              await deleteNode(node.id);
              closePanel();
            }}
            onNodeClick={(nid) => handleNodeClick(nid)}
          />
        ));
      }
    },
    [selectNode, openPanel, deleteNode, closePanel],
  );

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'list') {
      // Re-fetch as paginated list
      const state = useKnowledgeStore.getState();
      if (state.nodes.length === 0 && domainId) {
        fetchNodes(domainId, { page: 1 });
      }
    }
  }, [domainId, fetchNodes]);

  if (!domainId) {
    return (
      <div className="graph-view">
        <EmptyState
          emoji="🌐"
          title="Select a domain"
          description="Choose a domain from the sidebar to view its knowledge graph."
        />
      </div>
    );
  }

  return (
    <div className="graph-view">
      <div className="graph-view__header">
        <div className="graph-view__header-left">
          {currentDomain && (
            <span
              className="graph-view__domain-dot"
              style={{ backgroundColor: currentDomain.color }}
              aria-hidden="true"
            />
          )}
          <h1 className="graph-view__title">
            {currentDomain?.name ?? 'Domain'} Graph
          </h1>
          <span className="graph-view__count">{filteredNodes.length} nodes</span>
        </div>
        <SegmentedControl
          segments={VIEW_SEGMENTS}
          value={viewMode}
          onChange={handleViewChange}
        />
      </div>

      {viewMode === 'graph' ? (
        <div className="graph-view__canvas">
          <GraphControlPanel
            layout={layout}
            onLayoutChange={setLayout}
            filters={filters}
            onFiltersChange={setFilters}
            nodeTypes={uniqueTypes}
            nodeCount={filteredNodes.length}
            edgeCount={filteredEdges.length}
          />
          {loading ? (
            <div className="graph-view__loading" role="status" aria-label="Loading graph">
              <Skeleton height={200} width="100%" radius={6} />
            </div>
          ) : filteredNodes.length === 0 ? (
            <EmptyState
              emoji="🌐"
              title="No knowledge nodes"
              description="Add knowledge to this domain to see the graph visualization."
            />
          ) : (
            <Suspense
              fallback={
                <div className="graph-view__loading" role="status" aria-label="Loading graph renderer">
                  <Skeleton height="100%" width="100%" radius={6} />
                </div>
              }
            >
              {useWebGL ? (
                <div
                  role="img"
                  aria-label={`Knowledge graph visualization showing ${filteredNodes.length} nodes and ${filteredEdges.length} connections. Use list view for keyboard-accessible browsing.`}
                >
                  <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }} />
                  <WebGLGraph
                    nodes={filteredNodes}
                    edges={filteredEdges}
                    domainColor={currentDomain?.color}
                    onNodeClick={handleNodeClick}
                    selectedNodeId={selectedNodeId}
                  />
                </div>
              ) : (
                <div
                  role="img"
                  aria-label={`Knowledge graph visualization showing ${filteredNodes.length} nodes and ${filteredEdges.length} connections. Use list view for keyboard-accessible browsing.`}
                >
                  <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0 }} />
                  <ForceGraph
                    nodes={filteredNodes}
                    edges={filteredEdges}
                    domainColor={currentDomain?.color}
                    onNodeClick={handleNodeClick}
                    selectedNodeId={selectedNodeId}
                  />
                </div>
              )}
            </Suspense>
          )}
          <div className="graph-view__a11y-notice" role="note">
            <a href="#" onClick={(e) => { e.preventDefault(); setViewMode('list'); }}>
              Switch to list view for keyboard navigation
            </a>
          </div>
        </div>
      ) : (
        <div className="graph-view__list">
          {loading && nodes.length === 0 ? (
            <div className="graph-view__loading">
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredNodes.length === 0 ? (
            <EmptyState
              emoji="📚"
              title="No knowledge nodes yet"
              description="Knowledge nodes are created automatically from research and imports, or you can create one manually."
            />
          ) : (
            filteredNodes.map((node) => (
              <KnowledgeCard
                key={node.id}
                node={node}
                selected={node.id === selectedNodeId}
                domainColor={currentDomain?.color}
                onClick={() => handleNodeClick(node.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
