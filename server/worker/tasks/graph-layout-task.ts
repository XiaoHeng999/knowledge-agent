/**
 * GRAPH_LAYOUT_COMPUTE task handler.
 * Force-directed layout computation for knowledge graph visualization.
 */
import type { GraphLayoutPayload, GraphLayoutResult } from "../types";

interface TaskContext {
  signal: AbortSignal;
  reportProgress: (progress: number, message?: string) => void;
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const CONVERGENCE_THRESHOLD = 0.5;
const CONVERGENCE_CHECK_INTERVAL = 10;
const CONVERGENCE_PATIENCE = 3;

export async function handleGraphLayoutCompute(
  payload: GraphLayoutPayload,
  ctx: TaskContext,
): Promise<GraphLayoutResult> {
  const startTime = Date.now();
  const { nodes, edges, algorithm, maxIterations = 300 } = payload;

  if (nodes.length === 0) {
    return { positions: {}, iterations: 0, converged: true, computeTimeMs: 0 };
  }

  // For > 10K nodes, skip force layout — use simple circular/grid instead
  if (nodes.length > 10000 || algorithm !== "force-directed") {
    const positions = computeSimpleLayout(nodes, algorithm);
    return {
      positions,
      iterations: 0,
      converged: true,
      computeTimeMs: Date.now() - startTime,
    };
  }

  // Initialize simulation nodes in a circle
  const simNodes: SimNode[] = nodes.map((n, i) => ({
    id: n.id,
    x: Math.cos((2 * Math.PI * i) / nodes.length) * 200,
    y: Math.sin((2 * Math.PI * i) / nodes.length) * 200,
    vx: 0,
    vy: 0,
  }));

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
  const simEdges = edges.map((e) => ({
    source: nodeMap.get(e.fromId),
    target: nodeMap.get(e.toId),
    weight: e.weight,
  })).filter((e) => e.source && e.target);

  const repulsionStrength = 300;
  const attractionStrength = 0.005;
  const centerStrength = 0.01;
  const damping = 0.9;
  const maxDisplacement = 50;

  let convergedCount = 0;
  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    if (ctx.signal.aborted) throw new Error("Cancelled");
    iterations = iter + 1;

    let maxDisplacementThisIter = 0;

    // Reset forces
    for (const node of simNodes) {
      node.vx = 0;
      node.vy = 0;
    }

    // Repulsion (all pairs)
    for (let i = 0; i < simNodes.length; i++) {
      for (let j = i + 1; j < simNodes.length; j++) {
        const a = simNodes[i];
        const b = simNodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = Math.max(dx * dx + dy * dy, 1);
        const dist = Math.sqrt(distSq);
        const force = repulsionStrength / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Attraction (edges)
    for (const edge of simEdges) {
      const s = edge.source!;
      const t = edge.target!;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(Math.max(dx * dx + dy * dy, 1));
      const force = dist * attractionStrength * (edge.weight || 0.5);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    }

    // Center gravity
    for (const node of simNodes) {
      node.vx -= node.x * centerStrength;
      node.vy -= node.y * centerStrength;
    }

    // Apply velocity with damping
    for (const node of simNodes) {
      node.vx *= damping;
      node.vy *= damping;

      const disp = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (disp > maxDisplacement) {
        node.vx = (node.vx / disp) * maxDisplacement;
        node.vy = (node.vy / disp) * maxDisplacement;
      }

      node.x += node.vx;
      node.y += node.vy;

      maxDisplacementThisIter = Math.max(maxDisplacementThisIter, disp);
    }

    // Convergence check
    if (iter % CONVERGENCE_CHECK_INTERVAL === CONVERGENCE_CHECK_INTERVAL - 1) {
      if (maxDisplacementThisIter < CONVERGENCE_THRESHOLD) {
        convergedCount++;
        if (convergedCount >= CONVERGENCE_PATIENCE) {
          break;
        }
      } else {
        convergedCount = 0;
      }
    }

    const progress = 0.1 + (iter / maxIterations) * 0.8;
    if (iter % 20 === 0) {
      ctx.reportProgress(progress, `Iteration ${iter + 1}/${maxIterations}, energy: ${maxDisplacementThisIter.toFixed(3)}`);
    }
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of simNodes) {
    positions[node.id] = { x: Math.round(node.x * 100) / 100, y: Math.round(node.y * 100) / 100 };
  }

  ctx.reportProgress(1.0, `Layout complete (${iterations} iterations)`);
  return {
    positions,
    iterations,
    converged: convergedCount >= CONVERGENCE_PATIENCE,
    computeTimeMs: Date.now() - startTime,
  };
}

function computeSimpleLayout(
  nodes: Array<{ id: string }>,
  algorithm: "circular" | "grid" | "force-directed",
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  if (algorithm === "grid") {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    nodes.forEach((n, i) => {
      positions[n.id] = { x: (i % cols) * 80, y: Math.floor(i / cols) * 80 };
    });
  } else {
    // Circular
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      positions[n.id] = { x: Math.cos(angle) * 300, y: Math.sin(angle) * 300 };
    });
  }

  return positions;
}
