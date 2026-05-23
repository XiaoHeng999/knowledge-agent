import { ipcMain } from "electron";

function registerIpcHandlers(): void {
  ipcMain.handle("ping", () => "pong");
}

export { registerIpcHandlers };
