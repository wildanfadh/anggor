/**
 * Ollama Provider
 *
 * Uses Ollama's OpenAI-compatible API endpoint.
 * Default endpoint: http://localhost:11434/v1
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText, type CoreMessage } from "ai";

import type {
  Provider,
  ProviderConfig,
  ProviderMessage,
  ProviderResponse,
} from "./index.js";

function toCoreMessages(messages: ProviderMessage[]): CoreMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  })) as CoreMessage[];
}

const DEFAULT_ENDPOINT = "http://localhost:11434/v1";

export class OllamaProvider implements Provider {
  private readonly client;
  private readonly modelName: string;

  constructor(config: ProviderConfig) {
    this.modelName = config.model ?? "llama3";
    this.client = createOpenAI({
      apiKey: config.apiKey ?? "ollama", // Ollama doesn't need a real key
      baseURL: config.endpoint ?? DEFAULT_ENDPOINT,
    });
  }

  async chat(messages: ProviderMessage[]): Promise<ProviderResponse> {
    const result = await generateText({
      model: this.client(this.modelName),
      messages: toCoreMessages(messages),
    });

    return {
      content: result.text,
      model: result.response.modelId ?? this.modelName,
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
          }
        : undefined,
    };
  }

  async *stream(messages: ProviderMessage[]): AsyncGenerator<string> {
    const result = streamText({
      model: this.client(this.modelName),
      messages: toCoreMessages(messages),
    });

    for await (const chunk of result.textStream) {
      yield chunk;
    }
  }
}
