/**
 * Auto-updater service — handles checking, downloading, and installing updates.
 *
 * Uses electron-updater with GitHub Releases as the provider.
 * On macOS and Windows, updates download and install automatically.
 * On Linux, the user is directed to download manually.
 */

import { BrowserWindow, dialog } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";
import { logger } from "./logger";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
let checkTimer: ReturnType<typeof setInterval> | null = null;

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  version: string | null;
  error: string | null;
}

let currentStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  version: null,
  error: null,
};

function updateStatus(patch: Partial<UpdateStatus>): void {
  currentStatus = { ...currentStatus, ...patch };
  broadcastStatus();
}

function broadcastStatus(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("update:status", currentStatus);
  }
}

export function getUpdateStatus(): UpdateStatus {
  return { ...currentStatus };
}

export function initializeAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Don't attempt auto-update in dev mode
  const isDev = !require("electron").app.isPackaged;
  if (isDev) {
    logger.info("updater", "Skipping auto-updater in development mode");
    return;
  }

  // --- Events ---

  autoUpdater.on("checking-for-update", () => {
    updateStatus({ checking: true, error: null });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    updateStatus({
      checking: false,
      available: true,
      version: info.version,
    });

    if (process.platform === "linux") {
      // Linux: notify user to download manually
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send("update:linux-available", {
          version: info.version,
          releaseUrl: `https://github.com/agentclaw/agentclaw/releases/tag/v${info.version}`,
        });
      }
    } else {
      // macOS / Windows: prompt to download
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send("update:prompt-download", {
          version: info.version,
        });
      }
    }
  });

  autoUpdater.on("update-not-available", () => {
    updateStatus({ checking: false, available: false });
  });

  autoUpdater.on("download-progress", (progress) => {
    updateStatus({ downloading: true });
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("update:download-progress", {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
      });
    }
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    updateStatus({
      downloading: false,
      downloaded: true,
      version: info.version,
    });

    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send("update:prompt-install", {
        version: info.version,
      });
    }
  });

  autoUpdater.on("error", (err) => {
    updateStatus({ checking: false, downloading: false, error: err.message });
    logger.error("updater", "Update check failed", err);
  });

  // --- Initial check + periodic schedule ---

  checkForUpdates();
  checkTimer = setInterval(checkForUpdates, CHECK_INTERVAL_MS);

  logger.info("updater", "Auto-updater initialized");
}

export function shutdownAutoUpdater(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}

async function checkForUpdates(): Promise<void> {
  try {
    await autoUpdater.checkForUpdates();
  } catch {
    // Silently log — next scheduled check will retry
    logger.info("updater", "Update check failed, will retry on next schedule");
  }
}

/** User accepted the download prompt — start downloading. */
export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateStatus({ downloading: false, error: msg });
  }
}

/** User accepted the install prompt — quit and install. */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
