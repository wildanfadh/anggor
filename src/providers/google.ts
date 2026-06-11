/**
 * Google (Gemini) Provider
 */

import type { Provider, ProviderConfig, ProviderResponse } from "./index.js";

export class GoogleProvider implements Provider {
  constructor(config: ProviderConfig) { void config; }

  async chat(
    _messages: { role: string; content: string }[]
  ): Promise<ProviderResponse> {
    // TODO: Implement Google chat
    throw new Error("Not implemented");
  }

  async *stream(
    _messages: { role: string; content: string }[]
  ): AsyncGenerator<string> {
    // TODO: Implement Google streaming
    throw new Error("Not implemented");
  }
}