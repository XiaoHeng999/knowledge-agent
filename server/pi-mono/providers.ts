/**
 * Provider registration module.
 * Registers 9 LLM providers with the pi-mono ModelRegistry.
 */
import type { ModelRegistry } from "@mariozechner/pi-coding-agent";
import type { AuthStorage } from "@mariozechner/pi-coding-agent";

export interface ProviderDefinition {
  id: string;
  name: string;
  baseUrl: string;
  api: "openai-completions" | "anthropic" | "google";
  models: ProviderModel[];
}

export interface ProviderModel {
  id: string;
  name: string;
  reasoning: boolean;
  input: ("text" | "image")[];
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
  contextWindow: number;
  maxTokens: number;
}

const PROVIDERS: ProviderDefinition[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    api: "anthropic",
    models: [
      {
        id: "claude-opus-4-20250514",
        name: "Claude Opus 4",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
        contextWindow: 200000,
        maxTokens: 32000,
      },
      {
        id: "claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
        contextWindow: 200000,
        maxTokens: 64000,
      },
      {
        id: "claude-haiku-4-20250506",
        name: "Claude Haiku 4",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
        contextWindow: 200000,
        maxTokens: 8192,
      },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com",
    api: "openai-completions",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        reasoning: false,
        input: ["text", "image"],
        cost: { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 16384,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        reasoning: false,
        input: ["text", "image"],
        cost: { input: 0.15, output: 0.6, cacheRead: 0.075, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 16384,
      },
      {
        id: "o3",
        name: "o3",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 10, output: 40, cacheRead: 2.5, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 100000,
      },
      {
        id: "o4-mini",
        name: "o4-mini",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 1.1, output: 4.4, cacheRead: 0.275, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 100000,
      },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    api: "openai-completions",
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek-V3",
        reasoning: false,
        input: ["text"],
        cost: { input: 0.27, output: 1.1, cacheRead: 0.07, cacheWrite: 0 },
        contextWindow: 64000,
        maxTokens: 8192,
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek-R1",
        reasoning: true,
        input: ["text"],
        cost: { input: 0.55, output: 2.19, cacheRead: 0.14, cacheWrite: 0 },
        contextWindow: 64000,
        maxTokens: 8192,
      },
    ],
  },
  {
    id: "google",
    name: "Google",
    baseUrl: "https://generativelanguage.googleapis.com",
    api: "google",
    models: [
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 1.25, output: 10, cacheRead: 0.315, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 65536,
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 0.15, output: 0.6, cacheRead: 0.0375, cacheWrite: 0 },
        contextWindow: 1048576,
        maxTokens: 65536,
      },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai",
    api: "openai-completions",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        reasoning: false,
        input: ["text"],
        cost: { input: 0.59, output: 0.79, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 32768,
      },
    ],
  },
  {
    id: "ollama",
    name: "Ollama",
    baseUrl: "http://localhost:11434",
    api: "openai-completions",
    models: [
      {
        id: "llama3.1",
        name: "Llama 3.1",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 4096,
      },
      {
        id: "qwen2.5",
        name: "Qwen 2.5",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 4096,
      },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api",
    api: "openai-completions",
    models: [
      {
        id: "anthropic/claude-sonnet-4",
        name: "Claude Sonnet 4 (OpenRouter)",
        reasoning: true,
        input: ["text", "image"],
        cost: { input: 3, output: 15, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200000,
        maxTokens: 64000,
      },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    baseUrl: "https://api.x.ai",
    api: "openai-completions",
    models: [
      {
        id: "grok-3",
        name: "Grok 3",
        reasoning: false,
        input: ["text", "image"],
        cost: { input: 3, output: 15, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 131072,
        maxTokens: 16384,
      },
      {
        id: "grok-3-mini",
        name: "Grok 3 Mini",
        reasoning: true,
        input: ["text"],
        cost: { input: 0.3, output: 0.5, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 131072,
        maxTokens: 16384,
      },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai",
    api: "openai-completions",
    models: [
      {
        id: "mistral-large-latest",
        name: "Mistral Large",
        reasoning: false,
        input: ["text"],
        cost: { input: 2, output: 6, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      },
      {
        id: "codestral-latest",
        name: "Codestral",
        reasoning: false,
        input: ["text"],
        cost: { input: 0.3, output: 0.9, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 256000,
        maxTokens: 8192,
      },
    ],
  },
];

export function registerProviders(
  modelRegistry: ModelRegistry,
  authStorage: AuthStorage,
): void {
  for (const provider of PROVIDERS) {
    modelRegistry.registerProvider(provider.id, {
      name: provider.name,
      baseUrl: provider.baseUrl,
      api: provider.api,
      models: provider.models.map((m) => ({
        id: m.id,
        name: m.name,
        reasoning: m.reasoning,
        input: m.input,
        cost: m.cost,
        contextWindow: m.contextWindow,
        maxTokens: m.maxTokens,
      })),
    });
  }
}

export function getProviderDefinitions(): ProviderDefinition[] {
  return [...PROVIDERS];
}
