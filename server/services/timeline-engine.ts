/**
 * TimelineEngine — timeline CRUD, trend analysis, prediction generation,
 * prediction accuracy tracking, and event extraction from knowledge nodes.
 */
import { createSessionRunner } from "./session-runner";
import { resolveModelId } from "../lib/model-resolver";
import { setTimelineAnalyzeExecutor } from "../pi-mono/tools/timeline-analyze";
import { createNode } from "./knowledge-graph";
import type { DbDeps } from "./types";
import type { PredictionRow, PredictionStatus } from "../db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelinePrediction {
  id: string;
  domainId: string;
  content: string;
  confidence: number;
  predictedDate: string | null;
  status: PredictionStatus;
  actualOutcome: string | null;
  sourceNodeIds: string[];
  reasoning: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrendAnalysisResult {
  domainId: string;
  period: "month" | "quarter" | "year";
  report: string;
  emergingTopics: string[];
  decliningTopics: string[];
  knowledgeVelocity: number;
  predictionSuggestions: Array<{
    content: string;
    confidence: number;
    predictedDate: string | null;
  }>;
  analyzedAt: string;
  costUsd: number;
}

export interface PredictionAccuracy {
  domainId: string;
  total: number;
  confirmed: number;
  missed: number;
  pending: number;
  confirmedRate: number;
  missedRate: number;
  avgConfirmedConfidence: number;
  avgMissedConfidence: number;
}

