/**
 * knowledge_write custom tool.
 * Allows pi-mono agents to create and update knowledge nodes in the graph.
 */
import { defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import type { KnowledgeNodeType } from "../../db/schema";

export interface KnowledgeWriteResult {
  nodeId: string;
  title: string;
  domainId: string;
  action: "created" | "updated";
}

export interface KnowledgeWriteExecutor {
  (
    params: {
      domainId: string;
      title: string;
      content: string;
      nodeType: KnowledgeNodeType;
      tags: string[];
      source: string;
    },
    ctx: ExtensionContext,
  ): Promise<KnowledgeWriteResult>;
}

let executor: KnowledgeWriteExecutor | null = null;

export function setKnowledgeWriteExecutor(fn: KnowledgeWriteExecutor): void {
  executor = fn;
}

export const knowledgeWriteTool = defineTool({
  name: "knowledge_write",
  label: "Write Knowledge Node",
  description:
    "Create or update a knowledge node in the knowledge graph. " +
    "Use this to persist research findings, decisions, or insights to the domain's knowledge base.",
  promptSnippet: "knowledge_write: create or update a knowledge node",
  promptGuidelines: [
    "Always include a descriptive title and thorough content",
    "Use the most specific nodeType (concept, technology, person, event, decision, resource, question)",
    "Include relevant tags for discoverability",
  ],
  parameters: Type.Object({
    domainId: Type.String({ description: "Target domain ID" }),
    title: Type.String({ description: "Knowledge node title" }),
    content: Type.String({ description: "Full content of the knowledge node in Markdown" }),
    nodeType: Type.Union(
      [
        Type.Literal("concept"),
        Type.Literal("technology"),
        Type.Literal("person"),
        Type.Literal("event"),
        Type.Literal("decision"),
        Type.Literal("resource"),
        Type.Literal("question"),
      ],
      { description: "Type of knowledge node", default: "concept" },
    ),
    tags: Type.Array(Type.String(), {
      description: "Tags for categorization and search",
      default: [],
    }),
    source: Type.String({
      description: "Source attribution for this knowledge",
      default: "agent",
    }),
  }),
  execute: async (_toolCallId, params, _signal, _onUpdate, ctx) => {
    if (!executor) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: knowledge_write executor not configured. Knowledge graph not available.",
          },
        ],
        details: { error: "executor_not_configured" },
      };
    }

    try {
      const result = await executor(
        {
          domainId: params.domainId,
          title: params.title,
          content: params.content,
          nodeType: params.nodeType,
          tags: params.tags,
          source: params.source,
        },
        ctx,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: [
              `Knowledge node ${result.action}: **${result.title}**`,
              `Domain: ${result.domainId}`,
              `Node ID: ${result.nodeId}`,
            ].join("\n"),
          },
        ],
        details: result,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text" as const, text: `Knowledge write failed: ${message}` }],
        details: { error: message },
      };
    }
  },
});
