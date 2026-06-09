'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { select } from 'd3-selection';
import { drag as d3Drag } from 'd3-drag';
import { attachZoomBehavior, zoomIn, zoomOut, zoomReset, mergeSelections } from './d3-zoom-helpers';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force';
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import type { KnowledgeNode, KnowledgeEdge } from '@/lib/ipc/channels';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimNode extends SimulationNodeDatum {
  id: string;
  title: string;
  type: string;
  comprehensionLevel: number;
  domainId: string;
  domainColor: string;
  connectionCount: number;
}

export interface SimEdge extends SimulationLinkDatum<SimNode> {
  weight: number;
  edgeType: string;
}

interface ForceGraphProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  domainColor?: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  width?: number;
  height?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  concept: 'var(--accent)',
  technology: 'var(--info)',
  person: 'var(--warning)',
  event: 'var(--success)',
  decision: 'var(--error)',
  resource: '#bb9af7',
  question: '#ff9e64',
};

function nodeRadius(connections: number): number {
  return Math.max(6, Math.min(24, 6 + connections * 2));
}

function buildGraphData(
  knowledgeNodes: KnowledgeNode[],
  knowledgeEdges: KnowledgeEdge[],
  domainColor?: string,
) {
  const connCount = new Map<string, number>();
  for (const e of knowledgeEdges) {
    connCount.set(e.sourceId, (connCount.get(e.sourceId) ?? 0) + 1);
    connCount.set(e.targetId, (connCount.get(e.targetId) ?? 0) + 1);
  }

  const simNodes: SimNode[] = knowledgeNodes.map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    comprehensionLevel: n.comprehensionLevel,
    domainId: n.domainId,
    domainColor: domainColor ?? TYPE_COLORS[n.type] ?? 'var(--accent)',
    connectionCount: connCount.get(n.id) ?? 0,
  }));

  const nodeIds = new Set(simNodes.map((n) => n.id));
  const simEdges: SimEdge[] = knowledgeEdges
    .filter((e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))
    .map((e) => ({
      source: e.sourceId,
      target: e.targetId,
      weight: e.weight,
      edgeType: e.type,
    }));

  return { simNodes, simEdges };
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipData {
  x: number;
  y: number;
  node: SimNode;
}

