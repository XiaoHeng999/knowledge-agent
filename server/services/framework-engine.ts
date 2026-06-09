/**
 * FrameworkEngine — extensible analysis framework engine with built-in frameworks,
 * result generation, knowledge node creation, ADR generation, historical decision
 * retrieval, and domain summary with three-layer memory architecture.
 */
import { getDatabaseService } from "../db/index";
import { getPiMonoWrapper } from "../pi-mono/instance";
import { resolveModelId } from "../lib/model-resolver";
import { createNode } from "./knowledge-graph";
import { readConfig } from "./domain-config";
import type { CustomFrameworkConfig } from "./domain-config";
import type {
  FrameworkType,
  FrameworkResultRow,
  DecisionRow,
  DecisionStatus,
  KnowledgeNodeRow,
} from "../db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrameworkDefinition {
  type: FrameworkType;
  name: string;
  description: string;
  minNodes: number;
  promptTemplate: (domainName: string, nodeSummaries: string[], decisions: string[]) => string;
  parseResult: (raw: string) => FrameworkParsedResult;
}

export interface FrameworkParsedResult {
  title: string;
  summary: string;
  score?: number;
  details: string;
  tags: string[];
}

export interface FrameworkAnalysisResult {
  id: string;
  domainId: string;
  frameworkType: FrameworkType;
  title: string;
  analysisData: string;
  sourceNodeIds: string[];
  knowledgeNodeIds: string[];
  modelId: string | null;
  costUsd: number;
  createdAt: string;
}

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
// Built-in framework definitions
// ---------------------------------------------------------------------------

