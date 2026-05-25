# Knowledge Graph Export/Import Format

> Version: 1.0 | Date: 2026-05-22
> Task: P0.16.2 — Define knowledge graph export/import format (T9)
> Dependency: database-layer/initial-schema.md (14-table schema)
> Covers: Full graph export, partial domain export, round-trip fidelity

---

## 1. Format Overview

The knowledge graph export format is a JSON structure that captures nodes, edges, metadata, and domain configuration for complete portability. The format supports:

- **Full export**: All domains with all knowledge nodes, edges, sources, and timeline entries
- **Partial export**: Single domain with its knowledge subgraph
- **Round-trip fidelity**: Export → Import produces an identical knowledge graph
- **Versioned format**: Forward-compatible with schema evolution

---

## 2. JSON Schema

### 2.1 Top-Level Structure

```typescript
interface KnowledgeGraphExport {
  /** Format version for compatibility checks */
  version: "1.0";

  /** Export metadata */
  meta: ExportMeta;

  /** Domain configurations */
  domains: DomainExport[];

  /** Knowledge nodes across all exported domains */
  nodes: KnowledgeNodeExport[];

  /** Knowledge edges (relationships between nodes) */
  edges: KnowledgeEdgeExport[];

  /** Source records */
  sources: SourceExport[];

  /** Timeline entries */
  timeline: TimelineEntryExport[];

  /** Decision records */
  decisions: DecisionRecordExport[];
}
```

### 2.2 ExportMeta

```typescript
interface ExportMeta {
  /** ISO 8601 timestamp of export */
  exportedAt: string;

  /** Application version that produced the export */
  appVersion: string;

  /** "full" = all domains, "domain" = single domain, "selection" = selected nodes */
  exportType: "full" | "domain" | "selection";

  /** For domain exports, the domain ID */
  domainId?: string;

  /** For selection exports, the node IDs */
  nodeIds?: string[];

  /** Total count summary */
  counts: {
    domains: number;
    nodes: number;
    edges: number;
    sources: number;
    timelineEntries: number;
    decisionRecords: number;
  };
}
```

### 2.3 DomainExport

```typescript
interface DomainExport {
  id: string;                    // UUID
  name: string;
  description: string;
  color: string;                 // Hex color, e.g., "#5e6ad2"
  icon: string;                  // Icon name from Lucide
  config: {
    defaultModel?: string;
    researchSchedule?: string;   // Cron expression
    sources?: SourceConfig[];
    frameworks?: string[];
    skills?: string[];
    tags?: string[];
  };
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### 2.4 KnowledgeNodeExport

```typescript
interface KnowledgeNodeExport {
  id: string;                    // UUID
  domainId: string;              // FK to domain
  title: string;
  content: string;               // Markdown content
  type: KnowledgeNodeType;       // "concept" | "fact" | "insight" | "question" | "prediction"
  status: KnowledgeNodeStatus;   // "draft" | "reviewed" | "verified" | "outdated"
  comprehensionLevel: number;    // 0–5

  /** Frontmatter fields stored as key-value pairs */
  frontmatter: Record<string, string | number | boolean | string[]>;

  /** Tags for categorization */
  tags: string[];

  /** Source IDs referenced by this node */
  sourceIds: string[];

  /** Timestamps */
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601

  /** File path relative to domain directory (for version control) */
  filePath?: string;
}
```

### 2.5 KnowledgeEdgeExport

```typescript
interface KnowledgeEdgeExport {
  id: string;                    // UUID
  domainId: string;
  sourceNodeId: string;          // FK to node
  targetNodeId: string;          // FK to node
  relationType: string;          // "relates_to" | "depends_on" | "contradicts" | "supports" | "derived_from"
  weight: number;                // 0.0–1.0, default 0.5
  label?: string;                // Optional relationship description

  createdAt: string;
  updatedAt: string;
}
```

### 2.6 SourceExport

```typescript
interface SourceExport {
  id: string;                    // UUID
  domainId: string;
  type: SourceType;              // "url" | "pdf" | "rss" | "note" | "api"
  title: string;
  url?: string;
  content?: string;              // Original fetched/extracted content
  summary?: string;              // AI-generated summary
  author?: string;
  publishedAt?: string;

  /** Import status */
  status: SourceStatus;          // "pending" | "fetched" | "failed" | "processing"

  /** Node IDs that reference this source */
  linkedNodeIds: string[];