function GraphTooltip({ data }: { data: TooltipData }) {
  return (
    <div
      className="graph-tooltip"
      style={{
        position: 'absolute',
        left: data.x + 12,
        top: data.y - 8,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <div className="graph-tooltip__title">{data.node.title}</div>
      <div className="graph-tooltip__meta">
        <span className="graph-tooltip__type">{data.node.type}</span>
        <span className="graph-tooltip__level">Lvl {data.node.comprehensionLevel}/5</span>
        <span className="graph-tooltip__conn">{data.node.connectionCount} links</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ForceGraph component — uses D3 enter/update/exit for incremental DOM updates
// ---------------------------------------------------------------------------

export function ForceGraph({
  nodes: knowledgeNodes,
  edges: knowledgeEdges,
  domainColor,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  width: propWidth,
  height: propHeight,
  className = '',
}: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode, SimEdge>> | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 800, height: propHeight ?? 600 });

  const { simNodes, simEdges } = useMemo(
    () => buildGraphData(knowledgeNodes, knowledgeEdges, domainColor),
    [knowledgeNodes, knowledgeEdges, domainColor],
  );

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) {
      setDimensions({ width: propWidth, height: propHeight });
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [propWidth, propHeight]);

  // Main D3 render — uses data join (enter/update/exit) instead of clearing all
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = select(svgEl);
    const { width, height } = dimensions;
    if (width < 10 || height < 10 || simNodes.length === 0) return;

    // Ensure structure exists
    let g = svg.select<SVGGElement>('.graph-zoom-group');
    if (g.empty()) {
      svg.selectAll('*').remove();
      svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'var(--text-tertiary)');
      g = svg.append('g').attr('class', 'graph-zoom-group');
      g.append('g').attr('class', 'graph-edges');
      g.append('g').attr('class', 'graph-nodes');
    }

    const edgeGroup = g.select<SVGGElement>('.graph-edges');
    const nodeGroup = g.select<SVGGElement>('.graph-nodes');

    // Data join for edges
    const link = edgeGroup
      .selectAll<SVGLineElement, SimEdge>('line')
      .data(simEdges, (d) => {
        const s = typeof d.source === 'string' ? d.source : (d.source as SimNode).id;
        const t = typeof d.target === 'string' ? d.target : (d.target as SimNode).id;
        return `${s}-${t}`;
      });

    link.exit().remove();

    const linkEnter = link
      .enter()
      .append('line')
      .attr('stroke', 'var(--border-hover)')
      .attr('stroke-width', (d) => Math.max(1, d.weight * 3))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    const linkAll = mergeSelections(linkEnter, link);

    // Data join for nodes
    const node = nodeGroup
      .selectAll<SVGGElement, SimNode>('g.graph-node')
      .data(simNodes, (d) => d.id);

    node.exit().remove();

    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer');

    nodeEnter.append('circle');

    // Labels only for small graphs
    if (simNodes.length <= 80) {
      nodeEnter.append('text')
        .attr('dy', (d) => nodeRadius(d.connectionCount) + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', '11px')
        .attr('pointer-events', 'none');
    }

    const nodeAll = mergeSelections(nodeEnter, node);

    // Update attributes on all nodes (enter + update)
    nodeAll
      .select('circle')
      .attr('r', (d) => nodeRadius(d.connectionCount))
      .attr('fill', (d) => d.domainColor)
      .attr('stroke', (d) => (d.id === selectedNodeId ? 'var(--accent)' : 'var(--bg-primary)'))
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : 2))
      .attr('opacity', 0.9);

    if (simNodes.length <= 80) {
      nodeAll.select('text').text((d) => truncate(d.title, 16));
    }

    // Drag behavior
    const dragBehavior = d3Drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulationRef.current?.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    nodeAll.call(dragBehavior);

    // Click
    nodeAll.on('click', (_event, d) => {
      onNodeClick?.(d.id);
    });

    // Hover → tooltip
    nodeAll.on('mouseenter', (event, d) => {
      setTooltip({ x: event.offsetX, y: event.offsetY, node: d });
      onNodeHover?.(d.id);
      select(event.currentTarget)
        .select('circle')
        .transition()
        .duration(150)
        .attr('stroke', 'var(--accent)')
        .attr('stroke-width', 3);
    });
    nodeAll.on('mouseleave', (event, d) => {
      setTooltip(null);
      onNodeHover?.(null);
      const isSelected = d.id === selectedNodeId;
      select(event.currentTarget)
        .select('circle')
        .transition()
        .duration(150)
        .attr('stroke', isSelected ? 'var(--accent)' : 'var(--bg-primary)')
        .attr('stroke-width', isSelected ? 3 : 2);
    });

    // Zoom behavior — only bind once
    if (!((svgEl as unknown) as Record<string, unknown>).__zoomBound) {
      attachZoomBehavior(svg, g, {
        scaleExtent: [0.1, 4],
        initialCenter: { width, height },
      });
      ((svgEl as unknown) as Record<string, unknown>).__zoomBound = true;
    }

    // Force simulation
    const simulation = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(80),
      )
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(0, 0))
      .force('collision', forceCollide<SimNode>().radius((d) => nodeRadius(d.connectionCount) + 4))
      .on('tick', () => {
        linkAll
          .attr('x1', (d) => (d.source as SimNode).x ?? 0)
          .attr('y1', (d) => (d.source as SimNode).y ?? 0)
          .attr('x2', (d) => (d.target as SimNode).x ?? 0)
          .attr('y2', (d) => (d.target as SimNode).y ?? 0);
        nodeAll.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [simNodes, simEdges, dimensions, selectedNodeId, onNodeClick, onNodeHover]);

  // Public zoom controls
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    zoomIn(select(svgRef.current));
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    zoomOut(select(svgRef.current));
  }, []);

  const handleZoomReset = useCallback(() => {
    if (!svgRef.current) return;
    zoomReset(select(svgRef.current));
  }, []);

  if (simNodes.length === 0) {
    return (
      <div className={`force-graph force-graph--empty ${className}`}>
        <div className="force-graph__empty-msg">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.5-6.5L16 7m-8 10-1.5 1.5M19.5 18.5 18 17M7 7 5.5 5.5" />
          </svg>
          <p>No nodes to display</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`force-graph ${className}`}
      style={{ width: propWidth ?? '100%', height: propHeight ?? '100%' }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        aria-hidden="true"
      />
      {tooltip && <GraphTooltip data={tooltip} />}
      <div className="force-graph__zoom-controls">
        <button
          className="force-graph__zoom-btn"
          onClick={handleZoomIn}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <button
          className="force-graph__zoom-btn"
          onClick={handleZoomReset}
          aria-label="Reset zoom"
          title="Reset"
        >
          &#x21BB;
        </button>
        <button
          className="force-graph__zoom-btn"
          onClick={handleZoomOut}
          aria-label="Zoom out"
          title="Zoom out"
        >
          &minus;
        </button>
      </div>
    </div>
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
