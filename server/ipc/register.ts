import { APP_CHANNELS, DB_CHANNELS } from "../../src/lib/ipc/channels";
import { registerHandler } from "./handler";

// ---------------------------------------------------------------------------
// Placeholder handlers — will be replaced by real service handlers later.
// These exist so the IPC bridge is fully wired end-to-end from day one.
// ---------------------------------------------------------------------------

function registerAppHandlers(): void {
  registerHandler(APP_CHANNELS.PING, async () => ({ message: "pong" }));

  registerHandler(APP_CHANNELS.GET_VERSION, async () => {
    const { app } = await import("electron");
    return { version: app.getVersion() };
  });

  registerHandler(APP_CHANNELS.GET_PLATFORM, async () => {
    return { platform: process.platform };
  });
}

function registerDbHandlers(): void {
  registerHandler(DB_CHANNELS.INITIALIZE, async (_event, _req) => {
    // TODO: replace with real database initialization (task 1.5.2)
    return { success: true, version: 0 };
  });

  registerHandler(DB_CHANNELS.MIGRATE, async () => {
    // TODO: replace with real migration runner (task 1.5.3)
    return { success: true, fromVersion: 0, toVersion: 0 };
  });

  registerHandler(DB_CHANNELS.GET_VERSION, async () => {
    // TODO: replace with real version query (task 1.5.3)
    return { version: 0 };
  });

  registerHandler(DB_CHANNELS.BACKUP, async (_event, req) => {
    // TODO: replace with real backup logic
    return { success: true, path: req.targetPath };
  });
}

// ---------------------------------------------------------------------------
// Stubs for domains that will be implemented in later phases.
// Each returns a placeholder response so the renderer never crashes on
// an unhandled channel.
// ---------------------------------------------------------------------------

function registerModelHandlers(): void {
  // TODO: task 2.1.2
}

function registerDomainHandlers(): void {
  // TODO: task 2.2.2
}

function registerKnowledgeHandlers(): void {
  // TODO: task 3.1.2
}

function registerInboxHandlers(): void {
  // TODO: task 3.6.2
}

function registerResearchHandlers(): void {
  // TODO: task 4.1.5
}

function registerSettingsHandlers(): void {
  // TODO: task 2.4.x
}

function registerImportHandlers(): void {
  // TODO: task 4.2.5
}

// ---------------------------------------------------------------------------
// Public entry point — called once from electron/main.ts
// ---------------------------------------------------------------------------

export function registerAllIpcHandlers(): void {
  registerAppHandlers();
  registerDbHandlers();
  registerModelHandlers();
  registerDomainHandlers();
  registerKnowledgeHandlers();
  registerInboxHandlers();
  registerResearchHandlers();
  registerSettingsHandlers();
  registerImportHandlers();
}
