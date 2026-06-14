/**
 * Config Loader Tests
 */

import { describe, it, expect } from "bun:test";
import { ConfigSchema, ProviderNameSchema, ApprovalModeSchema } from "./schema.js";
import { resolveConfigPaths } from "./paths.js";

describe("Config Schema", () => {
  it("should parse valid config with defaults", () => {
    const result = ConfigSchema.parse({});
    expect(result.provider.name).toBe("openai");
    expect(result.provider.model).toBe("gpt-4-turbo-preview");
    expect(result.agent.maxIterations).toBe(15);
    expect(result.agent.temperature).toBe(0.7);
    expect(result.agent.approvalMode).toBe("balanced");
    expect(result.context.maxTokens).toBe(8000);
    expect(result.safety.blockedCommands).toContain("rm -rf");
    expect(result.theme.primary).toBe("cyan");
  });

  it("should parse custom provider config", () => {
    const result = ConfigSchema.parse({
      provider: {
        name: "anthropic",
        model: "claude-3-5-sonnet-latest",
        apiKey: "test-key",
      },
    });
    expect(result.provider.name).toBe("anthropic");
    expect(result.provider.model).toBe("claude-3-5-sonnet-latest");
    expect(result.provider.apiKey).toBe("test-key");
  });

  it("should reject invalid provider name", () => {
    expect(() => ProviderNameSchema.parse("invalid")).toThrow();
  });

  it("should reject invalid approval mode", () => {
    expect(() => ApprovalModeSchema.parse("invalid")).toThrow();
  });

  it("should accept valid provider names", () => {
    expect(ProviderNameSchema.parse("openai")).toBe("openai");
    expect(ProviderNameSchema.parse("anthropic")).toBe("anthropic");
    expect(ProviderNameSchema.parse("google")).toBe("google");
    expect(ProviderNameSchema.parse("ollama")).toBe("ollama");
    expect(ProviderNameSchema.parse("openrouter")).toBe("openrouter");
    expect(ProviderNameSchema.parse("groq")).toBe("groq");
    expect(ProviderNameSchema.parse("deepseek")).toBe("deepseek");
    expect(ProviderNameSchema.parse("custom")).toBe("custom");
  });

  it("should accept valid approval modes", () => {
    expect(ApprovalModeSchema.parse("safe")).toBe("safe");
    expect(ApprovalModeSchema.parse("balanced")).toBe("balanced");
    expect(ApprovalModeSchema.parse("auto")).toBe("auto");
  });
});

describe("Config Paths", () => {
  it("should resolve project config path", () => {
    const paths = resolveConfigPaths("/test/project");
    expect(paths.projectConfigPath).toContain(".anggor.json");
    expect(paths.legacyProjectConfigPath).toContain("anggor.config.json");
  });

  it("should resolve user config path", () => {
    const paths = resolveConfigPaths("/test/project");
    expect(paths.userConfigPath).toContain(".anggor");
    expect(paths.userConfigPath).toContain("config.json");
  });
});