  createdAt: string;
  updatedAt: string;
}
```

### 2.7 TimelineEntryExport

```typescript
interface TimelineEntryExport {
  id: string;
  domainId: string;
  eventType: TimelineEventType;  // "discovery" | "research" | "insight" | "prediction" | "decision"
  title: string;
  description: string;
  date: string;                  // ISO 8601 date
  importance: number;            // 1–5

  /** Linked knowledge node IDs */
  nodeIds: string[];

  /** Prediction-specific fields */
  prediction?: {
    confidence: number;          // 0.0–1.0
    deadline: string;            // ISO 8601
    outcome?: "correct" | "incorrect" | "pending";
  };

  createdAt: string;
  updatedAt: string;
}
```

### 2.8 DecisionRecordExport

```typescript
interface DecisionRecordExport {
  id: string;
  domainId: string;
  title: string;                 // "ADR-001: Choose Vector DB"
  status: "proposed" | "accepted" | "deprecated" | "superseded";

  context: string;               // Markdown: why this decision was needed
  decision: string;              // Markdown: what was decided
  rationale: string;             // Markdown: why this option
  consequences: string;          // Markdown: expected outcomes

  /** Linked knowledge node IDs */
  nodeIds: string[];

  /** If superseded, the ID of the replacing decision */
  supersededById?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Export File Format

### 3.1 Single-File Export (Default)

- **Extension**: `.agentclaw.json`
- **Encoding**: UTF-8
- **MIME type**: `application/json`
- **Max size**: No hard limit (streaming write for large exports)
- **Pretty print**: 2-space indentation
- **File naming**: `{exportType}_{domainName|all}_{YYYY-MM-DD}.agentclaw.json`

### 3.2 Bundle Export (Large Graphs)

For exports exceeding 50MB:

- **Format**: ZIP archive containing split JSON files
- **Extension**: `.agentclaw.zip`
- **Structure**:
  ```
  manifest.json          — ExportMeta + file listing
  domains.json           — DomainExport[]
  nodes_part_001.json    — KnowledgeNodeExport[] (chunked by 1000)
  nodes_part_002.json
  edges.json             — KnowledgeEdgeExport[]
  sources.json           — SourceExport[]
  timeline.json          — TimelineEntryExport[]
  decisions.json         — DecisionRecordExport[]
  ```

### 3.3 File Size Estimates

| Graph Size | Nodes | Edges | Sources | Export Size |
|-----------|-------|-------|---------|-------------|
| Small | 50 | 30 | 20 | ~200 KB |
| Medium | 500 | 300 | 100 | ~2 MB |
| Large | 5,000 | 3,000 | 500 | ~20 MB |
| Very Large | 50,000 | 30,000 | 5,000 | ~200 MB (use bundle) |

---

## 4. Import Process

### 4.1 Import Flow

```
User selects .agentclaw.json or .agentclaw.zip
    │
    ├─ Parse JSON / extract ZIP
    │
    ├─ Validate version compatibility
    │   ├─ Version match → proceed
    │   └─ Version mismatch → show warning with migration options
    │
    ├─ Validate schema integrity
    │   ├─ All required fields present
    │   ├─ All referenced IDs exist within the export
    │   └─ No duplicate IDs
    │
    ├─ Conflict resolution strategy
    │   ├─ "Overwrite" — Replace existing data with imported data
    │   ├─ "Keep both" — Assign new IDs to imported data, preserve existing
    │   ├─ "Skip" — Skip nodes/edges that already exist (by title match)
    │   └─ "Merge" — Keep existing, add only new items (default)
    │
    ├─ Import data
    │   ├─ Domains → domains table (create if not exists)
    │   ├─ Nodes → knowledge_nodes table (remap domain FKs)
    │   ├─ Edges → knowledge_edges table (remap node FKs)
    │   ├─ Sources → sources table
    │   ├─ Timeline → timeline_entries table
    │   └─ Decisions → decision_records table
    │
    ├─ Rebuild indexes
    │   ├─ Vector embeddings for new nodes
    │   └─ FTS5 full-text index
    │
    └─ Verify counts match meta.counts
```

### 4.2 Version Compatibility

| Export Version | Import Version | Compatibility |
|---------------|---------------|---------------|
| 1.0 | 1.0 | Full |
| 1.0 | 1.1+ | Forward compatible (new fields ignored gracefully) |
| 1.1 | 1.0 | Backward compatible (missing fields get defaults) |
| 2.0 | 1.x | Migration required (show warning dialog) |

### 4.3 Import Validation Rules

| Rule | Severity | Message |
|------|----------|---------|
| Missing `version` field | Error | "Invalid export file: missing version" |
| Unknown `version` value | Warning | "Export version {v} is newer than supported. Some data may not import correctly." |
| Missing required node field | Error | "Node {id} missing required field: {field}" |
| Orphaned edge (node ID not in export) | Warning | "Edge {id} references non-existent node. Edge will be skipped." |
| Duplicate ID within export | Error | "Duplicate ID found: {id}" |
| ID collision with existing data | Info | "Node {id} already exists. Applying conflict resolution strategy." |
| Empty domains array | Warning | "Export contains no domains." |

---

## 5. Conflict Resolution

### 5.1 Default Strategy: Merge

On import, the default strategy is **Merge** — preserve all existing data and only add new items.

```
For each imported item:
  IF item.id exists in database:
    IF item.updatedAt > existing.updatedAt:
      UPDATE existing with imported data
    ELSE:
      SKIP (existing is newer)
  ELSE:
    INSERT new item with imported ID
```

### 5.2 Overwrite Strategy

Replace any existing item that has a matching ID. Existing items not in the import are preserved.

### 5.3 Keep Both Strategy

Assign new UUIDs to all imported items. Remap all foreign keys within the import to the new IDs. Original items are untouched.

### 5.4 Skip Strategy

Only import items whose IDs do not exist in the database. Matching items are silently skipped.

---

## 6. UI Flow

### 6.1 Export UI

| Step | UI Element | Action |
|------|-----------|--------|
| 1 | Settings > Data > Export | Show export options |
| 2 | Export scope selector | "All domains" / "Select domain" / "Select nodes" |
| 3 | Domain picker (if scoped) | Dropdown of domain names |
| 4 | Include options | Checkboxes: sources, timeline, decisions |
| 5 | Export button | Triggers JSON generation + file save dialog |
| 6 | Progress bar | Shows export progress (N/M nodes processed) |
| 7 | Completion toast | "Exported {N} nodes, {E} edges successfully" |

### 6.2 Import UI

| Step | UI Element | Action |
|------|-----------|--------|
| 1 | Settings > Data > Import | File picker dialog |
| 2 | Validation screen | Show: version, counts, warnings/errors |
| 3 | Conflict resolution selector | Radio: Merge (default) / Overwrite / Keep both / Skip |
| 4 | Import button | Triggers import process |
| 5 | Progress bar | Shows import progress |
| 6 | Summary screen | "Imported {N} nodes, {E} edges. {S} skipped, {W} warnings." |

---

## 7. Programmatic API

### 7.1 Export

```typescript
interface ExportOptions {
  scope: "full" | "domain" | "selection";
  domainId?: string;
  nodeIds?: string[];
  includeSources: boolean;
  includeTimeline: boolean;
  includeDecisions: boolean;
}

interface ExportResult {
  filePath: string;
  format: "json" | "zip";
  counts: ExportMeta["counts"];
  fileSize: number;
}

// IPC channel: "knowledge:export"
async function exportGraph(options: ExportOptions): Promise<ExportResult>;
```

### 7.2 Import

```typescript
interface ImportOptions {
  filePath: string;
  conflictStrategy: "merge" | "overwrite" | "keep-both" | "skip";
}

interface ImportResult {
  imported: {
    domains: number;
    nodes: number;
    edges: number;
    sources: number;
    timelineEntries: number;
    decisionRecords: number;
  };
  skipped: number;
  warnings: string[];
  errors: string[];
}

// IPC channel: "knowledge:import"
async function importGraph(options: ImportOptions): Promise<ImportResult>;
```

---

## 8. Encryption & Privacy

- Export files contain **unencrypted** knowledge content (Markdown text)
- API keys are **never** included in exports
- Model configurations (model names) are included; API keys are not
- Export files should be treated as sensitive data by the user
- No automatic cloud upload — exports are local file operations only

---

## Validation Checklist

- [x] JSON schema covers all relevant database entities
- [x] Version field enables forward/backward compatibility
- [x] Export types: full, domain, selection
- [x] Bundle format for large exports (>50MB)
- [x] Import flow with validation and conflict resolution
- [x] Four conflict resolution strategies defined
- [x] UI flow for export and import
- [x] Programmatic API with IPC channels
- [x] Privacy: no API keys in exports
- [x] File size estimates for typical graph sizes
