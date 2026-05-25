# Security Gates Specification

> Version: 1.0 | Date: 2026-05-22
> Covers: P0.8.1 (Automated Write Audit Gates), P0.8.2 (Diff Review Queue), P0.8.3 (Write Permission Levels)
> Dependency: P0.1 (Error specs define security boundaries), version-control spec (auto-commit)

---

## P0.8.1 Automated Write Audit Gates

### Overview

Agent (AI) write operations SHALL pass through an audit gate before being applied to the file system. The gate determines whether the write requires explicit user approval based on the operation's risk level.

### Audit Gate Flow

```
Agent requests write operation
  │
  ▼
┌──────────────────────┐
│  Risk Assessment     │  Evaluate: operation type, target path, content scope
└──────────┬───────────┘
           │
     ┌─────┴──────────────────────┐
     │                            │
     ▼                            ▼
┌──────────┐              ┌──────────────┐
│  LOW     │              │  MEDIUM/HIGH │
│  RISK    │              │  RISK        │
└────┬─────┘              └──────┬───────┘
     │                           │
     ▼                           ▼
┌──────────┐              ┌──────────────┐
│ Auto-    │              │ Queue for    │
│ approve  │              │ user review  │
│ + commit │              │ (Diff panel) │
└──────────┘              └──────┬───────┘
                                  │
                          ┌───────┴───────┐
                          │               │
                          ▼               ▼
                    ┌──────────┐   ┌──────────┐
                    │ Approved │   │ Rejected │
                    │ → commit │   │ → discard│
                    └──────────┘   └──────────┘
```

### Write Operations Requiring Audit

| Operation | Trigger | Risk Level |
|-----------|---------|------------|
| Create knowledge node | Agent creates new `.md` file in domain | LOW |
| Update knowledge node content | Agent modifies existing `.md` file | MEDIUM |
| Delete knowledge node | Agent requests file deletion | HIGH |
| Create domain config | Agent creates `config.yaml` | LOW |
| Update domain config | Agent modifies `config.yaml` | MEDIUM |
| Create skill file | Agent writes to `skills/` directory | LOW |
| Update skill file | Agent modifies skill in `skills/` | MEDIUM |
| Write research result | Agent writes research output | LOW |
| Create decision record | Agent writes ADR file | LOW |
| Update framework analysis | Agent modifies analysis output | MEDIUM |
| Bulk knowledge update | Agent modifies > 5 files in single operation | HIGH |
| Modify any file outside domain directory | Agent attempts cross-domain write | BLOCKED (always reject) |

### Risk Assessment Rules

```typescript
type RiskLevel = "low" | "medium" | "high" | "blocked";

interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];        // Human-readable risk factors
  autoApprove: boolean;     // Whether to apply without user review
  requireExplicit: boolean; // Whether to require explicit "Approve" (not just no-response)
}

function assessWriteRisk(operation: WriteOperation): RiskAssessment {
  const reasons: string[] = [];
  let level: RiskLevel = "low";

  // Rule 1: Path boundary check
  if (!isWithinDomainDir(operation.targetPath, operation.domainId)) {
    return { level: "blocked", reasons: ["Write target outside domain directory"], autoApprove: false, requireExplicit: true };
  }

  // Rule 2: File type check
  if (BLOCKED_EXTENSIONS.some(ext => operation.targetPath.endsWith(ext))) {
    return { level: "blocked", reasons: [`File type not allowed: ${ext}`], autoApprove: false, requireExplicit: true };
  }

  // Rule 3: Modify existing content
  if (operation.type === "update" && fileExists(operation.targetPath)) {
    level = "medium";
    reasons.push("Modifying existing content");

    // Rule 3a: Large diff
    const diffSize = Math.abs(operation.newContent.length - currentContent.length);
    if (diffSize > 2000) {
      level = "high";
      reasons.push(`Large content change: ${diffSize} characters`);
    }
  }

  // Rule 4: Delete operation
  if (operation.type === "delete") {
    level = "high";
    reasons.push("Delete operation");
  }

  // Rule 5: Bulk operation
  if (operation.bulkCount > 5) {
    level = "high";
    reasons.push(`Bulk operation: ${operation.bulkCount} files`);
  }

  return {
    level,
    reasons,
    autoApprove: level === "low",
    requireExplicit: level === "high",
  };
}

const BLOCKED_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd", ".ps1", ".app", ".dmg", ".so", ".dylib"];
```

