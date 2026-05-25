# Worker Resource Budget

> Version: 1.0 | Date: 2026-05-22
> Defines CPU and memory limits for CPU-intensive operations

---

## Overall Worker Process Budget

| Resource | Limit | Rationale |
|----------|-------|-----------|
| **Max memory** | 256 MB | Single utility process cap; prevents OOM on user machines |
| **Max concurrent tasks** | 1 | Sequential execution avoids memory spikes |
| **Max queue depth** | 100 tasks | Prevents unbounded memory growth |
| **Heartbeat interval** | 30s | Detect unresponsive worker |
| **Heartbeat timeout** | 60s | Kill and restart worker |
| **Task default timeout** | 120s | Prevent stuck tasks |
| **Max task timeout** | 600s (10min) | Vector index build — longest expected operation |

---

## Per-Task Resource Budgets

### 1. Embedding Generation

| Resource | Budget | Notes |
|----------|--------|-------|
| **Memory** | 50 MB peak | Model weights + input text + output vectors |
| **CPU** | Burst (5-30s) | GPU-accelerated if available, otherwise CPU |
| **Timeout** | 60s | Single text chunk (up to 8K tokens) |
| **Input size** | 8,192 tokens max | Truncate longer texts |
| **Output** | 1,536-dim float32 vector | 6 KB per embedding |

**Batches**:
| Batch Size | Memory | Timeout |
|------------|--------|---------|
| 1 chunk | ~10 MB | 10s |
| 10 chunks | ~30 MB | 60s |
| 50 chunks | ~50 MB | 120s |
| 100 chunks | ~~80 MB | 300s |

**Constraint**: Batch size limited to prevent OOM. If batch exceeds 50 chunks, split into sub-batches.

---

### 2. Vector Index Build

| Resource | Budget | Notes |
|----------|--------|-------|
| **Memory** | 200 MB peak | All embeddings loaded + index construction |
| **CPU** | Sustained (1-10min) | Depends on vector count |
| **Timeout** | 600s (10min) | Longest operation |
| **Input** | Up to 500K vectors | Personal knowledge base scale |
| **Disk I/O** | Write-heavy during build | Temp file + final index write |

**Scaling by vector count**:

| Vectors | Memory | Time (est.) | Timeout |
|---------|--------|-------------|---------|
| 1,000 | ~10 MB | ~2s | 30s |
| 10,000 | ~50 MB | ~15s | 120s |
| 100,000 | ~150 MB | ~3min | 600s |
| 500,000 | ~200 MB | ~8min | 600s |
| > 500,000 | Reject | — | — |

**Constraint**: If vector count exceeds 500K, reject task with error: "Domain exceeds maximum knowledge size. Consider splitting into sub-domains."

---

### 3. Graph Layout Computation

| Resource | Budget | Notes |
|----------|--------|-------|
| **Memory** | 100 MB peak | Node positions + edge list + iteration state |
| **CPU** | Sustained (5-120s) | Iterative force simulation |
| **Timeout** | 120s | Force-directed layout |
| **Input** | Up to 10,000 nodes | Larger graphs → WebGL with simpler layout |
| **Iterations** | Max 300 | Convergence checked every 10 iterations |

**Scaling by node count**:

| Nodes | Memory | Iterations | Time (est.) | Timeout |
|-------|--------|------------|-------------|---------|
| 100 | ~5 MB | 100 | ~1s | 30s |
| 500 | ~15 MB | 150 | ~5s | 60s |
| 1,000 | ~30 MB | 200 | ~15s | 60s |
| 5,000 | ~60 MB | 250 | ~60s | 120s |
| 10,000 | ~100 MB | 300 | ~120s | 120s |
| > 10,000 | Skip | — | — | — |

**Constraint**: > 10,000 nodes → skip force layout, use simple circular/grid layout (computed in renderer).

**Convergence check**: Stop early if max node displacement < 0.5px across 3 consecutive checks.

---

### 4. PDF Text Extraction

| Resource | Budget | Notes |
|----------|--------|-------|
| **Memory** | 150 MB peak | PDF buffer + text extraction + page rendering |
| **CPU** | Burst (5-60s) | Depends on page count and complexity |
| **Timeout** | 120s | Standard PDF |
| **Input file size** | Max 50 MB | Larger files rejected before processing |
| **Page limit** | Max 500 pages | Truncate beyond this |
| **Output** | Plain text string | Cleaned, de-hyphenated |

**Scaling by file size**:

| File Size | Pages (est.) | Memory | Time (est.) | Timeout |
|-----------|-------------|--------|-------------|---------|
| 1 MB | ~10 pages | ~20 MB | ~2s | 30s |
| 10 MB | ~100 pages | ~50 MB | ~15s | 60s |
| 30 MB | ~300 pages | ~100 MB | ~45s | 120s |
| 50 MB | ~500 pages | ~150 MB | ~90s | 120s |
| > 50 MB | Rejected | — | — | — |

