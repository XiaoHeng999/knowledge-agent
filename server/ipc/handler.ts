import { ipcMain, IpcMainInvokeEvent } from "electron";
import type { ChannelName, ChannelRequest, ChannelResponse } from "../../src/lib/ipc/channels";

// ---------------------------------------------------------------------------
// IPC Error — normalised error type that crosses the IPC boundary
// ---------------------------------------------------------------------------

export class IpcError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "IpcError";
  }

  toJSON() {
    return {
      __ipcError: true,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Reconstruct an IpcError from the serialized form the renderer receives.
export function isIpcError(val: unknown): val is IpcError {
  return typeof val === "object" && val !== null && "__ipcError" in val;
}

// ---------------------------------------------------------------------------
// Handler function signature
// ---------------------------------------------------------------------------

export type IpcHandlerFn<C extends ChannelName> = (
  event: IpcMainInvokeEvent,
  request: ChannelRequest<C>,
) => ChannelResponse<C> | Promise<ChannelResponse<C>>;

// ---------------------------------------------------------------------------
// Handler options
// ---------------------------------------------------------------------------

export interface IpcHandlerOptions {
  /** Max time in ms before the handler is aborted (default: 30 000) */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// registerHandler — wraps every IPC handler with logging, error handling,
// and optional timeout.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT = 30_000;

export function registerHandler<C extends ChannelName>(
  channel: C,
  handler: IpcHandlerFn<C>,
  options: IpcHandlerOptions = {},
): void {
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT;

  ipcMain.handle(channel, async (event, request: ChannelRequest<C>) => {
    const start = performance.now();
    const logPrefix = `[IPC ${channel}]`;

    try {
      const result = await withTimeout(
        Promise.resolve(handler(event, request)),
        timeoutMs,
        `Handler for "${channel}" timed out after ${timeoutMs}ms`,
      );

      const duration = Math.round(performance.now() - start);
      console.log(`${logPrefix} OK (${duration}ms)`);
      return result;
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - start);

      if (err instanceof IpcError) {
        console.error(`${logPrefix} IpcError [${err.code}] (${duration}ms): ${err.message}`);
        return err.toJSON();
      }

      const message = err instanceof Error ? err.message : String(err);
      console.error(`${logPrefix} Unhandled error (${duration}ms): ${message}`);

      const wrapped = new IpcError("INTERNAL_ERROR", message);
      return wrapped.toJSON();
    }
  });
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  if (ms <= 0) return promise;

  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>(
      (_, reject) => (timer = setTimeout(() => reject(new IpcError("TIMEOUT", message)), ms)),
    ),
  ]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// unregisterAll — useful during tests or graceful shutdown
// ---------------------------------------------------------------------------

export function unregisterAll(): void {
  ipcMain.removeHandler("app:ping");
  ipcMain.removeHandler("app:getVersion");
  ipcMain.removeHandler("app:getPlatform");
  ipcMain.removeHandler("db:initialize");
  ipcMain.removeHandler("db:migrate");
  ipcMain.removeHandler("db:getVersion");
  ipcMain.removeHandler("db:backup");
  ipcMain.removeHandler("model:listProviders");
  ipcMain.removeHandler("model:listModels");
  ipcMain.removeHandler("model:addApiKey");
  ipcMain.removeHandler("model:validateApiKey");
  ipcMain.removeHandler("model:removeApiKey");
  ipcMain.removeHandler("model:setDefault");
  ipcMain.removeHandler("model:getDefault");
  ipcMain.removeHandler("domain:create");
  ipcMain.removeHandler("domain:list");
  ipcMain.removeHandler("domain:get");
  ipcMain.removeHandler("domain:update");
  ipcMain.removeHandler("domain:delete");
  ipcMain.removeHandler("domain:getConfig");
  ipcMain.removeHandler("domain:updateConfig");
  ipcMain.removeHandler("knowledge:createNode");
  ipcMain.removeHandler("knowledge:updateNode");
  ipcMain.removeHandler("knowledge:deleteNode");
  ipcMain.removeHandler("knowledge:getNode");
  ipcMain.removeHandler("knowledge:listNodes");
  ipcMain.removeHandler("knowledge:createEdge");
  ipcMain.removeHandler("knowledge:deleteEdge");
  ipcMain.removeHandler("knowledge:getGraph");
  ipcMain.removeHandler("knowledge:search");
  ipcMain.removeHandler("inbox:addItem");
  ipcMain.removeHandler("inbox:listItems");
  ipcMain.removeHandler("inbox:processItem");
  ipcMain.removeHandler("inbox:rejectItem");
  ipcMain.removeHandler("inbox:getStats");
  ipcMain.removeHandler("research:trigger");
  ipcMain.removeHandler("research:getStatus");
  ipcMain.removeHandler("research:listHistory");
  ipcMain.removeHandler("research:getDashboard");
  ipcMain.removeHandler("research:cancel");
  ipcMain.removeHandler("settings:get");
  ipcMain.removeHandler("settings:set");
  ipcMain.removeHandler("settings:getTheme");
  ipcMain.removeHandler("settings:setTheme");
  ipcMain.removeHandler("import:importUrl");
  ipcMain.removeHandler("import:importFile");
  ipcMain.removeHandler("import:getStatus");
}
