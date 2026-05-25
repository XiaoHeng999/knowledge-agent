# Worker Task Interface Specification

> Version: 1.0 | Date: 2026-05-22
> Defines IWorkerTask interface, progress reporting, and cancellation mechanism

---

## Core Interface

### IWorkerTask

```typescript
/**
 * Base interface for all worker tasks.
 * Each task type implements this interface with type-specific payload and result.
 */
interface IWorkerTask<TPayload = unknown, TResult = unknown> {
  /** Unique task identifier */
  id: string;

  /** Task type discriminator */
  type: WorkerTaskType;

  /** Execution priority */
  priority: TaskPriority;

  /** Task-specific input data */
  payload: TPayload;

  /** Maximum execution time in milliseconds */
  timeout: number;

  /** Timestamp when task was submitted */
  createdAt: number;

  /** Timestamp when task started execution */
  startedAt?: number;

  /** Current task state */
  state: TaskState;

  /** Abort controller for cancellation support */
  abortController: AbortController;
}

type WorkerTaskType =
  | 'EMBEDDING_GENERATION'
  | 'BATCH_EMBEDDINGS'
  | 'VECTOR_INDEX_BUILD'
  | 'GRAPH_LAYOUT_COMPUTE'
  | 'PDF_TEXT_EXTRACT'
  | 'RSS_FEED_FETCH'
  | 'DOMAIN_SUMMARY_GEN';

type TaskPriority = 'high' | 'normal' | 'low';

type TaskState =
  | 'pending'     // In queue, waiting to be executed
  | 'running'     // Currently executing
  | 'completed'   // Successfully finished
  | 'failed'      // Failed with error
  | 'cancelled';  // Cancelled by user or system
```

### ITaskHandler

```typescript
/**
 * Handler interface for each task type.
 * Registered in the worker process to handle specific task types.
 */
interface ITaskHandler<TPayload, TResult> {
  /** The task type this handler processes */
  taskType: WorkerTaskType;

  /**
   * Execute the task.
   * Must respect the AbortSignal for cancellation.
   * Should report progress periodically.
   */
  execute(
    payload: TPayload,
    context: TaskExecutionContext
  ): Promise<TResult>;

  /**
   * Estimate memory usage for this task before execution.
   * Returns estimated MB. Used for pre-execution memory check.
   */
  estimateMemory(payload: TPayload): number;

  /**
   * Clean up any resources after task completion or failure.
   * Called regardless of success/failure.
   */
  cleanup?(payload: TPayload): Promise<void>;
}

interface TaskExecutionContext {
  /** Abort signal for cancellation */
  signal: AbortSignal;

  /** Report progress (0.0 to 1.0) */
  reportProgress: (progress: number, message?: string) => void;

  /** Task timeout in milliseconds */
  timeout: number;

  /** Logger scoped to this task */
  logger: TaskLogger;
}
```

---

## Progress Reporting

### Progress Protocol

```typescript
interface TaskProgress {
  /** Task ID */
  taskId: string;

  /** Progress value from 0.0 to 1.0 */
  progress: number;

  /** Human-readable status message */
  message?: string;

  /** Optional structured data for specific task types */
  data?: Record<string, unknown>;

  /** Timestamp */
  timestamp: number;
}
```

### Progress Semantics by Task Type

| Task Type | Progress Mapping | Example Messages |
|-----------|-----------------|------------------|
| `EMBEDDING_GENERATION` | 0.0 → 1.0 (linear) | "Generating embedding... (chunk 3/10)" |
| `BATCH_EMBEDDINGS` | 0.0 → 1.0 (chunk/n) | "Processing batch... 50/100 chunks" |
| `VECTOR_INDEX_BUILD` | 0.0 → 0.3 (load) → 0.7 (build) → 1.0 (write) | "Loading vectors...", "Building index...", "Writing to disk..." |
| `GRAPH_LAYOUT_COMPUTE` | 0.0 → 0.1 (init) → 0.9 (iterate) → 1.0 (done) | "Iteration 150/300, energy: 0.003" |
| `PDF_TEXT_EXTRACT` | 0.0 → 1.0 (page/n) | "Extracting page 15/42..." |
| `RSS_FEED_FETCH` | 0.0 → 0.5 (fetch) → 1.0 (parse) | "Fetching feed...", "Parsing 23 entries..." |
| `DOMAIN_SUMMARY_GEN` | 0.0 → 0.3 (gather) → 0.7 (generate) → 1.0 (save) | "Gathering context...", "Generating summary..." |

