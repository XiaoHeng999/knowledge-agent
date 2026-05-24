/**
 * Knowledge graph IPC handlers — wires KNOWLEDGE_CHANNELS to KnowledgeGraph service.
 */
import { KNOWLEDGE_CHANNELS } from "../../../src/lib/ipc/channels";
import { registerHandler } from "../handler";
import * as KnowledgeGraph from "../../services/knowledge-graph";

export function registerKnowledgeHandlers(): void {
  registerHandler(KNOWLEDGE_CHANNELS.CREATE_NODE, async (_event, req) => {
    const node = KnowledgeGraph.createNode(req);
    return node;
  });

  registerHandler(KNOWLEDGE_CHANNELS.UPDATE_NODE, async (_event, req) => {
    const node = KnowledgeGraph.updateNode(req);
    return node;
  });

  registerHandler(KNOWLEDGE_CHANNELS.DELETE_NODE, async (_event, req) => {
    await KnowledgeGraph.deleteNode(req.id);
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
    const results = KnowledgeGraph.searchNodes(req.query, req.domainId, req.limit);
    return { results };
  });
}
