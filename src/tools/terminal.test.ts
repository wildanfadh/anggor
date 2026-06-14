/**
 * Terminal/Shell Tools Tests
 */

import { describe, it, expect } from "bun:test";
import { execCommand } from "./terminal.js";
import { checkCommandSafety, buildSafeEnv } from "../utils/safety.js";
import type { SafetyConfig } from "../utils/safety.js";

const safetyConfig: SafetyConfig = {
  blockedCommands: ["rm -rf", "sudo", "drop database", "mkfs"],
  allowedCommands: ["npm", "git", "node", "echo", "ls", "cat", "sleep"],
};

describe("Terminal Tools", () => {
  describe("execCommand", () => {
    it("should execute allowed command", async () => {
      const result = await execCommand("echo hello", safetyConfig);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("hello");
      expect(result.timedOut).toBe(false);
    });

    it("should block disallowed command", async () => {
      const result = await execCommand("docker ps", safetyConfig);
      expect(result.exitCode).toBe(-1);
      expect(result.stderr).toContain("not in allowlist");
    });

    it("should block dangerous command", async () => {
      const result = await execCommand("sudo ls", safetyConfig);
      expect(result.exitCode).toBe(-1);
      expect(result.stderr).toContain("dangerous pattern");
    });

    it("should handle timeout", async () => {
      const result = await execCommand("sleep 10", safetyConfig, { timeout: 100 });
      expect(result.timedOut).toBe(true);
    });

    it("should skip safety check when unsafe", async () => {
      const result = await execCommand("echo unsafe", safetyConfig, { unsafe: true });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("unsafe");
    });

    it("should measure duration", async () => {
      const result = await execCommand("echo test", safetyConfig);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Safety Utils", () => {
  describe("checkCommandSafety", () => {
    it("should allow safe command", () => {
      const result = checkCommandSafety("npm test", safetyConfig);
      expect(result.allowed).toBe(true);
    });

    it("should block dangerous command", () => {
      const result = checkCommandSafety("rm -rf /", safetyConfig);
      expect(result.allowed).toBe(false);
    });

    it("should block sudo", () => {
      const result = checkCommandSafety("sudo ls", safetyConfig);
      expect(result.allowed).toBe(false);
    });

    it("should block command not in allowlist", () => {
      const result = checkCommandSafety("docker ps", safetyConfig);
      expect(result.allowed).toBe(false);
    });

    it("should allow command in allowlist", () => {
      const result = checkCommandSafety("git status", safetyConfig);
      expect(result.allowed).toBe(true);
    });
  });

  describe("buildSafeEnv", () => {
    it("should keep safe env vars", () => {
      const env = buildSafeEnv({ PATH: "/usr/bin", HOME: "/home/user" });
      expect(env.PATH).toBe("/usr/bin");
      expect(env.HOME).toBe("/home/user");
    });

    it("should strip sensitive env vars", () => {
      const env = buildSafeEnv({
        PATH: "/usr/bin",
        API_KEY: "secret",
        OPENAI_API_KEY: "secret",
        TOKEN: "secret",
      });
      expect(env.PATH).toBe("/usr/bin");
      expect(env.API_KEY).toBeUndefined();
      expect(env.OPENAI_API_KEY).toBeUndefined();
      expect(env.TOKEN).toBeUndefined();
    });
  });
});
