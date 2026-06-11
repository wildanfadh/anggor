/**
 * Anthropic Provider
 */

import type { Provider, ProviderConfig, ProviderResponse } from "./index.js";

export class AnthropicProvider implements Provider {
  constructor(config: ProviderConfig) { void config; }

  async chat(
    _messages: { role: string; content: string }[]
  ): Promise<ProviderResponse> {
    // TODO: Implement Anthropic chat
    throw new Error("Not implemented");
  }

  async *stream(
    _messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    // TODO: Implement Anthropic streaming
    throw new Error("Not implemented");
  }
}