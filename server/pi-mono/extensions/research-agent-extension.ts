/**
 * Research agent extension.
 * Registers the timeline_analyze tool and sets up research-related lifecycle hooks.
 */
import type { ExtensionAPI, ExtensionFactory } from "@mariozechner/pi-coding-agent";
import { timelineAnalyzeTool } from "../tools/timeline-analyze";

export const researchAgentExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  pi.registerTool(timelineAnalyzeTool);

  pi.on("before_agent_start", async (_event, _ctx) => {
    // Domain context injection is handled at session creation time
    // via the wrapper layer's createExpertSession method.
    // Extensions can use before_agent_start to inject messages or
    // modify the system prompt for specific domains.
  });

  pi.on("turn_end", async (_event, _ctx) => {
    // Track turn-level cost for research sessions.
    // Full cost aggregation happens in the wrapper layer.
  });
};
