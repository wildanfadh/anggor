import { z } from "zod";

export const ProviderNameSchema = z.enum([
	"openai",
	"anthropic",
	"google",
	"ollama",
	"openrouter",
	"groq",
	"deepseek",
	"azure",
	"opencode",
	"commandcode",
	"mimo",
	"mimosgp",
	"custom",
]);

export const ApprovalModeSchema = z.enum(["safe", "balanced", "auto"]);

export const ProviderSchema = z.object({
	name: ProviderNameSchema.default("openai"),
	model: z.string().default("gpt-4-turbo-preview"),
	apiKey: z.string().optional(),
	endpoint: z.string().optional(),
});

export const AgentConfigSchema = z.object({
	maxIterations: z.number().int().positive().default(15),
	temperature: z.number().min(0).max(2).default(0.7),
	approvalMode: ApprovalModeSchema.default("balanced"),
});

export const ContextConfigSchema = z.object({
	maxTokens: z.number().int().positive().default(8000),
	ignorePatterns: z.array(z.string()).default(["node_modules", "dist", ".git", "*.log"]),
	scanDepth: z.number().int().positive().default(3),
});

export const SafetyConfigSchema = z.object({
	blockedCommands: z.array(z.string()).default(["rm -rf", "sudo", "drop database", "mkfs"]),
	allowedCommands: z.array(z.string()).default(["npm", "yarn", "bun", "go", "python", "node", "git"]),
});

export const ThemeConfigSchema = z.object({
	primary: z.string().default("cyan"),
	secondary: z.string().default("dim"),
	error: z.string().default("red"),
	success: z.string().default("green"),
});

export const ConfigSchema = z.object({
	provider: ProviderSchema.default({
		name: "openai",
		model: "gpt-4-turbo-preview",
	}),
	agent: AgentConfigSchema.default({}),
	context: ContextConfigSchema.default({}),
	safety: SafetyConfigSchema.default({}),
	theme: ThemeConfigSchema.default({}),
	routing: z
		.object({
			planner: ProviderNameSchema.optional(),
			coder: ProviderNameSchema.optional(),
			reviewer: ProviderNameSchema.optional(),
		})
		.optional(),
	telemetry: z
		.object({
			enabled: z.boolean().default(false),
		})
		.default({}),
	mcpServers: z.record(z.unknown()).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderSchema>;
export type ApprovalMode = z.infer<typeof ApprovalModeSchema>;
export type ProviderName = z.infer<typeof ProviderNameSchema>;
