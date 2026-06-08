/**
 * Import processing extension.
 * Manages tool registration for import-related workflows (URL, PDF, RSS).
 * Hooks: session_start (header), before_agent_start (system prompt),
 *        tool_result (import progress), tool_call (safety gate).
 */
import type { ExtensionAPI, ExtensionFactory } from "@mariozechner/pi-coding-agent";
import {
  consumePendingDomain,
  registerSession,
  getDomainContext,
} from "./session-context";

export const importAgentExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  // Import-specific tool registration happens here when the import pipeline
  // is implemented in Phase 4. For now, this extension provides lifecycle
  // hooks for import session management.

  // --- session_start: capture domain, set welcome header ---
  pi.on("session_start", async (_event, ctx) => {
    const domainId = consumePendingDomain();
    if (!domainId) return;

    const sessionId = ctx.sessionManager.getSessionId();
    registerSession(sessionId, domainId);

    const dc = getDomainContext(sessionId);
    ctx.ui.setTitle(dc ? `Import: ${dc.name}` : "AgentClaw Import");
  });

  // --- before_agent_start: inject domain context into system prompt ---
  pi.on("before_agent_start", async (event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();
    const dc = getDomainContext(sessionId);
    if (!dc) return;

    const contextBlock = [
      "## Import Domain Context",
      `Domain: ${dc.name} (ID: ${dc.domainId})`,
      dc.description ? `Description: ${dc.description}` : null,
      `Knowledge nodes: ${dc.knowledgeNodeCount}`,
    ]
      .filter(Boolean)
      .join("\n");

    return { systemPrompt: `${event.systemPrompt}\n\n${contextBlock}` };
  });

  // --- tool_result: track import tool results for progress UI ---
  pi.on("tool_result", async (_event, _ctx) => {
    // Import progress tracking — reserved for Phase 4 when import tools are registered.
  });

  // --- tool_call: intercept future import tool calls ---
  pi.on("tool_call", async (event) => {
    // Safety gate for import-related tools (Phase 4).
    // When import tools are registered, this hook will intercept bulk imports
    // and large-file imports that exceed safety thresholds.
    if (event.toolName.startsWith("import_")) {
      const input = (event as { input: Record<string, unknown> }).input;
      const bulkCount = typeof input?.bulkCount === "number" ? input.bulkCount : 0;
      if (bulkCount > 10) {
        return {
          block: true,
          reason: `Bulk import of ${bulkCount} items exceeds safety threshold (10). Split into smaller batches.`,
        };
      }
    }
  });
};