### Audit Gate API (IPC)

```typescript
// IPC channel: "security:assessWrite"
interface AssessWriteRequest {
  operation: WriteOperation;
}

interface AssessWriteResponse {
  risk: RiskAssessment;
  auditId: string;        // Unique ID for tracking this audit
}

// IPC channel: "security:getPendingAudits"
interface GetPendingAuditsResponse {
  audits: PendingAudit[];
  count: number;
}

// IPC channel: "security:resolveAudit"
interface ResolveAuditRequest {
  auditId: string;
  action: "approve" | "reject" | "edit_and_approve";
  editedContent?: string;  // Only for "edit_and_approve"
}

// IPC channel: "security:bulkResolve"
interface BulkResolveRequest {
  auditIds: string[];
  action: "approve_all" | "reject_all";
}
```

---

## P0.8.2 Diff Review Queue Mechanism

### UI Layout

The diff review queue appears in two locations:

#### 1. Right Panel — Diff Stack

When pending audits exist, the right panel shows a stacked list of diffs awaiting review:

```
┌─ Pending Reviews (3) ─────────────────────┐
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ #1  Update: attention-mechanism.md    │ │
│  │     Domain: ai-ml  |  MEDIUM risk     │ │
│  │     ──────────────────────────────    │ │
│  │     - Current (old content preview)   │ │
│  │     + Proposed (new content preview)  │ │
│  │     ──────────────────────────────    │ │
│  │     [Approve] [Reject] [Edit & Apply] │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ #2  Create: loss-function-summary.md  │ │
│  │     Domain: ai-ml  |  LOW risk        │ │
│  │     ──────────────────────────────    │ │
│  │     + (new file content preview)      │ │
│  │     ──────────────────────────────    │ │
│  │     [Approve] [Reject]                │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ #3  Delete: old-analysis.md           │ │
│  │     Domain: ai-ml  |  HIGH risk       │ │
│  │     ──────────────────────────────    │ │
│  │     - (file to be deleted)            │ │
│  │     ──────────────────────────────    │ │
│  │     [Approve ⚠] [Reject]              │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  [Approve All Low-Risk] [Reject All]        │
└─────────────────────────────────────────────┘
```

#### 2. Chat Input Area — Badge

When pending audits exist, the chat input area SHALL display a badge:

```
┌──────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐  │
│  │ Type a message...                      │  │
│  └────────────────────────────────────────┘  │
│                                    🔔 3 pending reviews  │
└──────────────────────────────────────────────┘
```

Clicking the badge opens the right panel diff stack.

### Queue Ordering

Diffs SHALL be ordered by:
1. Risk level (HIGH first, then MEDIUM, then LOW)
2. Within same risk level: FIFO (oldest first)

### Diff Display Format

Each diff card SHALL show:

| Element | Description |
|---------|-------------|
| Operation badge | `Create` (green) / `Update` (yellow) / `Delete` (red) |
| File name | Relative path from domain root |
| Domain label | Domain name with color indicator |
| Risk badge | `LOW` (green) / `MEDIUM` (yellow) / `HIGH` (red) |
| Diff preview | First 10 lines of unified diff, truncated with "Show full diff" link |
| Action buttons | Varies by risk level (see below) |

### Action Buttons by Risk Level

