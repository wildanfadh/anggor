/**
 * Ollama Provider
 */

import type { Provider, ProviderConfig, ProviderResponse } from "./index.js";

export class OllamaProvider implements Provider {
  constructor(config: ProviderConfig) { void config; }

  async chat(
    _messages: { role: string; content: string }[]
  ): Promise<ProviderResponse> {
    // TODO: Implement Ollama chat
    throw new Error("Not implemented");
  }

  async *stream(
    _messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    // TODO: Implement Ollama streaming
    throw new Error("Not implemented");
  }
}