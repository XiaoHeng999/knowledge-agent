import type { TokenUsage, ModelPricing, AggregatedUsage } from "./research-cost-tracker";
import { calculateCost, startTracking, stopTracking } from "./research-cost-tracker";
import { getProviderDefinitions } from "../pi-mono/providers";

export type { TokenUsage };

export interface CostEstimator {
  estimateTokens(input: string, output: string): TokenUsage;
  estimateCost(usage: TokenUsage, modelId: string): number;
}

function estimateTokensFromChars(input: string, output: string): TokenUsage {
  return {
    input: Math.ceil(input.length / 4),
    output: Math.ceil(output.length / 4),
  };
}

function resolveModelPricing(modelId: string): ModelPricing | null {
  for (const provider of getProviderDefinitions()) {
    for (const model of provider.models) {
      if (model.id === modelId) {
        return {
          costPerMillionInput: model.cost.input,
          costPerMillionOutput: model.cost.output,
        };
      }
    }
  }
  return null;
}

export function createHeuristicCostEstimator(): CostEstimator {
  return {
    estimateTokens: estimateTokensFromChars,
    estimateCost(usage, modelId) {
      const pricing = resolveModelPricing(modelId);
      if (!pricing) return 0;
      return calculateCost(usage, pricing);
    },
  };
}

export interface TrackerCostEstimatorResult {
  estimator: CostEstimator;
  onSessionCreated: (sessionId: string) => void;
}

export function createTrackerCostEstimator(runId: string): TrackerCostEstimatorResult {
  let sessionId: string | null = null;
  let lastUsage: AggregatedUsage | null = null;

  return {
    onSessionCreated(id: string) {
      sessionId = id;
      lastUsage = null;
      startTracking(id, runId);
    },
    estimator: {
      estimateTokens(_input: string, _output: string): TokenUsage {
        const usage = sessionId ? stopTracking(sessionId) : null;
        lastUsage = usage;
        sessionId = null;
        return { input: usage?.inputTokens ?? 0, output: usage?.outputTokens ?? 0 };
      },
      estimateCost(_usage: TokenUsage, _modelId: string): number {
        return lastUsage?.costUsd ?? 0;
      },
    },
  };
}
