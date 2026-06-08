/**
 * InboxProcessor service — manages inbox items (F5 Passive Mode).
 * Handles AI summary generation, domain assignment suggestions,
 * and the confirm/reject workflow for imported content.
 */
import { getDatabaseService } from "../db/index";
import type { InboxItemRow, InboxSourceType, InboxItemStatus } from "../db/schema";
import type {
  InboxItem,
  InboxAddRequest,
  InboxListRequest,
  InboxListResponse,
  InboxStatsResponse,
  DomainInfo,
} from "../../src/lib/ipc/channels";
import { generateEmbedding } from "./embedding-service";
import * as KnowledgeGraph from "./knowledge-graph";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Row → IPC type mapping
// ---------------------------------------------------------------------------

function rowToItem(row: InboxItemRow): InboxItem {
  return {
    id: row.id,
    title: extractTitle(row.raw_content, row.source_url),
    content: row.raw_content ?? "",
    source: row.source_type,
    status: row.status,
    domainId: row.domain_id,
    summary: row.ai_summary,
    createdAt: row.created_at,
  };
}

function extractTitle(rawContent: string | null, sourceUrl: string | null): string {
  if (rawContent) {
    const firstLine = rawContent.split("\n")[0]?.trim();
    if (firstLine && firstLine.length <= 200) return firstLine;
    if (firstLine) return firstLine.slice(0, 197) + "...";
  }
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      return url.hostname + url.pathname;
    } catch {
      return sourceUrl;
    }
  }
  return "Untitled";
}

// ---------------------------------------------------------------------------
// Domain suggestion via embedding similarity
// ---------------------------------------------------------------------------

export interface DomainSuggestion {
  domainId: string;
  domainName: string;
  domainColor: string;
  confidence: number;
}

export async function suggestDomains(
  content: string,
): Promise<DomainSuggestion[]> {
  const db = getDatabaseService();
  const contentEmbedding = await generateEmbedding(content);

  const domainRows = db.domains.list({ limit: 100, offset: 0 });
  if (domainRows.items.length === 0) return [];

  const suggestions: DomainSuggestion[] = [];

  for (const domain of domainRows.items) {
    const nodeRows = db.knowledgeNodes.listByDomain({
      domainId: domain.id,
      limit: 50,
      offset: 0,
    });

    if (nodeRows.items.length === 0) continue;

    // Compute centroid embedding for this domain
    let totalSimilarity = 0;
    let count = 0;

    for (const node of nodeRows.items) {
      const nodeText = [node.title, node.content].filter(Boolean).join(" ");
      if (!nodeText.trim()) continue;

      const nodeEmbedding = await generateEmbedding(nodeText);
      const sim = cosineSimilarity(contentEmbedding, nodeEmbedding);
      totalSimilarity += sim;
      count++;
    }

    if (count > 0) {
      const avgSimilarity = totalSimilarity / count;
      suggestions.push({
        domainId: domain.id,
        domainName: domain.name,
        domainColor: domain.color,
        confidence: Math.round(avgSimilarity * 100),
      });
    }
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);
  return suggestions.slice(0, 3);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// Excerpt generation — truncates first N lines as a preview
// ---------------------------------------------------------------------------

export async function generateExcerpt(itemId: string): Promise<string> {
  const db = getDatabaseService();

  const item = db.inbox.findById(itemId);
  if (!item) throw new Error(`Inbox item not found: ${itemId}`);

  const content = item.raw_content ?? "";
  if (!content.trim()) {
    return "No content available for excerpt.";
  }

  // Mark as processing
  db.db.prepare(
    `UPDATE inbox_items SET status = 'processing', updated_at = datetime('now') WHERE id = ?`,
  ).run(itemId);

  // Extract first 5 lines as excerpt preview
  const lines = content.split("\n").filter((l) => l.trim());
  const keyPoints = lines.slice(0, 5).map((l) => l.trim());

  const excerpt = [
    `**Key Points:**`,
    ...keyPoints.map((p) => `- ${p.slice(0, 200)}`),
    "",
    `**Content Length:** ${content.length} characters`,
    `**Source Type:** ${item.source_type}`,
  ].join("\n");

  // Store the excerpt
  db.db.prepare(
    `UPDATE inbox_items SET ai_summary = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(excerpt, itemId);

  return excerpt;
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export function addItem(req: InboxAddRequest): InboxItem {
  const db = getDatabaseService();

  const row = db.inbox.create({
    source_type: "note" as InboxSourceType,
    source_url: null,
    raw_content: req.content,
    ai_summary: null,
    suggested_domain_id: null,
    suggested_tags: null,
    status: "pending" as InboxItemStatus,
    domain_id: null,
    knowledge_node_id: null,
  } as unknown as Partial<InboxItemRow> & Record<string, unknown>);

  return rowToItem(row);
}

export function listItems(req: InboxListRequest): InboxListResponse {
  const db = getDatabaseService();

  const page = req.page ?? 1;
  const pageSize = req.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const result = db.inbox.listByStatus(req.status as InboxItemStatus | undefined, pageSize, offset);

  return {
    items: result.items.map(rowToItem),
    total: result.total,
  };
}

export function processItem(
  itemId: string,
  domainId: string,
): InboxItem {
  const db = getDatabaseService();

  const item = db.inbox.findById(itemId);
  if (!item) throw new Error(`Inbox item not found: ${itemId}`);

  // Create a knowledge node in the target domain
  const node = KnowledgeGraph.createNode({
    domainId,
    title: extractTitle(item.raw_content, item.source_url),
    type: "resource",
    content: item.raw_content ?? "",
  });

  // Mark inbox item as accepted
  db.inbox.processItem(itemId, domainId, node.id);

  const updated = db.inbox.findById(itemId);
  return rowToItem(updated!);
}

export function rejectItem(itemId: string): void {
  const db = getDatabaseService();
  const success = db.inbox.rejectItem(itemId);
  if (!success) throw new Error(`Inbox item not found: ${itemId}`);
}

export function getStats(): InboxStatsResponse {
  const db = getDatabaseService();
  const stats = db.inbox.getStats();
  return {
    pending: stats.pending,
    processing: stats.processing,
    accepted: stats.accepted,
    rejected: stats.rejected,
  };
}
