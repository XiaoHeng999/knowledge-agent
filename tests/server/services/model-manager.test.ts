import { describe, it, expect, vi, beforeEach } from "vitest";

// Electron mock must come before any import that transitively requires it
vi.mock("electron", () => ({
  app: { getPath: vi.fn(() => "/tmp/test-electron") },
}));

import { createModelManager } from "@server/services/model-manager";
import type { FullDeps } from "@server/services/types";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockDb() {
  return {
    apiKeys: {
      findByProvider: vi.fn(),
      delete: vi.fn(),
      createEncrypted: vi.fn(),
      setValid: vi.fn(),
    },
    modelConfigs: {
      findByProviderAndModel: vi.fn(),
      create: vi.fn(),
    },
    db: {
      prepare: vi.fn(() => ({
        run: vi.fn(),
        get: vi.fn(),
      })),
    },
  } as unknown as import("@server/db/index").DatabaseService;
}

function createMockPiMono() {
  return {
    listProviders: vi.fn().mockResolvedValue([]),
    setApiKey: vi.fn().mockResolvedValue(true),
    removeApiKey: vi.fn(),
    validateApiKey: vi.fn().mockResolvedValue({ valid: false }),
    listAvailableModels: vi.fn().mockResolvedValue([]),
    listAllModels: vi.fn().mockResolvedValue([]),
  } as unknown as import("@server/services/pi-mono-wrapper").PiMonoWrapper;
}