**Constraint**: Reject files > 50 MB with clear error message suggesting file splitting.

---

### 5. RSS Feed Fetch

| Resource | Budget | Notes |
|----------|--------|-------|
| **Memory** | 20 MB peak | Feed XML + parsed entries |
| **CPU** | Minimal | XML parsing, not CPU-bound |
| **Timeout** | 30s | Network-dependent |
| **Feed size** | Max 5 MB XML | Most feeds < 1 MB |
| **Entry limit** | Max 100 entries per fetch | Prevent queue flooding |

---

### 6. Domain Summary Generation

| Resource | Budget | Notes |
|----------|--------|-------|
| **Memory** | 30 MB peak | Context text + LLM response |
| **CPU** | Minimal | I/O bound (API call) |
| **Timeout** | 180s | Depends on LLM response time |
| **Input** | Domain knowledge nodes (top 50 by relevance) | Context window limit |
| **Output** | Summary text (max 2000 tokens) | Tiered: Hot/Warm/Cold |

---

## Memory Monitoring

### Worker Process Memory Tracking

```typescript
// Inside worker process
const MEMORY_LIMIT_MB = 256;
const MEMORY_CHECK_INTERVAL_MS = 5000;

setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / (1024 * 1024);

  if (heapUsedMB > MEMORY_LIMIT_MB * 0.9) {
    // 90% threshold — warn and pause queue
    sendToMain({
      type: 'WORKER_ERROR',
      error: `Memory usage at ${heapUsedMB.toFixed(0)}MB (limit: ${MEMORY_LIMIT_MB}MB). Pausing queue.`,
    });
    pauseQueue();
  }

  if (heapUsedMB > MEMORY_LIMIT_MB) {
    // 100% threshold — abort current task
    sendToMain({
      type: 'WORKER_ERROR',
      error: `Memory limit exceeded: ${heapUsedMB.toFixed(0)}MB`,
    });
    abortCurrentTask('OUT_OF_MEMORY');
  }
}, MEMORY_CHECK_INTERVAL_MS);
```

### Task-Level Memory Pre-Check

Before executing a task, estimate memory requirements based on task type and input size:

```typescript
function estimateTaskMemory(task: WorkerTaskPayload): number {
  switch (task.type) {
    case 'EMBEDDING_GENERATION':
      return 10 + (task.payload.batchSize ?? 1) * 0.5; // ~10MB + 0.5MB per chunk
    case 'VECTOR_INDEX_BUILD':
      return (task.payload.vectorCount ?? 0) * 0.0004 + 10; // ~0.4KB per vector + 10MB base
    case 'GRAPH_LAYOUT_COMPUTE':
      return (task.payload.nodeCount ?? 0) * 0.01 + 5; // ~10KB per node + 5MB base
    case 'PDF_TEXT_EXTRACT':
      return (task.payload.fileSizeBytes ?? 0) * 3; // ~3x file size for processing
    default:
      return 20; // Default 20MB estimate
  }
}
```

If `currentMemory + estimatedTaskMemory > MEMORY_LIMIT_MB`, defer task to later.

---

## CPU Usage Guidelines

| Task Type | Expected CPU Pattern | Impact on Main Process |
|-----------|---------------------|----------------------|
| Embedding generation | Burst (100% for 5-30s) | None — separate process |
| Vector index build | Sustained (80-100% for minutes) | None — separate process |
| Graph layout | Sustained (80-100% for seconds) | None — separate process |
| PDF extraction | Moderate (30-60% for seconds) | None — separate process |
| RSS fetch | Minimal (I/O bound) | None |

**Key benefit**: All CPU-intensive work runs in Utility Process. Main process stays responsive for UI interactions and IPC handling.

---

## Resource Enforcement Summary

| Task Type | Memory Limit | Time Limit | Input Limit |
|-----------|-------------|------------|-------------|
| EMBEDDING_GENERATION | 50 MB | 60s | 8K tokens / chunk |
| BATCH_EMBEDDINGS | 80 MB | 300s | 100 chunks |
| VECTOR_INDEX_BUILD | 200 MB | 600s | 500K vectors |
| GRAPH_LAYOUT_COMPUTE | 100 MB | 120s | 10K nodes |
| PDF_TEXT_EXTRACT | 150 MB | 120s | 50 MB file |
| RSS_FEED_FETCH | 20 MB | 30s | 5 MB feed |
| DOMAIN_SUMMARY_GEN | 30 MB | 180s | 50 nodes context |
| **Worker total** | **256 MB** | — | **100 queued tasks** |
