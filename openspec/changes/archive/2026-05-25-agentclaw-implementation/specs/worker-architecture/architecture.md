# Electron Utility Process Architecture

> Version: 1.0 | Date: 2026-05-22
> Decision: D8 — Single Utility Process + internal task queue

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Process                              │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  Electron   │  │   Service    │  │  Worker Bridge          │ │
│  │  App        │  │   Layer      │  │  (worker-bridge.ts)     │ │
│  │            │  │              │  │                         │ │
│  │ - Window   │  │ - Knowledge  │  │ - submitTask()          │ │
│  │ - Tray     │  │ - Research   │  │ - cancelTask()          │ │
│  │ - IPC      │  │ - Import     │  │ - onProgress()          │ │
│  │ - Menu     │  │ - Model      │  │ - onTaskComplete()      │ │
│  │            │  │ - Search     │  │ - onTaskError()         │ │
│  └────────────┘  └──────────────┘  └───────────┬─────────────┘ │
│                                                 │                │
│                              MessagePort (IPC)  │                │
│                                                 │                │
│  ┌──────────────────────────────────────────────▼──────────────┐│
│  │                Utility Process (worker-process.ts)           ││
│  │                                                             ││
│  │  ┌──────────────────────────────────────────────────────┐  ││
│  │  │              Task Queue (priority-based)              │  ││
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │  ││
│  │  │  │ Task A  │ │ Task B  │ │ Task C  │  ...           │  ││
│  │  │  │ (high)  │ │ (normal)│ │ (low)   │               │  ││
│  │  │  └─────────┘ └─────────┘ └─────────┘               │  ││
│  │  └──────────────────────────────────────────────────────┘  ││
│  │                                                             ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐           ││
│  │  │  Vector    │  │  Graph     │  │  PDF       │           ││
│  │  │  Indexer   │  │  Layout    │  │  Parser    │           ││
│  │  │  Worker    │  │  Worker    │  │  Worker    │           ││
│  │  └────────────┘  └────────────┘  └────────────┘           ││
│  │                                                             ││
│  │  ┌────────────┐  ┌────────────┐                            ││
│  │  │  Embedding │  │  RSS       │                            ││
│  │  │  Generator │  │  Poller    │                            ││
│  │  └────────────┘  └────────────┘                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │             Renderer Process (Next.js)                      ││
│  │                                                             ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                ││
│  │  │  React   │  │  Zustand │  │  IPC     │                ││
│  │  │  UI      │  │  Store   │  │  Client  │                ││
│  │  └──────────┘  └──────────┘  └──────────┘                ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Process Model

### Why Single Utility Process

From design decision D8:

| Factor | Single Process + Queue | Multiple Utility Processes |
|--------|----------------------|--------------------------|
| Memory overhead | ~30-50MB fixed | 30-50MB × N processes |
| Complexity | Low — single queue | High — inter-process coordination |
| Parallelism | Sequential within process | True parallelism |
| Crash blast radius | All tasks lost on crash | Only one worker type affected |
| Suitability | Personal app, < 10 concurrent tasks | Server-grade workloads |

**Decision**: Single Utility Process with an internal priority queue. Sequential execution of CPU-bound tasks prevents memory bloat while keeping the architecture simple.

---

## Communication: MessagePort

The Main process and Utility process communicate via Electron's `MessagePortMain`.

### Why MessagePort (not IPC invoke)

| Property | MessagePort | ipcMain/ipcRenderer |
|----------|-------------|---------------------|
| Bidirectional | Yes, full duplex | Request/response only |
| Streaming | Native support | Requires manual chunking |
| Performance | Direct port, no serialization overhead | JSON serialization |
| Use for | Continuous data (progress, streaming) | One-off commands |

**Pattern**: Use `ipcMain.handle` for one-off task submission, `MessagePort` for progress streaming and cancellation.

### Channel Setup

