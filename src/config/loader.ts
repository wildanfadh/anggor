import { readFile } from "node:fs/promises";

import type { Config } from "./schema.js";
import {
  ApprovalModeSchema,
  ConfigSchema,
  ProviderNameSchema,
} from "./schema.js";
import { resolveConfigPaths } from "./paths.js";

interface LoadConfigOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

interface RawConfigSources {
  user: Record<string, unknown>;
  project: Record<string, unknown>;
  env: Record<string, unknown>;
}

async function readJsonFile(path: string): Promise<Record<string, unknown>> {
  try {
    const content = await readFile(path, "utf8");
    const parsed = JSON.parse(content) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Config file must contain a JSON object: ${path}`);
    }

    return parsed as Record<string, unknown>;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${path}`);
    }

    throw error;
  }
}

function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = merged[key];
    const bothObjects =
      existing &&
      value &&
      typeof existing === "object" &&
      typeof value === "object" &&
      !Array.isArray(existing) &&
      !Array.isArray(value);

    merged[key] = bothObjects
      ? deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>)
      : value;
  }

  return merged;
}

function envToConfig(env: NodeJS.ProcessEnv): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const provider: Record<string, unknown> = {};
  const agent: Record<string, unknown> = {};
  const context: Record<string, unknown> = {};
  const safety: Record<string, unknown> = {};
  const theme: Record<string, unknown> = {};

  if (env.ANGGOR_PROVIDER) {
    provider.name = ProviderNameSchema.parse(env.ANGGOR_PROVIDER);
  }

  if (env.ANGGOR_MODEL) {
    provider.model = env.ANGGOR_MODEL;
  }

  if (env.ANGGOR_API_KEY) {
    provider.apiKey = env.ANGGOR_API_KEY;
  }

  if (env.ANGGOR_ENDPOINT) {
    provider.endpoint = env.ANGGOR_ENDPOINT;
  }

  if (env.ANGGOR_APPROVAL_MODE) {
    agent.approvalMode = ApprovalModeSchema.parse(env.ANGGOR_APPROVAL_MODE);
  }

  if (env.ANGGOR_MAX_ITERATIONS) {
    agent.maxIterations = Number(env.ANGGOR_MAX_ITERATIONS);
  }

  if (env.ANGGOR_TEMPERATURE) {
    agent.temperature = Number(env.ANGGOR_TEMPERATURE);
  }

  if (env.ANGGOR_MAX_TOKENS) {
    context.maxTokens = Number(env.ANGGOR_MAX_TOKENS);
  }

  if (env.ANGGOR_SCAN_DEPTH) {
    context.scanDepth = Number(env.ANGGOR_SCAN_DEPTH);
  }

  if (env.ANGGOR_IGNORE_PATTERNS) {
    context.ignorePatterns = env.ANGGOR_IGNORE_PATTERNS.split(",")
      .map((pattern) => pattern.trim())
      .filter(Boolean);
  }

  if (env.ANGGOR_BLOCKED_COMMANDS) {
    safety.blockedCommands = env.ANGGOR_BLOCKED_COMMANDS.split(",")
      .map((command) => command.trim())
      .filter(Boolean);
  }

  if (env.ANGGOR_ALLOWED_COMMANDS) {
    safety.allowedCommands = env.ANGGOR_ALLOWED_COMMANDS.split(",")
      .map((command) => command.trim())
      .filter(Boolean);
  }

  if (env.ANGGOR_THEME_PRIMARY) {
    theme.primary = env.ANGGOR_THEME_PRIMARY;
  }

  if (env.ANGGOR_THEME_SECONDARY) {
    theme.secondary = env.ANGGOR_THEME_SECONDARY;
  }

  if (env.ANGGOR_THEME_ERROR) {
    theme.error = env.ANGGOR_THEME_ERROR;
  }

  if (env.ANGGOR_THEME_SUCCESS) {
    theme.success = env.ANGGOR_THEME_SUCCESS;
  }

  if (env.OPENAI_API_KEY && provider.name === "openai") {
    provider.apiKey = env.OPENAI_API_KEY;
  }

  if (env.ANTHROPIC_API_KEY && provider.name === "anthropic") {
    provider.apiKey = env.ANTHROPIC_API_KEY;
  }

  if (env.GOOGLE_API_KEY && provider.name === "google") {
    provider.apiKey = env.GOOGLE_API_KEY;
  }

  if (env.OLLAMA_HOST && provider.name === "ollama") {
    provider.endpoint = env.OLLAMA_HOST;
  }

  if (env.OPENROUTER_API_KEY && provider.name === "openrouter") {
    provider.apiKey = env.OPENROUTER_API_KEY;
  }

  if (env.GROQ_API_KEY && provider.name === "groq") {
    provider.apiKey = env.GROQ_API_KEY;
  }

  if (env.DEEPSEEK_API_KEY && provider.name === "deepseek") {
    provider.apiKey = env.DEEPSEEK_API_KEY;
  }

  if (Object.keys(provider).length > 0) {
    result.provider = provider;
  }

  if (Object.keys(agent).length > 0) {
    result.agent = agent;
  }

  if (Object.keys(context).length > 0) {
    result.context = context;
  }

  if (Object.keys(safety).length > 0) {
    result.safety = safety;
  }

  if (Object.keys(theme).length > 0) {
    result.theme = theme;
  }

  return result;
}

async function loadRawConfigSources(options: LoadConfigOptions): Promise<RawConfigSources> {
  const { cwd = process.cwd(), env = process.env } = options;
  const { projectConfigPath, userConfigPath } = resolveConfigPaths(cwd);

  const [user, project] = await Promise.all([
    readJsonFile(userConfigPath),
    readJsonFile(projectConfigPath),
  ]);

  return {
    user,
    project,
    env: envToConfig(env),
  };
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<Config> {
  const sources = await loadRawConfigSources(options);
  const merged = deepMerge(deepMerge(sources.user, sources.project), sources.env);
  return ConfigSchema.parse(merged);
}

export function loadConfigSyncFromEnvOnly(env: NodeJS.ProcessEnv = process.env): Config {
  return ConfigSchema.parse(envToConfig(env));
}
