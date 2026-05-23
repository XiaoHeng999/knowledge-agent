/**
 * ModelManager service — orchestrates API key management, model discovery,
 * and default model configuration across pi-mono and the local DB.
 */
import { getDatabaseService } from "../db/index";
import { getPiMonoWrapper } from "../pi-mono/instance";
import type { ProviderInfo, ModelInfo } from "../../src/lib/ipc/channels";

// ---------------------------------------------------------------------------
// API Key management
// ---------------------------------------------------------------------------

export async function listProviders(): Promise<ProviderInfo[]> {
  const wrapper = getPiMonoWrapper();
  const providers = await wrapper.listProviders();
  return providers.map((p) => ({
    id: p.id,
    name: p.name,
    enabled: p.configured,
  }));
}

export async function addApiKey(providerId: string, apiKey: string): Promise<{ providerId: string }> {
  const wrapper = getPiMonoWrapper();
  const db = getDatabaseService();

  // Store in pi-mono auth
  await wrapper.setApiKey(providerId, apiKey);

  // Persist encrypted copy in local DB
  const existing = db.apiKeys.findByProvider(providerId);
  if (existing) {
    db.apiKeys.delete(existing.id);
  }
  db.apiKeys.createEncrypted(providerId, apiKey);

  return { providerId };
}

export async function validateApiKey(
  providerId: string,
  _apiKey: string,
): Promise<{ valid: boolean; models: ModelInfo[] }> {
  const wrapper = getPiMonoWrapper();
  const db = getDatabaseService();

  const result = await wrapper.validateApiKey(providerId);

  if (result.valid) {
    db.apiKeys.setValid(providerId, true);
    // Sync available models from this provider into local DB
    const models = await wrapper.listAvailableModels();
    const providerModels = models.filter((m) => m.provider === providerId);
    syncModelsToDb(providerModels);
    return { valid: true, models: mapModels(providerModels) };
  }

  db.apiKeys.setValid(providerId, false);
  return { valid: false, models: [] };
}

export function removeApiKey(providerId: string): void {
  const wrapper = getPiMonoWrapper();
  const db = getDatabaseService();

  wrapper.removeApiKey(providerId);

  const existing = db.apiKeys.findByProvider(providerId);
  if (existing) {
    db.apiKeys.delete(existing.id);
  }
}

// ---------------------------------------------------------------------------
// Model listing
// ---------------------------------------------------------------------------

export async function listModels(providerId?: string): Promise<ModelInfo[]> {
  const wrapper = getPiMonoWrapper();
  const models = await wrapper.listAllModels();

  const filtered = providerId ? models.filter((m) => m.provider === providerId) : models;
  return mapModels(filtered);
}

// ---------------------------------------------------------------------------
// Default model management (stored in settings table)
// ---------------------------------------------------------------------------

export function setDefaultModel(params: {
  providerId: string;
  modelId: string;
  scope: "global" | "domain";
  domainId?: string;
  role?: string;
}): void {
  const db = getDatabaseService();
  const key =
    params.scope === "global"
      ? "global:defaultModel"
      : `domain:${params.domainId}:defaultModel:${params.role ?? "expert"}`;

  const value = JSON.stringify({ providerId: params.providerId, modelId: params.modelId });

  db.db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  ).run(key, value);
}

export function getDefaultModel(params: {
  scope: "global" | "domain";
  domainId?: string;
  role?: string;
}): { providerId: string; modelId: string } | null {
  const db = getDatabaseService();
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const db = getDatabaseService();
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