### Progress Reporting Interval

| Task Duration | Min Interval | Rationale |
|---------------|-------------|-----------|
| < 5s | No progress reports (task completes too fast) |
| 5-30s | Every 1s | Frequent enough for user feedback |
| 30-120s | Every 2s | Balance between feedback and overhead |
| > 120s | Every 5s | Long-running tasks, reduce message overhead |

```typescript
// Helper: rate-limited progress reporter
function createProgressReporter(
  taskId: string,
  sendFn: (progress: TaskProgress) => void,
  minIntervalMs: number = 1000
): (progress: number, message?: string) => void {
  let lastSent = 0;

  return (progress: number, message?: string) => {
    const now = Date.now();
    if (now - lastSent < minIntervalMs && progress < 1.0) return;

    lastSent = now;
    sendFn({
      taskId,
      progress: Math.min(progress, 1.0),
      message,
      timestamp: now,
    });
  };
}
```

---

## Cancellation Mechanism

### Cancellation Flow

```
User clicks "Cancel"
  → Main process: WorkerBridge.cancelTask(taskId)
    → Send CANCEL_TASK message to worker
    → Worker receives message
      → Call task.abortController.abort()
      → Task handler checks signal.aborted
      → Task handler cleans up resources
      → Worker sends TASK_CANCELLED message
    → Main process: resolve pending promise with cancelled status
```

### Implementation

**Main process side**:

```typescript
class WorkerBridge {
  private pendingTasks = new Map<string, {
    resolve: (result: TaskResult) => void;
    reject: (error: Error) => void;
    abortController: AbortController;
  }>();

  cancelTask(taskId: string): void {
    const pending = this.pendingTasks.get(taskId);
    if (!pending) return;

    pending.abortController.abort();
    this.port.postMessage({ type: 'CANCEL_TASK', taskId });
  }
}
```

**Worker process side**:

```typescript
class TaskQueue {
  private activeTask?: IWorkerTask;

  handleCancel(taskId: string): void {
    if (this.activeTask?.id === taskId) {
      this.activeTask.abortController.abort();
      // Task handler must check signal.aborted and throw
    }
  }
}
```

**Task handler side**:

```typescript
async function handlePdfExtract(
  payload: PdfExtractPayload,
  ctx: TaskExecutionContext
): Promise<PdfExtractResult> {
  const pages = [];

  for (let i = 0; i < payload.totalPages; i++) {
    // Check for cancellation
    if (ctx.signal.aborted) {
      throw new TaskCancelledError(`PDF extraction cancelled at page ${i}`);
    }

    const pageText = await extractPage(payload.filePath, i);
    pages.push(pageText);

    ctx.reportProgress(
      (i + 1) / payload.totalPages,
      `Extracting page ${i + 1}/${payload.totalPages}`
    );
  }

  return { text: pages.join('\n\n'), pageCount: pages.length };
}
```

### Cancellation Error

```typescript
class TaskCancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskCancelledError';
  }
}

// In task executor wrapper:
try {
  const result = await handler.execute(task.payload, context);
  sendToMain({ type: 'TASK_COMPLETE', taskId: task.id, result });
} catch (error) {
  if (error instanceof TaskCancelledError || context.signal.aborted) {
    sendToMain({ type: 'TASK_CANCELLED', taskId: task.id });
  } else {
    sendToMain({ type: 'TASK_ERROR', taskId: task.id, error: serializeError(error) });
  }
} finally {
  await handler.cleanup?.(task.payload);
}
```

---

## Task-Specific Payloads & Results

### EMBEDDING_GENERATION

```typescript
interface EmbeddingPayload {
  text: string;
  model: string; // e.g., 'text-embedding-3-small'
  domainId: string;
  nodeId: string;
}

interface EmbeddingResult {
  vector: number[]; // float32 array
  dimensions: number;
  tokenCount: number;
}
```

### BATCH_EMBEDDINGS

```typescript
interface BatchEmbeddingPayload {
  items: Array<{
    nodeId: string;
    text: string;
  }>;
  model: string;
  domainId: string;
}

interface BatchEmbeddingResult {
  results: Array<{
    nodeId: string;
    vector: number[];
    dimensions: number;
    tokenCount: number;
  }>;
  totalTokens: number;
}
```

### VECTOR_INDEX_BUILD

```typescript
interface VectorIndexPayload {
  domainId: string;
  /** If provided, only re-index these nodes. If empty, full rebuild. */
  nodeIds?: string[];
  /** Embedding model to use */
  model: string;
}

interface VectorIndexResult {
  indexedCount: number;
  totalVectors: number;
  buildTimeMs: number;
  indexSizeBytes: number;
}
```

