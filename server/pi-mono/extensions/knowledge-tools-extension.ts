/**
 * Knowledge management extension.
 * Registers knowledge_write and domain_research tools with the pi-mono agent.
 */
import type { ExtensionAPI, ExtensionFactory } from "@mariozechner/pi-coding-agent";
import { domainResearchTool } from "../tools/domain-research";
import { knowledgeWriteTool } from "../tools/knowledge-write";

export const knowledgeToolsExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  pi.registerTool(domainResearchTool);
  pi.registerTool(knowledgeWriteTool);

  pi.on("session_start", async (_event, _ctx) => {
    // Knowledge tools are always available — no per-session setup needed.
  });
};
