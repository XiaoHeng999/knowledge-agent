/**
 * Security Gate IPC handlers — bridges renderer calls to the
 * security-gate service for write scope restriction and audit.
 */

import { SECURITY_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import {
  assessWriteRisk,
  getPendingAudits,
  getPendingCount,
  resolveAudit,
  bulkResolve,
  getAuditLog,
  addPendingAudit,
  logAuditEntry,
} from "../../services/security-gate";
import type { PendingAudit, AuditTrailEntry } from "../../../src/lib/ipc/channels";

export function registerSecurityHandlers(): void {
  registerHandler(SECURITY_CHANNELS.ASSESS_WRITE, async (_event, req) => {
    const risk = assessWriteRisk(req.operation);

    // Auto-approve low-risk operations immediately
    if (risk.autoApprove) {
      logAuditEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation: req.operation,
        riskLevel: risk.level,
        decision: "auto_approved",
        commitHash: undefined,
      });
    } else if (risk.level !== "blocked") {
      // Queue for user review
      const auditId = crypto.randomUUID();
      const audit: PendingAudit = {
        id: auditId,
        operation: req.operation,
        risk,
        createdAt: new Date().toISOString(),
      };
      addPendingAudit(audit);
    }

    return { risk };
  });

  registerHandler(SECURITY_CHANNELS.GET_PENDING, async () => {
    const audits = getPendingAudits();
    return { audits, count: getPendingCount() };
  });

  registerHandler(SECURITY_CHANNELS.RESOLVE_AUDIT, async (_event, req) => {
    resolveAudit(req.auditId, req.action, req.editedContent);
  });

  registerHandler(SECURITY_CHANNELS.BULK_RESOLVE, async (_event, req) => {
    bulkResolve(req.auditIds, req.action);
  });

  registerHandler(SECURITY_CHANNELS.GET_AUDIT_LOG, async (_event, req) => {
    return getAuditLog(req.limit, req.offset);
  });
}
