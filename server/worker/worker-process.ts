/**
 * Worker Process — Electron Utility Process entry point.
 * Receives tasks via MessagePort, executes them sequentially with priority,
 * and streams progress/results back to the main process.
 *
 * Communication:
 *   Main → Worker: MainToWorkerMessage (SUBMIT_TASK, CANCEL_TASK, etc.)
 *   Worker → Main: WorkerToMainMessage (TASK_PROGRESS, TASK_COMPLETE, etc.)
 */
import { TaskQueue, createProgressReporter, getProgressInterval } from "./task-queue";
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  WorkerTaskPayload,
} from "./types";
import { TASK_DEFAULT_TIMEOUTS } from "./types";

// Task handler registry
import { handleEmbeddingGeneration, handleBatchEmbeddings } from "./tasks/embedding-task";
import { handleVectorIndexBuild } from "./tasks/vector-index-task";
import { handleGraphLayoutCompute } from "./tasks/graph-layout-task";
import { handlePdfTextExtract } from "./tasks/pdf-parse-task";

// ---------------------------------------------------------------------------
// Handler type & registry
// ---------------------------------------------------------------------------

type TaskHandler = (
  payload: unknown,
  ctx: { signal: AbortSignal; reportProgress: (p: number, m?: string) => void },
) => Promise<unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<string, (payload: any, ctx: any) => Promise<unknown>> = {
  EMBEDDING_GENERATION: handleEmbeddingGeneration,
  BATCH_EMBEDDINGS: handleBatchEmbeddings,
  VECTOR_INDEX_BUILD: handleVectorIndexBuild,
  GRAPH_LAYOUT_COMPUTE: handleGraphLayoutCompute,
  PDF_TEXT_EXTRACT: handlePdfTextExtract,
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const queue = new TaskQueue();
let port: { postMessage: (msg: unknown) => void; on: (event: string, cb: (msg: unknown) => void) => void; start: () => void } | null = null;
let isShuttingDown = false;
let isExecuting = false;

// Memory monitoring
const MEMORY_LIMIT_MB = 256;
const MEMORY_CHECK_INTERVAL_MS = 5000;
let memoryCheckTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Send helper
// ---------------------------------------------------------------------------

function send(msg: WorkerToMainMessage): void {
  port?.postMessage(msg);
}

// ---------------------------------------------------------------------------
// Task execution
// ---------------------------------------------------------------------------

async function executeTask(task: WorkerTaskPayload): Promise<void> {
  const handler = handlers[task.type];
  if (!handler) {
    send({
      type: "TASK_ERROR",
      taskId: task.id,
      error: {
        code: "UNKNOWN_TASK_TYPE",
        message: `No handler for task type: ${task.type}`,
        recoverable: false,
      },
    });
    return;
  }

  const abortController = new AbortController();
  const timeout = task.timeout ?? TASK_DEFAULT_TIMEOUTS[task.type];
  const startTime = Date.now();

  // Timeout enforcement
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeout);

  // Rate-limited progress reporter
  const progressInterval = getProgressInterval(timeout);
  const reportProgress = createProgressReporter(task.id, send, progressInterval);

  try {
    reportProgress(0, "Starting task...");
    const result = await handler(task.payload, {
      signal: abortController.signal,
      reportProgress,
    });
    clearTimeout(timeoutId);
    send({ type: "TASK_COMPLETE", taskId: task.id, result });
  } catch (error) {
    clearTimeout(timeoutId);
    if (abortController.signal.aborted) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout - 100) {
        send({
          type: "TASK_ERROR",
          taskId: task.id,
          error: {
            code: "TASK_TIMEOUT",
            message: `Task timed out after ${timeout}ms`,
            recoverable: true,
            retryAfter: 5000,
          },
        });
      } else {
        send({ type: "TASK_CANCELLED", taskId: task.id });
      }
    } else {
      send({
        type: "TASK_ERROR",
        taskId: task.id,
        error: {
          code: "TASK_EXECUTION_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          recoverable: true,
        },
      });
    }
  } finally {
    queue.completeActive();
  }
}

async function processNextTask(): Promise<void> {
  if (isExecuting || isShuttingDown || queue.isPaused()) return;

  const task = queue.dequeue();
  if (!task) return;

  isExecuting = true;
  try {
    await executeTask(task);
  } finally {
    isExecuting = false;
    processNextTask();
  }
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

function handleMessage(msg: MainToWorkerMessage): void {
  switch (msg.type) {
    case "SUBMIT_TASK": {
      const accepted = queue.enqueue(msg.task);
      if (!accepted) {
        send({
          type: "TASK_ERROR",
          taskId: msg.task.id,
          error: {
            code: "QUEUE_FULL",
            message: "Task queue is full (max 100 pending tasks)",
            recoverable: true,
            retryAfter: 10000,
          },
        });
      }
      processNextTask();
      break;
    }

    case "CANCEL_TASK": {
      const cancelled = queue.cancelById(msg.taskId);
      if (cancelled) {
        send({ type: "TASK_CANCELLED", taskId: msg.taskId });
      }
      break;
    }

    case "PAUSE_QUEUE":
      queue.pause();
      break;

    case "RESUME_QUEUE":
      queue.resume();
      processNextTask();
      break;

    case "SHUTDOWN":
      isShuttingDown = true;
      queue.clear();
      if (memoryCheckTimer) {
        clearInterval(memoryCheckTimer);
        memoryCheckTimer = null;
      }
      break;
  }
}

// ---------------------------------------------------------------------------
// Memory monitoring
// ---------------------------------------------------------------------------

function startMemoryMonitor(): void {
  memoryCheckTimer = setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / (1024 * 1024);

    if (heapUsedMB > MEMORY_LIMIT_MB * 0.9) {
      send({
        type: "WORKER_ERROR",
        error: `Memory usage at ${heapUsedMB.toFixed(0)}MB (limit: ${MEMORY_LIMIT_MB}MB). Pausing queue.`,
      });
      queue.pause();
    } else if (queue.isPaused() && heapUsedMB < MEMORY_LIMIT_MB * 0.7) {
      queue.resume();
      send({
        type: "WORKER_ERROR",
        error: `Memory usage recovered to ${heapUsedMB.toFixed(0)}MB. Resuming queue.`,
      });
      processNextTask();
    }

    if (heapUsedMB > MEMORY_LIMIT_MB) {
      send({
        type: "WORKER_ERROR",
        error: `Memory limit exceeded: ${heapUsedMB.toFixed(0)}MB`,
      });
      queue.clear();
    }
  }, MEMORY_CHECK_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

interface ParentPortLike {
  on(event: string, callback: (event: { data: unknown; ports: Array<{ postMessage: (msg: unknown) => void; on: (event: string, cb: (msg: unknown) => void) => void; start: () => void }> }) => void): void;
  postMessage(message: unknown, transfer?: unknown[]): void;
}

// In Electron Utility Process, process.parentPort is available
const parentPort: ParentPortLike | null =
  (process as unknown as { parentPort?: ParentPortLike }).parentPort ?? null;

if (parentPort) {
  parentPort.on("message", (event) => {
    // First message receives the MessagePort
    if (!port && event.ports?.length) {
      port = event.ports[0];
      port.on("message", (msg) => handleMessage(msg as MainToWorkerMessage));
      port.start();
      startMemoryMonitor();
      send({ type: "WORKER_READY" });
      return;
    }

    // Subsequent messages via parentPort
    if (!port) {
      handleMessage(event.data as MainToWorkerMessage);
    }
  });
}
