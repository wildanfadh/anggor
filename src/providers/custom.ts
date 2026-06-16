/**
 * Custom Provider (OpenAI-compatible endpoint)
 *
 * Works with any OpenAI-compatible API:
 * - OpenRouter
 * - Groq
 * - DeepSeek
 * - Azure OpenAI
 * - Local LLM servers (LM Studio, text-generation-webui, etc.)
 */

import { createOpenAI } from "@ai-sdk/openai";
import { type CoreMessage, generateText, streamText } from "ai";

import type { Provider, ProviderConfig, ProviderMessage, ProviderResponse } from "./index.js";

function toCoreMessages(messages: ProviderMessage[]): CoreMessage[] {
	return messages.map((message) => ({
		role: message.role,
		content: message.content,
	})) as CoreMessage[];
}

function getApiKey(config: ProviderConfig): string {
	if (!config.apiKey) {
		throw new Error(`API key is required for custom provider`);
	}

	return config.apiKey;
}

function getEndpoint(config: ProviderConfig): string {
	if (!config.endpoint) {
		throw new Error(`Endpoint is required for custom provider`);
	}

	return config.endpoint;
}

export class CustomProvider implements Provider {
	private readonly client;
	private readonly modelName: string;

	constructor(config: ProviderConfig) {
		this.modelName = config.model ?? "gpt-3.5-turbo";
		this.client = createOpenAI({
			apiKey: getApiKey(config),
			baseURL: getEndpoint(config),
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
