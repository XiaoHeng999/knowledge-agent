/**
 * timeline_analyze custom tool.
 * Allows pi-mono agents to analyze domain timelines and generate predictions.
 */
import { defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

export interface TimelineAnalyzeResult {
  domainId: string;
  period: "month" | "quarter" | "year";
  report: string;
  timelineEventCount: number;
  predictions: Array<{
    content: string;
    confidence: number;
    predictedDate: string | null;
  }>;
}

export interface TimelineAnalyzeExecutor {
  (
    params: {
      domainId: string;
      period: "month" | "quarter" | "year";
    },
    ctx: ExtensionContext,
  ): Promise<TimelineAnalyzeResult>;
}

let executor: TimelineAnalyzeExecutor | null = null;

export function setTimelineAnalyzeExecutor(fn: TimelineAnalyzeExecutor): void {
  executor = fn;
}

export const timelineAnalyzeTool = defineTool({
  name: "timeline_analyze",
  label: "Timeline Analysis",
  description:
    "Analyze the development timeline of a domain and generate trend predictions. " +
    "Returns a structured report with events, trends, and confidence-scored predictions.",
  promptSnippet: "timeline_analyze: analyze domain timeline and generate predictions",
  promptGuidelines: [
    "Use 'month' for recent activity, 'quarter' for trends, 'year' for strategic overview",
    "Predictions include confidence scores (0-1) and optional target dates",
  ],
  parameters: Type.Object({
    domainId: Type.String({ description: "Target domain ID to analyze" }),
    period: Type.Union(
      [Type.Literal("month"), Type.Literal("quarter"), Type.Literal("year")],
      { description: "Analysis period scope", default: "quarter" },
    ),
  }),
  execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
    if (!executor) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: timeline_analyze executor not configured. Timeline engine not available.",
          },
        ],
        details: { error: "executor_not_configured" },
      };
    }

    try {
      const result = await executor(
        { domainId: params.domainId, period: params.period },
        ctx,
      );

      const predictionLines = result.predictions
        .map(
          (p) =>
            `- [${Math.round(p.confidence * 100)}% confidence] ${p.content}` +
            (p.predictedDate ? ` (by ${p.predictedDate})` : ""),
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `## Timeline Analysis: ${result.domainId}`,
              `**Period**: ${result.period} | **Events analyzed**: ${result.timelineEventCount}`,
              "",
              result.report,
              "",
              result.predictions.length > 0
                ? `### Predictions\n${predictionLines}`
                : "No predictions generated for this period.",
            ].join("\n"),
          },
        ],
        details: result,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Timeline analysis failed: ${message}` }],
        details: { error: message },
      };
    }
  },
});
