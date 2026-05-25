/**
 * WorkerBridge — main process interface to the Utility Process worker.
 * Manages the worker lifecycle, submits tasks, and routes progress/results
 * back to callers via callbacks and IPC events.
 */
import { utilityProcess, MessageChannelMain, type MessagePortMain } from "electron";
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  WorkerTaskType,
  TaskPriority,
  ErrorPayload,
} from "./types";
import { TASK_DEFAULT_TIMEOUTS as defaultTimeouts } from "./types";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaskCallbacks {
  onProgress?: (progress: number, message?: string) => void;
  onComplete: (result: unknown) => void;
  onError: (error: ErrorPayload) => void;
  onCancelled?: () => void;
}

interface PendingTask {
  callbacks: TaskCallbacks;
  submittedAt: number;
}

export interface WorkerTaskSubmitOptions {
  type: WorkerTaskType;
  priority?: TaskPriority;
  payload: unknown;
  timeout?: number;
  onProgress?: (progress: number, message?: string) => void;
}

// ---------------------------------------------------------------------------
// WorkerBridge
// ---------------------------------------------------------------------------

export class WorkerBridge {
  private worker: Electron.UtilityProcess | null = null;
  private port: MessagePortMain | null = null;
  private pendingTasks = new Map<string, PendingTask>();
  private isShuttingDown = false;
  private restartAttempts = 0;
  private maxRestartAttempts = 5;
  private workerReady = false;
  private readyCallbacks: Array<() => void> = [];

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const channel = new MessageChannelMain();
        const port1 = channel.port1;
        const port2 = channel.port2;
        this.port = port1;

        port1.on("message", (messageEvent: Electron.MessageEvent) => {
          this.handleWorkerMessage(messageEvent.data as WorkerToMainMessage);
        });
        port1.start();

        this.worker = utilityProcess.fork(
          require("path").join(__dirname, "../server/worker/worker-process.js"),
          [],
          { stdio: "pipe" },
        );

        this.worker.on("exit", (code) => {
          this.handleWorkerExit(code);
        });

        // Send port2 to worker via utility process message
        this.worker.postMessage({ type: "INIT_PORT" }, [port2]);

        // Wait for WORKER_READY
        const timeout = setTimeout(() => {
          reject(new Error("Worker failed to initialize within 10s"));
        }, 10_000);

        this.readyCallbacks.push(() => {
          clearTimeout(timeout);
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  submitTask(options: WorkerTaskSubmitOptions): string {
    const taskId = randomUUID();
    const msg: MainToWorkerMessage = {
      type: "SUBMIT_TASK",
      task: {
        id: taskId,
        type: options.type,
        priority: options.priority ?? "normal",
        payload: options.payload,
        timeout: options.timeout ?? defaultTimeouts[options.type],
        createdAt: Date.now(),
      },
    };

    this.pendingTasks.set(taskId, {
      callbacks: {
        onProgress: options.onProgress,
        onComplete: () => {},
        onError: () => {},
      },
      submittedAt: Date.now(),
    });

    this.port?.postMessage(msg);
    return taskId;
  }

  /**
   * Submit a task and return a promise that resolves with the result.
   */
  submitTaskAsync<T = unknown>(options: WorkerTaskSubmitOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskId = randomUUID();
      const msg: MainToWorkerMessage = {
        type: "SUBMIT_TASK",
        task: {
          id: taskId,
          type: options.type,
          priority: options.priority ?? "normal",
          payload: options.payload,
          timeout: options.timeout ?? defaultTimeouts[options.type],
          createdAt: Date.now(),
        },
      };

      this.pendingTasks.set(taskId, {
        callbacks: {
          onProgress: options.onProgress,
          onComplete: (result) => resolve(result as T),
          onError: (error) => reject(new Error(error.message)),
          onCancelled: () => reject(new Error("Task cancelled")),
        },
        submittedAt: Date.now(),
      });

      this.port?.postMessage(msg);
    });
  }

  cancelTask(taskId: string): void {
    const pending = this.pendingTasks.get(taskId);
    if (!pending) return;

    this.port?.postMessage({ type: "CANCEL_TASK", taskId });
  }

