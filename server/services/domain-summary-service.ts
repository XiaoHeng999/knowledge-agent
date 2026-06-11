/**
 * DomainSummaryService — domain summary generation and three-layer memory statistics.
 * Extracted from framework-engine for single-responsibility.
 */
import { getDatabaseService } from "../db/index";
import { getPiMonoWrapper } from "../pi-mono/instance";
import { createSessionRunner } from "./session-runner";
import { createNode } from "./knowledge-graph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainSummaryResult {
  domainId: string;
  domainName: string;
  executiveSummary: string;
  keyFindings: string[];
  activePredictions: string[];
  decisionLog: string[];
  recommendedActions: string[];
  hotLayerCount: number;
  warmLayerCount: number;
  coldLayerCount: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Public API: Domain summary generation with three-layer memory
// ---------------------------------------------------------------------------

export async function generateDomainSummary(domainId: string): Promise<DomainSummaryResult> {
  const db = getDatabaseService();

  const domain = db.domains.findById(domainId);
  if (!domain) throw new Error(`Domain not found: ${domainId}`);

  const now = new Date();
  const hotCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const warmCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Three-layer memory retrieval
  const allNodes = db.knowledgeNodes.listByDomain({ domainId, limit: 10000, offset: 0 }).items;
  const hotNodes = allNodes.filter((n) => n.created_at >= hotCutoff || n.updated_at >= hotCutoff);
  const warmNodes = allNodes.filter(
    (n) =>
      (n.created_at >= warmCutoff || n.updated_at >= warmCutoff) &&
      !hotNodes.some((h) => h.id === n.id),
  );
  const coldNodes = allNodes.filter(
    (n) => !hotNodes.some((h) => h.id === n.id) && !warmNodes.some((w) => w.id === n.id),
  );

  // Build summaries for prompt
  const hotSummaries = hotNodes.map((n) => `[HOT] ${n.title}: ${(n.content ?? "").slice(0, 200)}`);
  const warmSummaries = warmNodes.slice(0, 20).map((n) => `[WARM] ${n.title}: ${(n.content ?? "").slice(0, 150)}`);
  const recentDecisions = db.decisionRecords.listByDomain(domainId, 5, 0).items;
  const decisionSummaries = recentDecisions.map(
    (d) => `ADR-${String(d.decision_number).padStart(3, "0")}: ${d.title} — ${d.status}`,
  );

  const prompt = buildSummaryPrompt(domain.name, hotSummaries, warmSummaries, decisionSummaries);

  // Resolve model for summary
  const resolvedModelId = await resolveSummaryModel(domainId);

  const runner = createSessionRunner();
  const { content: fullContent } = await runner.runPrompt(domainId, resolvedModelId, prompt);

  // Parse the summary
  const parsed = parseSummaryResponse(fullContent);

  // Also store as auto-summary knowledge node
  createNode({
    domainId,
    title: `Domain Summary: ${domain.name} — ${now.toLocaleDateString()}`,
    type: "resource",
    content: fullContent,
    sources: [],
  });

  return {
    domainId,
    domainName: domain.name,
    executiveSummary: parsed.executiveSummary,
    keyFindings: parsed.keyFindings,
    activePredictions: parsed.activePredictions,
    decisionLog: parsed.decisionLog,
    recommendedActions: parsed.recommendedActions,
    hotLayerCount: hotNodes.length,
    warmLayerCount: warmNodes.length,
    coldLayerCount: coldNodes.length,
    generatedAt: now.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API: Get memory layer stats
// ---------------------------------------------------------------------------

export function getMemoryLayerStats(domainId: string): {
  hot: number;
  warm: number;
  cold: number;
  total: number;
} {
  const db = getDatabaseService();
  const now = new Date();
  const hotCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const warmCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const allNodes = db.knowledgeNodes.listByDomain({ domainId, limit: 10000, offset: 0 }).items;
  const hot = allNodes.filter((n) => n.created_at >= hotCutoff || n.updated_at >= hotCutoff).length;
  const warm = allNodes.filter(
    (n) =>
      (n.created_at >= warmCutoff || n.updated_at >= warmCutoff) &&
      !(n.created_at >= hotCutoff || n.updated_at >= hotCutoff),
  ).length;
  const cold = allNodes.length - hot - warm;

  return { hot, warm, cold, total: allNodes.length };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveSummaryModel(domainId: string): Promise<string> {
  const db = getDatabaseService();
  const domain = db.domains.findById(domainId);
  if (domain?.default_summary_model) return domain.default_summary_model;

  const wrapper = getPiMonoWrapper();
  const models = await wrapper.listAvailableModels();
  const cheapProviders = ["deepseek", "groq", "ollama"];
  for (const provider of cheapProviders) {
    const match = models.find((m) => m.provider === provider);
    if (match) return match.id;
  }

  if (models.length > 0) return models[0].id;
  throw new Error("No model available for summary generation.");
}

function buildSummaryPrompt(
  domainName: string,
  hotSummaries: string[],
  warmSummaries: string[],
  decisionSummaries: string[],
): string {
  const parts: string[] = [];
  parts.push(`Generate a comprehensive domain summary for "${domainName}".`);
  parts.push("");
  parts.push("## Recent Knowledge (Hot — last 24 hours)");
  if (hotSummaries.length > 0) {
    for (const s of hotSummaries) parts.push(s);
  } else {
    parts.push("(no recent activity)");
  }
  parts.push("");
  parts.push("## Recent Knowledge (Warm — last 30 days)");
  if (warmSummaries.length > 0) {
    for (const s of warmSummaries) parts.push(s);
  } else {
    parts.push("(no warm data)");
  }
  parts.push("");
  if (decisionSummaries.length > 0) {
    parts.push("## Recent Decisions");
    for (const d of decisionSummaries) parts.push(d);
    parts.push("");
  }
  parts.push("Produce a structured summary with these sections:");
  parts.push("## Executive Summary");
  parts.push("2-3 sentence high-level overview.");
  parts.push("## Key Findings");
  parts.push("3-5 bullet points with the most important discoveries or patterns.");
  parts.push("## Active Predictions");
  parts.push("Any predictions or forecasts mentioned in the knowledge base (or 'None identified').");
  parts.push("## Decision Log");
  parts.push("Summary of key decisions made and their current status.");
  parts.push("## Recommended Actions");
  parts.push("3-5 actionable recommendations based on the analysis.");

  return parts.join("\n");
}

interface ParsedSummary {
  executiveSummary: string;
  keyFindings: string[];
  activePredictions: string[];
  decisionLog: string[];
  recommendedActions: string[];
}

function parseSummaryResponse(raw: string): ParsedSummary {
  const extractSection = (heading: string): string[] => {
    const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=##|$)`, "i");
    const match = raw.match(regex);
    if (!match) return [];
    const content = match[0].replace(/^##\s*\w+.*\n?/i, "").trim();
    return content
      .split("\n")
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter((l) => l.length > 0);
  };

  const extractParagraph = (heading: string): string => {
    const regex = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=##|$)`, "i");
    const match = raw.match(regex);
    if (!match) return "";
    return match[0].replace(/^##\s*\w+.*\n?/i, "").trim();
  };

  return {
    executiveSummary: extractParagraph("Executive Summary"),
    keyFindings: extractSection("Key Findings"),
    activePredictions: extractSection("Active Predictions"),
    decisionLog: extractSection("Decision Log"),
    recommendedActions: extractSection("Recommended Actions"),
  };
}