```typescript
// main process: worker-bridge.ts
import { utilityProcess, MessagePortMain } from 'electron';

export class WorkerBridge {
  private worker: Electron.UtilityProcess;
  private port: MessagePortMain;
  private pendingTasks = new Map<string, TaskCallbacks>();

  constructor() {
    const { port1, port2 } = utilityProcess.createPortPair();

    this.port = port1;
    this.port.on('message', (msg: WorkerMessage) => this.handleMessage(msg));
    this.port.start();

    this.worker = utilityProcess.fork(
      path.join(__dirname, 'worker-process.js'),
      [],
      { stdio: 'pipe' }
    );

    // Send port2 to worker via IPC
    this.worker.postMessage({ type: 'INIT_PORT' }, [port2]);
  }
}
```

```typescript
// utility process: worker-process.ts
import { parentPort } from 'node:worker_threads'; // available in utility process

let port: MessagePort;

parentPort?.on('message', (msg: { type: string }) => {
  if (msg.type === 'INIT_PORT') {
    // port2 received via transferable
  }
});

// Actually, in Electron Utility Process, we use ipc
process.parentPort.on('message', (event) => {
  const [port] = event.ports;
  port.on('message', (msg: WorkerMessage) => handleTaskMessage(msg));
  port.start();
});
```

---

## Message Protocol

### Main → Worker Messages

```typescript
type MainToWorkerMessage =
  | { type: 'SUBMIT_TASK'; task: WorkerTaskPayload }
  | { type: 'CANCEL_TASK'; taskId: string }
  | { type: 'PAUSE_QUEUE' }
  | { type: 'RESUME_QUEUE' }
  | { type: 'SHUTDOWN' };

interface WorkerTaskPayload {
  id: string;
  type: WorkerTaskType;
  priority: 'high' | 'normal' | 'low';
  payload: unknown; // task-specific data
  timeout?: number; // ms, default per task type
  createdAt: number; // timestamp
}
```

### Worker → Main Messages

```typescript
type WorkerToMainMessage =
  | { type: 'TASK_PROGRESS'; taskId: string; progress: number; message?: string }
  | { type: 'TASK_COMPLETE'; taskId: string; result: unknown }
  | { type: 'TASK_ERROR'; taskId: string; error: ErrorPayload }
  | { type: 'QUEUE_STATUS'; pendingCount: number; activeTask?: string }
  | { type: 'WORKER_READY' }
  | { type: 'WORKER_ERROR'; error: string };

interface ErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number; // ms
}
```

---

## Task Queue Model

### Priority Queue

```
┌─────────────────────────────────────────────────┐
│ Priority Queue (in-memory, within worker)        │
│                                                   │
│ HIGH:    [embedding-gen-045]                      │
│ NORMAL:  [graph-layout-023] [vector-index-012]   │
│ LOW:     [rss-poll-001] [rss-poll-002]           │
│                                                   │
│ Active: [embedding-gen-045] ← currently running   │
└─────────────────────────────────────────────────┘
```

### Scheduling Rules

| Rule | Behavior |
|------|----------|
| Priority order | HIGH > NORMAL > LOW within same queue position |
| FIFO within priority | Same-priority tasks execute in submission order |
| Preemption | LOW tasks yield to HIGH tasks at next progress report |
| Concurrency | 1 task at a time (sequential execution) |
| Queue limit | Max 100 pending tasks; oldest LOW task dropped on overflow |

### Task Lifecycle

```
SUBMITTED → QUEUED → RUNNING → COMPLETED
                   ↘ FAILED → RETRYING → COMPLETED
                                      ↘ PERMANENTLY_FAILED
                   ↘ CANCELLED
```

---

## Task Types

| Task Type | Priority | Default Timeout | Description |
|-----------|----------|----------------|-------------|
| `EMBEDDING_GENERATION` | high | 60s | Generate embedding for a single text chunk |
| `BATCH_EMBEDDINGS` | normal | 300s | Generate embeddings for multiple chunks |
| `VECTOR_INDEX_BUILD` | normal | 600s | Build/rebuild vector index for a domain |
| `GRAPH_LAYOUT_COMPUTE` | normal | 120s | Force-directed layout calculation |
| `PDF_TEXT_EXTRACT` | normal | 120s | Extract text from PDF file |
| `RSS_FEED_FETCH` | low | 30s | Fetch and parse RSS feed |
| `DOMAIN_SUMMARY_GEN` | low | 180s | Generate domain summary (AI call) |

