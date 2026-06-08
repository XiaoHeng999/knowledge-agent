import { app, BrowserWindow, dialog, globalShortcut } from "electron";
import path from "path";
import { createWindow } from "./window";
import { registerAllIpcHandlers } from "../server/ipc/register";
import { initializeDatabase, shutdownDatabase } from "../server/db/index";
import { initializePiMono, shutdownPiMono } from "../server/pi-mono/instance";
import { startScheduler, stopScheduler } from "../server/services/research-scheduler";
import { initializeTimelineExecutor } from "../server/services/timeline-engine";
import { initializeSkillEngine } from "../server/services/skill-engine";
import { initializeWorker, shutdownWorker } from "../server/worker/worker-bridge";
import { initializeAutoUpdater, shutdownAutoUpdater } from "../server/services/auto-updater";
import { logger } from "../server/services/logger";

let mainWindow: BrowserWindow | null = null;

// ---------------------------------------------------------------------------
// Global error handlers — catch uncaught exceptions & unhandled rejections
// ---------------------------------------------------------------------------

process.on('uncaughtException', (error) => {
  logger.error("main", "Uncaught exception", error);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("main", "Unhandled rejection", err);
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    logger.initialize();

    try {
      initializeDatabase();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dialog.showErrorBox("Database Error", message);
      app.quit();
      return;
    }

    try {
      await initializePiMono();
      console.log("[PiMono] Initialized successfully");
    } catch (err) {
      console.error("[PiMono] Initialization failed:", err);
    }

    registerAllIpcHandlers();
    initializeTimelineExecutor();
    initializeSkillEngine();

    try {
      await initializeWorker();
      console.log("[Worker] Utility process initialized");
    } catch (err) {
      console.error("[Worker] Initialization failed:", err);
    }

    startScheduler();
    initializeAutoUpdater();
    mainWindow = createWindow();

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      mainWindow.on("closed", () => {
        mainWindow = null;
      });
    }
  });

  app.on("will-quit", () => {
    stopScheduler();
    shutdownWorker();
    shutdownAutoUpdater();
    shutdownPiMono();
    shutdownDatabase();
    logger.shutdown();
    globalShortcut.unregisterAll();
  });
}
