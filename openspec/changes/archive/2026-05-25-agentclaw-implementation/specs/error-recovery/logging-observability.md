# Logging & Observability Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: P0.7.1 (Structured Log Format), P0.7.2 (Cost Tracking), P0.7.3 (Debug Mode)
> Dependency: P0.3 (Worker Architecture — affects log collection from Utility Process)

---

## P0.7.1 Structured Log Format

### Log Entry Schema

Every log entry SHALL be a JSON object with the following fields:

```typescript
interface LogEntry {
  // Required fields
  timestamp: string;        // ISO 8601, e.g., "2026-05-22T14:30:00.123Z"
  level: LogLevel;          // "debug" | "info" | "warn" | "error"
  module: string;           // Source module, e.g., "expert-chat", "import-pipeline", "worker.vector-index"
  action: string;           // Specific operation, e.g., "send_message", "import_url", "build_index"
  message: string;          // Human-readable description

  // Optional fields (present when applicable)
  traceId?: string;         // Request/operation correlation ID (UUID v4)
  duration?: number;        // Operation duration in milliseconds
  cost?: CostEntry;         // API cost details (only for LLM/AI operations)
  error?: ErrorDetail;      // Error details (only for warn/error level)
  context?: Record<string, unknown>; // Arbitrary key-value metadata
  userId?: string;          // Always "local" for desktop app (reserved for future)
  sessionId?: string;       // Current Agent session ID
  domainId?: string;        // Active domain when the log was created
}

type LogLevel = "debug" | "info" | "warn" | "error";

interface CostEntry {
  model: string;            // e.g., "claude-sonnet-4-6", "deepseek-v3"
  provider: string;         // e.g., "anthropic", "openai"
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number; // Cost in USD, rounded to 6 decimal places
}

interface ErrorDetail {
  code: string;             // Error registry code, e.g., "CHAT.API_FAILURE"
  name: string;             // Error class name, e.g., "RateLimitError"
  stack?: string;           // Full stack trace (only in debug mode or error level)
  recoverable: boolean;     // Whether the error is automatically recoverable
}
```

### Log Output Targets

| Environment | Console Output | File Output |
|-------------|---------------|-------------|
| Development | Pretty-printed (color, indented JSON) | `~/.agentclaw/logs/dev.log` |
| Production  | JSON (single line) | `~/.agentclaw/logs/agentclaw.log` |

### Log Rotation

- Maximum single file size: 10MB
- Maximum rotated files: 5 (i.e., `agentclaw.log` + `agentclaw.log.1` ... `agentclaw.log.4`)
- Rotation strategy: On file size limit reached, rename current file to `.log.1`, shift older files, delete `.log.4`
- Total maximum disk usage: ~50MB

### Log Level Usage Guidelines

| Level | When to Use | Example |
|-------|-------------|---------|
| `debug` | Detailed diagnostic info (only in debug mode) | "Embedding vector computed: 1536 dims, 23ms" |
| `info` | Normal operation milestones | "Knowledge node created: 'transformer-architecture' in domain 'ai-ml'" |
| `warn` | Recoverable issues, degraded behavior | "API rate limit hit, retrying in 60s (attempt 2/3)" |
| `error` | Operation failures requiring attention | "Database write failed: SQLITE_BUSY after 30s retry" |

### Module Names (Standardized)

| Module Name | Covers |
|-------------|--------|
| `app` | Application lifecycle, window management |
| `expert-chat` | Chat sessions, message handling, streaming |
| `research-agent` | Scheduled research, cron execution |
| `import-pipeline` | URL/PDF/RSS import processing |
| `inbox` | Inbox item processing, AI summary |
| `knowledge-graph` | Node/edge CRUD, graph operations |
| `search` | Vector search, full-text search, RRF fusion |
| `framework` | Framework analysis, decision records |
| `timeline` | Timeline events, predictions |
| `model-mgmt` | API key management, model switching |
| `domain-mgmt` | Domain CRUD, config parsing |
| `version-control` | Git operations, auto-commit, rollback |
| `skill-system` | Skill loading, execution, tracking |
| `db` | Database connection, migration, repositories |
| `worker` | Utility Process task queue, task execution |
| `pi-mono` | SDK initialization, provider registration |
| `theme` | Style pack switching, token resolution |
| `onboarding` | First-run flow steps |

### Correlation (traceId)

Every API call to an LLM provider SHALL generate a `traceId`. All log entries related to the same operation (prompt construction → API call → response parsing → knowledge node creation) SHALL share the same `traceId`. This allows reconstructing the full chain for any single operation.

