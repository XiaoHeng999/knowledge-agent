import { getPiMonoWrapper } from "../pi-mono/instance";
import {
  createHeuristicCostEstimator,
  type CostEstimator,
} from "./cost-estimator";

export interface SessionRunnerResult {
  content: string;
  estimatedTokens: number;
  estimatedCost: number;
}

export interface SessionRunner {
  runPrompt(
    domainId: string,
    modelId: string,
    prompt: string,
  ): Promise<SessionRunnerResult>;
}

export function createSessionRunner(
  costEstimator?: CostEstimator,
  onSessionCreated?: (sessionId: string) => void,
): SessionRunner {
  const estimator = costEstimator ?? createHeuristicCostEstimator();

  return {
    async runPrompt(domainId, modelId, prompt) {
      const wrapper = getPiMonoWrapper();
      const { sessionId, session } = await wrapper.createExpertSession(
        domainId,
        modelId,
      );

      onSessionCreated?.(sessionId);

      let fullContent = "";

      try {
        const unsubscribe = session.subscribe((event: unknown) => {
          const e = event as {
            type: string;
            assistantMessageEvent?: { textDelta?: string };
          };
          if (
            e.type === "message_update" &&
            e.assistantMessageEvent &&
            "textDelta" in e.assistantMessageEvent
          ) {
            fullContent += e.assistantMessageEvent.textDelta ?? "";
          }
        });

        await session.prompt(prompt);
        unsubscribe();
      } finally {
        wrapper.destroySession(sessionId);
      }

      const usage = estimator.estimateTokens(prompt, fullContent);
      const cost = estimator.estimateCost(usage, modelId);

      return {
        content: fullContent,
        estimatedTokens: usage.input + usage.output,
        estimatedCost: cost,
      };
    },
  };
}
