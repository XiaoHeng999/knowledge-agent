'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
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

// Shaders — vertex now carries color per vertex
const VERT_SRC = `
  attribute vec2 a_position;
  attribute vec4 a_vertColor;
  uniform vec2 u_resolution;
  varying vec4 v_color;
  void main() {
    vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clip * vec2(1, -1), 0, 1);
    v_color = a_vertColor;
  }
`;

const FRAG_SRC = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    gl_FragColor = v_color;
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
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
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

/** Cull nodes outside the visible viewport with padding. */
function isInViewport(
  x: number,
  y: number,
  radius: number,
  panX: number,
  panY: number,
  zoom: number,
  viewW: number,
  viewH: number,
): boolean {
  const sx = x * zoom + panX;
  const sy = y * zoom + panY;
  const pad = radius * zoom + 8;
  return sx + pad >= 0 && sx - pad <= viewW && sy + pad >= 0 && sy - pad <= viewH;
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
  const rafRef = useRef<number>(0);
  const dimsRef = useRef({ width: propWidth ?? 800, height: propHeight ?? 600 });
  const glRef = useRef<{ gl: WebGLRenderingContext; program: WebGLProgram; posLoc: number; colorLoc: number; resLoc: WebGLUniformLocation | null; edgeBuf: WebGLBuffer | null; nodeBuf: WebGLBuffer | null } | null>(null);

  const nodeColorHex = domainColor ?? '#7aa2f7';

  // Build layout data
  const { glNodes, edgeIndices, idIndex } = useMemo(() => {
    const connCount = new Map<string, number>();
    for (const e of knowledgeEdges) {
      connCount.set(e.sourceId, (connCount.get(e.sourceId) ?? 0) + 1);
      connCount.set(e.targetId, (connCount.get(e.targetId) ?? 0) + 1);
    }

    const w = dimsRef.current.width;
    const h = dimsRef.current.height;

    const glNodes: WebGLNode[] = knowledgeNodes.map((n, i) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      comprehensionLevel: n.comprehensionLevel,
      x: w / 2 + Math.cos(i * 2.399) * 200,
      y: h / 2 + Math.sin(i * 2.399) * 200,
      radius: Math.max(3, Math.min(12, 3 + (connCount.get(n.id) ?? 0))),
      color: hexToRgb(TYPE_HEX[n.type] ?? nodeColorHex),
      connectionCount: connCount.get(n.id) ?? 0,
    }));

    const idIndex = new Map(glNodes.map((n, i) => [n.id, i]));
    const edgeIndices: [number, number][] = knowledgeEdges
      .filter((e) => idIndex.has(e.sourceId) && idIndex.has(e.targetId))
      .map((e) => [idIndex.get(e.sourceId)!, idIndex.get(e.targetId)!]);

    runSimpleLayout(glNodes, edgeIndices, w, h);
    return { glNodes, edgeIndices, idIndex };
  }, [knowledgeNodes, knowledgeEdges, nodeColorHex]);

  // Batched render using a single buffer for all edges + nodes
  const renderGL = useCallback(() => {
    const state = glRef.current;
    if (!state) return;
    const { gl, program, posLoc, colorLoc, resLoc } = state;
    const pan = panRef.current;
    const { width, height } = dimsRef.current;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    if (resLoc) gl.uniform2f(resLoc, width, height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // -- Draw all edges as one batched LINES call --
    const edgeVerts: number[] = [];
    for (const [ai, bi] of edgeIndices) {
      const a = glNodes[ai];
      const b = glNodes[bi];
      if (
        !isInViewport(a.x, a.y, 0, pan.x, pan.y, pan.zoom, width, height) &&
        !isInViewport(b.x, b.y, 0, pan.x, pan.y, pan.zoom, width, height)
      ) continue;
      const ax = a.x * pan.zoom + pan.x;
      const ay = a.y * pan.zoom + pan.y;
      const bx = b.x * pan.zoom + pan.x;
      const by = b.y * pan.zoom + pan.y;
      // 2 vertices * 6 floats (x, y, r, g, b, a)
      edgeVerts.push(ax, ay, 0.25, 0.27, 0.37, 0.5);
      edgeVerts.push(bx, by, 0.25, 0.27, 0.37, 0.5);
    }

    if (edgeVerts.length > 0) {
      const data = new Float32Array(edgeVerts);
      if (!state.edgeBuf) state.edgeBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, state.edgeBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

      const stride = 6 * 4;
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * 4);
      gl.drawArrays(gl.LINES, 0, edgeVerts.length / 6);
    }

    // -- Draw all nodes as one batched TRIANGLES call --
    const nodeVerts: number[] = [];
    for (const n of glNodes) {
      if (!isInViewport(n.x, n.y, n.radius, pan.x, pan.y, pan.zoom, width, height)) continue;

      const cx = n.x * pan.zoom + pan.x;
      const cy = n.y * pan.zoom + pan.y;
      const r = n.radius * pan.zoom;
      const isSelected = n.id === selectedNodeId;
      const [cr, cg, cb] = n.color;
      const alpha = isSelected ? 1.0 : 0.85;
      const strokeWidth = isSelected ? 2 : 1;

      // Outer ring for selected
      if (isSelected) {
        const rs = r + strokeWidth;
        nodeVerts.push(
          cx - rs, cy - rs, 1, 1, 1, 1,
          cx + rs, cy - rs, 1, 1, 1, 1,
          cx, cy, 1, 1, 1, 1,
          cx - rs, cy + rs, 1, 1, 1, 1,
          cx + rs, cy + rs, 1, 1, 1, 1,
          cx, cy, 1, 1, 1, 1,
        );
      }

      // Node circle (two triangles)
      nodeVerts.push(
        cx - r, cy - r, cr, cg, cb, alpha,
        cx + r, cy - r, cr, cg, cb, alpha,
        cx, cy, cr, cg, cb, alpha,
        cx - r, cy + r, cr, cg, cb, alpha,
        cx + r, cy + r, cr, cg, cb, alpha,
        cx, cy, cr, cg, cb, alpha,
      );
    }

    if (nodeVerts.length > 0) {
      const data = new Float32Array(nodeVerts);
      if (!state.nodeBuf) state.nodeBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, state.nodeBuf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

      const stride = 6 * 4;
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 2 * 4);
      gl.drawArrays(gl.TRIANGLES, 0, nodeVerts.length / 6);
    }
  }, [glNodes, edgeIndices, selectedNodeId]);

  // Responsive sizing
  useEffect(() => {
    if (propWidth && propHeight) {
      dimsRef.current = { width: propWidth, height: propHeight };
      renderGL();
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        dimsRef.current = {
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        };
        renderGL();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [propWidth, propHeight, renderGL]);

  // Initialize GL context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const posLoc = gl.getAttribLocation(program, 'a_position');
    const colorLoc = gl.getAttribLocation(program, 'a_vertColor');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');

    glRef.current = { gl, program, posLoc, colorLoc, resLoc, edgeBuf: null, nodeBuf: null };

    renderGL();

    return () => {
      if (glRef.current) {
        if (glRef.current.edgeBuf) gl.deleteBuffer(glRef.current.edgeBuf);
        if (glRef.current.nodeBuf) gl.deleteBuffer(glRef.current.nodeBuf);
        gl.deleteProgram(glRef.current.program);
      }
      glRef.current = null;
    };
  }, [renderGL]);

  // Resize canvas when dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = dimsRef.current;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, [propWidth, propHeight]);

  // Click → node detection
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !onNodeClick) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const pan = panRef.current;
      const { width, height } = dimsRef.current;

      // Check visible nodes only
      for (const n of glNodes) {
        if (!isInViewport(n.x, n.y, n.radius, pan.x, pan.y, pan.zoom, width, height)) continue;
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

  // Pan with requestAnimationFrame
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(renderGL);
  }, [renderGL]);

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
    scheduleRender();
  }, [scheduleRender]);

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false;
  }, []);

  // Scroll → zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    panRef.current.zoom = Math.max(0.1, Math.min(10, panRef.current.zoom * delta));
    scheduleRender();
  }, [scheduleRender]);

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
        onWheel={handleWheel}
        style={{ display: 'block', cursor: 'grab' }}
      />
    </div>
  );
}
