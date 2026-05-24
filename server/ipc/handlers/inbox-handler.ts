/**
 * Inbox IPC handlers — wires INBOX_CHANNELS to InboxProcessor service.
 */
import { INBOX_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as InboxProcessor from "../../services/inbox-processor";

export function registerInboxHandlers(): void {
  registerHandler(INBOX_CHANNELS.ADD_ITEM, async (_event, req) => {
    return InboxProcessor.addItem(req);
  });

  registerHandler(INBOX_CHANNELS.LIST_ITEMS, async (_event, req) => {
    return InboxProcessor.listItems(req);
  });

  registerHandler(INBOX_CHANNELS.PROCESS_ITEM, async (_event, req) => {
    return InboxProcessor.processItem(req.id, req.domainId);
  });

  registerHandler(INBOX_CHANNELS.REJECT_ITEM, async (_event, req) => {
    InboxProcessor.rejectItem(req.id);
  });

  registerHandler(INBOX_CHANNELS.GET_STATS, async () => {
    return InboxProcessor.getStats();
  });

  registerHandler(INBOX_CHANNELS.SUGGEST_DOMAINS, async (_event, req) => {
    const db = (await import("../../db/index")).getDatabaseService();
    const item = db.inbox.findById(req.itemId);
    if (!item) throw new Error(`Inbox item not found: ${req.itemId}`);
    const content = [item.raw_content, item.source_url].filter(Boolean).join(" ");
    const suggestions = await InboxProcessor.suggestDomains(content || "untitled");
    return { suggestions };
  });
}
