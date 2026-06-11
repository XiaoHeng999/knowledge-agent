import { CHAT_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import type { ConversationService } from "../../services/conversation-service";
import { createLogger } from "../../services/logger";

const log = createLogger("Chat");

export function registerChatHandlers(conversationService: ConversationService): void {
  registerHandler(CHAT_CHANNELS.SEND_MESSAGE, async (event, req) => {
    const { BrowserWindow } = await import("electron");
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (!sender) throw new Error("No browser window found");
    conversationService.sendMessageStream(sender, req.conversationId, req.content, req.modelId).catch((err) => {
      log.error("Stream error", err instanceof Error ? err : undefined);
    });
  });
}
