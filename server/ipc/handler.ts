import { ipcMain, IpcMainInvokeEvent } from "electron";
import type { ChannelName, ChannelRequest, ChannelResponse } from "../../src/lib/ipc/channels";
import { createLogger } from "../services/logger";

const log = createLogger("IPC");

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
  timeout?: number;
}

// ---------------------------------------------------------------------------
// registerHandler — wraps every IPC handler with logging, error handling,
// and optional timeout. Tracks registered channels for cleanup.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT = 30_000;
const registeredChannels: string[] = [];

export function registerHandler<C extends ChannelName>(
  channel: C,
  handler: IpcHandlerFn<C>,
  options: IpcHandlerOptions = {},
): void {
  registeredChannels.push(channel);
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT;

  ipcMain.handle(channel, async (event, request: ChannelRequest<C>) => {
    const start = performance.now();

    try {
      const result = await withTimeout(
        Promise.resolve(handler(event, request)),
        timeoutMs,
        `Handler for "${channel}" timed out after ${timeoutMs}ms`,
      );

      const duration = Math.round(performance.now() - start);
      log.info(`${channel} OK (${duration}ms)`);
      return result;
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - start);

      if (err instanceof IpcError) {
        log.error(`IpcError [${err.code}] (${duration}ms): ${err.message}`);
        return err.toJSON();
      }

      const message = err instanceof Error ? err.message : String(err);
      log.error(`Unhandled error (${duration}ms): ${message}`);

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
  for (const channel of registeredChannels) {
    ipcMain.removeHandler(channel);
  }
  registeredChannels.length = 0;
}
