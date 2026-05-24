'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import type { KnowledgeNode, KnowledgeEdge } from '@/lib/ipc/channels';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebGLNode {
  id: string;
  title: string;
  type: string;
  comprehensionLevel: number;
  x: number;
  y: number;
  radius: number;
  color: [number, number, number];
  connectionCount: number;
}

interface WebGLGraphProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  domainColor?: string;
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  width?: number;
  height?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0.5, 0.6, 0.9];
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

const TYPE_HEX: Record<string, string> = {
  concept: '#7aa2f7',
  technology: '#7dcfff',
  person: '#e0af68',
  event: '#9ece6a',
  decision: '#f7768e',
  resource: '#bb9af7',
  question: '#ff9e64',
};

// Simple vertex/fragment shaders for point + line rendering
const VERT_SRC = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  void main() {
    vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clip * vec2(1, -1), 0, 1);
  }
`;

const POINT_FRAG_SRC = `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    gl_FragColor = u_color;
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, POINT_FRAG_SRC);
  if (!vert || !frag) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

// Simple force layout (lightweight, no D3 dependency)
function runSimpleLayout(
  nodes: WebGLNode[],
  edgePairs: [number, number][],
  width: number,
  height: number,
  iterations = 120,
) {
  const cx = width / 2;
  const cy = height / 2;

  for (let i = 0; i < iterations; i++) {
    const alpha = 1 - i / iterations;
    // Repulsion
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const dx = nodes[a].x - nodes[b].x;
        const dy = nodes[a].y - nodes[b].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (800 * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[a].x += fx;
        nodes[a].y += fy;
        nodes[b].x -= fx;
        nodes[b].y -= fy;
      }
    }
    // Attraction along edges
    for (const [ai, bi] of edgePairs) {
      const a = nodes[ai];
      const b = nodes[bi];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 100) * 0.01 * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.x += fx;
      a.y += fy;
      b.x -= fx;
      b.y -= fy;
    }
    // Center gravity
    for (const n of nodes) {
      n.x += (cx - n.x) * 0.01 * alpha;
      n.y += (cy - n.y) * 0.01 * alpha;
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WebGLGraph({
  nodes: knowledgeNodes,
  edges: knowledgeEdges,
  domainColor,
  onNodeClick,
  selectedNodeId,
  width: propWidth,
  height: propHeight,
  className = '',
}: WebGLGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panRef = useRef({ x: 0, y: 0, zoom: 1, dragging: false, lastX: 0, lastY: 0 });
  const [dimensions, setDimensions] = useState({ width: propWidth ?? 800, height: propHeight ?? 600 });

  const nodeColorHex = domainColor ?? '#7aa2f7';

  // Build layout data
  const { glNodes, edgeIndices } = useMemo(() => {
    const connCount = new Map<string, number>();
    for (const e of knowledgeEdges) {
      connCount.set(e.sourceId, (connCount.get(e.sourceId) ?? 0) + 1);
      connCount.set(e.targetId, (connCount.get(e.targetId) ?? 0) + 1);
    }

    const glNodes: WebGLNode[] = knowledgeNodes.map((n, i) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      comprehensionLevel: n.comprehensionLevel,
      x: dimensions.width / 2 + Math.cos(i * 2.399) * 200,
      y: dimensions.height / 2 + Math.sin(i * 2.399) * 200,
      radius: Math.max(3, Math.min(12, 3 + (connCount.get(n.id) ?? 0))),
      color: hexToRgb(TYPE_HEX[n.type] ?? nodeColorHex),
      connectionCount: connCount.get(n.id) ?? 0,
    }));

    const idIndex = new Map(glNodes.map((n, i) => [n.id, i]));
    const edgeIndices: [number, number][] = knowledgeEdges
      .filter((e) => idIndex.has(e.sourceId) && idIndex.has(e.targetId))
      .map((e) => [idIndex.get(e.sourceId)!, idIndex.get(e.targetId)!]);

    runSimpleLayout(glNodes, edgeIndices, dimensions.width, dimensions.height);
    return { glNodes, edgeIndices };
  }, [knowledgeNodes, knowledgeEdges, nodeColorHex, dimensions]);

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

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) return;

    const { width, height } = dimensions;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const program = createProgram(gl);
    if (!program) return;

    const posLoc = gl.getAttribLocation(program, 'a_position');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const colorLoc = gl.getUniformLocation(program, 'u_color');

    gl.useProgram(program);
    gl.uniform2f(resLoc, width, height);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const pan = panRef.current;

    // Draw edges
    const edgeVerts: number[] = [];
    for (const [ai, bi] of edgeIndices) {
      const a = glNodes[ai];
      const b = glNodes[bi];
      edgeVerts.push(a.x * pan.zoom + pan.x, a.y * pan.zoom + pan.y);
      edgeVerts.push(b.x * pan.zoom + pan.x, b.y * pan.zoom + pan.y);
    }
    if (edgeVerts.length > 0) {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edgeVerts), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4f(colorLoc, 0.25, 0.27, 0.37, 0.5);
      gl.drawArrays(gl.LINES, 0, edgeVerts.length / 2);
      gl.deleteBuffer(buf);
    }

    // Draw nodes (as points — each node becomes 4 triangles for a circle)
    for (const n of glNodes) {
      const cx = n.x * pan.zoom + pan.x;
      const cy = n.y * pan.zoom + pan.y;
      const r = n.radius * pan.zoom;
      const isSelected = n.id === selectedNodeId;
      const [cr, cg, cb] = n.color;
      const alpha = isSelected ? 1.0 : 0.85;
      gl.uniform4f(colorLoc, cr, cg, cb, alpha);

      const verts = [
        cx - r, cy - r,
        cx + r, cy - r,
        cx, cy,
        cx - r, cy + r,
        cx + r, cy + r,
        cx, cy,
      ];
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.deleteBuffer(buf);
    }
  }, [glNodes, edgeIndices, dimensions, selectedNodeId]);

  // Click → node detection
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !onNodeClick) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const pan = panRef.current;

      for (const n of glNodes) {
        const nx = n.x * pan.zoom + pan.x;
        const ny = n.y * pan.zoom + pan.y;
        const r = n.radius * pan.zoom + 4;
        const dx = mx - nx;
        const dy = my - ny;
        if (dx * dx + dy * dy <= r * r) {
          onNodeClick(n.id);
          return;
        }
      }
    },
    [glNodes, onNodeClick],
  );

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    panRef.current.dragging = true;
    panRef.current.lastX = e.clientX;
    panRef.current.lastY = e.clientY;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panRef.current.dragging) return;
    panRef.current.x += e.clientX - panRef.current.lastX;
    panRef.current.y += e.clientY - panRef.current.lastY;
    panRef.current.lastX = e.clientX;
    panRef.current.lastY = e.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`webgl-graph ${className}`}
      style={{ width: propWidth ?? '100%', height: propHeight ?? '100%' }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: 'block', cursor: 'grab' }}
      />
    </div>
  );
}
