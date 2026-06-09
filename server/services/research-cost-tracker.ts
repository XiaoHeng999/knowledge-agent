/**
 * Research cost tracker — accumulates real token usage from SDK turn_end events.
 * Replaces the chars/4 estimation heuristic with actual LLM API usage data.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenUsage {
  input: number;
  output: number;
}

export interface ModelPricing {
  costPerMillionInput: number;
  costPerMillionOutput: number;
}

export interface AggregatedUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// ---------------------------------------------------------------------------
// Pure: calculate cost from token usage and model pricing
// ---------------------------------------------------------------------------

export function calculateCost(usage: TokenUsage, pricing: ModelPricing): number {
  return (
    (usage.input / 1_000_000) * pricing.costPerMillionInput +
    (usage.output / 1_000_000) * pricing.costPerMillionOutput
  );
}

// ---------------------------------------------------------------------------
// Stateful: per-session token accumulation
// ---------------------------------------------------------------------------

const sessionUsageMap = new Map<string, { runId: string } & AggregatedUsage>();

export function startTracking(sessionId: string, runId: string): void {
  sessionUsageMap.set(sessionId, { runId, inputTokens: 0, outputTokens: 0, costUsd: 0 });
}

export function accumulateUsage(
  sessionId: string,
  usage: TokenUsage,
  pricing: ModelPricing,
): void {
  const entry = sessionUsageMap.get(sessionId);
  if (!entry) return;

  entry.inputTokens += usage.input;
  entry.outputTokens += usage.output;
  entry.costUsd += calculateCost(usage, pricing);
}

export function getAggregatedUsage(sessionId: string): AggregatedUsage | null {
  const entry = sessionUsageMap.get(sessionId);
  if (!entry) return null;
  return {
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    costUsd: entry.costUsd,
  };
}

export function stopTracking(sessionId: string): AggregatedUsage | null {
  const entry = sessionUsageMap.get(sessionId);
  if (!entry) return null;
  sessionUsageMap.delete(sessionId);
  return {
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    costUsd: entry.costUsd,
  };
}

/** Reset all tracking state (test-only). */
export function resetTracking(): void {
  sessionUsageMap.clear();
}

// ---------------------------------------------------------------------------
// Pure: post-completion budget check
// ---------------------------------------------------------------------------

export type BudgetStatus = "completed" | "over_budget";

export function resolveBudgetStatus(costUsd: number, maxCostUsd: number): BudgetStatus {
  return costUsd > maxCostUsd ? "over_budget" : "completed";
}
