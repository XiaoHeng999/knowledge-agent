/**
 * SecurityGate service — enforces write scope restrictions for Agent operations.
 * Ensures Agents can only write within their designated domain directory
 * and provides risk assessment for write operations.
 */

import path from "path";
import { getDataDir, getDomainsDir, getDomainDir } from "../fs/paths";
import { getDatabaseService } from "../db/index";
import type {
  RiskLevel,
  WriteOperation,
  RiskAssessment,
  PendingAudit,
  AuditTrailEntry,
} from "../../src/lib/ipc/channels";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLOCKED_EXTENSIONS = [
  ".exe", ".sh", ".bat", ".cmd", ".ps1", ".app", ".dmg", ".so", ".dylib",
];

// ---------------------------------------------------------------------------
// In-memory pending audits
// ---------------------------------------------------------------------------

const pendingAudits = new Map<string, PendingAudit>();

// ---------------------------------------------------------------------------
// Path boundary checks
// ---------------------------------------------------------------------------

function resolveDomainDir(domainId: string): string | null {
  const db = getDatabaseService();
  const domain = db.domains.findById(domainId);
  if (!domain) return null;
  const slug = domain.config_path?.split("/").filter(Boolean).pop() ?? "";
  if (!slug) return null;
  return path.resolve(getDomainDir(slug));
}

function isWithinDomainDir(targetPath: string, domainId: string): boolean {
  const domainDir = resolveDomainDir(domainId);
  if (!domainDir) return false;
  const resolved = path.resolve(targetPath);
  return resolved.startsWith(domainDir + path.sep) || resolved === domainDir;
}

function isBlockedFileType(targetPath: string): boolean {
  const ext = path.extname(targetPath).toLowerCase();
  return BLOCKED_EXTENSIONS.includes(ext);
}

// ---------------------------------------------------------------------------
// Risk assessment
// ---------------------------------------------------------------------------

export function assessWriteRisk(operation: WriteOperation): RiskAssessment {
  const reasons: string[] = [];
  let level: RiskLevel = "low";

  // Rule 1: Path boundary — writes must be within domain directory
  if (!isWithinDomainDir(operation.targetPath, operation.domainId)) {
    return {
      level: "blocked",
      reasons: ["Write target outside domain directory"],
      autoApprove: false,
      requireExplicit: true,
    };
  }

  // Rule 2: File type check
  if (isBlockedFileType(operation.targetPath)) {
    return {
      level: "blocked",
      reasons: [`File type not allowed: ${path.extname(operation.targetPath)}`],
      autoApprove: false,
      requireExplicit: true,
    };
  }

  // Rule 3: Delete is always high risk
  if (operation.type === "delete") {
    level = "high";
    reasons.push("Delete operation");
  }

  // Rule 4: Update existing content is medium risk
  if (operation.type === "update") {
    level = "medium";
    reasons.push("Modifying existing content");
  }

  // Rule 5: Bulk operation threshold
  if ((operation.bulkCount ?? 0) > 5) {
    level = "high";
    reasons.push(`Bulk operation: ${operation.bulkCount} files`);
  }

  // Rule 6: Large content change
  if (operation.type === "update" && operation.newContent && operation.newContent.length > 2000) {
    level = "high";
    reasons.push("Large content change");
  }

  return {
    level,
    reasons,
    autoApprove: level === "low",
    requireExplicit: level === "high",
  };
}

// ---------------------------------------------------------------------------
// Pending audit management
// ---------------------------------------------------------------------------

export function addPendingAudit(audit: PendingAudit): void {
  pendingAudits.set(audit.id, audit);
}

export function getPendingAudits(): PendingAudit[] {
  return Array.from(pendingAudits.values()).sort((a, b) => {
    const riskOrder: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2, blocked: 3 };
    const riskDiff = riskOrder[a.risk.level] - riskOrder[b.risk.level];
    if (riskDiff !== 0) return riskDiff;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function getPendingCount(): number {
  return pendingAudits.size;
}

export function resolveAudit(
  auditId: string,
  action: "approve" | "reject" | "edit_and_approve",
  _editedContent?: string,
): boolean {
  const audit = pendingAudits.get(auditId);
  if (!audit) return false;

  pendingAudits.delete(auditId);

  const decision = action === "reject" ? "user_rejected" as const : "user_approved" as const;
  logAuditEntry({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    operation: audit.operation,
    riskLevel: audit.risk.level,
    decision,
    reviewer: "user",
  });

  return true;
}

export function bulkResolve(
  auditIds: string[],
  action: "approve_all" | "reject_all",
): number {
  const decision = action === "reject_all" ? "user_rejected" as const : "user_approved" as const;
  let count = 0;
  for (const id of auditIds) {
    const audit = pendingAudits.get(id);
    if (!audit) continue;
    pendingAudits.delete(id);
    count++;
    logAuditEntry({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      operation: audit.operation,
      riskLevel: audit.risk.level,
      decision,
      reviewer: "user",
    });
  }
  return count;
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

const MAX_AUDIT_TRAIL_SIZE = 1000;

const auditTrail: AuditTrailEntry[] = [];

export function logAuditEntry(entry: AuditTrailEntry): void {
  auditTrail.push(entry);
  while (auditTrail.length > MAX_AUDIT_TRAIL_SIZE) {
    auditTrail.shift();
  }
}

export function getAuditLog(
  limit: number = 50,
  offset: number = 0,
): { entries: AuditTrailEntry[]; total: number } {
  const sorted = [...auditTrail].reverse();
  return {
    entries: sorted.slice(offset, offset + limit),
    total: sorted.length,
  };
}
