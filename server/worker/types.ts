/**
 * Worker types — message protocol, task interfaces, and payload/result definitions.
 * Shared between main process (worker-bridge) and utility process (worker-process).
 */

// ---------------------------------------------------------------------------
// Task types & priority
// ---------------------------------------------------------------------------

export type WorkerTaskType =
  | "EMBEDDING_GENERATION"
  | "BATCH_EMBEDDINGS"
  | "VECTOR_INDEX_BUILD"
  | "GRAPH_LAYOUT_COMPUTE"
  | "PDF_TEXT_EXTRACT";

export type TaskPriority = "high" | "normal" | "low";

export type TaskState =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// ---------------------------------------------------------------------------
// Default timeouts per task type (ms)
// ---------------------------------------------------------------------------

export const TASK_DEFAULT_TIMEOUTS: Record<WorkerTaskType, number> = {
  EMBEDDING_GENERATION: 60_000,
  BATCH_EMBEDDINGS: 300_000,
  VECTOR_INDEX_BUILD: 600_000,
  GRAPH_LAYOUT_COMPUTE: 120_000,
  PDF_TEXT_EXTRACT: 120_000,
};

// ---------------------------------------------------------------------------
// Task payloads & results
// ---------------------------------------------------------------------------

export interface EmbeddingPayload {
  text: string;
  model: string;
  domainId: string;
  nodeId: string;
}

export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  tokenCount: number;
}

export interface BatchEmbeddingPayload {
  items: Array<{ nodeId: string; text: string }>;
  model: string;
  domainId: string;
}

export interface BatchEmbeddingResult {
  results: Array<{
    nodeId: string;
    vector: number[];
    dimensions: number;
    tokenCount: number;
  }>;
  totalTokens: number;
}

export interface VectorIndexPayload {
  domainId: string;
  nodeIds?: string[];
  model: string;
}

export interface VectorIndexResult {
  indexedCount: number;
  totalVectors: number;
  buildTimeMs: number;
}

export interface GraphLayoutPayload {
  domainId: string;
  nodes: Array<{ id: string; domainId: string }>;
  edges: Array<{ fromId: string; toId: string; weight: number }>;
  algorithm: "force-directed" | "circular" | "grid";
  maxIterations?: number;
}

export interface GraphLayoutResult {
  positions: Record<string, { x: number; y: number }>;
  iterations: number;
  converged: boolean;
  computeTimeMs: number;
}

export interface PdfExtractPayload {
  filePath: string;
  maxPages?: number;
  domainId: string;
}

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  extractedPages: number;
  metadata?: {
    title?: string;
    author?: string;
    createdAt?: string;
  };
}

// ---------------------------------------------------------------------------
// Task wrapper for the queue
// ---------------------------------------------------------------------------

export interface WorkerTaskPayload {
  id: string;
  type: WorkerTaskType;
  priority: TaskPriority;
  payload: unknown;
  timeout?: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Message protocol (Main ↔ Worker)
// ---------------------------------------------------------------------------

export type MainToWorkerMessage =
  | { type: "SUBMIT_TASK"; task: WorkerTaskPayload }
  | { type: "CANCEL_TASK"; taskId: string }
  | { type: "PAUSE_QUEUE" }
  | { type: "RESUME_QUEUE" }
  | { type: "SHUTDOWN" };

export interface ErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
}

export type WorkerToMainMessage =
  | { type: "TASK_PROGRESS"; taskId: string; progress: number; message?: string }
  | { type: "TASK_COMPLETE"; taskId: string; result: unknown }
  | { type: "TASK_ERROR"; taskId: string; error: ErrorPayload }
  | { type: "TASK_CANCELLED"; taskId: string }
  | { type: "QUEUE_STATUS"; pendingCount: number; activeTask?: string }
  | { type: "WORKER_READY" }
  | { type: "WORKER_ERROR"; error: string };

// ---------------------------------------------------------------------------
// Handler context & generic handler type
// ---------------------------------------------------------------------------

export interface WorkerHandlerContext {
  signal: AbortSignal;
  reportProgress: (progress: number, message?: string) => void;
}

export type WorkerHandler<P = unknown, R = unknown> = (
  payload: P,
  ctx: WorkerHandlerContext,
) => Promise<R>;

// ---------------------------------------------------------------------------
// Task-specific payloads & results (used by handler map)
// ---------------------------------------------------------------------------

export interface VectorIndexTaskPayload extends VectorIndexPayload {
  /** Node data sent from main process */
  nodes: Array<{ id: string; title: string; content: string; summary: string | null }>;
}

export interface VectorIndexTaskResult extends VectorIndexResult {
  /** Generated vectors for main process to upsert */
  vectors: Array<{ nodeId: string; vector: number[] }>;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class TaskCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskCancelledError";
  }
}
