/**
 * pi-mono wrapper layer.
 * Provides 6 core interface abstractions that decouple AgentClaw from pi-mono internals.
 * All higher-level services go through these interfaces.
 */
import {
  createAgentSession,
  type AgentSession,
  type CreateAgentSessionOptions,
  type ToolDefinition,
} from "@mariozechner/pi-coding-agent";
import type { PiMonoCore } from "../pi-mono/core";
import type { KnowledgeNodeType } from "../db/schema";
import { domainResearchTool } from "../pi-mono/tools/domain-research";
import { knowledgeWriteTool } from "../pi-mono/tools/knowledge-write";
import { timelineAnalyzeTool } from "../pi-mono/tools/timeline-analyze";
import {
  setPendingDomain,
  registerSession,
  clearSession,
} from "../pi-mono/extensions/session-context";

// ---------------------------------------------------------------------------
// Interface definitions
// ---------------------------------------------------------------------------

export interface IModelManager {
  /** List providers with their auth status. */
  listProviders(): Promise<Array<{ id: string; name: string; configured: boolean }>>;
  /** Set API key for a provider. */
  setApiKey(provider: string, apiKey: string): Promise<boolean>;
  /** Remove API key for a provider. */
  removeApiKey(provider: string): void;
  /** List all available models (with auth). */
  listAvailableModels(): Promise<Array<ModelInfo>>;
  /** List all models (including unauthenticated). */
  listAllModels(): Promise<Array<ModelInfo>>;
  /** Validate an API key by making a test request. */
  validateApiKey(provider: string): Promise<{ valid: boolean; error?: string }>;
}

export interface IAgentPool {
  /** Create a new expert chat session for a domain. */
  createExpertSession(
    domainId: string,
    modelId: string,
  ): Promise<{ sessionId: string; session: AgentSession }>;
  /** Resume an existing session. */
  resumeSession(sessionId: string): Promise<AgentSession | null>;
  /** Destroy a session. */
  destroySession(sessionId: string): void;
  /** Get an active session. */
  getSession(sessionId: string): AgentSession | undefined;
  /** List all active sessions. */
  listActiveSessions(): Array<{ sessionId: string; domainId: string; modelId: string }>;
}

export interface IKnowledgeDB {
  /** Create a knowledge node. */
  createNode(params: CreateNodeParams): Promise<{ nodeId: string }>;
  /** Update a knowledge node. */
  updateNode(params: UpdateNodeParams): Promise<boolean>;
  /** Delete a knowledge node. */
  deleteNode(nodeId: string): Promise<boolean>;
  /** Get a knowledge node by ID. */
  getNode(nodeId: string): Promise<KnowledgeNodeData | null>;
  /** List knowledge nodes by domain. */
  listNodes(domainId: string, filters?: NodeFilters): Promise<KnowledgeNodeData[]>;
  /** Search knowledge nodes using hybrid search. */
  searchNodes(query: string, domainId?: string, limit?: number): Promise<KnowledgeNodeData[]>;
}

export interface ISkillEngine {
  /** List all registered skills. */
  listSkills(domainId?: string): Promise<Array<SkillInfo>>;
  /** Execute a skill. */
  executeSkill(
    skillName: string,
    domainId: string,
    input: string,
  ): Promise<{ success: boolean; output: string }>;
  /** Enable/disable a skill. */
  toggleSkill(skillId: string, enabled: boolean): Promise<void>;
}

export interface IImportPipe {
  /** Import content from a URL. */
  importUrl(url: string, domainId: string): Promise<{ importId: string; status: string }>;
  /** Import content from a file (PDF). */
  importFile(filePath: string, domainId: string): Promise<{ importId: string; status: string }>;
  /** Get import status. */
  getImportStatus(importId: string): Promise<ImportStatusInfo | null>;
}

