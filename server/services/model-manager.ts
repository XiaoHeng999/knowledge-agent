/**
 * ModelManager service — orchestrates API key management, model discovery,
 * and default model configuration across pi-mono and the local DB.
 */
import type { FullDeps } from "./types";
import type { ProviderInfo, ModelInfo } from "../../src/lib/ipc/channels";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createModelManager(deps: FullDeps) {
  const { db, piMono } = deps;

  // -------------------------------------------------------------------------
  // API Key management
  // -------------------------------------------------------------------------

  async function listProviders(): Promise<ProviderInfo[]> {
    const providers = await piMono.listProviders();
    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.configured,
    }));
  }

  async function addApiKey(providerId: string, apiKey: string): Promise<{ providerId: string }> {
    await piMono.setApiKey(providerId, apiKey);

    const existing = db.apiKeys.findByProvider(providerId);
    if (existing) {
      db.apiKeys.delete(existing.id);
    }
    db.apiKeys.createEncrypted(providerId, apiKey);

    return { providerId };
  }

  async function validateApiKey(
    providerId: string,
    _apiKey: string,
  ): Promise<{ valid: boolean; models: ModelInfo[] }> {
    const result = await piMono.validateApiKey(providerId);

    if (result.valid) {
      db.apiKeys.setValid(providerId, true);
      const models = await piMono.listAvailableModels();
      const providerModels = models.filter((m) => m.provider === providerId);
      syncModelsToDb(providerModels);
      return { valid: true, models: mapModels(providerModels) };
    }

    db.apiKeys.setValid(providerId, false);
    return { valid: false, models: [] };
  }

  function removeApiKey(providerId: string): void {
    piMono.removeApiKey(providerId);

    const existing = db.apiKeys.findByProvider(providerId);
    if (existing) {
      db.apiKeys.delete(existing.id);
    }
  }

  // -------------------------------------------------------------------------
  // Model listing
  // -------------------------------------------------------------------------

  async function listModels(providerId?: string): Promise<ModelInfo[]> {
    const models = await piMono.listAllModels();

    const filtered = providerId ? models.filter((m) => m.provider === providerId) : models;
    return mapModels(filtered);
  }

  // -------------------------------------------------------------------------
  // Default model management (stored in settings table)
  // -------------------------------------------------------------------------

  function setDefaultModel(params: {
    providerId: string;
    modelId: string;
    scope: "global" | "domain";
    domainId?: string;
    role?: string;
  }): void {
    const key =
      params.scope === "global"
        ? "global:defaultModel"
        : `domain:${params.domainId}:defaultModel:${params.role ?? "expert"}`;

    const value = JSON.stringify({ providerId: params.providerId, modelId: params.modelId });

    db.db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    ).run(key, value);
  }

  function getDefaultModel(params: {
    scope: "global" | "domain";
    domainId?: string;
    role?: string;
  }): { providerId: string; modelId: string } | null {
    const key =
      params.scope === "global"
        ? "global:defaultModel"
        : `domain:${params.domainId}:defaultModel:${params.role ?? "expert"}`;

    const row = db.db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    if (!row) return null;

    try {
      return JSON.parse(row.value) as { providerId: string; modelId: string };
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function mapModels(
    models: Array<{
      id: string;
      name: string;
      provider: string;
      costPerMillionInput: number;
      costPerMillionOutput: number;
      contextWindow: number;
      available: boolean;
    }>,
  ): ModelInfo[] {
    return models.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      costPerMillion: m.costPerMillionInput,
      available: m.available,
      contextWindow: m.contextWindow,
    }));
  }

  function syncModelsToDb(
    models: Array<{
      id: string;
      name: string;
      provider: string;
      costPerMillionInput: number;
      costPerMillionOutput: number;
      contextWindow: number;
    }>,
  ): void {
    for (const m of models) {
      const existing = db.modelConfigs.findByProviderAndModel(m.provider, m.id);
      if (!existing) {
        db.modelConfigs.create({
          provider: m.provider,
          model_id: m.id,
          display_name: m.name,
          is_local: 0,
          is_active: 1,
          cost_per_million_input: m.costPerMillionInput,
          cost_per_million_output: m.costPerMillionOutput,
          max_context_tokens: m.contextWindow,
        } as unknown as Partial<import("../db/schema").ModelConfigRow> & Record<string, unknown>);
      }
    }
  }

  return {
    listProviders,
    addApiKey,
    validateApiKey,
    removeApiKey,
    listModels,
    setDefaultModel,
    getDefaultModel,
  };
}

export type ModelManager = ReturnType<typeof createModelManager>;
