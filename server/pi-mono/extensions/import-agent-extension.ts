/**
 * Import processing extension.
 * Manages tool registration for import-related workflows (URL, PDF, RSS).
 */
import type { ExtensionAPI, ExtensionFactory } from "@mariozechner/pi-coding-agent";

export const importAgentExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  // Import-specific tool registration happens here when the import pipeline
  // is implemented in Phase 4. For now, this extension provides lifecycle
  // hooks for import session management.

  pi.on("session_start", async (_event, _ctx) => {
    // Import sessions will be created when the user triggers an import.
  });

  pi.on("tool_result", async (event, _ctx) => {
    // Track tool results for import-related tools.
    // Used to build the import progress UI.
  });
};
