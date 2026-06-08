/**
 * Knowledge management extension.
 * Registers knowledge_write and domain_research tools with the pi-mono agent.
 * Hooks: session_start (header), before_agent_start (system prompt), tool_call (safety gate).
 */
import type { ExtensionAPI, ExtensionFactory } from "@mariozechner/pi-coding-agent";
import { domainResearchTool } from "../tools/domain-research";
import { knowledgeWriteTool } from "../tools/knowledge-write";
import {
  consumePendingDomain,
  registerSession,
  getDomainContext,
} from "./session-context";

const LARGE_CONTENT_THRESHOLD = 10_000;
const BROAD_QUERY_MIN_LENGTH = 10;

export const knowledgeToolsExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  pi.registerTool(domainResearchTool);
  pi.registerTool(knowledgeWriteTool);

  // --- session_start: capture domain from pending registry, set welcome header ---
  pi.on("session_start", async (_event, ctx) => {
    const domainId = consumePendingDomain();
    if (!domainId) return;

    const sessionId = ctx.sessionManager.getSessionId();
    registerSession(sessionId, domainId);

    const dc = getDomainContext(sessionId);
    ctx.ui.setTitle(dc ? `Domain: ${dc.name}` : "AgentClaw Session");
  });

  // --- before_agent_start: augment system prompt with domain context ---
  pi.on("before_agent_start", async (event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();
    const dc = getDomainContext(sessionId);
    if (!dc) return;

    const contextBlock = [
      "## Current Domain Context",
      `Domain: ${dc.name} (ID: ${dc.domainId})`,
      dc.description ? `Description: ${dc.description}` : null,
      `Knowledge nodes: ${dc.knowledgeNodeCount}`,
    ]
      .filter(Boolean)
      .join("\n");

    return { systemPrompt: `${event.systemPrompt}\n\n${contextBlock}` };
  });

  // --- tool_call: intercept dangerous operations ---
  pi.on("tool_call", async (event) => {
    const input = "input" in event ? (event as { input: Record<string, unknown> }).input : null;

    if (event.toolName === "knowledge_write" && input) {
      const content = typeof input.content === "string" ? input.content : "";
      if (content.length > LARGE_CONTENT_THRESHOLD) {
        return {
          block: true,
          reason:
            `Knowledge write rejected: content is ${content.length} chars ` +
            `(threshold: ${LARGE_CONTENT_THRESHOLD}). ` +
            "Break it into smaller, focused nodes or request explicit approval.",
        };
      }
    }

    if (event.toolName === "domain_research" && input) {
      const depth = input.depth;
      const query = typeof input.query === "string" ? input.query : "";
      if (depth === "deep" && query.length < BROAD_QUERY_MIN_LENGTH) {
        return {
          block: true,
          reason:
            `Deep research rejected: query "${query}" is too broad ` +
            `(minimum ${BROAD_QUERY_MIN_LENGTH} chars). ` +
            "Provide a more specific query for deep analysis.",
        };
      }
    }
  });
};
