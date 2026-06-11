import { INBOX_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as InboxProcessor from "../../services/inbox-processor";

export function registerInboxHandlers(): void {
  registerHandler(INBOX_CHANNELS.SUGGEST_DOMAINS, async (_event, req) => {
    const db = (await import("../../db/index")).getDatabaseService();
    const item = db.inbox.findById(req.itemId);
    if (!item) throw new Error(`Inbox item not found: ${req.itemId}`);
    const content = [item.raw_content, item.source_url].filter(Boolean).join(" ");
    const suggestions = await InboxProcessor.suggestDomains(content || "untitled");
    return { suggestions };
  });
}
