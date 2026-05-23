/**
 * Version Control IPC handlers — bridges renderer calls to the
 * version-control service.
 */

import { VC_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as vc from "../../services/version-control";

export function registerVersionControlHandlers(): void {
  registerHandler(VC_CHANNELS.INIT, async () => {
    return vc.initRepo();
  });

  registerHandler(VC_CHANNELS.GET_STATUS, async () => {
    return vc.getStatus();
  });

  registerHandler(VC_CHANNELS.GET_HISTORY, async (_event, req) => {
    const commits = await vc.getHistory(req.filePath, req.limit);
    return { commits };
  });

  registerHandler(VC_CHANNELS.GET_DIFF, async (_event, req) => {
    return vc.getDiff(req.fromHash, req.toHash, req.filePath);
  });

  registerHandler(VC_CHANNELS.ROLLBACK, async (_event, req) => {
    return vc.rollbackFile(req.filePath, req.targetHash);
  });
}