  pauseQueue(): void {
    this.port?.postMessage({ type: "PAUSE_QUEUE" });
  }

  resumeQueue(): void {
    this.port?.postMessage({ type: "RESUME_QUEUE" });
  }

  getPendingCount(): number {
    return this.pendingTasks.size;
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (!this.worker) return;

    // Signal worker to stop
    this.port?.postMessage({ type: "SHUTDOWN" });

    // Wait up to 5s for pending tasks
    if (this.pendingTasks.size > 0) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 5000);

        const interval = setInterval(() => {
          if (this.pendingTasks.size === 0) {
            clearTimeout(timeout);
            clearInterval(interval);
            resolve();
          }
        }, 200);

        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 5500);
      });
    }

    // Force kill worker
    this.worker.kill();
    this.port?.close();
    this.port = null;
    this.worker = null;

    // Clear all pending
    for (const [, pending] of this.pendingTasks) {
      pending.callbacks.onError({
        code: "WORKER_SHUTDOWN",
        message: "Worker is shutting down",
        recoverable: false,
      });
    }
    this.pendingTasks.clear();
  }

  // -------------------------------------------------------------------------
  // Message handling
  // -------------------------------------------------------------------------

  private handleWorkerMessage(msg: WorkerToMainMessage): void {
    switch (msg.type) {
      case "WORKER_READY":
        this.workerReady = true;
        this.restartAttempts = 0;
        for (const cb of this.readyCallbacks) cb();
        this.readyCallbacks = [];
        console.log("[Worker] Ready");
        break;

      case "TASK_PROGRESS": {
        const pending = this.pendingTasks.get(msg.taskId);
        pending?.callbacks.onProgress?.(msg.progress, msg.message);
        break;
      }

      case "TASK_COMPLETE": {
        const pending = this.pendingTasks.get(msg.taskId);
        if (pending) {
          pending.callbacks.onComplete(msg.result);
          this.pendingTasks.delete(msg.taskId);
        }
        break;
      }

      case "TASK_ERROR": {
        const pending = this.pendingTasks.get(msg.taskId);
        if (pending) {
          pending.callbacks.onError(msg.error);
          this.pendingTasks.delete(msg.taskId);
        }
        break;
      }

      case "TASK_CANCELLED": {
        const pending = this.pendingTasks.get(msg.taskId);
        if (pending) {
          pending.callbacks.onCancelled?.();
          this.pendingTasks.delete(msg.taskId);
        }
        break;
      }

      case "WORKER_ERROR":
        console.error("[Worker]", msg.error);
        break;

      case "QUEUE_STATUS":
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Worker lifecycle
  // -------------------------------------------------------------------------

  private handleWorkerExit(code: number | null): void {
    this.workerReady = false;
    console.error(`[Worker] Process exited with code ${code}`);

    // Notify all pending tasks
    for (const [, pending] of this.pendingTasks) {
      pending.callbacks.onError({
        code: "WORKER_CRASHED",
        message: "Worker process crashed unexpectedly",
        recoverable: true,
        retryAfter: 3000,
      });
    }
    this.pendingTasks.clear();

    if (this.isShuttingDown) return;

    // Restart with exponential backoff
    if (this.restartAttempts < this.maxRestartAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.restartAttempts), 30000);
      this.restartAttempts++;
      console.log(`[Worker] Restarting in ${delay}ms (attempt ${this.restartAttempts})`);

      setTimeout(() => {
        this.initialize().catch((err) => {
          console.error("[Worker] Restart failed:", err);
        });
      }, delay);
    } else {
      console.error("[Worker] Max restart attempts reached");
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let bridge: WorkerBridge | null = null;

export function getWorkerBridge(): WorkerBridge {
  if (!bridge) {
    bridge = new WorkerBridge();
  }
  return bridge;
}

export async function initializeWorker(): Promise<void> {
  const b = getWorkerBridge();
  await b.initialize();
}

export async function shutdownWorker(): Promise<void> {
  if (bridge) {
    await bridge.shutdown();
    bridge = null;
  }
}
