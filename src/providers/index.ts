/**
 * Provider Index
 *
 * Exports all available AI providers.
 */

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

export interface Provider {
  chat(messages: { role: string; content: string }[]): Promise<ProviderResponse>;
  stream(messages: { role: string; content: string }[]): AsyncGenerator<string>;
}