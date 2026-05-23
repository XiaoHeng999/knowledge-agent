/**
 * pi-mono SDK core initialization.
 * Manages AuthStorage, ModelRegistry, SessionManager, and ResourceLoader lifecycle.
 */
import { app } from "electron";
import path from "path";
import {
  AuthStorage,
  ModelRegistry,
  SessionManager,
  DefaultResourceLoader,
  type ExtensionFactory,
} from "@mariozechner/pi-coding-agent";
import { registerProviders } from "./providers";

export interface PiMonoConfig {
  userDataPath?: string;
  extensionFactories?: ExtensionFactory[];
}

export class PiMonoCore {
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
  sessionManager: SessionManager;
  resourceLoader: DefaultResourceLoader;
  private initialized = false;

  private constructor(config: PiMonoConfig) {
    const userData = config.userDataPath ?? app.getPath("userData");
    const agentDir = path.join(userData, "agent");

    this.authStorage = AuthStorage.create(path.join(userData, "auth.json"));
    this.modelRegistry = ModelRegistry.create(
      this.authStorage,
      path.join(agentDir, "models.json"),
    );
    this.sessionManager = SessionManager.create(path.join(userData, "sessions"));

    this.resourceLoader = new DefaultResourceLoader({
      cwd: userData,
      agentDir,
      extensionFactories: config.extensionFactories ?? [],
    });
  }

  static async create(config: PiMonoConfig = {}): Promise<PiMonoCore> {
    const instance = new PiMonoCore(config);
    await instance.initialize();
    return instance;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register all 9 providers
    registerProviders(this.modelRegistry, this.authStorage);

    // Load extensions, skills, and prompt templates
    await this.resourceLoader.reload();

    this.initialized = true;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  /** Return all models that have credentials configured. */
  getAvailableModels() {
    return this.modelRegistry.getAvailable();
  }

  /** Return all models (including those without credentials). */
  getAllModels() {
    return this.modelRegistry.getAll();
  }

  /** Check if a provider has auth configured. */
  hasProviderAuth(provider: string): boolean {
    return this.authStorage.has(provider);
  }

  /** Get auth status for a provider. */
  getProviderAuthStatus(provider: string) {
    return this.modelRegistry.getProviderAuthStatus(provider);
  }

  /** Set API key for a provider. */
  async setProviderApiKey(provider: string, apiKey: string): Promise<void> {
    this.authStorage.set(provider, { type: "api_key", key: apiKey });
    // Refresh model registry so newly-authed models appear as available
    this.modelRegistry.refresh();
  }

  /** Remove API key for a provider. */
  removeProviderApiKey(provider: string): void {
    this.authStorage.remove(provider);
    this.modelRegistry.refresh();
  }

  /** Reload all resources (extensions, skills, prompts). */
  async reloadResources(): Promise<void> {
    await this.resourceLoader.reload();
  }
}
