/**
 * Search IPC handlers — wires SEARCH_CHANNELS to SearchEngine service.
 */
import { SEARCH_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as SearchEngine from "../../services/search-engine";

export function registerSearchHandlers(): void {
  registerHandler(SEARCH_CHANNELS.SEARCH, async (_event, req) => {
    const result = await SearchEngine.search(req);
    return result;
  });

  registerHandler(SEARCH_CHANNELS.REINDEX_DOMAIN, async (_event, req) => {
    const indexed = await SearchEngine.reindexDomain(req.domainId);
    return { indexed };
  });
}
