/**
 * Research agent extension.
 * Registers the timeline_analyze tool and sets up research-related lifecycle hooks.
 * Hooks: session_start (header), before_agent_start (system prompt + context),
 *        turn_end (cost tracking stub), tool_call (safety gate).
 */
import type { ExtensionAPI, ExtensionFactory } from "@mariozechner/pi-coding-agent";
import { timelineAnalyzeTool } from "../tools/timeline-analyze";
import {
  consumePendingDomain,
  registerSession,
  getDomainContext,
} from "./session-context";

export const researchAgentExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  pi.registerTool(timelineAnalyzeTool);

  // --- session_start: capture domain, set welcome header ---
  pi.on("session_start", async (_event, ctx) => {
    const domainId = consumePendingDomain();
    if (!domainId) return;

    const sessionId = ctx.sessionManager.getSessionId();
    registerSession(sessionId, domainId);

    const dc = getDomainContext(sessionId);
    ctx.ui.setTitle(dc ? `Research: ${dc.name}` : "AgentClaw Research");
  });

  // --- before_agent_start: inject domain context into system prompt ---
  pi.on("before_agent_start", async (event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();
    const dc = getDomainContext(sessionId);
    if (!dc) return;

    const contextBlock = [
      "## Research Domain Context",
      `Domain: ${dc.name} (ID: ${dc.domainId})`,
      dc.description ? `Description: ${dc.description}` : null,
      `Knowledge nodes available: ${dc.knowledgeNodeCount}`,
    ]
      .filter(Boolean)
      .join("\n");

    return { systemPrompt: `${event.systemPrompt}\n\n${contextBlock}` };
  });

  // --- turn_end: cost tracking placeholder ---
  pi.on("turn_end", async (_event, _ctx) => {
    // Cost aggregation is handled in the wrapper layer.
    // This hook is reserved for per-turn cost logging when needed.
  });

  // --- tool_call: intercept high-risk research operations ---
  pi.on("tool_call", async (event) => {
    if (event.toolName === "timeline_analyze") {
      const input = (event as { input: Record<string, unknown> }).input;
      const period = input?.period;
      if (period === "year") {
        return {
          block: true,
          reason:
            "Year-wide timeline analysis can be expensive and produce very long reports. " +
            "Consider using 'quarter' first and escalating to 'year' only when needed.",
        };
      }
    }
  });
};