| Risk Level | Buttons | Behavior |
|------------|---------|----------|
| LOW | [Approve] [Reject] | Approve applies immediately with auto-commit |
| MEDIUM | [Approve] [Reject] [Edit & Apply] | Approve requires one click confirmation |
| HIGH | [Approve ⚠] [Reject] | Approve requires typing "APPROVE" to confirm (destructive action safeguard) |

### Edit & Apply Mode

When the user clicks "Edit & Apply":
1. A full-content editor opens in the right panel with the proposed content
2. User can modify the content
3. Clicking "Apply" commits the edited version
4. Clicking "Cancel" returns to the diff view without changes

### Auto-Dismiss

- LOW risk audits SHALL be auto-approved after 60 seconds if no interaction (configurable in settings)
- MEDIUM/HIGH risk audits SHALL NEVER be auto-approved

### Notification

- New pending audit → Desktop notification (if app is minimized): "Agent Claw: N changes awaiting review"
- All audits resolved → Toast notification: "All changes reviewed"

---

## P0.8.3 Write Permission Levels

### Permission Matrix

| Level | Auto-Pass | Needs Confirmation | Needs Explicit Approval |
|-------|-----------|--------------------|------------------------|
| **LOW** | ✅ Yes (auto-approve) | — | — |
| **MEDIUM** | — | ✅ Yes (single-click approve) | — |
| **HIGH** | — | — | ✅ Yes (type "APPROVE") |
| **BLOCKED** | — | — | ❌ Never allowed |

### Detailed Permission Rules

#### LOW — Auto-Approve

These operations are considered safe and SHALL be applied immediately without user review:

| Operation | Condition |
|-----------|-----------|
| Create new knowledge node | New `.md` file in domain's `data/knowledge/` directory |
| Create research result | New file in domain's research output area |
| Create decision record | New `ADR-NNN-*.md` file |
| Create skill file | New file in domain's `skills/` directory |
| Append to inbox | Adding content to inbox processing queue |
| Write log/metrics | System-level data collection writes |

All auto-approved operations SHALL still trigger a git auto-commit (per version-control spec).

#### MEDIUM — Needs Confirmation

These operations modify existing content and require one-click user approval:

| Operation | Condition |
|-----------|-----------|
| Update knowledge node content | Modifying existing `.md` file, diff < 2000 chars |
| Update domain config | Modifying `config.yaml` |
| Update skill file | Modifying existing skill |
| Update framework analysis | Modifying analysis output |
| Append to knowledge node | Adding content to existing node (not replacement) |
| Rename/move file | Moving a file within the same domain |

#### HIGH — Needs Explicit Approval

These operations are potentially destructive and require explicit confirmation:

| Operation | Condition |
|-----------|-----------|
| Delete any file | Agent requests file deletion |
| Large content replacement | Diff > 2000 characters (> 50% of original content replaced) |
| Bulk write operation | Agent modifies > 5 files in a single operation |
| Modify database schema | Agent requests structural changes |
| Update model configuration | Changing model parameters for a domain |
| Replace domain config | Complete rewrite of `config.yaml` |

Explicit approval requires the user to type "APPROVE" in a confirmation input field, preventing accidental approval via keyboard shortcut.

#### BLOCKED — Always Reject

These operations SHALL never be allowed, regardless of user approval:

| Operation | Reason |
|-----------|--------|
| Write outside domain directory | Agent sandboxing boundary |
| Write executable files | Security risk (`.exe`, `.sh`, `.bat`, etc.) |
| Write to system paths | `~/.agentclaw/` config/log files |
| Modify other domains' files | Cross-domain isolation |
| Modify application code | Self-modification prevention |
| Access API keys | API keys are encrypted, never exposed to agents |

### Permission Override (User Settings)

Users MAY adjust the permission levels per operation type in Settings → Security:

