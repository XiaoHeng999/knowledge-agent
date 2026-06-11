import { getDatabaseService } from "../db/index";
import type { DecisionRow, DecisionStatus } from "../db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DecisionRecordResult {
  id: string;
  domainId: string;
  title: string;
  decisionNumber: number;
  context: string;
  decisionText: string;
  rationale: string | null;
  expectedOutcome: string | null;
  status: DecisionStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function rowToDecisionResult(row: DecisionRow): DecisionRecordResult {
  return {
    id: row.id,
    domainId: row.domain_id,
    title: row.title,
    decisionNumber: row.decision_number,
    context: row.context,
    decisionText: row.decision_text,
    rationale: row.rationale,
    expectedOutcome: row.expected_outcome,
    status: row.status as DecisionStatus,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Public API: Decision Record (ADR) CRUD
// ---------------------------------------------------------------------------

export async function generateDecisionRecord(
  domainId: string,
  title: string,
  context: string,
  decisionText: string,
  rationale?: string,
  expectedOutcome?: string,
): Promise<DecisionRecordResult> {
  const db = getDatabaseService();

  const domain = db.domains.findById(domainId);
  if (!domain) throw new Error(`Domain not found: ${domainId}`);

  const decisionNumber = db.decisionRecords.nextDecisionNumber(domainId);

  // Retrieve related historical decisions
  const recentDecisions = db.decisionRecords.listByDomain(domainId, 5, 0);
  const relatedDecisions = recentDecisions.items
    .filter((d) =>
      title.toLowerCase().split(" ").some((word) =>
        d.title.toLowerCase().includes(word) && word.length > 3,
      ),
    )
    .map((d) => d.id);

  const row = db.decisionRecords.create({
    domain_id: domainId,
    title,
    decision_number: decisionNumber,
    context,
    decision_text: decisionText,
    rationale: rationale ?? null,
    expected_outcome: expectedOutcome ?? null,
    status: "proposed" as DecisionStatus,
    superseded_by: null,
    source_node_ids: relatedDecisions.length > 0 ? JSON.stringify(relatedDecisions) : null,
    file_path: null,
  } as unknown as Partial<DecisionRow> & Record<string, unknown>);

  return rowToDecisionResult(row);
}

export function updateDecisionStatus(
  decisionId: string,
  status: DecisionStatus,
  supersededBy?: string,
): DecisionRecordResult {
  const db = getDatabaseService();
  const existing = db.decisionRecords.findById(decisionId);
  if (!existing) throw new Error(`Decision record not found: ${decisionId}`);

  const updateData: Record<string, unknown> = { status };
  if (supersededBy) updateData.superseded_by = supersededBy;

  const updated = db.decisionRecords.update(decisionId, updateData);
  return rowToDecisionResult(updated!);
}

export function listDecisionRecords(
  domainId: string,
): { items: DecisionRecordResult[]; total: number } {
  const db = getDatabaseService();
  const result = db.decisionRecords.listByDomain(domainId);
  return {
    items: result.items.map(rowToDecisionResult),
    total: result.total,
  };
}

export function getDecisionRecord(id: string): DecisionRecordResult {
  const db = getDatabaseService();
  const row = db.decisionRecords.findById(id);
  if (!row) throw new Error(`Decision record not found: ${id}`);
  return rowToDecisionResult(row);
}

// ---------------------------------------------------------------------------
// Public API: Historical decision retrieval for analysis context
// ---------------------------------------------------------------------------

export function retrieveRelevantDecisions(
  domainId: string,
  queryText: string,
  limit = 5,
): DecisionRecordResult[] {
  const db = getDatabaseService();
  const allDecisions = db.decisionRecords.listByDomain(domainId, 50, 0);

  const queryWords = queryText.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  const scored = allDecisions.items.map((d) => {
    const text = `${d.title} ${d.context} ${d.decision_text}`.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (text.includes(word)) score++;
    }
    return { row: d, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => rowToDecisionResult(s.row));
}
