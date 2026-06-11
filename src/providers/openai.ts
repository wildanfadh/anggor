/**
 * OpenAI Provider
 */

import type { Provider, ProviderConfig, ProviderResponse } from "./index.js";

export class OpenAIProvider implements Provider {
  constructor(config: ProviderConfig) { void config; }

  async chat(
    _messages: { role: string; content: string }[]
  ): Promise<ProviderResponse> {
    // TODO: Implement OpenAI chat
    throw new Error("Not implemented");
  }

  async *stream(
    _messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    // TODO: Implement OpenAI streaming
    throw new Error("Not implemented");
  }
}