function createMockDeps(): FullDeps & {
  db: ReturnType<typeof createMockDb>;
  piMono: ReturnType<typeof createMockPiMono>;
} {
  return {
    db: createMockDb(),
    piMono: createMockPiMono(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createModelManager", () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
  });

  // -------------------------------------------------------------------------
  // Factory contract
  // -------------------------------------------------------------------------

  it("returns an object with all 7 public methods", () => {
    const manager = createModelManager(deps);

    expect(typeof manager.listProviders).toBe("function");
    expect(typeof manager.addApiKey).toBe("function");
    expect(typeof manager.validateApiKey).toBe("function");
    expect(typeof manager.removeApiKey).toBe("function");
    expect(typeof manager.listModels).toBe("function");
    expect(typeof manager.setDefaultModel).toBe("function");
    expect(typeof manager.getDefaultModel).toBe("function");
  });

  // -------------------------------------------------------------------------
  // listProviders
  // -------------------------------------------------------------------------

  it("listProviders delegates to piMono and maps configured → enabled", async () => {
    deps.piMono.listProviders.mockResolvedValue([
      { id: "openai", name: "OpenAI", configured: true },
      { id: "anthropic", name: "Anthropic", configured: false },
    ]);

    const manager = createModelManager(deps);
    const result = await manager.listProviders();

    expect(deps.piMono.listProviders).toHaveBeenCalledOnce();
    expect(result).toEqual([
      { id: "openai", name: "OpenAI", enabled: true },
      { id: "anthropic", name: "Anthropic", enabled: false },
    ]);
  });

  // -------------------------------------------------------------------------
  // addApiKey
  // -------------------------------------------------------------------------

  it("addApiKey stores key via piMono and upserts in db", async () => {
    const manager = createModelManager(deps);
    const result = await manager.addApiKey("openai", "sk-test");

    expect(deps.piMono.setApiKey).toHaveBeenCalledWith("openai", "sk-test");
    expect(deps.db.apiKeys.createEncrypted).toHaveBeenCalledWith("openai", "sk-test");
    expect(result).toEqual({ providerId: "openai" });
  });

  it("addApiKey deletes existing key before creating new one", async () => {
    deps.db.apiKeys.findByProvider.mockReturnValue({ id: "key-1", provider_id: "openai" });

    const manager = createModelManager(deps);
    await manager.addApiKey("openai", "sk-new");

    expect(deps.db.apiKeys.findByProvider).toHaveBeenCalledWith("openai");
    expect(deps.db.apiKeys.delete).toHaveBeenCalledWith("key-1");
    expect(deps.db.apiKeys.createEncrypted).toHaveBeenCalledWith("openai", "sk-new");
  });

  // -------------------------------------------------------------------------
  // validateApiKey
  // -------------------------------------------------------------------------

  it("validateApiKey returns valid=false when validation fails", async () => {
    deps.piMono.validateApiKey.mockResolvedValue({ valid: false, error: "bad key" });

    const manager = createModelManager(deps);
    const result = await manager.validateApiKey("openai", "sk-bad");

    expect(result).toEqual({ valid: false, models: [] });
    expect(deps.db.apiKeys.setValid).toHaveBeenCalledWith("openai", false);
  });

  it("validateApiKey syncs models and returns them when valid", async () => {
    deps.piMono.validateApiKey.mockResolvedValue({ valid: true });
    deps.piMono.listAvailableModels.mockResolvedValue([
      {
        id: "gpt-4",
        name: "GPT-4",
        provider: "openai",
        costPerMillionInput: 30,
        costPerMillionOutput: 60,
        contextWindow: 128000,
        available: true,
      },
      {
        id: "claude-3",
        name: "Claude 3",
        provider: "anthropic",
        costPerMillionInput: 15,
        costPerMillionOutput: 75,
        contextWindow: 200000,
        available: true,
      },
    ]);
    deps.db.modelConfigs.findByProviderAndModel.mockReturnValue(null);

    const manager = createModelManager(deps);
    const result = await manager.validateApiKey("openai", "sk-good");

    expect(result.valid).toBe(true);
    expect(result.models).toHaveLength(1); // only openai models
    expect(result.models[0]).toEqual({
      id: "gpt-4",
      name: "GPT-4",
      provider: "openai",
      costPerMillion: 30,
      available: true,
      contextWindow: 128000,
    });
    expect(deps.db.apiKeys.setValid).toHaveBeenCalledWith("openai", true);
    expect(deps.db.modelConfigs.create).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // removeApiKey
  // -------------------------------------------------------------------------

  it("removeApiKey removes from both piMono and db", () => {
    deps.db.apiKeys.findByProvider.mockReturnValue({ id: "key-1", provider_id: "openai" });

    const manager = createModelManager(deps);
    manager.removeApiKey("openai");

    expect(deps.piMono.removeApiKey).toHaveBeenCalledWith("openai");
    expect(deps.db.apiKeys.delete).toHaveBeenCalledWith("key-1");
  });

  it("removeApiKey skips db delete when no existing key", () => {
    deps.db.apiKeys.findByProvider.mockReturnValue(null);

    const manager = createModelManager(deps);
    manager.removeApiKey("openai");

    expect(deps.piMono.removeApiKey).toHaveBeenCalledWith("openai");
    expect(deps.db.apiKeys.delete).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // listModels
  // -------------------------------------------------------------------------

  it("listModels returns all models mapped", async () => {
    deps.piMono.listAllModels.mockResolvedValue([
      {
        id: "gpt-4",
        name: "GPT-4",
        provider: "openai",
        costPerMillionInput: 30,
        costPerMillionOutput: 60,
        contextWindow: 128000,
        available: true,
      },
    ]);

    const manager = createModelManager(deps);
    const result = await manager.listModels();

    expect(result).toEqual([
      {
        id: "gpt-4",
        name: "GPT-4",
        provider: "openai",
        costPerMillion: 30,
        available: true,
        contextWindow: 128000,
      },
    ]);
  });

  it("listModels filters by providerId", async () => {
    deps.piMono.listAllModels.mockResolvedValue([
      {
        id: "gpt-4",
        name: "GPT-4",
        provider: "openai",
        costPerMillionInput: 30,
        costPerMillionOutput: 60,
        contextWindow: 128000,
        available: true,
      },
      {
        id: "claude-3",
        name: "Claude 3",
        provider: "anthropic",
        costPerMillionInput: 15,
        costPerMillionOutput: 75,
        contextWindow: 200000,
        available: true,
      },
    ]);

    const manager = createModelManager(deps);
    const result = await manager.listModels("openai");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("gpt-4");
  });

  // -------------------------------------------------------------------------
  // setDefaultModel
  // -------------------------------------------------------------------------

  it("setDefaultModel writes to db via prepared statement for global scope", () => {
    const mockRun = vi.fn();
    (deps.db.db.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ run: mockRun });

    const manager = createModelManager(deps);
    manager.setDefaultModel({ providerId: "openai", modelId: "gpt-4", scope: "global" });

    expect(deps.db.db.prepare).toHaveBeenCalledOnce();
    expect(mockRun).toHaveBeenCalledWith(
      "global:defaultModel",
      JSON.stringify({ providerId: "openai", modelId: "gpt-4" }),
    );
  });

  it("setDefaultModel uses domain-scoped key for domain scope", () => {
    const mockRun = vi.fn();
    (deps.db.db.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ run: mockRun });

    const manager = createModelManager(deps);
    manager.setDefaultModel({
      providerId: "openai",
      modelId: "gpt-4",
      scope: "domain",
      domainId: "dom-1",
      role: "expert",
    });

    expect(mockRun).toHaveBeenCalledWith(
      "domain:dom-1:defaultModel:expert",
      expect.any(String),
    );
  });

  // -------------------------------------------------------------------------
  // getDefaultModel
  // -------------------------------------------------------------------------

  it("getDefaultModel returns parsed model for global scope", () => {
    const mockGet = vi.fn().mockReturnValue({
      value: JSON.stringify({ providerId: "openai", modelId: "gpt-4" }),
    });
    (deps.db.db.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ get: mockGet });

    const manager = createModelManager(deps);
    const result = manager.getDefaultModel({ scope: "global" });

    expect(result).toEqual({ providerId: "openai", modelId: "gpt-4" });
    expect(deps.db.db.prepare).toHaveBeenCalledWith(
      "SELECT value FROM settings WHERE key = ?",
    );
    expect(mockGet).toHaveBeenCalledWith("global:defaultModel");
  });

  it("getDefaultModel returns null when no setting exists", () => {
    const mockGet = vi.fn().mockReturnValue(undefined);
    (deps.db.db.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ get: mockGet });

    const manager = createModelManager(deps);
    const result = manager.getDefaultModel({ scope: "global" });

    expect(result).toBeNull();
  });

  it("getDefaultModel returns null for invalid JSON", () => {
    const mockGet = vi.fn().mockReturnValue({ value: "not-json" });
    (deps.db.db.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ get: mockGet });

    const manager = createModelManager(deps);
    const result = manager.getDefaultModel({ scope: "global" });

    expect(result).toBeNull();
  });

  it("getDefaultModel uses domain-scoped key with default role 'expert'", () => {
    const mockGet = vi.fn().mockReturnValue({
      value: JSON.stringify({ providerId: "anthropic", modelId: "claude-3" }),
    });
    (deps.db.db.prepare as ReturnType<typeof vi.fn>).mockReturnValue({ get: mockGet });

    const manager = createModelManager(deps);
    manager.getDefaultModel({ scope: "domain", domainId: "dom-1" });

    expect(mockGet).toHaveBeenCalledWith("domain:dom-1:defaultModel:expert");
  });
});
