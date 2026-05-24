import { RESEARCH_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import {
  triggerResearch,
  getResearchStatus,
  listResearchHistory,
  getResearchDashboard,
  cancelResearch,
} from "../../services/research-scheduler";

export function registerResearchHandlers(): void {
  registerHandler(RESEARCH_CHANNELS.TRIGGER, async (_event, req) => {
    return triggerResearch(req.domainId, "manual");
  });

  registerHandler(RESEARCH_CHANNELS.GET_STATUS, async (_event, req) => {
    return getResearchStatus(req.id);
  });

  registerHandler(RESEARCH_CHANNELS.LIST_HISTORY, async (_event, req) => {
    return listResearchHistory(req.domainId);
  });

  registerHandler(RESEARCH_CHANNELS.GET_DASHBOARD, async () => {
    return getResearchDashboard();
  });

  registerHandler(RESEARCH_CHANNELS.CANCEL, async (_event, req) => {
    cancelResearch(req.id);
  });
}
