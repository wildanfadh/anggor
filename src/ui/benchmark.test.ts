/**
 * CLI Benchmark Tests
 *
 * Measures startup performance and verifies key output targets.
 * Task #48: CLI output tests and benchmark help/version startup.
 */

import { describe, test, expect } from "bun:test";
import { $ } from "bun";

const BINARY = "dist/anggor";

// ---------------------------------------------------------------------------
// Binary startup benchmarks
// ---------------------------------------------------------------------------

describe("CLI Startup Benchmarks", () => {
  test("anggor --version should complete within 200ms", async () => {
    const start = performance.now();
    const result = await $`${BINARY} --version`.quiet();
    const duration = performance.now() - start;

    expect(result.exitCode).toBe(0);
    expect(result.text().trim()).toMatch(/^\d+\.\d+\.\d+/);
    expect(duration).toBeLessThanOrEqual(200);
  });

  test("anggor --help should complete within 200ms", async () => {
    const start = performance.now();
    const result = await $`${BINARY} --help`.quiet();
    const duration = performance.now() - start;

    expect(result.exitCode).toBe(0);
    expect(result.text()).toContain("Usage:");
    expect(duration).toBeLessThanOrEqual(200);
  });

  test("anggor --help should contain all major commands", async () => {
    const result = await $`${BINARY} --help`.quiet();

    const output = result.text();
    expect(output).toContain("plan");
    expect(output).toContain("commit");
    expect(output).toContain("status");
    expect(output).toContain("review");
    expect(output).toContain("explain");
    expect(output).toContain("resume");
    expect(output).toContain("mcp");
    expect(output).toContain("skill");
    expect(output).toContain("provider");
    expect(output).toContain("cost");
    expect(output).toContain("plugin");
    expect(output).toContain("config");
  });
});

// ---------------------------------------------------------------------------
// Command output format verification
// ---------------------------------------------------------------------------

describe("CLI Output Format", () => {
  test("anggor status should return text", async () => {
    const result = await $`${BINARY} status`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.text().length).toBeGreaterThan(0);
  });

  test("anggor provider list should produce structured output", async () => {
    const result = await $`${BINARY} provider list`.quiet();
    expect(result.exitCode).toBe(0);
    const output = result.text();

    // Should contain provider names in some form
    expect(output).toContain("openai");
    expect(output).toContain("anthropic");
  });

  test("anggor review should produce output", async () => {
    const result = await $`${BINARY} review`.quiet();
    expect(result.exitCode).toBe(0);
    // Should return something (either "no changes" or a table)
    expect(result.text().length).toBeGreaterThan(0);
  });

  test("anggor mcp list should produce output", async () => {
    const result = await $`${BINARY} mcp list`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.text().length).toBeGreaterThan(0);
  });

  test("anggor skill list should produce output", async () => {
    const result = await $`${BINARY} skill list`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.text().length).toBeGreaterThan(0);
  });

  test("anggor plan should produce plan text", async () => {
    const result = await $`${BINARY} plan "test plan"`.quiet();
    expect(result.exitCode).toBe(0);
    const output = result.text();
    expect(output).toContain("PLAN");
    expect(output).toContain("test plan");
  });

  test("anggor --dry-run should produce plan text", async () => {
    const result = await $`${BINARY} --dry-run "refactor test"`.quiet();
    expect(result.exitCode).toBe(0);
    const output = result.text();
    expect(output).toContain("DRY RUN");
    expect(output).toContain("refactor test");
  });

  test("anggor resume should not crash", async () => {
    const result = await $`${BINARY} resume`.quiet();
    expect(result.exitCode).toBe(0);
    expect(result.text().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Bun-first verification
// ---------------------------------------------------------------------------

describe("Bun-First Verification", () => {
  test("package.json scripts should use bun commands", async () => {
    const pkg = await Bun.file("package.json").json();
    const scripts = pkg.scripts ?? {};

    // All script commands should be bun-first
    for (const [name, cmd] of Object.entries(scripts)) {
      if (typeof cmd !== "string") continue;
      // Skip standard lifecycle scripts
      if (name === "postinstall" || name === "preinstall") continue;

      expect(
        cmd,
        `Script "${name}" should use bun, not node. Found: "${cmd}"`
      ).not.toContain("node ");
    }

    expect(scripts.dev).toContain("bun run");
    expect(scripts.test).toContain("bun test");
    expect(scripts.compile).toContain("bun build");
  });

  test("tsconfig.json should target modern ES", async () => {
    const tsconfig = await Bun.file("tsconfig.json").json();
    expect(tsconfig.compilerOptions.target).toMatch(/^ES20/);
    expect(tsconfig.compilerOptions.module).toBe("ESNext");
  });

  test("engines should require bun", async () => {
    const pkg = await Bun.file("package.json").json();
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.bun).toBeDefined();
  });

  test("binary should exist and be executable", async () => {
    const result = await $`test -x ${BINARY} && echo "ok"`.quiet();
    expect(result.text().trim()).toBe("ok");
  });
});
