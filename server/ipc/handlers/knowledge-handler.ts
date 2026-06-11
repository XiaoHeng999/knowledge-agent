import {
  KNOWLEDGE_CHANNELS,
  type KnowledgeNode,
  type KnowledgeEdge,
  type KnowledgeWriteResponse,
  type KnowledgeWriteVoidResponse,
} from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as KnowledgeGraph from "../../services/knowledge-graph";
import { guardedWrite, guardedDelete } from "../../services/security-gate";

export function registerKnowledgeHandlers(): void {
  registerHandler(KNOWLEDGE_CHANNELS.CREATE_NODE, async (_event, req) => {
    const operation = {
      type: "create" as const,
      targetPath: `domain/${req.domainId}/knowledge/${req.title}`,
      domainId: req.domainId,
      newContent: req.content,
    };
    return guardedWrite<KnowledgeNode>(operation, () => KnowledgeGraph.createNode(req));
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
    return guardedWrite<KnowledgeNode>(operation, () => KnowledgeGraph.updateNode(req));
  });

  registerHandler(KNOWLEDGE_CHANNELS.DELETE_NODE, async (_event, req) => {
    const node = KnowledgeGraph.getNode(req.id);
    if (!node) throw new Error(`Node not found: ${req.id}`);

    const operation = {
      type: "delete" as const,
      targetPath: `domain/${node.domainId}/knowledge/${node.id}`,
      domainId: node.domainId,
    };
    return guardedDelete(operation);
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
    return guardedWrite<KnowledgeEdge>(operation, () => Promise.resolve(KnowledgeGraph.createEdge(req)));
  });

  registerHandler(KNOWLEDGE_CHANNELS.DELETE_EDGE, async (_event, _req) => {
    const domainId = "";
    const operation = {
      type: "delete" as const,
      targetPath: `domain/${domainId}/knowledge/edge/${_req.id}`,
      domainId,
    };
    return guardedDelete(operation);
  });
}
