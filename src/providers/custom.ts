/**
 * Custom Provider (OpenAI-compatible endpoint)
 */

import type { Provider, ProviderConfig, ProviderResponse } from "./index.js";

export class CustomProvider implements Provider {
  constructor(config: ProviderConfig) { void config; }

  async chat(
    _messages: { role: string; content: string }[]
  ): Promise<ProviderResponse> {
    // TODO: Implement custom provider chat
    throw new Error("Not implemented");
  }

  async *stream(
    _messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    // TODO: Implement custom provider streaming
    throw new Error("Not implemented");
  }
}