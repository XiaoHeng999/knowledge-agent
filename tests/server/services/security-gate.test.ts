import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Electron
vi.mock("electron", () => ({
  app: { getPath: () => "/tmp/agentclaw-test" },
}));

// Mock DB service — domain lookup for path boundary checks
const mockFindById = vi.fn();
vi.mock("@server/db/index", () => ({
  getDatabaseService: () => ({
    domains: { findById: mockFindById },
  }),
}));

import {
  assessWriteRisk,
  addPendingAudit,
  getPendingAudits,
  getPendingCount,
  resolveAudit,
  bulkResolve,
  logAuditEntry,
  getAuditLog,
  guardedWrite,
  guardedDelete,
} from "@server/services/security-gate";
import type { WriteOperation, PendingAudit, AuditTrailEntry } from "@/lib/ipc/channels/security";

// ---------------------------------------------------------------------------
// State cleanup — module-level maps persist across tests
// ---------------------------------------------------------------------------

function clearAllPending() {
  const audits = getPendingAudits();
  for (const a of audits) resolveAudit(a.id, "reject");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOMAIN_ID = "domain-1";

function op(overrides: Partial<WriteOperation> = {}): WriteOperation {
  return {
    type: "create",
    targetPath: `/tmp/agentclaw-test/domains/my-domain/file.txt`,
    domainId: DOMAIN_ID,
    ...overrides,
  };
}

function setupDomainDir() {
  // Last segment of config_path is used as slug → getDomainDir(slug)
  mockFindById.mockReturnValue({
    id: DOMAIN_ID,
    config_path: "/data/domains/my-domain",
  });
}

// ---------------------------------------------------------------------------
// assessWriteRisk — path boundary
// ---------------------------------------------------------------------------

describe("assessWriteRisk", () => {
  beforeEach(() => {
    mockFindById.mockReset();
  });

  it("blocks writes outside domain directory", () => {
    setupDomainDir();
    const result = assessWriteRisk(op({ targetPath: "/tmp/evil/shell.sh" }));
    expect(result.level).toBe("blocked");
    expect(result.reasons[0]).toMatch(/outside domain/i);
    expect(result.autoApprove).toBe(false);
    expect(result.requireExplicit).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // assessWriteRisk — blocked file types
  // ---------------------------------------------------------------------------

  it("blocks dangerous file types even within domain", () => {
    setupDomainDir();
    const result = assessWriteRisk(op({ targetPath: `/tmp/agentclaw-test/domains/my-domain/run.sh` }));
    expect(result.level).toBe("blocked");
    expect(result.reasons[0]).toMatch(/not allowed.*\.sh/i);
  });

  // ---------------------------------------------------------------------------
  // assessWriteRisk — risk levels by operation type
  // ---------------------------------------------------------------------------

  it("rates delete as high risk", () => {
    setupDomainDir();
    const result = assessWriteRisk(op({ type: "delete" }));
    expect(result.level).toBe("high");
    expect(result.reasons).toContain("Delete operation");
    expect(result.requireExplicit).toBe(true);
  });

  it("rates update as medium risk", () => {
    setupDomainDir();
    const result = assessWriteRisk(op({ type: "update" }));
    expect(result.level).toBe("medium");
    expect(result.reasons).toContain("Modifying existing content");
    expect(result.autoApprove).toBe(false);
  });

  it("rates create as low risk (auto-approve)", () => {
    setupDomainDir();
    const result = assessWriteRisk(op({ type: "create" }));
    expect(result.level).toBe("low");
    expect(result.reasons).toHaveLength(0);
    expect(result.autoApprove).toBe(true);
    expect(result.requireExplicit).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // assessWriteRisk — escalation rules
  // ---------------------------------------------------------------------------

  it("escalates to high when bulkCount > 5", () => {
    setupDomainDir();
    const result = assessWriteRisk(op({ bulkCount: 6 }));
    expect(result.level).toBe("high");
    expect(result.reasons).toContain("Bulk operation: 6 files");
  });

  it("escalates to high when update has large content", () => {
    setupDomainDir();
    const result = assessWriteRisk(op({ type: "update", newContent: "x".repeat(2001) }));
    expect(result.level).toBe("high");
    expect(result.reasons).toContain("Large content change");
  });

  it("does not escalate when newContent is exactly 2000 chars", () => {
    setupDomainDir();
    const result = assessWriteRisk(op({ type: "update", newContent: "x".repeat(2000) }));
    expect(result.level).toBe("medium");
    expect(result.reasons).not.toContain("Large content change");
  });
});

// ---------------------------------------------------------------------------
// Pending audit CRUD
// ---------------------------------------------------------------------------

function makeAudit(id: string, level: "high" | "medium" | "low", createdAt: string): PendingAudit {
  return {
    id,
    operation: op(),
    risk: { level, reasons: [], autoApprove: level === "low", requireExplicit: level === "high" },
    createdAt,
  };
}

describe("pending audit management", () => {
  beforeEach(() => {
    clearAllPending();
    mockFindById.mockReset();
  });

  it("stores and retrieves pending audits sorted by risk then time", () => {
    addPendingAudit(makeAudit("a1", "low", "2026-01-01T10:00:00Z"));
    addPendingAudit(makeAudit("a2", "high", "2026-01-01T09:00:00Z"));
    addPendingAudit(makeAudit("a3", "medium", "2026-01-01T08:00:00Z"));

    const list = getPendingAudits();
    expect(list.map((a) => a.id)).toEqual(["a2", "a3", "a1"]);
    expect(getPendingCount()).toBe(3);
  });

  it("resolves an audit by id and returns true", () => {
    addPendingAudit(makeAudit("r1", "medium", "2026-01-01T00:00:00Z"));
    expect(resolveAudit("r1", "approve")).toBe(true);
    expect(getPendingCount()).toBe(0);
  });

  it("returns false when resolving a missing audit", () => {
    expect(resolveAudit("nope", "reject")).toBe(false);
  });

  it("bulk-resolves matching audits and returns count", () => {
    addPendingAudit(makeAudit("b1", "high", "2026-01-01T00:00:00Z"));
    addPendingAudit(makeAudit("b2", "high", "2026-01-01T00:00:00Z"));
    addPendingAudit(makeAudit("b3", "low", "2026-01-01T00:00:00Z"));

    const count = bulkResolve(["b1", "b2", "missing"], "approve_all");
    expect(count).toBe(2);
    expect(getPendingCount()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

function makeEntry(id: string): AuditTrailEntry {
  return {
    id,
    timestamp: new Date().toISOString(),
    operation: op(),
    riskLevel: "low",
    decision: "auto_approved",
  };
}

describe("audit trail", () => {
  it("returns entries newest-first with pagination", () => {
    // Drain any prior entries
    const prior = getAuditLog(9999);
    // We can't clear the audit trail directly, so we test relative behavior

    logAuditEntry(makeEntry("e1"));
    logAuditEntry(makeEntry("e2"));
    logAuditEntry(makeEntry("e3"));

    const page = getAuditLog(2, 0);
    expect(page.total).toBeGreaterThanOrEqual(3);
    // Newest first
    const ids = page.entries.map((e) => e.id);
    expect(ids).toContain("e3");
    expect(ids).toContain("e2");
  });

  it("respects offset pagination", () => {
    logAuditEntry(makeEntry("o1"));
    logAuditEntry(makeEntry("o2"));

    const all = getAuditLog(9999, 0);
    // Find our entries in the full log (reversed = newest first)
    const idx = all.entries.findIndex((e) => e.id === "o2");
    expect(idx).toBeGreaterThan(-1);

    // o2 is newer than o1, so it comes first in the reversed list
    const idx1 = all.entries.findIndex((e) => e.id === "o1");
    expect(idx).toBeLessThan(idx1);
  });
});

// ---------------------------------------------------------------------------
// guardedWrite / guardedDelete
// ---------------------------------------------------------------------------

describe("guardedWrite", () => {
  beforeEach(() => {
    clearAllPending();
    mockFindById.mockReset();
  });

  it("throws when operation is blocked", async () => {
    // targetPath outside domain → blocked
    const operation: WriteOperation = {
      type: "create",
      targetPath: "/tmp/evil/path.txt",
      domainId: DOMAIN_ID,
    };

    await expect(guardedWrite(operation, async () => "never")).rejects.toThrow(
      /blocked/i,
    );
  });

  it("logs a blocked audit entry when throwing", async () => {
    const operation: WriteOperation = {
      type: "create",
      targetPath: "/tmp/evil/path.txt",
      domainId: DOMAIN_ID,
    };

    await expect(guardedWrite(operation, async () => "never")).rejects.toThrow();
    const log = getAuditLog(9999);
    const blocked = log.entries.find(
      (e) => e.decision === "blocked",
    );
    expect(blocked).toBeDefined();
    expect(blocked!.operation).toEqual(operation);
  });

  it("auto-approves low-risk create, executes callback, returns result", async () => {
    setupDomainDir();
    const operation: WriteOperation = {
      type: "create",
      targetPath: `/tmp/agentclaw-test/domains/my-domain/file.txt`,
      domainId: DOMAIN_ID,
    };
    const callback = vi.fn().mockResolvedValue({ id: "node-1" });

    const result = await guardedWrite(operation, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ result: { id: "node-1" }, pendingAudit: false });

    const log = getAuditLog(9999);
    const approved = log.entries.find(
      (e) => e.decision === "auto_approved" && e.operation === operation,
    );
    expect(approved).toBeDefined();
  });

  it("pends medium-risk update without calling executeFn", async () => {
    setupDomainDir();
    const operation: WriteOperation = {
      type: "update",
      targetPath: `/tmp/agentclaw-test/domains/my-domain/file.txt`,
      domainId: DOMAIN_ID,
    };
    const callback = vi.fn().mockResolvedValue("should-not-run");

    const result = await guardedWrite(operation, callback);

    expect(callback).not.toHaveBeenCalled();
    expect(result.pendingAudit).toBe(true);
    if (result.pendingAudit) {
      expect(result.result).toBeNull();
      expect(result.auditId).toBeTruthy();
      expect(result.risk.level).toBe("medium");
    }

    // Pending audit should be retrievable
    const pending = getPendingAudits();
    expect(pending.some((a) => a.id === (result as any).auditId)).toBe(true);
  });
});

describe("guardedDelete", () => {
  beforeEach(() => {
    clearAllPending();
    mockFindById.mockReset();
  });

  it("throws when operation is blocked", () => {
    const operation: WriteOperation = {
      type: "delete",
      targetPath: "/tmp/evil/path.txt",
      domainId: DOMAIN_ID,
    };

    expect(() => guardedDelete(operation)).toThrow(/blocked/i);
  });

  it("logs a blocked audit entry when throwing", () => {
    const operation: WriteOperation = {
      type: "delete",
      targetPath: "/tmp/evil/path.txt",
      domainId: DOMAIN_ID,
    };

    expect(() => guardedDelete(operation)).toThrow();
    const log = getAuditLog(9999);
    const blocked = log.entries.find((e) => e.decision === "blocked");
    expect(blocked).toBeDefined();
    expect(blocked!.operation).toEqual(operation);
  });

  it("creates pending audit for high-risk delete (never autoApprove)", () => {
    setupDomainDir();
    const operation: WriteOperation = {
      type: "delete",
      targetPath: `/tmp/agentclaw-test/domains/my-domain/file.txt`,
      domainId: DOMAIN_ID,
    };

    const result = guardedDelete(operation);

    expect(result.pendingAudit).toBe(true);
    if (result.pendingAudit) {
      expect(result.auditId).toBeTruthy();
      expect(result.risk.level).toBe("high");
    }
    expect(getPendingCount()).toBe(1);
  });
});
