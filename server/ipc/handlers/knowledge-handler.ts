/**
 * Knowledge graph IPC handlers — wires KNOWLEDGE_CHANNELS to KnowledgeGraph service.
 * Medium/high-risk operations go through the security gate before being applied.
 */
import { KNOWLEDGE_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as KnowledgeGraph from "../../services/knowledge-graph";
import * as SearchEngine from "../../services/search-engine";
import {
  assessWriteRisk,
  addPendingAudit,
  logAuditEntry,
} from "../../services/security-gate";
import type { PendingAudit } from "../../../src/lib/ipc/channels";

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
      logAuditEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation,
        riskLevel: risk.level,
        decision: "blocked",
      });
      throw new Error(`Write blocked: ${risk.reasons.join(", ")}`);
    }

    if (risk.autoApprove) {
      logAuditEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation,
        riskLevel: risk.level,
        decision: "auto_approved",
      });
      return KnowledgeGraph.createNode(req);
    }

    // Queue for review
    const audit: PendingAudit = {
      id: crypto.randomUUID(),
      operation,
      risk,
      createdAt: new Date().toISOString(),
    };
    addPendingAudit(audit);
    return { _pendingAudit: audit.id, risk } as unknown as Awaited<
      ReturnType<typeof KnowledgeGraph.createNode>
    >;
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
      logAuditEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation,
        riskLevel: risk.level,
        decision: "blocked",
      });
      throw new Error(`Write blocked: ${risk.reasons.join(", ")}`);
    }

    if (risk.autoApprove) {
      logAuditEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation,
        riskLevel: risk.level,
        decision: "auto_approved",
      });
      return KnowledgeGraph.updateNode(req);
    }

    // Medium/high risk: queue for review
    const audit: PendingAudit = {
      id: crypto.randomUUID(),
      operation,
      risk,
      createdAt: new Date().toISOString(),
    };
    addPendingAudit(audit);
    return { _pendingAudit: audit.id, risk } as unknown as Awaited<
      ReturnType<typeof KnowledgeGraph.updateNode>
    >;
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
      logAuditEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        operation,
        riskLevel: risk.level,
        decision: "blocked",
      });
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
    return { _pendingAudit: audit.id, risk } as unknown as void;
  });

  registerHandler(KNOWLEDGE_CHANNELS.GET_NODE, async (_event, req) => {
    const node = KnowledgeGraph.getNode(req.id);
    return node;
  });

  registerHandler(KNOWLEDGE_CHANNELS.LIST_NODES, async (_event, req) => {
    const result = KnowledgeGraph.listNodes(req);
    return result;
  });

  registerHandler(KNOWLEDGE_CHANNELS.CREATE_EDGE, async (_event, req) => {
    const edge = KnowledgeGraph.createEdge(req);
    return edge;
  });

  registerHandler(KNOWLEDGE_CHANNELS.DELETE_EDGE, async (_event, req) => {
    await KnowledgeGraph.deleteEdge(req.id);
  });

  registerHandler(KNOWLEDGE_CHANNELS.GET_GRAPH, async (_event, req) => {
    const graph = KnowledgeGraph.getGraph(req.domainId);
    return graph;
  });

  registerHandler(KNOWLEDGE_CHANNELS.SEARCH, async (_event, req) => {
    const result = await SearchEngine.search(req);
    return { results: result.results };
  });
}