const BUILT_IN_FRAMEWORKS: FrameworkDefinition[] = [
  {
    type: "trl",
    name: "Technology Readiness Level",
    description: "Assess technology maturity on a 1-9 scale based on available evidence.",
    minNodes: 3,
    promptTemplate: (domain, summaries, decisions) => {
      const parts: string[] = [];
      parts.push(`You are a technology analyst evaluating the readiness level of technologies in the "${domain}" domain.`);
      parts.push("");
      parts.push("## Available Knowledge");
      for (const s of summaries) {
        parts.push(`- ${s}`);
      }
      if (decisions.length > 0) {
        parts.push("");
        parts.push("## Previous Decisions");
        for (const d of decisions) {
          parts.push(`- ${d}`);
        }
      }
      parts.push("");
      parts.push("Analyze the technology readiness level for this domain. For each key technology:");
      parts.push("1. Assign a TRL score (1-9) where 1=basic research, 9=full deployment");
      parts.push("2. Provide evidence citations from the knowledge base");
      parts.push("3. Identify gaps preventing advancement to the next level");
      parts.push("4. Recommend actions to bridge those gaps");
      parts.push("");
      parts.push("Format your response as:");
      parts.push("## Overall TRL Assessment");
      parts.push("Average TRL: X.X");
      parts.push("");
      parts.push("## Technology Breakdown");
      parts.push("For each technology: name, TRL score, evidence, gaps");
      parts.push("");
      parts.push("## Key Gaps & Recommendations");
      parts.push("Prioritized list of actions to advance readiness.");

      return parts.join("\n");
    },
    parseResult: (raw) => {
      const trlMatch = raw.match(/Average TRL:\s*([\d.]+)/i);
      const score = trlMatch ? parseFloat(trlMatch[1]) : undefined;
      const titleMatch = raw.match(/##\s*Overall TRL Assessment/i);
      const summaryEnd = titleMatch ? titleMatch.index : raw.indexOf("##");
      const summary = summaryEnd && summaryEnd > 0
        ? raw.slice(0, summaryEnd).trim().slice(0, 300)
        : raw.slice(0, 300).trim();

      return {
        title: `TRL Analysis — Level ${score ?? "?"}`,
        summary,
        score,
        details: raw,
        tags: ["framework", "trl-analysis"],
      };
    },
  },
  {
    type: "competitive_landscape",
    name: "Competitive Landscape Analysis",
    description: "Map competitors, market positions, and strategic implications.",
    minNodes: 5,
    promptTemplate: (domain, summaries, decisions) => {
      const parts: string[] = [];
      parts.push(`You are a strategic analyst mapping the competitive landscape for the "${domain}" domain.`);
      parts.push("");
      parts.push("## Available Knowledge");
      for (const s of summaries) {
        parts.push(`- ${s}`);
      }
      if (decisions.length > 0) {
        parts.push("");
        parts.push("## Previous Strategic Decisions");
        for (const d of decisions) {
          parts.push(`- ${d}`);
        }
      }
      parts.push("");
      parts.push("Analyze the competitive landscape:");
      parts.push("1. Identify key players/technologies/approaches and their market positions");
      parts.push("2. Assess strengths and weaknesses of each");
      parts.push("3. Map competitive dynamics (cooperation, disruption, consolidation)");
      parts.push("4. Identify strategic opportunities and threats");
      parts.push("5. Recommend positioning strategy");
      parts.push("");
      parts.push("Format your response as:");
      parts.push("## Market Overview");
      parts.push("## Key Players & Positions");
      parts.push("## Competitive Dynamics");
      parts.push("## Opportunities & Threats");
      parts.push("## Strategic Recommendations");

      return parts.join("\n");
    },
    parseResult: (raw) => ({
      title: "Competitive Landscape Analysis",
      summary: raw.slice(0, 300).trim(),
      details: raw,
      tags: ["framework", "competitive-landscape"],
    }),
  },
  {
    type: "hype_cycle",
    name: "Gartner Hype Cycle Positioning",
    description: "Position technologies on the hype cycle curve based on maturity and adoption signals.",
    minNodes: 4,
    promptTemplate: (domain, summaries, decisions) => {
      const parts: string[] = [];
      parts.push(`You are a technology analyst positioning technologies in the "${domain}" domain on a Gartner-style hype cycle.`);
      parts.push("");
      parts.push("## Available Knowledge");
      for (const s of summaries) {
        parts.push(`- ${s}`);
      }
      if (decisions.length > 0) {
        parts.push("");
        parts.push("## Context Decisions");
        for (const d of decisions) {
          parts.push(`- ${d}`);
        }
      }
      parts.push("");
      parts.push("For each technology in this domain:");
      parts.push("1. Position it on the hype cycle: Innovation Trigger, Peak of Inflated Expectations, Trough of Disillusionment, Slope of Enlightenment, Plateau of Productivity");
      parts.push("2. Estimate time to mainstream adoption (2-5 years, 5-10 years, 10+ years, or already mainstream)");
      parts.push("3. Assess the current sentiment vs. actual capability");
      parts.push("4. Identify signals that would indicate movement to the next phase");
      parts.push("");
      parts.push("Format your response as:");
      parts.push("## Hype Cycle Map");
      parts.push("## Technology Positions");
      parts.push("## Key Signals & Predictions");

      return parts.join("\n");
    },
    parseResult: (raw) => ({
      title: "Hype Cycle Positioning",
      summary: raw.slice(0, 300).trim(),
      details: raw,
      tags: ["framework", "hype-cycle"],
    }),
  },
];

// ---------------------------------------------------------------------------
// Custom framework builder
// ---------------------------------------------------------------------------

export function buildCustomFrameworkDefinition(cfg: CustomFrameworkConfig): FrameworkDefinition {
  return {
    type: "custom",
    name: cfg.name,
    description: cfg.description,
    minNodes: 1,
    promptTemplate: (domainName, nodeSummaries, decisionSummaries) => {
      const parts: string[] = [];
      parts.push(`You are analyzing the "${domainName}" domain using the "${cfg.name}" framework.`);
      parts.push("");
      parts.push(`## Framework: ${cfg.name}`);
      parts.push(cfg.description);
      parts.push("");
      parts.push("## Dimensions");
      for (const dim of cfg.dimensions) {
        parts.push(`- ${dim}`);
      }
      parts.push("");
      if (nodeSummaries.length > 0) {
        parts.push("## Knowledge Nodes");
        for (const s of nodeSummaries) {
          parts.push(`- ${s}`);
        }
        parts.push("");
      }
      if (decisionSummaries.length > 0) {
        parts.push("## Previous Decisions");
        for (const d of decisionSummaries) {
          parts.push(`- ${d}`);
        }
        parts.push("");
      }
      parts.push("## Scoring Instructions");
      parts.push(cfg.scoringPrompt);
      return parts.join("\n");
    },
    parseResult: (raw) => ({
      title: cfg.name,
      summary: raw.slice(0, 300).trim(),
      details: raw,
      tags: ["framework", "custom-analysis"],
    }),
  };
}

// ---------------------------------------------------------------------------
// Row → IPC type mapping
// ---------------------------------------------------------------------------

function rowToResult(row: FrameworkResultRow): FrameworkAnalysisResult {
  return {
    id: row.id,
    domainId: row.domain_id,
    frameworkType: row.framework_type as FrameworkType,
    title: row.title,
    analysisData: row.analysis_data,
    sourceNodeIds: row.source_node_ids ? JSON.parse(row.source_node_ids) : [],
    knowledgeNodeIds: row.knowledge_node_ids ? JSON.parse(row.knowledge_node_ids) : [],
    modelId: row.model_id,
    costUsd: row.cost_usd,
    createdAt: row.created_at,
  };
}

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

export function extractSlugFromConfigPath(configPath: string): string {
  // configPath is like /path/to/domains/my-domain/config.yaml — extract "my-domain"
  const parts = configPath.replace(/\\/g, "/").split("/");
  const domainsIdx = parts.lastIndexOf("domains");
  if (domainsIdx >= 0 && parts.length > domainsIdx + 1) {
    return parts[domainsIdx + 1];
  }
  return parts[parts.length - 2] ?? "";
}

// ---------------------------------------------------------------------------
// Public API: Framework listing
// ---------------------------------------------------------------------------

export async function listFrameworks(domainId?: string): Promise<Array<{ type: FrameworkType; name: string; description: string; minNodes: number }>> {
  const builtIn = BUILT_IN_FRAMEWORKS.map((f) => ({
    type: f.type,
    name: f.name,
    description: f.description,
    minNodes: f.minNodes,
  }));

  if (!domainId) return builtIn;

  const db = getDatabaseService();
  const domain = db.domains.findById(domainId);
  if (!domain) return builtIn;

  const domainSlug = extractSlugFromConfigPath(domain.config_path);
  const config = await readConfig(domainSlug);
  if (config?.customFramework) {
    const custom = buildCustomFrameworkDefinition(config.customFramework);
    return [...builtIn, { type: custom.type, name: custom.name, description: custom.description, minNodes: custom.minNodes }];
  }

  return builtIn;
}

export async function getFrameworkDefinition(type: FrameworkType, domainSlug?: string): Promise<FrameworkDefinition | undefined> {
  if (type === "custom" && domainSlug) {
    const config = await readConfig(domainSlug);
    if (config?.customFramework) return buildCustomFrameworkDefinition(config.customFramework);
  }
  return BUILT_IN_FRAMEWORKS.find((f) => f.type === type);
}

// ---------------------------------------------------------------------------
// Public API: Execute framework analysis
// ---------------------------------------------------------------------------

export async function executeFrameworkAnalysis(
  domainId: string,
  frameworkType: FrameworkType,
  modelId?: string,
): Promise<FrameworkAnalysisResult> {
  const db = getDatabaseService();

  // Get domain info
  const domain = db.domains.findById(domainId);
  if (!domain) throw new Error(`Domain not found: ${domainId}`);

  // Resolve framework definition (custom reads from domain config)
  let framework: FrameworkDefinition | undefined;
  if (frameworkType === "custom") {
    const domainSlug = extractSlugFromConfigPath(domain.config_path);
    const config = await readConfig(domainSlug);
    if (!config?.customFramework) throw new Error("No custom framework defined for this domain");
    framework = buildCustomFrameworkDefinition(config.customFramework);
  } else {
    framework = BUILT_IN_FRAMEWORKS.find((f) => f.type === frameworkType);
  }
  if (!framework) throw new Error(`Unknown framework type: ${frameworkType}`);

  // Collect knowledge nodes
  const nodeResult = db.knowledgeNodes.listByDomain({
    domainId,
    limit: 100,
    offset: 0,
  });

  if (nodeResult.items.length < framework.minNodes) {
    throw new Error(
      `Insufficient data for ${framework.name}. At least ${framework.minNodes} knowledge nodes recommended. ` +
      `Currently: ${nodeResult.items.length}. Add more knowledge or proceed with caution.`,
    );
  }

  const sourceNodeIds = nodeResult.items.map((n) => n.id);
  const nodeSummaries = nodeResult.items.map(
    (n) => `${n.title} (${n.node_type}, comprehension: ${n.comprehension_score})`,
  );

  // Collect recent historical decisions
  const decisionsResult = db.decisionRecords.listByDomain(domainId, 10, 0);
  const decisionSummaries = decisionsResult.items.map(
    (d) => `ADR-${String(d.decision_number).padStart(3, "0")}: ${d.title} [${d.status}]`,
  );

  // Resolve model
  const resolvedModelId = await resolveModelId(domainId, modelId);

  // Build prompt
  const prompt = framework.promptTemplate(
    domain.name,
    nodeSummaries,
    decisionSummaries,
  );

  // Execute via pi-mono
  const wrapper = getPiMonoWrapper();
  let fullContent = "";
  let costUsd = 0;

  const sessionResult = await wrapper.createExpertSession(domainId, resolvedModelId);
  const sessionId = sessionResult.sessionId;

  const unsubscribe = sessionResult.session.subscribe((event) => {
    if (event.type === "message_update") {
      const assistantEvent = event.assistantMessageEvent;
      if (assistantEvent && "textDelta" in assistantEvent) {
        fullContent += (assistantEvent as { textDelta: string }).textDelta;
      }
    }
  });

  await sessionResult.session.prompt(prompt);
  unsubscribe();
  wrapper.destroySession(sessionId);

  // Estimate cost
  const models = await wrapper.listAvailableModels();
  const model = models.find((m) => m.id === resolvedModelId);
  if (model) {
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(fullContent.length / 4);
    costUsd =
      (inputTokens / 1_000_000) * model.costPerMillionInput +
      (outputTokens / 1_000_000) * model.costPerMillionOutput;
  }

  // Parse result
  const parsed = framework.parseResult(fullContent);

  // Store result
  const resultRow = db.frameworkResults.create({
    domain_id: domainId,
    framework_type: frameworkType,
    title: parsed.title,
    analysis_data: JSON.stringify({ raw: fullContent, parsed }),
    source_node_ids: JSON.stringify(sourceNodeIds),
    knowledge_node_ids: null,
    model_id: resolvedModelId,
    cost_usd: costUsd,
  } as unknown as Partial<FrameworkResultRow> & Record<string, unknown>);

  // Create knowledge node from result
  const knowledgeNode = createNode({
    domainId,
    title: `${framework.name}: ${domain.name} — ${new Date().toLocaleDateString()}`,
    type: "resource",
    content: fullContent,
    sources: [],
  });

  // Update result with knowledge node id
  db.frameworkResults.update(resultRow.id, {
    knowledge_node_ids: JSON.stringify([knowledgeNode.id]),
  } as unknown as Partial<FrameworkResultRow>);

  const updated = db.frameworkResults.findById(resultRow.id);
  return rowToResult(updated!);
}

// ---------------------------------------------------------------------------
// Public API: List framework results
// ---------------------------------------------------------------------------

export function listFrameworkResults(
  domainId: string,
  frameworkType?: FrameworkType,
): { items: FrameworkAnalysisResult[]; total: number } {
  const db = getDatabaseService();

  const result = frameworkType
    ? db.frameworkResults.listByType(domainId, frameworkType)
    : db.frameworkResults.listByDomain(domainId);

  return {
    items: result.items.map(rowToResult),
    total: result.total,
  };
}

// ---------------------------------------------------------------------------
// Public API: Get single framework result
// ---------------------------------------------------------------------------

export function getFrameworkResult(id: string): FrameworkAnalysisResult {
  const db = getDatabaseService();
  const row = db.frameworkResults.findById(id);
  if (!row) throw new Error(`Framework result not found: ${id}`);
  return rowToResult(row);
}

// ---------------------------------------------------------------------------
// Public API: Decision Record (ADR) generation
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

// ---------------------------------------------------------------------------
// Public API: Domain summary generation with three-layer memory
// ---------------------------------------------------------------------------

export async function generateDomainSummary(domainId: string): Promise<DomainSummaryResult> {
  const db = getDatabaseService();
  const wrapper = getPiMonoWrapper();

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

  let fullContent = "";
  const sessionResult = await wrapper.createExpertSession(domainId, resolvedModelId);
  const sessionId = sessionResult.sessionId;

  const unsubscribe = sessionResult.session.subscribe((event) => {
    if (event.type === "message_update") {
      const assistantEvent = event.assistantMessageEvent;
      if (assistantEvent && "textDelta" in assistantEvent) {
        fullContent += (assistantEvent as { textDelta: string }).textDelta;
      }
    }
  });

  await sessionResult.session.prompt(prompt);
  unsubscribe();
  wrapper.destroySession(sessionId);

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

  // Prefer cheap models for summaries
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
