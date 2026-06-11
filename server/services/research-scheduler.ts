/**
 * ResearchScheduler service — cron-based research scheduling, agent execution,
 * result processing, and cost tracking for the F2 scheduled research agent.
 */
import type { FullDeps } from "./types";
import type { ResearchRunRow, ResearchRunStatus, ResearchTriggerType } from "../db/schema";
import type { ResearchStatus, ResearchDashboardResponse } from "../../src/lib/ipc/channels";
import { readConfig, type DomainConfigFile } from "./domain-config";
import { createNode } from "./knowledge-graph";
import { resolveBudgetStatus } from "./research-cost-tracker";
import { createLogger } from "./logger";
import { createSessionRunner } from "./session-runner";
import { createTrackerCostEstimator } from "./cost-estimator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveRun {
  runId: string;
  domainId: string;
  abortController: AbortController;
  startedAt: string;
}

// ---------------------------------------------------------------------------
// Row → IPC type mapping
// ---------------------------------------------------------------------------

function rowToStatus(row: ResearchRunRow): ResearchStatus {
  return {
    id: row.id,
    domainId: row.domain_id,
    status: row.status as ResearchStatus["status"],
    progress: row.status === "completed" || row.status === "over_budget" ? 100 : row.status === "failed" ? 0 : 50,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// Cron expression parser (simplified: only standard 5-field cron)
// ---------------------------------------------------------------------------

function parseCronMinutes(expr: string): number {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 60;

  const minutePart = parts[0];
  if (minutePart === "*") return 60;

  const minutes = new Set<number>();
  for (const seg of minutePart.split(",")) {
    if (seg.includes("/")) {
      const [, stepStr] = seg.split("/");
      const step = parseInt(stepStr, 10);
      if (step > 0) return step;
    }
    const m = parseInt(seg, 10);
    if (!isNaN(m)) minutes.add(m);
  }

  return minutes.size > 0 ? Math.max(1, ...Array.from(minutes)) * 1 : 60;
}

function shouldRunNow(expr: string, now: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minField, hourField, domField, monField, dowField] = parts;

  const matches = (field: string, value: number): boolean => {
    if (field === "*") return true;
    for (const seg of field.split(",")) {
      if (seg.includes("/")) {
        const [base, step] = seg.split("/");
        if (base === "*" || parseInt(base, 10) === value) {
          return value % parseInt(step, 10) === 0;
        }
        continue;
      }
      if (seg.includes("-")) {
        const [lo, hi] = seg.split("-").map(Number);
        if (value >= lo && value <= hi) return true;
        continue;
      }
      if (parseInt(seg, 10) === value) return true;
    }
    return false;
  };

  return (
    matches(minField, now.getMinutes()) &&
    matches(hourField, now.getHours()) &&
    matches(domField, now.getDate()) &&
    matches(monField, now.getMonth() + 1) &&
    matches(dowField, now.getDay())
  );
}

// ---------------------------------------------------------------------------
// Research prompt builder
// ---------------------------------------------------------------------------

function buildResearchPrompt(config: DomainConfigFile): string {
  const templates = config.research.queryTemplates;
  const tags = config.tags;
  const sourceNames = config.sources.map((s) => s.name);

  const topic = tags.length > 0 ? tags[Math.floor(Math.random() * tags.length)] : config.name;
  const template =
    templates.length > 0
      ? templates[Math.floor(Math.random() * templates.length)]
      : "What are the latest developments in {topic}?";

  const query = template.replace("{topic}", topic).replace("{year}", String(new Date().getFullYear()));

  const parts: string[] = [];
  parts.push(`You are a research assistant for the "${config.name}" domain.`);
  parts.push(`Description: ${config.description}`);
  if (sourceNames.length > 0) {
    parts.push(`Available sources: ${sourceNames.join(", ")}`);
  }
  parts.push("");
  parts.push(`Research question: ${query}`);
  parts.push("");
  parts.push(
    "Provide a concise research summary with key findings. Structure your response as:",
  );
  parts.push("## Summary");
  parts.push("A 2-3 sentence overview of the findings.");
  parts.push("## Key Findings");
  parts.push("3-5 bullet points with the most important discoveries.");
  parts.push("## Implications");
  parts.push("1-2 sentences on why these findings matter for this domain.");

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createResearchScheduler(deps: FullDeps) {
  const { db, piMono } = deps;
  const log = createLogger("ResearchScheduler");

  const activeRuns = new Map<string, ActiveRun>();
  const cronTimers = new Map<string, ReturnType<typeof setInterval>>();
  let schedulerInterval: ReturnType<typeof setInterval> | null = null;

  // -------------------------------------------------------------------------
  // Resolve research model — use domain config, or fallback to cheapest
  // -------------------------------------------------------------------------

  async function resolveResearchModel(config: DomainConfigFile): Promise<string> {
    if (config.models.research) return config.models.research;

    const models = await piMono.listAvailableModels();

    const cheapProviders = ["deepseek", "groq", "ollama"];
    for (const provider of cheapProviders) {
      const match = models.find(
        (m) => m.provider === provider && m.available,
      );
      if (match) return match.id;
    }

    if (models.length > 0) return models[0].id;

    throw new Error("No model available for research. Configure a research model or add an API key.");
  }

  // -------------------------------------------------------------------------
  // Core: execute a research run
  // -------------------------------------------------------------------------

  async function executeResearchRun(
    domainId: string,
    triggerType: ResearchTriggerType,
    runId: string,
    abortSignal: AbortSignal,
  ): Promise<void> {
    const domain = db.domains.findById(domainId);
    if (!domain) throw new Error(`Domain not found: ${domainId}`);

    const config = await readConfig(domain.config_path);
    if (!config) throw new Error(`Domain config not found: ${domain.config_path}`);

    const todayRuns = db.researchRuns.countByDomainToday(domainId);
    if (todayRuns >= config.research.maxDailyRuns) {
      throw new Error(`Daily research limit reached (${config.research.maxDailyRuns}) for domain ${config.name}`);
    }

    const modelId = await resolveResearchModel(config);

    const prompt = buildResearchPrompt(config);

    db.researchRuns.update(runId, {
      model_id: modelId,
      query: prompt.slice(0, 500),
      status: "running" as ResearchRunStatus,
    } as unknown as Partial<ResearchRunRow>);

    let fullContent = "";

    const { estimator, onSessionCreated } = createTrackerCostEstimator(runId);
    const runner = createSessionRunner(estimator, onSessionCreated);

    try {
      const result = await runner.runPrompt(domainId, modelId, prompt);
      fullContent = result.content;

      if (abortSignal.aborted) {
        db.researchRuns.update(runId, {
          status: "cancelled" as ResearchRunStatus,
          completed_at: new Date().toISOString(),
        } as unknown as Partial<ResearchRunRow>);
        return;
      }

      const budgetStatus = resolveBudgetStatus(result.estimatedCost, config.research.maxCostPerRunUsd);

      let nodesCreated = 0;
      if (fullContent.trim()) {
        createNode({
          domainId,
          title: `Research: ${config.name} — ${new Date().toLocaleDateString()}`,
          type: "resource",
          content: fullContent,
          sources: config.sources.map((s) => s.url),
        });
        nodesCreated = 1;
      }

      db.researchRuns.update(runId, {
        status: budgetStatus as ResearchRunStatus,
        findings_summary: fullContent.slice(0, 1000),
        knowledge_nodes_created: nodesCreated,
        cost_usd: result.estimatedCost,
        token_count: result.estimatedTokens,
        completed_at: new Date().toISOString(),
      } as unknown as Partial<ResearchRunRow>);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      const trackedUsage = estimator.estimateTokens("", "");
      const trackedCost = estimator.estimateCost(trackedUsage, modelId);

      db.researchRuns.update(runId, {
        status: "failed" as ResearchRunStatus,
        error_message: errorMessage,
        cost_usd: trackedCost,
        token_count: trackedUsage.input + trackedUsage.output,
        completed_at: new Date().toISOString(),
      } as unknown as Partial<ResearchRunRow>);

      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Cron scheduler — tick every minute, check all domain schedules
  // -------------------------------------------------------------------------

  async function checkAllSchedules(now: Date): Promise<void> {
    const domains = db.domains.list({ limit: 1000, offset: 0 });

    for (const domain of domains.items) {
      if (!domain.research_schedule) continue;

      const hasActive = Array.from(activeRuns.values()).some((r) => r.domainId === domain.id);
      if (hasActive) continue;

      if (shouldRunNow(domain.research_schedule, now)) {
        try {
          await triggerResearch(domain.id, "scheduled");
          log.info(`Triggered scheduled research for domain: ${domain.name}`);
        } catch (err) {
          log.error(
            `Failed to trigger for ${domain.name}`,
            err instanceof Error ? err : undefined,
          );
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  async function triggerResearch(
    domainId: string,
    triggerType: ResearchTriggerType = "manual",
  ): Promise<ResearchStatus> {
    const existing = Array.from(activeRuns.values()).find((r) => r.domainId === domainId);
    if (existing) {
      const row = db.researchRuns.findById(existing.runId);
      if (row) return rowToStatus(row);
    }

    const startedAt = new Date().toISOString();
    const row = db.researchRuns.create({
      domain_id: domainId,
      trigger_type: triggerType,
      model_id: null,
      status: "running" as ResearchRunStatus,
      query: null,
      findings_summary: null,
      knowledge_nodes_created: 0,
      cost_usd: 0,
      token_count: 0,
      error_message: null,
      started_at: startedAt,
      completed_at: null,
    } as unknown as Partial<ResearchRunRow> & Record<string, unknown>);

    const runId = row.id;
    const abortController = new AbortController();
    activeRuns.set(runId, { runId, domainId, abortController, startedAt });

    executeResearchRun(domainId, triggerType, runId, abortController.signal)
      .catch((err) => {
        log.error(`Run ${runId} failed`, err instanceof Error ? err : undefined);
      })
      .finally(() => {
        activeRuns.delete(runId);
      });

    return rowToStatus(row);
  }

  function getResearchStatus(runId: string): ResearchStatus {
    const row = db.researchRuns.findById(runId);
    if (!row) throw new Error(`Research run not found: ${runId}`);
    return rowToStatus(row);
  }

  function listResearchHistory(domainId: string): { items: ResearchStatus[]; total: number } {
    const result = db.researchRuns.listByDomain({ domainId, limit: 100, offset: 0 });
    return {
      items: result.items.map(rowToStatus),
      total: result.total,
    };
  }

  function getResearchDashboard(): ResearchDashboardResponse {
    const recentResult = db.researchRuns.list({
      limit: 10,
      offset: 0,
      orderBy: "started_at",
      orderDir: "DESC",
    });

    const recentResearch = recentResult.items.map(rowToStatus);

    const today = new Date().toISOString().slice(0, 10);
    const todayRuns = db.researchRuns.list({
      where: "date(started_at) = ?",
      params: [today],
      limit: 100,
      offset: 0,
    });

    const todayCompleted = todayRuns.items.filter((r) => r.status === "completed");
    const todaySummary =
      todayCompleted.length > 0
        ? `${todayCompleted.length} research run(s) completed today, ${todayRuns.items.length} total.`
        : "No research runs today.";

    const allRuns = db.researchRuns.list({ limit: 10000, offset: 0 });
    let totalCost = 0;
    const modelDistribution: Record<string, number> = {};
    for (const run of allRuns.items) {
      totalCost += run.cost_usd;
      if (run.model_id) {
        modelDistribution[run.model_id] = (modelDistribution[run.model_id] ?? 0) + run.cost_usd;
      }
    }

    return {
      todaySummary,
      recentResearch,
      costTracking: { totalCost, modelDistribution },
    };
  }

  function cancelResearch(runId: string): void {
    const active = activeRuns.get(runId);
    if (active) {
      active.abortController.abort();
      activeRuns.delete(runId);
    }

    const row = db.researchRuns.findById(runId);
    if (row && row.status === "running") {
      db.researchRuns.update(runId, {
        status: "cancelled" as ResearchRunStatus,
        completed_at: new Date().toISOString(),
      } as unknown as Partial<ResearchRunRow>);
    }
  }

  function startScheduler(): void {
    if (schedulerInterval) return;

    schedulerInterval = setInterval(() => {
      const now = new Date();
      checkAllSchedules(now).catch((err) => {
        log.error("Scheduler tick error", err instanceof Error ? err : undefined);
      });
    }, 60_000);

    log.info("Started — checking schedules every 60s");
  }

  function stopScheduler(): void {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }

    for (const timer of cronTimers.values()) {
      clearInterval(timer);
    }
    cronTimers.clear();

    log.info("Stopped");
  }

  function getActiveRunForDomain(domainId: string): ResearchStatus | null {
    const active = Array.from(activeRuns.values()).find((r) => r.domainId === domainId);
    if (!active) return null;
    const row = db.researchRuns.findById(active.runId);
    return row ? rowToStatus(row) : null;
  }

  return {
    triggerResearch,
    getResearchStatus,
    listResearchHistory,
    getResearchDashboard,
    cancelResearch,
    startScheduler,
    stopScheduler,
    getActiveRunForDomain,
  };
}

export type ResearchScheduler = ReturnType<typeof createResearchScheduler>;
