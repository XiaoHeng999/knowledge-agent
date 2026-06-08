/**
 * Knowledge graph IPC handlers — wires KNOWLEDGE_CHANNELS to KnowledgeGraph service.
 * Medium/high-risk operations go through the security gate before being applied.
 */
import {
  KNOWLEDGE_CHANNELS,
  type KnowledgeNode,
  type KnowledgeEdge,
  type KnowledgeWriteResponse,
  type KnowledgeWriteVoidResponse,
} from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as KnowledgeGraph from "../../services/knowledge-graph";
import {
  assessWriteRisk,
  addPendingAudit,
  logAuditEntry,
} from "../../services/security-gate";
import type { PendingAudit } from "../../../src/lib/ipc/channels";

function pendingAuditResult<T>(audit: PendingAudit): KnowledgeWriteResponse<T> {
  return { result: null, pendingAudit: true, auditId: audit.id, risk: audit.risk };
}

function pendingAuditVoidResult(audit: PendingAudit): KnowledgeWriteVoidResponse {
  return { pendingAudit: true, auditId: audit.id, risk: audit.risk };
}

function makeAuditEntry(operation: Parameters<typeof assessWriteRisk>[0], riskLevel: string, decision: string) {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    operation,
    riskLevel: riskLevel as PendingAudit["risk"]["level"],
    decision: decision as "auto_approved" | "blocked",
  };
}

export function registerKnowledgeHandlers(): void {
  registerHandler(KNOWLEDGE_CHANNELS.CREATE_NODE, async (_event, req) => {
    const operation = {
      type: "create" as const,
      targetPath: `domain/${req.domainId}/knowledge/${req.title}`,
      domainId: req.domainId,
      newContent: req.content,
    };
    const risk = assessWriteRisk(operation);

    if (risk.level === "blocked") {
      logAuditEntry(makeAuditEntry(operation, risk.level, "blocked"));
      throw new Error(`Write blocked: ${risk.reasons.join(", ")}`);
    }

    if (risk.autoApprove) {
      logAuditEntry(makeAuditEntry(operation, risk.level, "auto_approved"));
      const result = await KnowledgeGraph.createNode(req);
      return { result, pendingAudit: false } satisfies KnowledgeWriteResponse<KnowledgeNode>;
    }

    const audit: PendingAudit = {
      id: crypto.randomUUID(),
      operation,
      risk,
      createdAt: new Date().toISOString(),
    };
    addPendingAudit(audit);
    return pendingAuditResult<KnowledgeNode>(audit);
  });

  registerHandler(KNOWLEDGE_CHANNELS.UPDATE_NODE, async (_event, req) => {
    const node = KnowledgeGraph.getNode(req.id);
    if (!node) throw new Error(`Node not found: ${req.id}`);

    const operation = {
      type: "update" as const,
      targetPath: `domain/${node.domainId}/knowledge/${node.id}`,
      domainId: node.domainId,
      newContent: req.content,
    };
    const risk = assessWriteRisk(operation);

    if (risk.level === "blocked") {
      logAuditEntry(makeAuditEntry(operation, risk.level, "blocked"));
      throw new Error(`Write blocked: ${risk.reasons.join(", ")}`);
    }

    if (risk.autoApprove) {
      logAuditEntry(makeAuditEntry(operation, risk.level, "auto_approved"));
      const result = await KnowledgeGraph.updateNode(req);
      return { result, pendingAudit: false } satisfies KnowledgeWriteResponse<KnowledgeNode>;
    }

    const audit: PendingAudit = {
      id: crypto.randomUUID(),
      operation,
      risk,
      createdAt: new Date().toISOString(),
    };
    addPendingAudit(audit);
    return pendingAuditResult<KnowledgeNode>(audit);
  });

  registerHandler(KNOWLEDGE_CHANNELS.DELETE_NODE, async (_event, req) => {
    const node = KnowledgeGraph.getNode(req.id);
    if (!node) throw new Error(`Node not found: ${req.id}`);

    const operation = {
      type: "delete" as const,
      targetPath: `domain/${node.domainId}/knowledge/${node.id}`,
      domainId: node.domainId,
    };
    const risk = assessWriteRisk(operation);

    if (risk.level === "blocked") {
      logAuditEntry(makeAuditEntry(operation, risk.level, "blocked"));
      throw new Error(`Write blocked: ${risk.reasons.join(", ")}`);
    }

    // Delete is always high risk → queue for review
    const audit: PendingAudit = {
      id: crypto.randomUUID(),
      operation,
      risk,
      createdAt: new Date().toISOString(),
    };
    addPendingAudit(audit);
    return pendingAuditVoidResult(audit);
  });

  registerHandler(KNOWLEDGE_CHANNELS.GET_NODE, async (_event, req) => {
    return KnowledgeGraph.getNode(req.id);
  });

  registerHandler(KNOWLEDGE_CHANNELS.LIST_NODES, async (_event, req) => {
    return KnowledgeGraph.listNodes(req);
  });

  registerHandler(KNOWLEDGE_CHANNELS.CREATE_EDGE, async (_event, req) => {
    const sourceNode = KnowledgeGraph.getNode(req.sourceId);
    const targetNode = KnowledgeGraph.getNode(req.targetId);
    const domainId = sourceNode?.domainId ?? targetNode?.domainId ?? "";

    const operation = {
      type: "create" as const,
      targetPath: `domain/${domainId}/knowledge/edge/${req.sourceId}-${req.targetId}`,
      domainId,
      newContent: `Edge: ${req.sourceId} → ${req.targetId} (${req.type})`,
    };
    const risk = assessWriteRisk(operation);

    if (risk.level === "blocked") {
      logAuditEntry(makeAuditEntry(operation, risk.level, "blocked"));
      throw new Error(`Write blocked: ${risk.reasons.join(", ")}`);
    }

    if (risk.autoApprove) {
      logAuditEntry(makeAuditEntry(operation, risk.level, "auto_approved"));
      const result = KnowledgeGraph.createEdge(req);
      return { result, pendingAudit: false } satisfies KnowledgeWriteResponse<KnowledgeEdge>;
    }

    const audit: PendingAudit = {
      id: crypto.randomUUID(),
      operation,
      risk,
      createdAt: new Date().toISOString(),
    };
    addPendingAudit(audit);
    return pendingAuditResult<KnowledgeEdge>(audit);
  });

  registerHandler(KNOWLEDGE_CHANNELS.DELETE_EDGE, async (_event, req) => {
    const domainId = "";

    const operation = {
      type: "delete" as const,
      targetPath: `domain/${domainId}/knowledge/edge/${req.id}`,
      domainId,
    };
    const risk = assessWriteRisk(operation);

    if (risk.level === "blocked") {
      logAuditEntry(makeAuditEntry(operation, risk.level, "blocked"));
      throw new Error(`Write blocked: ${risk.reasons.join(", ")}`);
    }

    const audit: PendingAudit = {
      id: crypto.randomUUID(),
      operation,
      risk,
      createdAt: new Date().toISOString(),
    };
    addPendingAudit(audit);
    return pendingAuditVoidResult(audit);
  });

  registerHandler(KNOWLEDGE_CHANNELS.GET_GRAPH, async (_event, req) => {
    return KnowledgeGraph.getGraph(req.domainId);
  });
}
