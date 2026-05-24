import { IMPORT_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as ImportPipeline from "../../services/import-pipeline";

export function registerImportHandlers(): void {
  registerHandler(IMPORT_CHANNELS.IMPORT_URL, async (_event, req) => {
    return ImportPipeline.importUrl(req);
  });

  registerHandler(IMPORT_CHANNELS.IMPORT_FILE, async (_event, req) => {
    return ImportPipeline.importFile(req);
  });

  registerHandler(IMPORT_CHANNELS.GET_STATUS, async (_event, req) => {
    return ImportPipeline.getImportStatus(req.id);
  });

  registerHandler(IMPORT_CHANNELS.LIST, async (_event, req) => {
    const page = req.page ?? 1;
    const pageSize = req.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    return ImportPipeline.listImports(req.domainId, req.status as ImportPipeline.ImportStatusType, pageSize, offset);
  });

  registerHandler(IMPORT_CHANNELS.RETRY, async (_event, req) => {
    return ImportPipeline.retryImport(req.id);
  });

  registerHandler(IMPORT_CHANNELS.CANCEL, async (_event, req) => {
    ImportPipeline.cancelImport(req.id);
  });

  registerHandler(IMPORT_CHANNELS.POLL_RSS, async (_event, req) => {
    return ImportPipeline.pollRssFeed(req.feedUrl, req.domainId);
  });
}