export interface ISearchEngine {
  /** Perform a hybrid (vector + full-text) search. */
  search(
    query: string,
    domainId?: string,
    limit?: number,
  ): Promise<Array<SearchResult>>;
  /** Index a knowledge node for search. */
  indexNode(nodeId: string, content: string, domainId: string): Promise<void>;
  /** Remove a node from the search index. */
  removeNode(nodeId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  reasoning: boolean;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  contextWindow: number;
  maxTokens: number;
  available: boolean;
}

export interface CreateNodeParams {
  domainId: string;
  title: string;
  content: string;
  nodeType: KnowledgeNodeType;
  tags?: string[];
  source?: string;
}

export interface UpdateNodeParams {
  nodeId: string;
  title?: string;
  content?: string;
  summary?: string;
  nodeType?: KnowledgeNodeType;
  comprehensionScore?: number;
}

export interface KnowledgeNodeData {
  id: string;
  domainId: string;
  title: string;
  content: string | null;
  summary: string | null;
  nodeType: KnowledgeNodeType;
  status: string;
  comprehensionScore: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NodeFilters {
  nodeType?: KnowledgeNodeType;
  status?: string;
  minComprehension?: number;
  limit?: number;
  offset?: number;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string | null;
  skillType: string;
  isEnabled: boolean;
  executionCount: number;
  successRate: number;
}

export interface ImportStatusInfo {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errorMessage: string | null;
}

export interface SearchResult {
  nodeId: string;
  title: string;
  score: number;
  snippet: string;
  domainId: string;
}

// ---------------------------------------------------------------------------
// PiMonoWrapper — implements all 6 interfaces
// ---------------------------------------------------------------------------

export class PiMonoWrapper implements IModelManager, IAgentPool {
  private core: PiMonoCore;
  private sessions = new Map<string, { session: AgentSession; domainId: string; modelId: string }>();

  constructor(core: PiMonoCore) {
    this.core = core;
  }

  // ---- IModelManager -------------------------------------------------------

  async listProviders() {
    const allModels = this.core.getAllModels();
    const providerSet = new Set<string>();
    for (const model of allModels) {
      providerSet.add(model.provider);
    }
    return Array.from(providerSet).map((id) => ({
      id,
      name: this.core.modelRegistry.getProviderDisplayName(id),
      configured: this.core.hasProviderAuth(id),
    }));
  }

  async setApiKey(provider: string, apiKey: string): Promise<boolean> {
    await this.core.setProviderApiKey(provider, apiKey);
    return true;
  }

  removeApiKey(provider: string): void {
    this.core.removeProviderApiKey(provider);
  }

  async listAvailableModels(): Promise<ModelInfo[]> {
    return this.core.getAvailableModels().map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      reasoning: m.reasoning,
      costPerMillionInput: m.cost.input,
      costPerMillionOutput: m.cost.output,
      contextWindow: m.contextWindow,
      maxTokens: m.maxTokens,
      available: true,
    }));
  }

  async listAllModels(): Promise<ModelInfo[]> {
    const allModels = this.core.getAllModels();
    const availableModels = new Set(this.core.getAvailableModels().map((m) => m.id));
    return allModels.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      reasoning: m.reasoning,
      costPerMillionInput: m.cost.input,
      costPerMillionOutput: m.cost.output,
      contextWindow: m.contextWindow,
      maxTokens: m.maxTokens,
      available: availableModels.has(m.id),
    }));
  }

  async validateApiKey(provider: string): Promise<{ valid: boolean; error?: string }> {
    const apiKey = await this.core.modelRegistry.getApiKeyForProvider(provider);
    if (!apiKey) {
      return { valid: false, error: "No API key configured" };
    }
    // Actual validation happens when pi-mono tries to use the key.
    // For now we just check presence; full validation requires a test model call
    // which will be implemented in the ModelManager service (Phase 2).
    return { valid: true };
  }

  // ---- IAgentPool ----------------------------------------------------------

  async createExpertSession(domainId: string, modelId: string) {
    const models = this.core.getAvailableModels();
    const model = models.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Model not found or not available: ${modelId}`);
    }

    // Register domain before session creation so session_start hooks can pick it up.
    setPendingDomain(domainId);

    const { session } = await createAgentSession({
      model,
      authStorage: this.core.authStorage,
      modelRegistry: this.core.modelRegistry,
      sessionManager: this.core.sessionManager,
      resourceLoader: this.core.resourceLoader,
      noTools: "all",
      customTools: this.getKnowledgeTools(),
    });

    const sessionId = session.sessionId;
    this.sessions.set(sessionId, { session, domainId, modelId });

    // Also register in the session-context so before_agent_start / tool_call hooks
    // can look up the domain by sessionId even if session_start didn't fire.
    registerSession(sessionId, domainId);

    return { sessionId, session };
  }

  async resumeSession(sessionId: string): Promise<AgentSession | null> {
    const entry = this.sessions.get(sessionId);
    return entry?.session ?? null;
  }

  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
    clearSession(sessionId);
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  listActiveSessions() {
    return Array.from(this.sessions.entries()).map(([sessionId, entry]) => ({
      sessionId,
      domainId: entry.domainId,
      modelId: entry.modelId,
    }));
  }

  // ---- Helpers -------------------------------------------------------------

  private getKnowledgeTools(): ToolDefinition[] {
    return [domainResearchTool, knowledgeWriteTool, timelineAnalyzeTool];
  }
}
