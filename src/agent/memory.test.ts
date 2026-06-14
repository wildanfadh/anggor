/**
 * Session Memory Tests
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { SessionMemory } from "./memory.js";

describe("SessionMemory", () => {
  let memory: SessionMemory;

  beforeEach(() => {
    memory = new SessionMemory();
  });

  describe("Messages", () => {
    it("should add message", () => {
      const msg = memory.addMessage("user", "Hello");
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("Hello");
      expect(msg.id).toBeDefined();
      expect(msg.timestamp).toBeDefined();
    });

    it("should get messages", () => {
      memory.addMessage("user", "Hello");
      memory.addMessage("assistant", "Hi");

      const messages = memory.getMessages();
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
    });
  });

  describe("Tool Calls", () => {
    it("should add tool call", () => {
      const record = memory.addToolCall("file.read", "input", "output", true, 100);
      expect(record.tool).toBe("file.read");
      expect(record.success).toBe(true);
      expect(record.duration).toBe(100);
    });

    it("should get tool calls", () => {
      memory.addToolCall("file.read", "in", "out", true, 10);
      memory.addToolCall("git.status", "in", "out", true, 20);

      const calls = memory.getToolCalls();
      expect(calls.length).toBe(2);
    });
  });

  describe("Plans", () => {
    it("should add plan", () => {
      const plan = memory.addPlan("Test task", ["Step 1", "Step 2"]);
      expect(plan.task).toBe("Test task");
      expect(plan.steps.length).toBe(2);
      expect(plan.status).toBe("active");
    });

    it("should get active plan", () => {
      memory.addPlan("Test task");
      const active = memory.getActivePlan();
      expect(active).not.toBeNull();
      expect(active?.task).toBe("Test task");
    });

    it("should complete plan", () => {
      const plan = memory.addPlan("Test task");
      memory.completePlan(plan.id);

      const active = memory.getActivePlan();
      expect(active).toBeNull();
    });
  });

  describe("Todos", () => {
    it("should add todo", () => {
      const todo = memory.addTodo("Test todo");
      expect(todo.task).toBe("Test todo");
      expect(todo.status).toBe("pending");
    });

    it("should update todo status", () => {
      const todo = memory.addTodo("Test todo");
      memory.updateTodoStatus(todo.id, "done");

      const todos = memory.getTodos();
      expect(todos[0].status).toBe("done");
    });

    it("should get pending todos", () => {
      memory.addTodo("Todo 1");
      const todo2 = memory.addTodo("Todo 2");
      memory.updateTodoStatus(todo2.id, "done");

      const pending = memory.getPendingTodos();
      expect(pending.length).toBe(1);
      expect(pending[0].task).toBe("Todo 1");
    });

    it("should get in-progress todos", () => {
      const todo1 = memory.addTodo("Todo 1");
      memory.addTodo("Todo 2");
      memory.updateTodoStatus(todo1.id, "in-progress");

      const inProgress = memory.getInProgressTodos();
      expect(inProgress.length).toBe(1);
      expect(inProgress[0].task).toBe("Todo 1");
    });
  });

  describe("Context", () => {
    it("should get context within budget", () => {
      memory.addMessage("system", "You are a coding agent.");
      memory.addMessage("user", "Fix the bug.");
      memory.addMessage("assistant", "I'll fix it.");

      const context = memory.getContext({ maxTokens: 8000 });
      expect(context).toContain("You are a coding agent.");
      expect(context).toContain("Fix the bug.");
    });

    it("should estimate tokens", () => {
      memory.addMessage("user", "Hello world");
      const tokens = memory.getEstimatedTokens();
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe("Session Management", () => {
    it("should get entry count", () => {
      memory.addMessage("user", "Hello");
      memory.addTodo("Todo");
      expect(memory.getEntryCount()).toBe(2);
    });

    it("should clear memory", () => {
      memory.addMessage("user", "Hello");
      memory.addTodo("Todo");
      memory.clear();

      expect(memory.getEntryCount()).toBe(0);
      expect(memory.getMessages().length).toBe(0);
      expect(memory.getTodos().length).toBe(0);
    });
  });
});
