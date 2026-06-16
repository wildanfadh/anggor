/**
 * Provider Index
 *
 * Exports all available AI providers.
 */

import type { ProviderConfig as AppProviderConfig } from "../config/index.js";
import { AnthropicProvider } from "./anthropic.js";
import { CustomProvider } from "./custom.js";
import { GoogleProvider } from "./google.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAIProvider } from "./openai.js";

export { AnthropicProvider } from "./anthropic.js";
export { CustomProvider } from "./custom.js";
export { GoogleProvider } from "./google.js";
export { OllamaProvider } from "./ollama.js";
export { OpenAIProvider } from "./openai.js";

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

export interface ProviderMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface Provider {
	chat(messages: ProviderMessage[]): Promise<ProviderResponse>;
	stream(messages: ProviderMessage[]): AsyncGenerator<string>;
}

function toRuntimeProviderConfig(config: AppProviderConfig): ProviderConfig {
	return {
		name: config.name,
		apiKey: config.apiKey,
		endpoint: config.endpoint,
		model: config.model,
	};
}

/**
 * Default endpoints for OpenAI-compatible providers.
 */
const DEFAULT_ENDPOINTS: Record<string, string> = {
	openrouter: "https://openrouter.ai/api/v1",
	groq: "https://api.groq.com/openai/v1",
	deepseek: "https://api.deepseek.com/v1",
	ollama: "http://localhost:11434/v1",
	google: "https://generativelanguage.googleapis.com/v1beta/openai",
	azure: "", // Azure requires custom endpoint
	opencode: "https://api.opencode.ai/v1",
	commandcode: "https://api.commandcode.dev/v1",
	mimo: "https://api.mimo.ai/v1",
	mimosgp: "https://token-plan-sgp.xiaomimimo.com/v1",
};

/**
 * Default models for providers.
 */
const DEFAULT_MODELS: Record<string, string> = {
	openai: "gpt-4o",
	anthropic: "claude-3-5-sonnet-latest",
	google: "gemini-1.5-flash",
	ollama: "llama3",
	openrouter: "openai/gpt-4o",
	groq: "llama3-70b-8192",
	deepseek: "deepseek-chat",
	azure: "gpt-4o",
	opencode: "opencode-v1",
	commandcode: "commandcode-v1",
	mimo: "mimo-v1",
	mimosgp: "mimosgp-v1",
	custom: "gpt-3.5-turbo",
};

export function createProvider(config: AppProviderConfig): Provider {
	const runtimeConfig = toRuntimeProviderConfig(config);

	// Set default endpoint if not provided
	if (!runtimeConfig.endpoint && DEFAULT_ENDPOINTS[config.name]) {
		runtimeConfig.endpoint = DEFAULT_ENDPOINTS[config.name];
	}

	// Set default model if not provided
	if (!runtimeConfig.model) {
		runtimeConfig.model = DEFAULT_MODELS[config.name] ?? "gpt-3.5-turbo";
	}

	switch (config.name) {
		case "openai":
			return new OpenAIProvider(runtimeConfig);

		case "anthropic":
			return new AnthropicProvider(runtimeConfig);

		case "google":
			return new GoogleProvider(runtimeConfig);

		case "ollama":
			return new OllamaProvider(runtimeConfig);

		case "openrouter":
		case "groq":
		case "deepseek":
		case "azure":
		case "opencode":
		case "commandcode":
		case "mimo":
		case "mimosgp":
		case "custom":
			return new CustomProvider(runtimeConfig);

		default:
			throw new Error(`Unsupported provider: ${runtimeConfig.name}`);
	}
}
