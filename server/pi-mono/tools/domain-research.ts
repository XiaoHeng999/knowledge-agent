/**
 * domain_research custom tool.
 * Allows pi-mono agents to search and synthesize information within a domain.
 */
import { defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

export interface DomainResearchResult {
  domainId: string;
  query: string;
  depth: "quick" | "deep";
  summary: string;
  relatedNodeIds: string[];
  sourcesFound: number;
}

export interface DomainResearchExecutor {
  (
    params: {
      domainId: string;
      query: string;
      depth: "quick" | "deep";
    },
    ctx: ExtensionContext,
  ): Promise<DomainResearchResult>;
}

let executor: DomainResearchExecutor | null = null;

export function setDomainResearchExecutor(fn: DomainResearchExecutor): void {
  executor = fn;
}

export const domainResearchTool = defineTool({
  name: "domain_research",
  label: "Domain Research",
  description:
    "Search and synthesize information within a specific knowledge domain. " +
    "Returns structured findings including related knowledge nodes and source counts.",
  promptSnippet: "domain_research: search and synthesize domain knowledge",
  promptGuidelines: [
    "Use 'quick' depth for broad overviews, 'deep' for comprehensive analysis",
    "Review relatedNodeIds to explore connected concepts",
  ],
  parameters: Type.Object({
    domainId: Type.String({ description: "Target domain ID to search within" }),
    query: Type.String({ description: "Research query or topic to investigate" }),
    depth: Type.Union([Type.Literal("quick"), Type.Literal("deep")], {
      description: "Search depth: 'quick' for overview, 'deep' for comprehensive analysis",
      default: "quick",
    }),
  }),
  execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
    if (!executor) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: domain_research executor not configured. Research engine not available.",
          },
        ],
        details: { error: "executor_not_configured" },
      };
    }

    try {
      const result = await executor(
        { domainId: params.domainId, query: params.query, depth: params.depth },
        ctx,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `## Research Results: ${params.query}`,
              `**Domain**: ${result.domainId} | **Depth**: ${result.depth}`,
              `**Sources found**: ${result.sourcesFound}`,
              "",
              result.summary,
              "",
              result.relatedNodeIds.length > 0
                ? `Related nodes: ${result.relatedNodeIds.join(", ")}`
                : "No directly related knowledge nodes found.",
            ].join("\n"),
          },
        ],
        details: result,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Research failed: ${message}` }],
        details: { error: message },
      };
    }
  },
});
