'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { KnowledgeNode, KnowledgeEdge } from '@/lib/ipc/channels';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: string;
  comprehensionLevel: number;
  domainId: string;
  domainColor: string;
  connectionCount: number;
}

export interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
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
// ForceGraph component
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
  const simulationRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);
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

  // Main D3 render
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    if (width < 10 || height < 10 || simNodes.length === 0) return;

    // Zoom container
    const g = svg.append('g').attr('class', 'graph-zoom-group');

    // Arrow marker for edges
    svg
      .append('defs')
      .append('marker')
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

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svg as any).call(zoom);

    // Center initial view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svg as any).call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2),
    );

    // Edge links
    const link = g
      .append('g')
      .attr('class', 'graph-edges')
      .selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', 'var(--border-hover)')
      .attr('stroke-width', (d) => Math.max(1, d.weight * 3))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Node groups
    const node = g
      .append('g')
      .attr('class', 'graph-nodes')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('class', 'graph-node')
      .style('cursor', 'pointer');

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => nodeRadius(d.connectionCount))
      .attr('fill', (d) => d.domainColor)
      .attr('stroke', 'var(--bg-primary)')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9);

    // Node labels (for small graphs only)
    if (simNodes.length <= 80) {
      node
        .append('text')
        .text((d) => truncate(d.title, 16))
        .attr('dy', (d) => nodeRadius(d.connectionCount) + 14)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-secondary)')
        .attr('font-size', '11px')
        .attr('pointer-events', 'none');
    }

    // Highlight selected
    if (selectedNodeId) {
      node
        .select('circle')
        .attr('stroke', (d) => (d.id === selectedNodeId ? 'var(--accent)' : 'var(--bg-primary)'))
        .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : 2));
    }

    // Drag
    const drag = d3
      .drag<SVGGElement, SimNode>()
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
    node.call(drag);

    // Click
    node.on('click', (_event, d) => {
      onNodeClick?.(d.id);
    });

    // Hover → tooltip
    node.on('mouseenter', (event, d) => {
      setTooltip({ x: event.offsetX, y: event.offsetY, node: d });
      onNodeHover?.(d.id);
      d3.select(event.currentTarget)
        .select('circle')
        .transition()
        .duration(150)
        .attr('stroke', 'var(--accent)')
        .attr('stroke-width', 3);
    });
    node.on('mouseleave', (event, d) => {
      setTooltip(null);
      onNodeHover?.(null);
      const isSelected = d.id === selectedNodeId;
      d3.select(event.currentTarget)
        .select('circle')
        .transition()
        .duration(150)
        .attr('stroke', isSelected ? 'var(--accent)' : 'var(--bg-primary)')
        .attr('stroke-width', isSelected ? 3 : 2);
    });

    // Force simulation
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(80),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius((d) => nodeRadius((d as SimNode).connectionCount) + 4))
      .on('tick', () => {
        link
          .attr('x1', (d) => (d.source as SimNode).x ?? 0)
          .attr('y1', (d) => (d.source as SimNode).y ?? 0)
          .attr('x2', (d) => (d.target as SimNode).x ?? 0)
          .attr('y2', (d) => (d.target as SimNode).y ?? 0);
        node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [simNodes, simEdges, dimensions, selectedNodeId, onNodeClick, onNodeHover]);

  // Public zoom controls
  const handleZoomIn = useCallback(() => {
    const svg = d3.select(svgRef.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svg.transition().duration(300) as any).call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.4);
  }, []);

  const handleZoomOut = useCallback(() => {
    const svg = d3.select(svgRef.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svg.transition().duration(300) as any).call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.7);
  }, []);

  const handleZoomReset = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (svg.transition().duration(500) as any).call(zoom.transform, d3.zoomIdentity);
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
