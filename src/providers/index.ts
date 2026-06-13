/**
 * Provider Index
 *
 * Exports all available AI providers.
 */

import type { ProviderConfig as AppProviderConfig, ProviderName } from "../config/index.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";

export { OpenAIProvider } from "./openai.js";
export { AnthropicProvider } from "./anthropic.js";
export { GoogleProvider } from "./google.js";
export { OllamaProvider } from "./ollama.js";
export { CustomProvider } from "./custom.js";

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

export interface ProviderResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Provider {
  chat(messages: ProviderMessage[]): Promise<ProviderResponse>;
  stream(messages: ProviderMessage[]): AsyncGenerator<string>;
}

function toRuntimeProviderConfig(config: AppProviderConfig): ProviderConfig {
  return {
    name: config.name,
    apiKey: config.apiKey,
    endpoint: config.endpoint,
    model: config.model,
  };
}

function createNotImplementedProvider(name: ProviderName): never {
  throw new Error(`Provider \`${name}\` is not implemented yet`);
}

export function createProvider(config: AppProviderConfig): Provider {
  const runtimeConfig = toRuntimeProviderConfig(config);

  switch (config.name) {
    case "openai":
      return new OpenAIProvider(runtimeConfig);
    case "anthropic":
      return new AnthropicProvider(runtimeConfig);
    case "google":
    case "ollama":
    case "openrouter":
    case "groq":
    case "deepseek":
    case "azure":
    case "custom":
      return createNotImplementedProvider(config.name);
    default:
      throw new Error(`Unsupported provider: ${runtimeConfig.name}`);
  }
}
