/**
 * turn_end handler factory — extracts real token usage from SDK TurnEndEvent.
 * Accumulates per-turn usage into the research cost tracker.
 */
import { accumulateUsage, type ModelPricing } from "../../services/research-cost-tracker";

interface TurnEndEvent {
  type: "turn_end";
  turnIndex: number;
  message: {
    role: string;
    model?: string;
    content: unknown[];
    usage?: { input: number; output: number };
  };
  toolResults: unknown[];
}

/**
 * Creates a turn_end handler bound to a specific session.
 * @param sessionId — the pi-mono agent session ID
 * @param getModelPricing — async function taking a model ID, returning pricing (or null)
 */
export function createTurnEndHandler(
  sessionId: string,
  getModelPricing: (modelId: string) => Promise<ModelPricing | null>,
): (event: TurnEndEvent) => Promise<void> {
  return async (event: TurnEndEvent) => {
    if (event.message.role !== "assistant") return;

    const usage = event.message.usage;
    if (!usage) return;

    const modelId = event.message.model;
    if (!modelId) return;

    const pricing = await getModelPricing(modelId);
    if (!pricing) return;

    accumulateUsage(sessionId, { input: usage.input, output: usage.output }, pricing);
  };
}
