import { app, BrowserWindow, globalShortcut } from "electron";
import path from "path";
import { createWindow } from "./window";
import { registerAllIpcHandlers } from "../server/ipc/register";
import { initializeDatabase, shutdownDatabase } from "../server/db/index";

let mainWindow: BrowserWindow | null = null;

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
    initializeDatabase();
    registerAllIpcHandlers();
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
    }
  });

  app.on("will-quit", () => {
    shutdownDatabase();
    globalShortcut.unregisterAll();
  });
}