---

## Error Handling in Worker

### Task-Level Errors

| Error | Behavior |
|-------|----------|
| Timeout | Task marked `FAILED`, `recoverable: true`, `retryAfter: 5000` |
| Out of memory | Worker self-restarts, all running task marked `FAILED` |
| Uncaught exception | Task marked `FAILED`, `recoverable: false`, error logged |
| Cancellation | Task marked `CANCELLED`, resources cleaned up |

### Worker-Level Errors

| Error | Behavior |
|-------|----------|
| Worker crash | Main process detects via `exit` event, restarts worker |
| Worker unresponsive (60s heartbeat) | Main process kills worker, restarts |
| Port disconnect | Re-establish port on worker restart |

### Restart Policy

```typescript
// Main process restart logic
private handleWorkerExit(code: number | null): void {
  if (this.isShuttingDown) return;

  logger.error('Worker process exited', { code });

  // Notify all pending tasks of failure
  for (const [taskId, callbacks] of this.pendingTasks) {
    callbacks.onError({
      code: 'WORKER_CRASHED',
      message: 'Worker process crashed unexpectedly',
      recoverable: true,
      retryAfter: 3000,
    });
  }
  this.pendingTasks.clear();

  // Restart with exponential backoff
  const delay = Math.min(1000 * Math.pow(2, this.restartAttempts), 30000);
  this.restartAttempts++;

  setTimeout(() => {
    logger.info('Restarting worker process', { attempt: this.restartAttempts });
    this.initializeWorker();
  }, delay);
}
```

---

## Shutdown Sequence

```
Main process receives quit signal
  → WorkerBridge.shutdown()
    → Send SHUTDOWN message to worker
    → Wait up to 5s for current task to complete
    → If timeout: force kill worker process
    → Clean up MessagePort
    → Resolve
```

```typescript
async shutdown(): Promise<void> {
  this.isShuttingDown = true;

  // Signal worker to stop accepting new tasks
  this.port.postMessage({ type: 'SHUTDOWN' });

  // Wait for current task to finish (up to 5s)
  const currentTask = this.pendingTasks.get(this.activeTaskId);
  if (currentTask) {
    await Promise.race([
      currentTask.completionPromise,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }

  // Force kill if still running
  this.worker.kill();
  this.port.close();
}
```

---

## File Structure

```
server/
├── worker/
│   ├── worker-bridge.ts        # Main process side: submit/cancel/listen
│   ├── worker-process.ts       # Utility process entry: queue + dispatch
│   ├── task-queue.ts           # Priority queue implementation
│   ├── types.ts                # Message types, task types, interfaces
│   ├── tasks/
│   │   ├── embedding-task.ts   # EMBEDDING_GENERATION handler
│   │   ├── vector-index-task.ts # VECTOR_INDEX_BUILD handler
│   │   ├── graph-layout-task.ts # GRAPH_LAYOUT_COMPUTE handler
│   │   ├── pdf-parse-task.ts   # PDF_TEXT_EXTRACT handler
│   │   ├── rss-poll-task.ts    # RSS_FEED_FETCH handler
│   │   └── summary-task.ts     # DOMAIN_SUMMARY_GEN handler
│   └── __tests__/
│       ├── task-queue.test.ts
│       └── worker-bridge.test.ts
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| Process model | Single Utility Process |
| Communication | Electron MessagePort (streaming) + IPC (commands) |
| Task scheduling | Priority queue (HIGH/NORMAL/LOW), sequential execution |
| Error recovery | Task retry, worker restart with backoff |
| Shutdown | Graceful (5s timeout) → force kill |
| Memory | Fixed ~30-50MB for worker process |