```
┌─ Security Settings ────────────────────────┐
│                                              │
│  Default Permission Levels:                 │
│                                              │
│  Knowledge create:    [LOW ▼]               │
│  Knowledge update:    [MEDIUM ▼]            │
│  Knowledge delete:    [HIGH ▼]              │
│  Domain config:       [MEDIUM ▼]            │
│  Skill files:         [LOW ▼]               │
│  Research results:    [LOW ▼]               │
│                                              │
│  Auto-approve low-risk after:               │
│  [60s ▼]  (0 = never auto-approve)          │
│                                              │
│  ☐ Require approval for all Agent writes    │
│  (Treats everything as MEDIUM+)             │
│                                              │
│  ☐ Auto-approve all Agent writes            │
│  (⚠ Not recommended — disables safety)      │
└──────────────────────────────────────────────┘
```

### Permission Check Enforcement

The permission check SHALL be enforced at the IPC boundary, not at the UI level:

```typescript
// server/services/security-gate.ts
export class SecurityGate {
  constructor(
    private readonly repo: DomainRepository,
    private readonly settings: SecuritySettings,
  ) {}

  async assess(operation: WriteOperation): Promise<AuditDecision> {
    // Step 1: Always-blocked checks (cannot be overridden)
    if (this.isBlocked(operation)) {
      return { action: "blocked", reason: "Operation is not allowed for security reasons" };
    }

    // Step 2: Get effective permission level (user override or default)
    const effectiveLevel = this.getEffectiveLevel(operation);

    // Step 3: Return decision
    return {
      action: effectiveLevel === "low" ? "auto_approve" : "require_review",
      level: effectiveLevel,
      riskFactors: this.getRiskFactors(operation),
    };
  }
}
```

### Audit Trail

All write operations SHALL be logged to an audit trail:

```typescript
interface AuditTrailEntry {
  id: string;
  timestamp: string;
  operation: WriteOperation;
  riskLevel: RiskLevel;
  decision: "auto_approved" | "user_approved" | "user_rejected" | "blocked";
  reviewer?: string;        // Always "user" for manual review
  reviewDuration?: number;  // Time from audit creation to resolution (ms)
  commitHash?: string;      // Git commit hash after approved write
}
```

Audit trail entries SHALL be stored in SQLite and queryable via `security:getAuditLog` IPC channel.

---

## File Structure

```
server/
├── services/
│   └── security-gate.ts              # SecurityGate service (risk assessment + audit)
├── ipc/
│   └── handlers/
│       └── security-handler.ts       # IPC handlers for security gates
├── db/
│   ├── schema.ts                     # Add: audit_trail, cost_records tables
│   └── repositories/
│       └── audit-trail.ts            # AuditTrailEntry CRUD + queries

src/
├── components/
│   ├── security/
│   │   ├── diff-review-card.tsx      # Single diff review card
│   │   ├── diff-review-stack.tsx     # Stacked list of pending diffs
│   │   ├── edit-and-apply.tsx        # Full-content editor for "Edit & Apply"
│   │   ├── approve-confirm.tsx       # "Type APPROVE" confirmation dialog
│   │   ├── pending-badge.tsx         # "N pending reviews" badge for input area
│   │   └── security-settings.tsx     # Permission level configuration
│   └── diff/
│       └── diff-viewer.tsx           # (from version-control spec, reused)
├── stores/
│   └── security-store.ts             # Pending audits state, user preferences
└── lib/
    └── hooks/
        └── use-security-gate.ts      # Hook for IPC calls to security gate
```

---

## Summary

| Aspect | Decision |
|--------|----------|
| Risk levels | 4 tiers: LOW (auto-approve), MEDIUM (1-click confirm), HIGH (type "APPROVE"), BLOCKED (always reject) |
| Path boundary | Agent writes restricted to domain directory only |
| Diff review UI | Right panel stacked queue (HIGH→MEDIUM→LOW), chat input badge for pending count |
| Auto-approve | LOW risk after 60s (configurable), never for MEDIUM/HIGH |
| User overrides | Per-operation-type permission level adjustable in settings |
| Audit trail | All decisions logged to SQLite with commit hash |
| Enforcement | Server-side (IPC boundary), not client-side |
