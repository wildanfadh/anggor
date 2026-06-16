/**
 * Anthropic Provider
 */

import { createAnthropic } from "@ai-sdk/anthropic";
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
		throw new Error("Anthropic API key is required");
	}

	return config.apiKey;
}

export class AnthropicProvider implements Provider {
	private readonly client;
	private readonly modelName: string;

	constructor(config: ProviderConfig) {
		this.modelName = config.model ?? "claude-3-5-sonnet-latest";
		this.client = createAnthropic({
			apiKey: getApiKey(config),
			baseURL: config.endpoint,
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
