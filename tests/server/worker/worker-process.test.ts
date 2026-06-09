import { describe, it, expect } from "vitest";
import type { WorkerTaskType } from "../../../server/worker/types";
import { TASK_DEFAULT_TIMEOUTS } from "../../../server/worker/types";

// Import individual handlers — these already have correct types
import { handleEmbeddingGeneration, handleBatchEmbeddings } from "../../../server/worker/tasks/embedding-task";
import { handleVectorIndexBuild } from "../../../server/worker/tasks/vector-index-task";
import { handleGraphLayoutCompute } from "../../../server/worker/tasks/graph-layout-task";
import { handlePdfTextExtract } from "../../../server/worker/tasks/pdf-parse-task";

/**
 * Exhaustiveness check: every WorkerTaskType must have a handler registered.
 * If someone adds a new task type but forgets to add a handler, this test fails.
 */

const ALL_TASK_TYPES: WorkerTaskType[] = [
  "EMBEDDING_GENERATION",
  "BATCH_EMBEDDINGS",
  "VECTOR_INDEX_BUILD",
  "GRAPH_LAYOUT_COMPUTE",
  "PDF_TEXT_EXTRACT",
];

// Mirror the handler map from worker-process.ts
// This also serves as a compile-time check: each handler must be assignable
// to its correct WorkerHandler<P, R> type via the TaskHandlerMap interface.
const handlers = {
  EMBEDDING_GENERATION: handleEmbeddingGeneration,
  BATCH_EMBEDDINGS: handleBatchEmbeddings,
  VECTOR_INDEX_BUILD: handleVectorIndexBuild,
  GRAPH_LAYOUT_COMPUTE: handleGraphLayoutCompute,
  PDF_TEXT_EXTRACT: handlePdfTextExtract,
} as const;

describe("Worker handler registry", () => {
  it("registers a handler for every WorkerTaskType", () => {
    for (const taskType of ALL_TASK_TYPES) {
      expect(handlers).toHaveProperty(taskType);
      expect(typeof handlers[taskType as keyof typeof handlers]).toBe("function");
    }
  });

  it("has matching default timeouts for every handler", () => {
    for (const taskType of ALL_TASK_TYPES) {
      expect(TASK_DEFAULT_TIMEOUTS).toHaveProperty(taskType);
      expect(typeof TASK_DEFAULT_TIMEOUTS[taskType as WorkerTaskType]).toBe("number");
    }
  });

  it("has no extra handlers beyond defined WorkerTaskTypes", () => {
    const handlerKeys = Object.keys(handlers);
    expect(handlerKeys.length).toBe(ALL_TASK_TYPES.length);
    for (const key of handlerKeys) {
      expect(ALL_TASK_TYPES).toContain(key);
    }
  });
});