Example chain:
```json
[
  { "traceId": "t-abc123", "action": "build_prompt", "message": "Constructing system prompt for domain 'ai-ml'" },
  { "traceId": "t-abc123", "action": "llm_call_start", "message": "Calling claude-sonnet-4-6", "cost": { "model": "claude-sonnet-4-6", "inputTokens": 2048, ... } },
  { "traceId": "t-abc123", "action": "parse_response", "message": "Extracted 3 knowledge updates" },
  { "traceId": "t-abc123", "action": "knowledge_write", "message": "Created node 'attention-mechanism'" }
]
```

---

## P0.7.2 Operation Cost Tracking

### Cost Tracking Architecture

```
┌───────────────────────────────────────────────────────┐
│                  CostTracker Service                    │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Per-Request │  │  Per-Session  │  │  Per-Domain  │ │
│  │  Cost Record │  │  Accumulator  │  │  Accumulator │ │
│  └─────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │          SQLite: cost_records table               │ │
│  │  id | timestamp | session_id | domain_id | model  │ │
│  │     | provider | input_tokens | output_tokens     │ │
│  │     | cost_usd | operation_type                    │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

### Cost Record Type

```typescript
interface CostRecord {
  id: string;               // UUID
  timestamp: string;        // ISO 8601
  sessionId: string;        // Agent session ID
  domainId: string;         // Domain context
  model: string;            // Model identifier
  provider: string;         // Provider name
  operationType: OperationType;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

type OperationType =
  | "chat_message"          // Expert chat interaction
  | "research_run"          // Scheduled research execution
  | "summary_generation"    // Domain/node summary
  | "embedding_generation"  // Text → embedding vector
  | "import_processing"     // AI processing of imported content
  | "framework_analysis"    // Framework analysis execution
  | "timeline_prediction"   // Prediction generation
  | "skill_execution";      // Custom skill execution
```

### Cost Estimation Formula

For each provider/model combination, cost is estimated as:

```
estimatedCostUsd = (inputTokens / 1_000_000 × inputPricePerMillion)
                 + (outputTokens / 1_000_000 × outputPricePerMillion)
```

Price data SHALL be maintained in a static price table:

```typescript
// server/services/cost-tracker/pricing.ts
const MODEL_PRICING: Record<string, { provider: string; inputPerMillion: number; outputPerMillion: number }> = {
  "claude-sonnet-4-6":   { provider: "anthropic", inputPerMillion: 3.00,  outputPerMillion: 15.00 },
  "claude-opus-4-7":     { provider: "anthropic", inputPerMillion: 15.00, outputPerMillion: 75.00 },
  "claude-haiku-4-5":    { provider: "anthropic", inputPerMillion: 0.80,  outputPerMillion: 4.00 },
  "gpt-4o":              { provider: "openai",    inputPerMillion: 2.50,  outputPerMillion: 10.00 },
  "gpt-4o-mini":         { provider: "openai",    inputPerMillion: 0.15,  outputPerMillion: 0.60 },
  "deepseek-v3":         { provider: "deepseek",  inputPerMillion: 0.27,  outputPerMillion: 1.10 },
  "gemini-2.0-flash":    { provider: "google",    inputPerMillion: 0.10,  outputPerMillion: 0.40 },
  // Ollama models: cost is always 0
  "llama3.1:70b":        { provider: "ollama",    inputPerMillion: 0,     outputPerMillion: 0 },
};
```

### Cost Aggregation APIs

The CostTracker SHALL expose the following query APIs (via IPC):

| API | Parameters | Returns |
|-----|-----------|---------|
| `cost:getSessionTotal` | `sessionId` | Total cost, token counts for one session |
| `cost:getDomainTotal` | `domainId, dateRange?` | Aggregated cost for a domain |
| `cost:getModelDistribution` | `dateRange?` | Cost breakdown by model (pie chart data) |
| `cost:getDailyTrend` | `dateRange?` | Daily cost totals (line chart data) |
| `cost:getTopOperations` | `limit?, dateRange?` | Most expensive individual operations |

### Status Bar Display

The status bar (28px at bottom) SHALL show:
- Current session cost: `$0.042` (updates in real-time during streaming)
- Current model name: `claude-sonnet-4-6`
- Research status indicator (idle/running)

Clicking the cost display SHALL open the cost detail view in the right panel.

---

## P0.7.3 Debug Mode Specification

### Activation

Debug mode SHALL be toggled via:

1. **Settings UI**: Settings → Advanced → "Enable Debug Mode" toggle
2. **Keyboard shortcut**: `Cmd/Ctrl+Shift+D`
3. **Environment variable**: `AGENTCLAW_DEBUG=1` on launch
4. **CLI argument**: `--debug` flag when launching the Electron binary

### Debug Mode Enhancements

When debug mode is active, the following additional behaviors are enabled:

| Feature | Normal Mode | Debug Mode |
|---------|-------------|------------|
| Log level | `info` and above | `debug` and above (all messages) |
| Stack traces in logs | Error level only | All levels |
| Worker task lifecycle | Only errors logged | Full lifecycle: submit → queue → start → progress → complete |
| IPC message logging | Disabled | All IPC invoke/handle calls logged with duration |
| Performance metrics | Not collected | Collected and displayed in debug overlay |
| Pi-mono SDK verbosity | Standard | Verbose (raw API requests/responses logged) |
| Query plans | Not logged | SQLite query plans logged for slow queries (>100ms) |

### Performance Metrics Panel

Debug mode SHALL provide a floating overlay panel (toggle with `Cmd/Ctrl+Shift+P`):

```
┌─ Debug Panel ────────────────────────────┐
│                                           │
│  Memory: 234MB / 500MB budget            │
│  Worker: idle (0 pending, 0 active)      │
│  DB: 2 connections, 12ms avg query       │
│  IPC: 45 calls/min, 8ms avg latency      │
│                                           │
│  Session Cost: $0.042                     │
│  Tokens: in=12,340 / out=3,456           │
│                                           │
│  Slow Queries (>100ms):                  │
│  - knowledge_nodes SELECT: 234ms         │
│  - vector_search: 156ms                  │
│                                           │
│  Recent Errors:                           │
│  - [14:30:00] CHAT.API_FAILURE (retry 2) │
│                                           │
│  [Export Logs] [Open Log File]            │
└───────────────────────────────────────────┘
```

### Performance Metrics Collected

```typescript
interface PerformanceMetrics {
  memory: {
    current: number;        // MB, process.memoryUsage().heapUsed
    budget: number;         // MB, from P0.3.2 resource budget
    workerMemory?: number;  // MB, worker process RSS
  };
  worker: {
    pendingTasks: number;
    activeTask?: string;
    totalCompleted: number;
    totalFailed: number;
  };
  database: {
    activeConnections: number;
    averageQueryTimeMs: number;   // Rolling average of last 100 queries
    slowQueryCount: number;       // Queries > 100ms in current session
  };
  ipc: {
    callsPerMinute: number;
    averageLatencyMs: number;     // Rolling average of last 100 calls
  };
  tokens: {
    inputTotal: number;
    outputTotal: number;
  };
}
```

### Log Export

The debug panel SHALL provide two export options:

1. **Export Logs**: Downloads the last 24 hours of logs as a `.jsonl` file (one JSON object per line)
2. **Open Log File**: Opens the log file directory in the OS file manager

### Debug Mode Persistence

Debug mode state SHALL be persisted in `app-settings` store. When the application restarts, the debug mode state is restored.

### Worker Process Logging

Since the Utility Process does not have direct file system access for logging, worker logs SHALL be forwarded to the Main process via the existing `MessagePort` channel:

```typescript
// Added to WorkerToMainMessage union
| { type: 'DEBUG_LOG'; entry: LogEntry }
```

The Main process logger SHALL tag these entries with `module: "worker.*"` and write them to the same log file.

---

## File Structure

```
server/
├── services/
│   ├── logger.ts                    # Main logger (writes to console + file)
│   ├── cost-tracker/
│   │   ├── index.ts                 # CostTracker service
│   │   ├── pricing.ts               # Model price table
│   │   └── types.ts                 # CostRecord, OperationType types
│   └── debug-panel/
│       ├── metrics-collector.ts     # Performance metrics collection
│       └── types.ts                 # PerformanceMetrics type
├── db/
│   ├── schema.ts                    # Add cost_records table to schema
│   └── repositories/
│       └── cost-records.ts          # CostRecord CRUD + aggregation queries

src/
├── components/
│   └── debug/
│       ├── debug-overlay.tsx        # Debug panel overlay
│       └── performance-metrics.tsx  # Metrics display
├── lib/
│   └── hooks/
│       └── use-debug-mode.ts        # Debug mode toggle hook
└── stores/
    └── debug-store.ts               # Debug mode state (persisted)
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| Log format | JSON with required fields (timestamp, level, module, action, message) + optional cost/error/context |
| Log rotation | 10MB × 5 files = 50MB max |
| Cost tracking | Per-request records in SQLite, aggregation APIs for UI |
| Cost estimation | Static price table per model, formula-based |
| Debug mode | Toggle via settings/shortcut/env/CLI; enables verbose logging + performance overlay |
| Performance panel | Floating overlay with memory/worker/DB/IPC/token metrics |
| Worker logging | Forward via MessagePort to Main process logger |
