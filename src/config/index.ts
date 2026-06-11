/**
 * Anggor Configuration
 *
 * Loads and validates project-level and user-level configuration.
 */
import { z } from "zod";

export const ProviderSchema = z.object({
  name: z.string(),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  model: z.string().optional(),
});

export const ConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "ollama", "custom"]).default("openai"),
  model: z.string().default("gpt-4o"),
  approvalMode: z.enum(["safe", "balanced", "dangerous"]).default("balanced"),
  providers: z.record(ProviderSchema).default({}),
  mcpServers: z.record(z.unknown()).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  // TODO: Load from anggor.config.json, anggor.config.local.json, ~/.anggor/config.json
  return ConfigSchema.parse({});
}

export const config = loadConfig();