/**
 * FrameworkEngine — extensible analysis framework engine with built-in frameworks,
 * result generation, knowledge node creation, and domain summary with three-layer
 * memory architecture.
 */
import type { DbDeps } from "./types";
import { createSessionRunner } from "./session-runner";
import { resolveModelId } from "../lib/model-resolver";
import { createNode } from "./knowledge-graph";
import { readConfig, extractSlugFromConfigPath } from "./domain-config";
import { BUILT_IN_FRAMEWORKS, buildCustomFrameworkDefinition } from "./framework-definitions";
import type {
  FrameworkType,
  FrameworkResultRow,
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

export type { DecisionRecordResult } from "./decision-service";

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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createFrameworkEngine(deps: DbDeps) {
  const { db } = deps;

  // -------------------------------------------------------------------------
  // Public API: Framework listing
  // -------------------------------------------------------------------------

  async function listFrameworks(domainId?: string): Promise<Array<{ type: FrameworkType; name: string; description: string; minNodes: number }>> {
    const builtIn = BUILT_IN_FRAMEWORKS.map((f) => ({
      type: f.type,
      name: f.name,
      description: f.description,
      minNodes: f.minNodes,
    }));

    if (!domainId) return builtIn;

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

  // -------------------------------------------------------------------------
  // Public API: Execute framework analysis
  // -------------------------------------------------------------------------

  async function executeFrameworkAnalysis(
    domainId: string,
    frameworkType: FrameworkType,
    modelId?: string,
  ): Promise<FrameworkAnalysisResult> {
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

    // Execute via SessionRunner
    const runner = createSessionRunner();
    const { content: fullContent, estimatedCost: costUsd } = await runner.runPrompt(
      domainId,
      resolvedModelId,
      prompt,
    );

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

  // -------------------------------------------------------------------------
  // Public API: List framework results
  // -------------------------------------------------------------------------

  function listFrameworkResults(
    domainId: string,
    frameworkType?: FrameworkType,
  ): { items: FrameworkAnalysisResult[]; total: number } {
    const result = frameworkType
      ? db.frameworkResults.listByType(domainId, frameworkType)
      : db.frameworkResults.listByDomain(domainId);

    return {
      items: result.items.map(rowToResult),
      total: result.total,
    };
  }

  // -------------------------------------------------------------------------
  // Public API: Get single framework result
  // -------------------------------------------------------------------------

  function getFrameworkResult(id: string): FrameworkAnalysisResult {
    const row = db.frameworkResults.findById(id);
    if (!row) throw new Error(`Framework result not found: ${id}`);
    return rowToResult(row);
  }

  return {
    listFrameworks,
    executeFrameworkAnalysis,
    listFrameworkResults,
    getFrameworkResult,
  };
}

export type FrameworkEngine = ReturnType<typeof createFrameworkEngine>;
