import { APP_CHANNELS, DB_CHANNELS, WINDOW_CHANNELS } from "../../src/lib/ipc/channels";
import { BrowserWindow } from "electron";
import { registerHandler } from "./handler";
import {
  initializeDatabase,
  getDatabaseService,
  shutdownDatabase,
  backupDatabase,
} from "../db/index";
import { loadMigrations } from "../db/migrations/index";
import { registerModelHandlers as registerModelHandlersFromModule } from "./handlers/model-handler";
import { registerDomainHandlers as registerDomainHandlersFromModule } from "./handlers/domain-handler";

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
  registerHandler(DB_CHANNELS.INITIALIZE, async (_event, req) => {
    const svc = initializeDatabase(req.dbPath);
    const version = svc.migrations.getCurrentVersion();
    return { success: true, version };
  });

  registerHandler(DB_CHANNELS.MIGRATE, async () => {
    const svc = getDatabaseService();
    const fromVersion = svc.migrations.getCurrentVersion();
    const result = svc.migrations.run(loadMigrations());
    return { success: true, fromVersion, toVersion: result.currentVersion };
  });

  registerHandler(DB_CHANNELS.GET_VERSION, async () => {
    const svc = getDatabaseService();
    return { version: svc.migrations.getCurrentVersion() };
  });

  registerHandler(DB_CHANNELS.BACKUP, async (_event, req) => {
    backupDatabase(req.targetPath);
    return { success: true, path: req.targetPath };
  });
}

// ---------------------------------------------------------------------------
// Stubs for domains that will be implemented in later phases.
// Each returns a placeholder response so the renderer never crashes on
// an unhandled channel.
// ---------------------------------------------------------------------------

function registerModelHandlers(): void {
  // Delegated to handlers/model-handler.ts
  registerModelHandlersFromModule();
}

function registerDomainHandlers(): void {
  registerDomainHandlersFromModule();
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

function registerWindowHandlers(): void {
  registerHandler(WINDOW_CHANNELS.MINIMIZE, async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
    return { success: true };
  });

  registerHandler(WINDOW_CHANNELS.MAXIMIZE, async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.maximize();
    return { success: true };
  });

  registerHandler(WINDOW_CHANNELS.CLOSE, async (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
    return { success: true };
  });

  registerHandler(WINDOW_CHANNELS.IS_MAXIMIZED, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return { maximized: win?.isMaximized() ?? false };
  });

  registerHandler(WINDOW_CHANNELS.TOGGLE_MAXIMIZE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: true };
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    return { success: true };
  });
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
  registerWindowHandlers();
}
