/**
 * Google (Gemini) Provider
 *
 * Uses Google's OpenAI-compatible endpoint.
 * Default endpoint: https://generativelanguage.googleapis.com/v1beta/openai
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

function getApiKey(config: ProviderConfig): string {
  if (!config.apiKey) {
    throw new Error("Google API key is required");
  }

  return config.apiKey;
}

const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai";

export class GoogleProvider implements Provider {
  private readonly client;
  private readonly modelName: string;

  constructor(config: ProviderConfig) {
    this.modelName = config.model ?? "gemini-1.5-flash";
    this.client = createOpenAI({
      apiKey: getApiKey(config),
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