export interface TimelineEntry {
  id: string;
  domainId: string;
  type: "event" | "prediction" | "milestone";
  title: string;
  description: string;
  date: string;
  importance: "high" | "medium" | "low";
  sourceNodeId: string | null;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Row → IPC type mapping
// ---------------------------------------------------------------------------

function rowToPrediction(row: PredictionRow): TimelinePrediction {
  return {
    id: row.id,
    domainId: row.domain_id,
    content: row.content,
    confidence: row.confidence,
    predictedDate: row.predicted_date,
    status: row.status as PredictionStatus,
    actualOutcome: row.actual_outcome,
    sourceNodeIds: row.source_node_ids ? JSON.parse(row.source_node_ids) : [],
    reasoning: row.reasoning,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTimelineEngine(deps: DbDeps) {
  const { db } = deps;

  // -------------------------------------------------------------------------
  // Public API: List predictions for a domain
  // -------------------------------------------------------------------------

  function listPredictions(
    domainId: string,
    options?: { status?: PredictionStatus; limit?: number; offset?: number },
  ): { items: TimelinePrediction[]; total: number } {
    const { status, limit = 50, offset = 0 } = options ?? {};

    const result = status
      ? db.predictions.list({
          where: "domain_id = ? AND status = ?",
          params: [domainId, status],
          limit,
          offset,
          orderBy: "predicted_date",
          orderDir: "DESC",
        })
      : db.predictions.listByDomain(domainId, limit, offset);

    return {
      items: result.items.map(rowToPrediction),
      total: result.total,
    };
  }

  // -------------------------------------------------------------------------
  // Public API: Get single prediction
  // -------------------------------------------------------------------------

  function getPrediction(id: string): TimelinePrediction {
    const row = db.predictions.findById(id);
    if (!row) throw new Error(`Prediction not found: ${id}`);
    return rowToPrediction(row);
  }

  // -------------------------------------------------------------------------
  // Public API: Create prediction manually
  // -------------------------------------------------------------------------

  function createPrediction(params: {
    domainId: string;
    content: string;
    confidence: number;
    predictedDate?: string;
    reasoning?: string;
    sourceNodeIds?: string[];
  }): TimelinePrediction {
    const row = db.predictions.create({
      domain_id: params.domainId,
      content: params.content,
      confidence: params.confidence,
      predicted_date: params.predictedDate ?? null,
      status: "pending" as PredictionStatus,
      actual_outcome: null,
      source_node_ids: params.sourceNodeIds ? JSON.stringify(params.sourceNodeIds) : null,
      reasoning: params.reasoning ?? null,
      verified_at: null,
    } as unknown as Partial<PredictionRow> & Record<string, unknown>);

    return rowToPrediction(row);
  }

  // -------------------------------------------------------------------------
  // Public API: Update prediction
  // -------------------------------------------------------------------------

  function updatePrediction(
    id: string,
    data: {
      content?: string;
      confidence?: number;
      predictedDate?: string;
      reasoning?: string;
    },
  ): TimelinePrediction {
    const updateData: Record<string, unknown> = {};
    if (data.content !== undefined) updateData.content = data.content;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;
    if (data.predictedDate !== undefined) updateData.predicted_date = data.predictedDate;
    if (data.reasoning !== undefined) updateData.reasoning = data.reasoning;

    const updated = db.predictions.update(id, updateData);
    if (!updated) throw new Error(`Prediction not found: ${id}`);
    return rowToPrediction(updated);
  }

  // -------------------------------------------------------------------------
  // Public API: Verify prediction
  // -------------------------------------------------------------------------

  function verifyPrediction(
    id: string,
    status: "confirmed" | "refuted" | "expired",
    actualOutcome?: string,
  ): TimelinePrediction {
    const existing = db.predictions.findById(id);
    if (!existing) throw new Error(`Prediction not found: ${id}`);

    const updateData: Record<string, unknown> = {
      status,
      verified_at: new Date().toISOString(),
    };
    if (actualOutcome !== undefined) updateData.actual_outcome = actualOutcome;

    const updated = db.predictions.update(id, updateData);
    return rowToPrediction(updated!);
  }

  // -------------------------------------------------------------------------
  // Public API: Delete prediction
  // -------------------------------------------------------------------------

  function deletePrediction(id: string): void {
    const deleted = db.predictions.delete(id);
    if (!deleted) throw new Error(`Prediction not found: ${id}`);
  }

  // -------------------------------------------------------------------------
  // Public API: Extract timeline events from knowledge nodes
  // -------------------------------------------------------------------------

  function extractTimelineEvents(
    domainId: string,
    options?: { limit?: number; offset?: number },
  ): { items: TimelineEntry[]; total: number } {
    const nodes = db.knowledgeNodes.listByDomain({
      domainId,
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
    });

    const entries: TimelineEntry[] = [];

    for (const node of nodes.items) {
      if (node.node_type === "event") {
        entries.push({
          id: node.id,
          domainId: node.domain_id,
          type: "event",
          title: node.title,
          description: (node.summary ?? node.content ?? "").slice(0, 200),
          date: node.created_at,
          importance: node.comprehension_score >= 4 ? "high" : node.comprehension_score >= 2 ? "medium" : "low",
          sourceNodeId: node.id,
          metadata: { nodeType: node.node_type },
        });
      } else if (node.node_type === "decision") {
        entries.push({
          id: node.id,
          domainId: node.domain_id,
          type: "milestone",
          title: node.title,
          description: (node.summary ?? node.content ?? "").slice(0, 200),
          date: node.updated_at ?? node.created_at,
          importance: "high",
          sourceNodeId: node.id,
          metadata: { nodeType: node.node_type },
        });
      }
    }

    const predictions = db.predictions.listByDomain(domainId, 50, 0);
    for (const pred of predictions.items) {
      entries.push({
        id: pred.id,
        domainId: pred.domain_id,
        type: "prediction",
        title: pred.content,
        description: pred.reasoning ?? "",
        date: pred.predicted_date ?? pred.created_at,
        importance: pred.confidence >= 0.8 ? "high" : pred.confidence >= 0.5 ? "medium" : "low",
        sourceNodeId: null,
        metadata: {
          confidence: pred.confidence,
          status: pred.status,
          isPrediction: true,
        },
      });
    }

    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { items: entries, total: entries.length };
  }

  // -------------------------------------------------------------------------
  // Public API: Generate trend analysis
  // -------------------------------------------------------------------------

  async function analyzeTrends(
    domainId: string,
    period: "month" | "quarter" | "year" = "quarter",
    modelId?: string,
  ): Promise<TrendAnalysisResult> {
    const domain = db.domains.findById(domainId);
    if (!domain) throw new Error(`Domain not found: ${domainId}`);

    const nodeResult = db.knowledgeNodes.listByDomain({ domainId, limit: 200, offset: 0 });
    if (nodeResult.items.length < 10) {
      throw new Error(
        `Insufficient data for trend analysis. At least 10 knowledge nodes required (current: ${nodeResult.items.length}).`,
      );
    }

    const nodeSummaries = nodeResult.items.map(
      (n) => `- [${n.node_type}] ${n.title} (comprehension: ${n.comprehension_score}, created: ${n.created_at.slice(0, 10)})`,
    );

    const existingPredictions = db.predictions.listByDomain(domainId, 20, 0);
    const predictionSummaries = existingPredictions.items.map(
      (p) => `- [${p.status}] "${p.content}" (confidence: ${Math.round(p.confidence * 100)}%, target: ${p.predicted_date ?? "none"})`,
    );

    const now = new Date();
    const periodDays = period === "month" ? 30 : period === "quarter" ? 90 : 365;
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const recentNodes = nodeResult.items.filter((n) => n.created_at >= periodStart);
    const knowledgeVelocity = Math.round((recentNodes.length / periodDays) * 7 * 10) / 10;

    const prompt = buildTrendAnalysisPrompt(domain.name, period, nodeSummaries, predictionSummaries, knowledgeVelocity);

    const resolvedModelId = await resolveModelId(domainId, modelId);

    const runner = createSessionRunner();
    const { content: fullContent, estimatedCost: costUsd } = await runner.runPrompt(
      domainId,
      resolvedModelId,
      prompt,
    );

    const parsed = parseTrendAnalysis(fullContent, knowledgeVelocity);

    createNode({
      domainId,
      title: `Trend Analysis: ${domain.name} (${period}) — ${now.toLocaleDateString()}`,
      type: "resource",
      content: fullContent,
      sources: [],
    });

    for (const suggestion of parsed.predictionSuggestions) {
      db.predictions.create({
        domain_id: domainId,
        content: suggestion.content,
        confidence: suggestion.confidence,
        predicted_date: suggestion.predictedDate ?? null,
        status: "pending" as PredictionStatus,
        actual_outcome: null,
        source_node_ids: JSON.stringify(nodeResult.items.slice(0, 10).map((n) => n.id)),
        reasoning: "Auto-generated by trend analysis",
        verified_at: null,
      } as unknown as Partial<PredictionRow> & Record<string, unknown>);
    }

    return {
      domainId,
      period,
      report: parsed.report,
      emergingTopics: parsed.emergingTopics,
      decliningTopics: parsed.decliningTopics,
      knowledgeVelocity,
      predictionSuggestions: parsed.predictionSuggestions,
      analyzedAt: now.toISOString(),
      costUsd,
    };
  }

  // -------------------------------------------------------------------------
  // Public API: Generate predictions via AI
  // -------------------------------------------------------------------------

  async function generatePredictions(
    domainId: string,
    modelId?: string,
  ): Promise<TimelinePrediction[]> {
    const domain = db.domains.findById(domainId);
    if (!domain) throw new Error(`Domain not found: ${domainId}`);

    const nodeResult = db.knowledgeNodes.listByDomain({ domainId, limit: 100, offset: 0 });
    if (nodeResult.items.length < 5) {
      throw new Error(
        `Insufficient data for prediction generation. At least 5 knowledge nodes required (current: ${nodeResult.items.length}).`,
      );
    }

    const nodeSummaries = nodeResult.items.map(
      (n) => `- [${n.node_type}] ${n.title}: ${(n.summary ?? "").slice(0, 100)}`,
    );

    const existingPredictions = db.predictions.listByDomain(domainId, 10, 0);
    const existingSummaries = existingPredictions.items.map(
      (p) => `- "${p.content}" [${p.status}] confidence: ${Math.round(p.confidence * 100)}%`,
    );

    const prompt = buildPredictionPrompt(domain.name, nodeSummaries, existingSummaries);
    const resolvedModelId = await resolveModelId(domainId, modelId);

    const runner = createSessionRunner();
    const { content: fullContent } = await runner.runPrompt(domainId, resolvedModelId, prompt);

    const suggestedPredictions = parsePredictionsFromResponse(fullContent);

    const sourceNodeIds = nodeResult.items.slice(0, 10).map((n) => n.id);
    const created: TimelinePrediction[] = [];

    for (const pred of suggestedPredictions) {
      const row = db.predictions.create({
        domain_id: domainId,
        content: pred.content,
        confidence: pred.confidence,
        predicted_date: pred.predictedDate ?? null,
        status: "pending" as PredictionStatus,
        actual_outcome: null,
        source_node_ids: JSON.stringify(sourceNodeIds),
        reasoning: "AI-suggested prediction based on domain knowledge analysis",
        verified_at: null,
      } as unknown as Partial<PredictionRow> & Record<string, unknown>);

      created.push(rowToPrediction(row));
    }

    return created;
  }

  // -------------------------------------------------------------------------
  // Public API: Prediction accuracy tracking
  // -------------------------------------------------------------------------

  function getPredictionAccuracy(domainId: string): PredictionAccuracy {
    const all = db.predictions.list({
      where: "domain_id = ?",
      params: [domainId],
      limit: 10000,
      offset: 0,
    });

    const total = all.items.length;
    const confirmed = all.items.filter((p) => p.status === "confirmed");
    const missed = all.items.filter((p) => p.status === "refuted" || p.status === "expired");
    const pending = all.items.filter((p) => p.status === "pending");

    const avgConfidence = (items: PredictionRow[]) =>
      items.length > 0 ? Math.round((items.reduce((s, p) => s + p.confidence, 0) / items.length) * 100) / 100 : 0;

    return {
      domainId,
      total,
      confirmed: confirmed.length,
      missed: missed.length,
      pending: pending.length,
      confirmedRate: total > 0 ? Math.round((confirmed.length / total) * 100) / 100 : 0,
      missedRate: total > 0 ? Math.round((missed.length / total) * 100) / 100 : 0,
      avgConfirmedConfidence: avgConfidence(confirmed),
      avgMissedConfidence: avgConfidence(missed),
    };
  }

  // -------------------------------------------------------------------------
  // Public API: Auto-expire predictions past their target date
  // -------------------------------------------------------------------------

  function expireOverduePredictions(): number {
    const expired = db.predictions.findExpired();

    for (const pred of expired) {
      db.predictions.update(pred.id, {
        status: "expired",
        verified_at: new Date().toISOString(),
      } as unknown as Partial<PredictionRow>);
    }

    return expired.length;
  }

  // -------------------------------------------------------------------------
  // Wire up timeline_analyze tool executor
  // -------------------------------------------------------------------------

  function initializeTimelineExecutor(): void {
    setTimelineAnalyzeExecutor(async (params) => {
      const result = await analyzeTrends(params.domainId, params.period);

      return {
        domainId: params.domainId,
        period: params.period,
        report: result.report,
        timelineEventCount: result.knowledgeVelocity > 0
          ? Math.round(result.knowledgeVelocity * (params.period === "month" ? 4 : params.period === "quarter" ? 13 : 52))
          : 0,
        predictions: result.predictionSuggestions.map((p) => ({
          content: p.content,
          confidence: p.confidence,
          predictedDate: p.predictedDate,
        })),
      };
    });
  }

  return {
    listPredictions,
    getPrediction,
    createPrediction,
    updatePrediction,
    verifyPrediction,
    deletePrediction,
    extractTimelineEvents,
    analyzeTrends,
    generatePredictions,
    getPredictionAccuracy,
    expireOverduePredictions,
    initializeTimelineExecutor,
  };
}

export type TimelineEngine = ReturnType<typeof createTimelineEngine>;

// ---------------------------------------------------------------------------
// Helpers: prompt building
// ---------------------------------------------------------------------------

function buildTrendAnalysisPrompt(
  domainName: string,
  period: string,
  nodeSummaries: string[],
  predictionSummaries: string[],
  velocity: number,
): string {
  const parts: string[] = [];
  parts.push(`You are a domain analyst examining trends in "${domainName}" over the past ${period}.`);
  parts.push("");
  parts.push(`Knowledge velocity: ${velocity} nodes/week`);
  parts.push("");
  parts.push("## Knowledge Base");
  for (const s of nodeSummaries) parts.push(s);
  parts.push("");
  if (predictionSummaries.length > 0) {
    parts.push("## Existing Predictions");
    for (const s of predictionSummaries) parts.push(s);
    parts.push("");
  }
  parts.push("Analyze trends and produce:");
  parts.push("## Trend Report");
  parts.push("A 2-3 paragraph narrative of key trends and patterns.");
  parts.push("## Emerging Topics");
  parts.push("List 3-5 emerging topics (one per line, prefixed with '-').");
  parts.push("## Declining Topics");
  parts.push("List 1-3 declining topics (one per line, prefixed with '-').");
  parts.push("## Predictions");
  parts.push("Propose 2-4 predictions. Format each as:");
  parts.push("PREDICT: <statement> | CONFIDENCE: <0-100>% | DATE: <target date or none>");
  parts.push("");
  parts.push("Example: PREDICT: GPT-5 will be released by Q3 2026 | CONFIDENCE: 70% | DATE: 2026-09-30");

  return parts.join("\n");
}

function buildPredictionPrompt(
  domainName: string,
  nodeSummaries: string[],
  existingPredictions: string[],
): string {
  const parts: string[] = [];
  parts.push(`You are a domain expert generating forward-looking predictions for "${domainName}".`);
  parts.push("");
  parts.push("## Knowledge Base");
  for (const s of nodeSummaries) parts.push(s);
  parts.push("");
  if (existingPredictions.length > 0) {
    parts.push("## Existing Predictions");
    for (const s of existingPredictions) parts.push(s);
    parts.push("");
  }
  parts.push("Based on the knowledge above, generate 3-5 specific, falsifiable predictions.");
  parts.push("Each prediction must be concrete and time-bounded when possible.");
  parts.push("");
  parts.push("Format each prediction exactly as:");
  parts.push("PREDICT: <statement> | CONFIDENCE: <0-100>% | DATE: <YYYY-MM-DD or none>");

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers: response parsing
// ---------------------------------------------------------------------------

interface ParsedTrendAnalysis {
  report: string;
  emergingTopics: string[];
  decliningTopics: string[];
  predictionSuggestions: Array<{ content: string; confidence: number; predictedDate: string | null }>;
}

function parseTrendAnalysis(raw: string, velocity: number): ParsedTrendAnalysis {
  const extractSection = (heading: string): string => {
    const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=##\\s|$)`, "i");
    const match = raw.match(regex);
    if (!match) return "";
    return match[0].replace(/^##\s*\w+.*\n?/i, "").trim();
  };

  const extractList = (heading: string): string[] => {
    const section = extractSection(heading);
    return section
      .split("\n")
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter((l) => l.length > 0);
  };

  const report = extractSection("Trend Report");
  const emergingTopics = extractList("Emerging Topics");
  const decliningTopics = extractList("Declining Topics");

  // Parse predictions
  const predictionSuggestions: Array<{ content: string; confidence: number; predictedDate: string | null }> = [];
  const predSection = extractSection("Predictions");
  const predRegex = /PREDICT:\s*(.+?)\s*\|\s*CONFIDENCE:\s*(\d+)%\s*\|\s*DATE:\s*(\S+)/gi;
  let match: RegExpExecArray | null;

  while ((match = predRegex.exec(predSection)) !== null) {
    const dateStr = match[3].toLowerCase() === "none" ? null : match[3];
    predictionSuggestions.push({
      content: match[1].trim(),
      confidence: parseInt(match[2], 10) / 100,
      predictedDate: dateStr,
    });
  }

  return {
    report: report || raw.slice(0, 500),
    emergingTopics,
    decliningTopics,
    predictionSuggestions,
  };
}

function parsePredictionsFromResponse(
  raw: string,
): Array<{ content: string; confidence: number; predictedDate: string | null }> {
  const predictions: Array<{ content: string; confidence: number; predictedDate: string | null }> = [];
  const regex = /PREDICT:\s*(.+?)\s*\|\s*CONFIDENCE:\s*(\d+)%\s*\|\s*DATE:\s*(\S+)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const dateStr = match[3].toLowerCase() === "none" ? null : match[3];
    predictions.push({
      content: match[1].trim(),
      confidence: parseInt(match[2], 10) / 100,
      predictedDate: dateStr,
    });
  }

  return predictions;
}


