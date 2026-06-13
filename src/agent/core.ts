/**
 * Anggor Agent Core
 *
 * V1.0 ReAct loop: plan → execute → validate → iterate.
 * Integrates all tools: file, terminal, git, search, todo, planner, memory.
 */

import { SessionMemory, type TodoItem } from "./memory.js";
import { Planner, type PlanStep } from "./planner.js";
import { TodoTracker } from "../tools/todo-tracker.js";
import * as fileTools from "../tools/file.js";
import { execCommand } from "../tools/terminal.js";
import type { SafetyConfig } from "../utils/safety.js";
import { gitStatus, gitDiff, gitLog, gitBranch, gitCommit } from "../tools/git.js";
import { searchInFiles } from "../context/grep.js";
import type { Config } from "../config/schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentOptions {
  config: Config;
  cwd?: string;
  maxRetries?: number;
  dryRun?: boolean;
}

export interface AgentResult {
  success: boolean;
  message: string;
  changes?: string[];
  todos?: TodoItem[];
  duration: number;
}

export interface ToolCallResult {
  success: boolean;
  output: string;
  duration: number;
}

export type ToolName =
  | "file.read"
  | "file.write"
  | "file.create"
  | "file.delete"
  | "file.patch"
  | "terminal.exec"
  | "git.status"
  | "git.diff"
  | "git.log"
  | "git.branch"
  | "git.commit"
  | "search.code"
  | "todo.add"
  | "todo.update";

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export class Agent {
  readonly memory: SessionMemory;
  readonly planner: Planner;
  readonly todos: TodoTracker;

  private readonly config: Config;
  private readonly cwd: string;
  private readonly maxRetries: number;
  private readonly dryRun: boolean;
  private readonly safetyConfig: SafetyConfig;
  private interrupted = false;

  constructor(options: AgentOptions) {
    this.config = options.config;
    this.cwd = options.cwd ?? process.cwd();
    this.maxRetries = options.maxRetries ?? 3;
    this.dryRun = options.dryRun ?? false;

    this.memory = new SessionMemory();
    this.planner = new Planner(this.memory);
    this.todos = new TodoTracker(this.memory);

    this.safetyConfig = {
      blockedCommands: this.config.safety.blockedCommands,
      allowedCommands: this.config.safety.allowedCommands,
    };
  }

  // ---------------------------------------------------------------------------
  // Main execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a task. This is the main entry point for the agent.
   */
  async execute(task: string): Promise<AgentResult> {
    const startTime = performance.now();

    this.memory.addMessage("user", task);

    // 1. Create plan
    this.planner.createPlan(task, []);
    this.todos.addTodo(`Plan: ${task}`);

    // 2. Execute in ReAct loop
    const result = await this.reactLoop(task);

    // 3. Finalize
    const duration = Math.round(performance.now() - startTime);
    this.memory.addMessage("assistant", result.message);

    return {
      ...result,
      todos: this.todos.getAll(),
      duration,
    };
  }

  /**
   * Plan only (dry-run mode). Shows what would be done without executing.
   */
  async planOnly(task: string): Promise<AgentResult> {
    const startTime = performance.now();

    // Create plan
    this.planner.createPlan(task, [
      "Analyze task requirements",
      "Determine affected files",
      "Create implementation plan",
      "Review plan for safety",
    ]);

    const planText = this.planner.formatDryRunPlan();
    this.memory.addMessage("system", `Plan created (dry-run):\n${planText}`);

    const duration = Math.round(performance.now() - startTime);

    return {
      success: true,
      message: planText,
      todos: this.todos.getAll(),
      duration,
    };
  }

  // ---------------------------------------------------------------------------
  // ReAct loop
  // ---------------------------------------------------------------------------

  private async reactLoop(task: string): Promise<AgentResult> {
    const maxIterations = this.config.agent.maxIterations;
    let iter = 0;

    while (iter < maxIterations && !this.interrupted) {
      iter++;

      // 1. Reason: decide what to do next
      const action = await this.decideNextAction(task);
      if (!action) {
        break; // No more actions needed
      }

      // 2. Act: execute the action
      const result = await this.executeAction(action);

      // 3. Observe: record result
      this.memory.addToolCall(
        action.tool,
        action.input,
        result.output,
        result.success,
        result.duration
      );

      // 4. Decide: continue or stop?
      if (!result.success) {
        // Self-heal: retry with backoff
        const retried = await this.selfHeal(action);
        if (!retried) {
          return {
            success: false,
            message: `Failed after ${this.maxRetries} retries: ${result.output}`,
            changes: this.getChanges(),
            todos: this.todos.getAll(),
            duration: 0,
          };
        }
      }

      // Update todo status
      const currentTodos = this.todos.getInProgress();
      for (const todo of currentTodos) {
        this.todos.complete(todo.id);
      }
    }

    if (this.interrupted) {
      return {
        success: false,
        message: "Execution interrupted by user.",
        changes: this.getChanges(),
        todos: this.todos.getAll(),
        duration: 0,
      };
    }

    return {
      success: true,
      message: `Task completed in ${iter} iterations.`,
      changes: this.getChanges(),
      todos: this.todos.getAll(),
      duration: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Action planning
  // ---------------------------------------------------------------------------

  private async decideNextAction(
    task: string
  ): Promise<{ tool: ToolName; input: string } | null> {
    // Get current plan
    const plan = this.planner.getActivePlan();
    if (!plan) return null;

    // Get next pending step
    const nextStep = this.planner.getNextPendingStep();
    if (!nextStep) return null;

    // Mark step as in-progress
    this.planner.startStep(nextStep.id);
    this.todos.addTodo(nextStep.description);

    // Determine tool based on step description
    return this.mapStepToAction(nextStep, task);
  }

  private mapStepToAction(
    step: PlanStep,
    _task: string
  ): { tool: ToolName; input: string } {
    const desc = step.description.toLowerCase();

    // File operations
    if (desc.includes("read") || desc.includes("analyze") || desc.includes("check")) {
      return { tool: "file.read", input: step.description };
    }
    if (desc.includes("write") || desc.includes("create") || desc.includes("implement")) {
      return { tool: "file.write", input: step.description };
    }
    if (desc.includes("patch") || desc.includes("fix") || desc.includes("update")) {
      return { tool: "file.patch", input: step.description };
    }
    if (desc.includes("delete") || desc.includes("remove")) {
      return { tool: "file.delete", input: step.description };
    }

    // Git operations
    if (desc.includes("commit")) {
      return { tool: "git.commit", input: step.description };
    }
    if (desc.includes("diff") || desc.includes("changes")) {
      return { tool: "git.diff", input: step.description };
    }
    if (desc.includes("status") || desc.includes("branch")) {
      return { tool: "git.status", input: step.description };
    }

    // Search
    if (desc.includes("search") || desc.includes("find") || desc.includes("grep")) {
      return { tool: "search.code", input: step.description };
    }

    // Terminal/exec
    if (desc.includes("run") || desc.includes("test") || desc.includes("build") || desc.includes("lint")) {
      return { tool: "terminal.exec", input: step.description };
    }

    // Default: treat as file write
    return { tool: "file.write", input: step.description };
  }

  // ---------------------------------------------------------------------------
  // Action execution
  // ---------------------------------------------------------------------------

  private async executeAction(
    action: { tool: ToolName; input: string }
  ): Promise<ToolCallResult> {
    const startTime = performance.now();

    try {
      if (this.dryRun) {
        return {
          success: true,
          output: `[dry-run] Would execute: ${action.tool}(${action.input})`,
          duration: Math.round(performance.now() - startTime),
        };
      }

      const result = await this.executeTool(action.tool, action.input);
      return {
        success: result.success,
        output: result.output,
        duration: Math.round(performance.now() - startTime),
      };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: Math.round(performance.now() - startTime),
      };
    }
  }

  private async executeTool(tool: ToolName, input: string): Promise<ToolCallResult> {
    switch (tool) {
      case "file.read":
        return this.executeFileRead(input);
      case "file.write":
        return this.executeFileWrite(input);
      case "file.create":
        return this.executeFileCreate(input);
      case "file.delete":
        return this.executeFileDelete(input);
      case "file.patch":
        return this.executeFilePatch(input);
      case "terminal.exec":
        return this.executeTerminal(input);
      case "git.status":
        return this.executeGitStatus();
      case "git.diff":
        return this.executeGitDiff(input);
      case "git.log":
        return this.executeGitLog();
      case "git.branch":
        return this.executeGitBranch();
      case "git.commit":
        return this.executeGitCommit(input);
      case "search.code":
        return this.executeSearch(input);
      case "todo.add":
        this.todos.addTodo(input);
        return { success: true, output: `Todo added: ${input}`, duration: 0 };
      case "todo.update":
        return { success: true, output: "Todo updated", duration: 0 };
      default:
        return { success: false, output: `Unknown tool: ${tool}`, duration: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // Tool implementations
  // ---------------------------------------------------------------------------

  private async executeFileRead(input: string): Promise<ToolCallResult> {
    try {
      const content = await fileTools.readFile(input);
      return { success: true, output: content, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeFileWrite(input: string): Promise<ToolCallResult> {
    try {
      // For now, just acknowledge - actual content would come from LLM
      return { success: true, output: `Would write to: ${input}`, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeFileCreate(input: string): Promise<ToolCallResult> {
    try {
      return { success: true, output: `Would create: ${input}`, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeFileDelete(input: string): Promise<ToolCallResult> {
    try {
      return { success: true, output: `Would delete: ${input}`, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeFilePatch(input: string): Promise<ToolCallResult> {
    try {
      return { success: true, output: `Would patch: ${input}`, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeTerminal(input: string): Promise<ToolCallResult> {
    const result = await execCommand(input, this.safetyConfig, { cwd: this.cwd });
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      duration: result.duration,
    };
  }

  private async executeGitStatus(): Promise<ToolCallResult> {
    try {
      const status = await gitStatus(this.cwd);
      const output = [
        `Branch: ${status.branch}`,
        `Files: ${status.files.length}`,
        ...status.files.map((f) => `  ${f.index}${f.worktree} ${f.path}`),
      ].join("\n");
      return { success: true, output, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeGitDiff(input: string): Promise<ToolCallResult> {
    try {
      const diff = await gitDiff(input || undefined, this.cwd);
      return { success: true, output: diff, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeGitLog(): Promise<ToolCallResult> {
    try {
      const log = await gitLog(5, this.cwd);
      const output = log.map((e) => `${e.shortHash} ${e.message}`).join("\n");
      return { success: true, output, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeGitBranch(): Promise<ToolCallResult> {
    try {
      const branch = await gitBranch(this.cwd);
      return { success: true, output: `Current: ${branch.current}\nAll: ${branch.all.join(", ")}`, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeGitCommit(input: string): Promise<ToolCallResult> {
    try {
      const result = await gitCommit(input, this.cwd);
      return { success: true, output: `Committed: ${result.shortHash}`, duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  private async executeSearch(input: string): Promise<ToolCallResult> {
    try {
      const result = await searchInFiles(input, { cwd: this.cwd });
      const output = result.matches
        .slice(0, 10)
        .map((m) => `${m.file}:${m.line}: ${m.preview}`)
        .join("\n");
      return { success: true, output: output || "No matches found.", duration: 0 };
    } catch (error: unknown) {
      return { success: false, output: error instanceof Error ? error.message : String(error), duration: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // Self-healing
  // ---------------------------------------------------------------------------

  private async selfHeal(
    action: { tool: ToolName; input: string }
  ): Promise<boolean> {
    for (let retry = 0; retry < this.maxRetries; retry++) {
      this.memory.addMessage("system", `Retry ${retry + 1}/${this.maxRetries} for ${action.tool}`);

      // Wait a bit before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * (retry + 1)));

      const result = await this.executeAction(action);
      if (result.success) {
        return true;
      }
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getChanges(): string[] {
    const toolCalls = this.memory.getToolCalls();
    return toolCalls
      .filter((tc) => tc.success)
      .map((tc) => tc.tool)
      .filter((tool, index, self) => self.indexOf(tool) === index);
  }

  /**
   * Interrupt the agent (e.g., on Ctrl+C).
   */
  interrupt(): void {
    this.interrupted = true;
  }

  /**
   * Get current status for `anggor status`.
   */
  getStatus(): string {
    const plan = this.planner.getActivePlan();
    const todos = this.todos.formatTodos();
    const progress = this.planner.getProgress();

    const parts: string[] = [];

    if (plan) {
      parts.push(this.planner.formatPlan());
    }

    if (todos !== "No todos.") {
      parts.push(todos);
    }

    if (progress) {
      parts.push(`\nProgress: ${progress.done}/${progress.total} steps done`);
    }

    return parts.join("\n\n") || "No active plan or todos.";
  }
}
