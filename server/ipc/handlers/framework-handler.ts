import { FRAMEWORK_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import {
  listFrameworks,
  executeFrameworkAnalysis,
  listFrameworkResults,
  getFrameworkResult,
  generateDomainSummary,
  getMemoryLayerStats,
  listDecisionRecords,
  getDecisionRecord,
  generateDecisionRecord,
  updateDecisionStatus,
  retrieveRelevantDecisions,
} from "../../services/framework-engine";
import type { FrameworkType } from "../../db/schema";

export function registerFrameworkHandlers(): void {
  registerHandler(FRAMEWORK_CHANNELS.LIST_FRAMEWORKS, async (_event, req?: { domainId?: string }) => {
    const frameworks = await listFrameworks(req?.domainId);
    return { frameworks };
  });

  registerHandler(FRAMEWORK_CHANNELS.EXECUTE, async (_event, req) => {
    return executeFrameworkAnalysis(
      req.domainId,
      req.frameworkType as FrameworkType,
      req.modelId,
    );
  });

  registerHandler(FRAMEWORK_CHANNELS.LIST_RESULTS, async (_event, req) => {
    return listFrameworkResults(
      req.domainId,
      req.frameworkType as FrameworkType | undefined,
    );
  });

  registerHandler(FRAMEWORK_CHANNELS.GET_RESULT, async (_event, req) => {
    return getFrameworkResult(req.id);
  });

  registerHandler(FRAMEWORK_CHANNELS.GENERATE_SUMMARY, async (_event, req) => {
    return generateDomainSummary(req.domainId);
  });

  registerHandler(FRAMEWORK_CHANNELS.GET_MEMORY_STATS, async (_event, req) => {
    return getMemoryLayerStats(req.domainId);
  });

  registerHandler(FRAMEWORK_CHANNELS.LIST_DECISIONS, async (_event, req) => {
    return listDecisionRecords(req.domainId);
  });

  registerHandler(FRAMEWORK_CHANNELS.GET_DECISION, async (_event, req) => {
    return getDecisionRecord(req.id);
  });

  registerHandler(FRAMEWORK_CHANNELS.CREATE_DECISION, async (_event, req) => {
    return generateDecisionRecord(
      req.domainId,
      req.title,
      req.context,
      req.decisionText,
      req.rationale,
      req.expectedOutcome,
    );
  });

  registerHandler(FRAMEWORK_CHANNELS.UPDATE_DECISION, async (_event, req) => {
    return updateDecisionStatus(
      req.decisionId,
      req.status as "proposed" | "accepted" | "deprecated" | "superseded",
      req.supersededBy,
    );
  });

  registerHandler(FRAMEWORK_CHANNELS.RETRIEVE_RELATED, async (_event, req) => {
    const decisions = retrieveRelevantDecisions(
      req.domainId,
      req.queryText,
      req.limit,
    );
    return { decisions };
  });
}
