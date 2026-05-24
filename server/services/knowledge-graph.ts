/**
 * KnowledgeGraph service — orchestrates knowledge node/edge CRUD,
 * graph traversal, and statistics.
 */
import { getDatabaseService } from "../db/index";
import type {
  KnowledgeNodeRow,
  KnowledgeEdgeRow,
  KnowledgeNodeType,
  KnowledgeNodeStatus,
  EdgeType,
} from "../db/schema";
import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeCreateNodeRequest,
  KnowledgeUpdateNodeRequest,
  KnowledgeCreateEdgeRequest,
  KnowledgeListRequest,
} from "../../src/lib/ipc/channels";
import { indexNode, removeFromIndex } from "./search-engine";

// ---------------------------------------------------------------------------
// Row → IPC type mapping
// ---------------------------------------------------------------------------

export function rowToNode(row: KnowledgeNodeRow): KnowledgeNode {
  const sourceIds: string[] = row.source_ids ? JSON.parse(row.source_ids) : [];
  return {
    id: row.id,
    domainId: row.domain_id,
    title: row.title,
    type: row.node_type,
    content: row.content ?? "",
    comprehensionLevel: row.comprehension_score,
    sources: sourceIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToEdge(row: KnowledgeEdgeRow): KnowledgeEdge {
  return {
    id: row.id,
    sourceId: row.source_node_id,
    targetId: row.target_node_id,
    type: row.edge_type,
    weight: row.weight,
  };
}

// ---------------------------------------------------------------------------
// Create node
// ---------------------------------------------------------------------------

export function createNode(req: KnowledgeCreateNodeRequest): KnowledgeNode {
  const db = getDatabaseService();

  const sourceIds = req.sources ? JSON.stringify(req.sources) : null;

  const row = db.knowledgeNodes.create({
    domain_id: req.domainId,
    title: req.title,
    content: req.content,
    node_type: (req.type || "concept") as KnowledgeNodeType,
    status: "active" as KnowledgeNodeStatus,
    comprehension_score: 0,
    source_ids: sourceIds,
  } as unknown as Partial<KnowledgeNodeRow> & Record<string, unknown>);

  const node = rowToNode(row);

  // Auto-index for vector search (fire-and-forget)
  const indexText = [req.title, req.content].filter(Boolean).join(" ");
  indexNode(node.id, indexText).catch((err) => {
    console.warn(`[Search] Failed to index node ${node.id}:`, err.message);
  });

  return node;
}

// ---------------------------------------------------------------------------
// Update node
// ---------------------------------------------------------------------------

export function updateNode(req: KnowledgeUpdateNodeRequest): KnowledgeNode {
  const db = getDatabaseService();

  const existing = db.knowledgeNodes.findById(req.id);
  if (!existing) throw new Error(`Knowledge node not found: ${req.id}`);

  const updateData: Record<string, unknown> = {};
  if (req.title !== undefined) updateData.title = req.title;
  if (req.content !== undefined) updateData.content = req.content;
  if (req.comprehensionLevel !== undefined) {
    updateData.comprehension_score = req.comprehensionLevel;
  }

  const updated = db.knowledgeNodes.update(req.id, updateData);
  const node = rowToNode(updated!);

  // Re-index for vector search if content changed
  if (req.title !== undefined || req.content !== undefined) {
    const indexText = [node.title, node.content].filter(Boolean).join(" ");
    indexNode(node.id, indexText).catch((err) => {
      console.warn(`[Search] Failed to re-index node ${node.id}:`, err.message);
    });
  }

  return node;
}

// ---------------------------------------------------------------------------
// Delete node
// ---------------------------------------------------------------------------

export function deleteNode(id: string): void {
  const db = getDatabaseService();

  const existing = db.knowledgeNodes.findById(id);
  if (!existing) throw new Error(`Knowledge node not found: ${id}`);

  // Delete related edges first
  db.knowledgeEdges.deleteByNodeIds([id]);

  // Delete the node
  db.knowledgeNodes.delete(id);

  // Remove from vector index
  removeFromIndex(id).catch((err) => {
    console.warn(`[Search] Failed to remove node ${id} from index:`, err.message);
  });
}

// ---------------------------------------------------------------------------
// Get single node
// ---------------------------------------------------------------------------

export function getNode(id: string): KnowledgeNode {
  const db = getDatabaseService();
  const row = db.knowledgeNodes.findById(id);
  if (!row) throw new Error(`Knowledge node not found: ${id}`);
  return rowToNode(row);
}

// ---------------------------------------------------------------------------
// List nodes with pagination + filters
// ---------------------------------------------------------------------------

export function listNodes(req: KnowledgeListRequest): { nodes: KnowledgeNode[]; total: number } {
  const db = getDatabaseService();

  const page = req.page ?? 1;
  const pageSize = req.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const result = db.knowledgeNodes.listByDomain({
    domainId: req.domainId,
    nodeType: req.type,
    status: req.status,
    comprehensionScore: req.comprehensionLevel,
    search: req.search,
    limit: pageSize,
    offset,
  });

  return {
    nodes: result.items.map(rowToNode),
    total: result.total,
  };
}

// ---------------------------------------------------------------------------
// Create edge
// ---------------------------------------------------------------------------

export function createEdge(req: KnowledgeCreateEdgeRequest): KnowledgeEdge {
  const db = getDatabaseService();

  // Validate both nodes exist
  const sourceNode = db.knowledgeNodes.findById(req.sourceId);
  if (!sourceNode) throw new Error(`Source node not found: ${req.sourceId}`);
  const targetNode = db.knowledgeNodes.findById(req.targetId);
  if (!targetNode) throw new Error(`Target node not found: ${req.targetId}`);

  // Check for duplicate edge
  const existing = db.knowledgeEdges.findBySourceNodeId(req.sourceId);
  const duplicate = existing.find(
    (e) => e.target_node_id === req.targetId && e.edge_type === req.type,
  );
  if (duplicate) throw new Error("Edge already exists between these nodes with the same type");

  const row = db.knowledgeEdges.create({
    source_node_id: req.sourceId,
    target_node_id: req.targetId,
    edge_type: req.type as EdgeType,
    weight: req.weight ?? 0.5,
  } as unknown as Partial<KnowledgeEdgeRow> & Record<string, unknown>);

  return rowToEdge(row);
}

// ---------------------------------------------------------------------------
// Delete edge
// ---------------------------------------------------------------------------

export function deleteEdge(id: string): void {
  const db = getDatabaseService();
  const existing = db.knowledgeEdges.findById(id);
  if (!existing) throw new Error(`Knowledge edge not found: ${id}`);
  db.knowledgeEdges.delete(id);
}

// ---------------------------------------------------------------------------
// Get graph — all nodes + edges for a domain
// ---------------------------------------------------------------------------

export function getGraph(domainId: string): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  const db = getDatabaseService();

  const nodeResult = db.knowledgeNodes.listByDomain({
    domainId,
    limit: 10000,
    offset: 0,
  });

  const nodeIds = nodeResult.items.map((n) => n.id);
  const edgeRows = nodeIds.length > 0 ? db.knowledgeEdges.findByDomainNodeIds(nodeIds) : [];

  return {
    nodes: nodeResult.items.map(rowToNode),
    edges: edgeRows.map(rowToEdge),
  };
}

// ---------------------------------------------------------------------------
// Search knowledge nodes (simple text search; vector search in 3.5)
// ---------------------------------------------------------------------------

export function searchNodes(
  query: string,
  domainId?: string,
  limit = 20,
): { node: KnowledgeNode; score: number; matchType: "fulltext" }[] {
  const db = getDatabaseService();

  const result = db.knowledgeNodes.listByDomain({
    domainId,
    search: query,
    limit,
    offset: 0,
  });

  return result.items.map((row) => ({
    node: rowToNode(row),
    score: 1.0,
    matchType: "fulltext" as const,
  }));
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface KnowledgeStats {
  totalNodes: number;
  nodesByType: Record<string, number>;
  nodesByStatus: Record<string, number>;
  totalEdges: number;
  avgComprehension: number;
}

export function getStats(domainId: string): KnowledgeStats {
  const db = getDatabaseService();

  const nodeResult = db.knowledgeNodes.listByDomain({ domainId, limit: 10000, offset: 0 });
  const nodes = nodeResult.items;
  const nodeIds = nodes.map((n) => n.id);
  const edges = nodeIds.length > 0 ? db.knowledgeEdges.findByDomainNodeIds(nodeIds) : [];

  const nodesByType: Record<string, number> = {};
  const nodesByStatus: Record<string, number> = {};
  let totalComprehension = 0;

  for (const node of nodes) {
    nodesByType[node.node_type] = (nodesByType[node.node_type] ?? 0) + 1;
    nodesByStatus[node.status] = (nodesByStatus[node.status] ?? 0) + 1;
    totalComprehension += node.comprehension_score;
  }

  return {
    totalNodes: nodes.length,
    nodesByType,
    nodesByStatus,
    totalEdges: edges.length,
    avgComprehension: nodes.length > 0 ? totalComprehension / nodes.length : 0,
  };
}
