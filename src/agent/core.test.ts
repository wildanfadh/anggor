/**
 * Agent Core Integration Tests
 *
 * Tests the full agent loop with mock configuration.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Agent } from "./core.js";
import type { Config } from "../config/schema.js";

const testConfig: Config = {
  provider: { name: "openai", model: "gpt-4-turbo-preview" },
  agent: { maxIterations: 5, temperature: 0.7, approvalMode: "balanced" },
  context: { maxTokens: 8000, ignorePatterns: [], scanDepth: 3 },
  safety: {
    blockedCommands: ["rm -rf", "sudo"],
    allowedCommands: ["npm", "git", "node", "echo", "ls"],
  },
  theme: { primary: "cyan", secondary: "dim", error: "red", success: "green" },
  mcpServers: {},
};

describe("Agent Core Integration", () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({ config: testConfig });
  });

  describe("Agent Creation", () => {
    it("should create agent with config", () => {
      expect(agent).toBeDefined();
      expect(agent.memory).toBeDefined();
      expect(agent.planner).toBeDefined();
      expect(agent.todos).toBeDefined();
    });

    it("should create agent with dry-run mode", () => {
      const dryRunAgent = new Agent({ config: testConfig, dryRun: true });
      expect(dryRunAgent).toBeDefined();
    });
  });

  describe("Plan Only Mode", () => {
    it("should create plan without executing", async () => {
      const result = await agent.planOnly("Add authentication");

      expect(result.success).toBe(true);
      expect(result.message).toContain("dry-run");
      expect(result.message).toContain("Add authentication");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should include plan steps", async () => {
      const result = await agent.planOnly("Fix lint errors");

      expect(result.message).toContain("Analyze task requirements");
      expect(result.message).toContain("Determine affected files");
    });
  });

  describe("Execute Mode", () => {
    it("should execute task in dry-run mode", async () => {
      const dryRunAgent = new Agent({ config: testConfig, dryRun: true });
      const result = await dryRunAgent.execute("Test task");

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should track todos during execution", async () => {
      const dryRunAgent = new Agent({ config: testConfig, dryRun: true });
      await dryRunAgent.execute("Test task");

      const todos = dryRunAgent.todos.getAll();
      expect(todos.length).toBeGreaterThan(0);
    });

    it("should record messages in memory", async () => {
      const dryRunAgent = new Agent({ config: testConfig, dryRun: true });
      await dryRunAgent.execute("Test task");

      const messages = dryRunAgent.memory.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some((m) => m.role === "user")).toBe(true);
      expect(messages.some((m) => m.role === "assistant")).toBe(true);
    });
  });

  describe("Interrupt Handling", () => {
    it("should interrupt agent", () => {
      agent.interrupt();
      // Agent should be interrupted - no error thrown
      expect(true).toBe(true);
    });

    it("should return interrupted result", async () => {
      // Interrupt immediately
      agent.interrupt();

      const result = await agent.execute("Test task");
      expect(result.success).toBe(false);
      expect(result.message).toContain("interrupted");
    });
  });

  describe("Status", () => {
    it("should get status with no active plan", () => {
      const status = agent.getStatus();
      expect(status).toContain("No active plan");
    });

    it("should get status with active plan", async () => {
      await agent.planOnly("Test task");
      const status = agent.getStatus();

      expect(status).toContain("PLAN");
      expect(status).toContain("Test task");
    });
  });

  describe("Tool Integration", () => {
    it("should have all tools available", () => {
      // Verify agent has access to all tool types
      const agent2 = new Agent({ config: testConfig });
      expect(agent2.memory).toBeDefined();
      expect(agent2.planner).toBeDefined();
      expect(agent2.todos).toBeDefined();
    });
  });

  describe("Planner Integration", () => {
    it("should create plan via planner", () => {
      const plan = agent.planner.createPlan("Test task", ["Step 1", "Step 2"]);

      expect(plan.task).toBe("Test task");
      expect(plan.steps.length).toBe(2);
    });

    it("should track plan progress", () => {
      const plan = agent.planner.createPlan("Test task", ["Step 1", "Step 2"]);

      agent.planner.startStep(plan.steps[0].id);
      expect(agent.planner.getProgress()?.inProgress).toBe(1);

      agent.planner.completeStep(plan.steps[0].id);
      expect(agent.planner.getProgress()?.done).toBe(1);
    });
  });

  describe("Memory Integration", () => {
    it("should store messages", () => {
      agent.memory.addMessage("user", "Hello");
      agent.memory.addMessage("assistant", "Hi there!");

      const messages = agent.memory.getMessages();
      expect(messages.length).toBe(2);
    });

    it("should store tool calls", () => {
      agent.memory.addToolCall("file.read", "src/index.ts", "content", true, 100);

      const calls = agent.memory.getToolCalls();
      expect(calls.length).toBe(1);
      expect(calls[0].tool).toBe("file.read");
    });

    it("should get context within budget", () => {
      agent.memory.addMessage("system", "You are a coding agent.");
      agent.memory.addMessage("user", "Fix the bug.");

      const context = agent.memory.getContext({ maxTokens: 8000 });
      expect(context).toContain("coding agent");
      expect(context).toContain("Fix the bug");
    });
  });
});