### GRAPH_LAYOUT_COMPUTE

```typescript
interface GraphLayoutPayload {
  domainId: string;
  /** Pre-fetched nodes and edges (sent from main process) */
  nodes: Array<{ id: string; domainId: string }>;
  edges: Array<{ fromId: string; toId: string; weight: number }>;
  /** Layout algorithm */
  algorithm: 'force-directed' | 'circular' | 'grid';
  /** Max iterations for force-directed */
  maxIterations?: number;
}

interface GraphLayoutResult {
  positions: Record<string, { x: number; y: number }>;
  iterations: number;
  converged: boolean;
  computeTimeMs: number;
}
```

### PDF_TEXT_EXTRACT

```typescript
interface PdfExtractPayload {
  filePath: string;
  /** Max pages to extract (0 = all) */
  maxPages?: number;
  domainId: string;
}

interface PdfExtractResult {
  text: string;
  pageCount: number;
  extractedPages: number;
  metadata?: {
    title?: string;
    author?: string;
    createdAt?: string;
  };
}
```

### RSS_FEED_FETCH

```typescript
interface RssFetchPayload {
  feedUrl: string;
  domainId: string;
  /** Last fetched entry ID (for deduplication) */
  lastEntryId?: string;
}

interface RssFetchResult {
  newEntries: Array<{
    title: string;
    url: string;
    summary: string;
    publishedAt: string;
    author?: string;
  }>;
  totalEntries: number;
  feedTitle: string;
}
```

### DOMAIN_SUMMARY_GEN

```typescript
interface DomainSummaryPayload {
  domainId: string;
  /** Knowledge nodes to include in context */
  contextNodes: Array<{
    title: string;
    content: string;
    comprehensionLevel: number;
  }>;
  /** Summary tier */
  tier: 'hot' | 'warm' | 'cold';
  /** LLM model to use */
  model: string;
}

interface DomainSummaryResult {
  summary: string;
  tier: 'hot' | 'warm' | 'cold';
  tokenCount: number;
  nodeCount: number;
}
```

---

## Task Executor Wrapper

The worker process uses a generic executor that wraps each task handler:

```typescript
async function executeTask(
  task: IWorkerTask,
  handler: ITaskHandler<unknown, unknown>,
  sendToMain: (msg: WorkerToMainMessage) => void
): Promise<void> {
  const startTime = Date.now();
  const progress = createProgressReporter(task.id, (p) => {
    sendToMain({ type: 'TASK_PROGRESS', ...p });
  });

  const context: TaskExecutionContext = {
    signal: task.abortController.signal,
    reportProgress: progress,
    timeout: task.timeout,
    logger: createTaskLogger(task.id, task.type),
  };

  // Set timeout
  const timeoutId = setTimeout(() => {
    task.abortController.abort();
  }, task.timeout);

  try {
    const result = await handler.execute(task.payload, context);
    clearTimeout(timeoutId);

    sendToMain({
      type: 'TASK_COMPLETE',
      taskId: task.id,
      result,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (task.abortController.signal.aborted) {
      // Check if it was a timeout or user cancellation
      const elapsed = Date.now() - startTime;
      if (elapsed >= task.timeout - 100) {
        sendToMain({
          type: 'TASK_ERROR',
          taskId: task.id,
          error: {
            code: 'TASK_TIMEOUT',
            message: `Task timed out after ${task.timeout}ms`,
            recoverable: true,
          },
        });
      } else {
        sendToMain({ type: 'TASK_CANCELLED', taskId: task.id });
      }
    } else {
      sendToMain({
        type: 'TASK_ERROR',
        taskId: task.id,
        error: {
          code: 'TASK_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true,
        },
      });
    }
  } finally {
    await handler.cleanup?.(task.payload);
  }
}
```

---

## Summary

| Aspect | Specification |
|--------|--------------|
| Task interface | Generic `IWorkerTask<TPayload, TResult>` with type-specific payloads |
| Handler interface | `ITaskHandler` with `execute`, `estimateMemory`, `cleanup` |
| Progress | 0.0-1.0 scale, rate-limited, type-specific message format |
| Cancellation | `AbortController` pattern, cooperative checking in handlers |
| Timeout | `setTimeout` → abort, distinguishes timeout from user cancel |
| Task types | 7 defined types with specific payloads and results |
| Cleanup | `finally` block ensures `cleanup()` called on all outcomes |
