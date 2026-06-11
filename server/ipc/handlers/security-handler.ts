import { SECURITY_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import {
  assessWriteRisk,
  getPendingAudits,
  getPendingCount,
  addPendingAudit,
  logAuditEntry,
} from "../../services/security-gate";
import type { PendingAudit } from "../../../src/lib/ipc/channels";

export function registerSecurityHandlers(): void {
  registerHandler(SECURITY_CHANNELS.ASSESS_WRITE, async (_event, req) => {
    const risk = assessWriteRisk(req.operation);

    if (risk.autoApprove) {
      logAuditEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation: req.operation,
        riskLevel: risk.level,
        decision: "auto_approved",
      });
    } else if (risk.level !== "blocked") {
      const audit: PendingAudit = {
        id: crypto.randomUUID(),
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
}
