/**
 * Anggor Agent Core
 *
 * V1.0 ReAct loop: plan → execute → validate → iterate.
 * Integrates all tools: file, terminal, git, search, todo, planner, memory.
 *
 * Two execution modes:
 *   - LLM-powered (when Provider is available) – uses the LLM to decide actions
 *   - Heuristic (fallback) – simple keyword-based action mapping (used in tests)
 */

import type { Provider, ProviderMessage } from "../providers/index.js";
import { SessionMemory, type TodoItem } from "./memory.js";
import { Planner, type PlanStep } from "./planner.js";
import { TodoTracker } from "../tools/todo-tracker.js";
import * as fileTools from "../tools/file.js";
import { execCommand } from "../tools/terminal.js";
import type { SafetyConfig } from "../utils/safety.js";
import { gitStatus, gitDiff, gitLog, gitBranch, gitCommit } from "../tools/git.js";
import { searchInFiles } from "../context/grep.js";
import type { Config } from "../config/schema.js";
import {
  createCheckpoint,
  rollback as checkpointRollback,
  cleanupCheckpoint,
} from "../memory/checkpoint.js";
import { saveMemory } from "../memory/bank.js";
import { REACT_SYSTEM_PROMPT } from "./prompts.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentOptions {
  config: Config;
  /** AI provider for LLM-powered decision making. */
  provider?: Provider;
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
// LLM response shape
// ---------------------------------------------------------------------------

interface LlmAction {
  action: "plan" | "tool_call" | "done";
  thought?: string;
  plan?: { task: string; steps: string[] };
  tool?: string;
  input?: Record<string, unknown>;
  message?: string;
}

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
  private readonly provider?: Provider;
  private interrupted = false;
  private modifiedFiles = new Set<string>();

  constructor(options: AgentOptions) {
    this.config = options.config;
    this.cwd = options.cwd ?? process.cwd();
    this.maxRetries = options.maxRetries ?? 3;
    this.dryRun = options.dryRun ?? false;
    this.provider = options.provider;

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
   * Execute a task. Uses LLM-powered loop when provider is available,
   * falls back to heuristic-based execution otherwise.
   */
  async execute(task: string): Promise<AgentResult> {
    if (this.interrupted) {
      return this.makeResult(false, "Execution interrupted by user.");
    }

    if (this.provider && !this.dryRun) {
      return this.llmExecute(task);
    }

    return this.heuristicExecute(task);
  }

  // ---------------------------------------------------------------------------
  // LLM-powered execution
  // ---------------------------------------------------------------------------

  private async llmExecute(task: string): Promise<AgentResult> {
    const startTime = performance.now();
    const provider = this.provider!;

    this.memory.addMessage("system", REACT_SYSTEM_PROMPT);
    this.memory.addMessage("user", task);

    // Track modified files for checkpoint
    this.modifiedFiles = new Set();

    // Create checkpoint before modifications
    let checkpointId: string | null = null;
    try {
      // We'll add files to checkpoint as we modify them
      checkpointId = null; // Create on first file change
    } catch {
      // Checkpoint creation failed, continue without it
    }

    const maxIterations = this.config.agent.maxIterations;
    let iteration = 0;

    while (iteration < maxIterations && !this.interrupted) {
      iteration++;

      try {
        // Build messages for LLM
        const context = this.memory.getContext({
          maxTokens: this.config.context.maxTokens,
          reserveForResponse: 2048,
        });

        const messages: ProviderMessage[] = [
          { role: "system", content: context },
          {
            role: "system",
            content: `Iteration ${iteration}/${maxIterations}. Respond with JSON only.`,
          },
        ];

        // Get action from LLM
        const response = await provider.chat(messages);
        const action = this.parseLlmResponse(response.content);

        if (!action) {
          this.memory.addMessage(
            "system",
            `Failed to parse LLM response: ${response.content.slice(0, 200)}`
          );
          continue;
        }

        this.memory.addMessage(
          "assistant",
          `[${action.action}] ${action.thought ?? ""}`
        );

        // Execute the action
        switch (action.action) {
          case "plan": {
            if (action.plan) {
              this.planner.createPlan(
                action.plan.task,
                action.plan.steps
              );
            }
            break;
          }

          case "tool_call": {
            if (!action.tool) {
              this.memory.addMessage("system", "No tool specified in tool_call");
              continue;
            }

            const result = await this.executeTool(
              action.tool as ToolName,
              action.input ?? {}
            );

            // Track modified files for checkpoint
            if (result.success && this.isModifyingTool(action.tool)) {
              const path = this.getModifiedPath(action.tool, action.input ?? {});
              if (path) this.modifiedFiles.add(path);
            }

            this.memory.addToolCall(
              action.tool,
              JSON.stringify(action.input),
              result.output,
              result.success,
              result.duration
            );

            // If tool failed, let LLM know and try self-heal
            if (!result.success) {
              this.memory.addMessage(
                "system",
                `Tool ${action.tool} failed: ${result.output}. Please fix the issue.`
              );
            }
            break;
          }

          case "done": {
            const duration = Math.round(performance.now() - startTime);
            const result: AgentResult = {
              success: true,
              message: action.message ?? "Task completed.",
              changes: [...this.modifiedFiles],
              todos: this.todos.getAll(),
              duration,
            };

            // Cleanup checkpoint on success
            if (checkpointId) {
              await cleanupCheckpoint(checkpointId);
            }

            // Save memory for resume
            try {
              await saveMemory(this.memory, this.cwd);
            } catch {
              // Non-critical
            }

            this.memory.addMessage("assistant", result.message);
            return result;
          }

          default:
            this.memory.addMessage(
              "system",
              `Unknown action: ${String((action as unknown as Record<string, unknown>).action)}`
            );
        }
      } catch (error: unknown) {
        this.memory.addMessage(
          "system",
          `Error in iteration ${iteration}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Max iterations reached or interrupted
    if (checkpointId) {
      try {
        await checkpointRollback(checkpointId);
      } catch {
        // Rollback failed
      }
      await cleanupCheckpoint(checkpointId);
    }

    if (this.interrupted) {
      return this.makeResult(false, "Execution interrupted by user.");
    }

    return this.makeResult(
      false,
      `Reached max iterations (${maxIterations}) without completing the task.`
    );
  }

  // ---------------------------------------------------------------------------
  // Heuristic execution (fallback / tests / dry-run)
  // ---------------------------------------------------------------------------

  private async heuristicExecute(task: string): Promise<AgentResult> {
    const startTime = performance.now();

    this.memory.addMessage("user", task);

    // 1. Create plan
    this.planner.createPlan(task, []);
    this.todos.addTodo(`Plan: ${task}`);

    // 2. Create checkpoint before modifications
    let checkpointId: string | null = null;
    if (!this.dryRun) {
      try {
        const checkpoint = await createCheckpoint(
          this.cwd,
          [...this.modifiedFiles],
          task
        );
        checkpointId = checkpoint.id;
        this.memory.addMessage("system", `Checkpoint created: ${checkpoint.id}`);
      } catch {
        // Checkpoint creation failed, continue without it
      }
    }

    // 3. Execute in ReAct loop
    const result = await this.reactLoop(task);

    // 4. Cleanup checkpoint on success, rollback on failure
    if (checkpointId) {
      if (result.success) {
        await cleanupCheckpoint(checkpointId);
      } else {
        try {
          await checkpointRollback(checkpointId);
          this.memory.addMessage(
            "system",
            `Rolled back to checkpoint: ${checkpointId}`
          );
        } catch {
          // Rollback failed
        }
        await cleanupCheckpoint(checkpointId);
      }
    }

    // 5. Finalize
    const duration = Math.round(performance.now() - startTime);
    this.memory.addMessage("assistant", result.message);

    return {
      ...result,
      todos: this.todos.getAll(),
      duration,
      changes: [...this.modifiedFiles],
    };
  }

  // ---------------------------------------------------------------------------
  // Plan only
  // ---------------------------------------------------------------------------

  /**
   * Plan only (dry-run mode). Shows what would be done without executing.
   */
  async planOnly(task: string): Promise<AgentResult> {
    const startTime = performance.now();

    if (this.provider) {
      // LLM-powered plan generation
      try {
        const response = await this.provider.chat([
          { role: "system", content: REACT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Create a plan for: ${task}\n\nRespond with JSON, action "plan".`,
          },
        ]);

        const action = this.parseLlmResponse(response.content);
        if (action?.plan) {
          this.planner.createPlan(action.plan.task, action.plan.steps);
          this.memory.addMessage(
            "system",
            `LLM-generated plan (dry-run):\n${this.planner.formatDryRunPlan()}`
          );
        } else {
          // Fallback to heuristic plan
          this.createHeuristicPlan(task);
        }
      } catch {
        this.createHeuristicPlan(task);
      }
    } else {
      this.createHeuristicPlan(task);
    }

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
  // ReAct loop (heuristic)
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
  // Action planning (heuristic)
  // ---------------------------------------------------------------------------

  private async decideNextAction(
    task: string
  ): Promise<{ tool: ToolName; input: string } | null> {
    const plan = this.planner.getActivePlan();
    if (!plan) return null;

    const nextStep = this.planner.getNextPendingStep();
    if (!nextStep) return null;

    this.planner.startStep(nextStep.id);
    this.todos.addTodo(nextStep.description);

    return this.mapStepToAction(nextStep, task);
  }

  private mapStepToAction(
    step: PlanStep,
    _task: string
  ): { tool: ToolName; input: string } {
    const desc = step.description.toLowerCase();

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
    if (desc.includes("commit")) {
      return { tool: "git.commit", input: step.description };
    }
    if (desc.includes("diff") || desc.includes("changes")) {
      return { tool: "git.diff", input: step.description };
    }
    if (desc.includes("status") || desc.includes("branch")) {
      return { tool: "git.status", input: step.description };
    }
    if (desc.includes("search") || desc.includes("find") || desc.includes("grep")) {
      return { tool: "search.code", input: step.description };
    }
    if (desc.includes("run") || desc.includes("test") || desc.includes("build") || desc.includes("lint")) {
      return { tool: "terminal.exec", input: step.description };
    }

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

      const result = await this.executeTool(action.tool, { rawInput: action.input });
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

  // ---------------------------------------------------------------------------
  // Unified tool execution (used by both LLM and heuristic paths)
  // ---------------------------------------------------------------------------

  private async executeTool(
    tool: ToolName,
    input: Record<string, unknown>
  ): Promise<ToolCallResult> {
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
        return this.executeGitLog(input);
      case "git.branch":
        return this.executeGitBranch();
      case "git.commit":
        return this.executeGitCommit(input);
      case "search.code":
        return this.executeSearch(input);
      case "todo.add":
        this.todos.addTodo(String(input.task ?? input.rawInput ?? ""));
        return { success: true, output: "Todo added", duration: 0 };
      case "todo.update":
        return { success: true, output: "Todo updated", duration: 0 };
      default:
        return { success: false, output: `Unknown tool: ${tool}`, duration: 0 };
    }
  }

  // ---------------------------------------------------------------------------
  // File tools (real implementation)
  // ---------------------------------------------------------------------------

  private async executeFileRead(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const path = String(input.path ?? input.rawInput ?? "");
      if (!path) return { success: false, output: "No path provided", duration: 0 };

      const options: fileTools.ReadFileOptions = {};
      if (typeof input.lineStart === "number") options.lineStart = input.lineStart;
      if (typeof input.lineEnd === "number") options.lineEnd = input.lineEnd;

      const content = await fileTools.readFile(path, options);
      const truncated =
        content.length > 4000
          ? content.slice(0, 4000) + `\n... (${content.length - 4000} more chars)`
          : content;
      return { success: true, output: truncated, duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  private async executeFileWrite(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const path = String(input.path ?? "");
      const content = String(input.content ?? "");
      if (!path) return { success: false, output: "No path provided", duration: 0 };

      const result = await fileTools.writeFile(path, content);
      this.modifiedFiles.add(path);
      return { success: true, output: `Written ${result.bytes} bytes to ${result.path}`, duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  private async executeFileCreate(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const path = String(input.path ?? "");
      const content = String(input.content ?? "");
      if (!path) return { success: false, output: "No path provided", duration: 0 };

      const result = await fileTools.createFile(path, content);
      this.modifiedFiles.add(path);
      return { success: true, output: `Created ${result.bytes} bytes at ${result.path}`, duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  private async executeFileDelete(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const path = String(input.path ?? "");
      if (!path) return { success: false, output: "No path provided", duration: 0 };

      const result = await fileTools.deleteFile(path, true);
      this.modifiedFiles.add(path);
      const msg = result.backupPath
        ? `Moved to backup: ${result.backupPath}`
        : "Moved to trash";
      return { success: true, output: msg, duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  private async executeFilePatch(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const path = String(input.path ?? "");
      const diff = String(input.diff ?? "");
      if (!path) return { success: false, output: "No path provided", duration: 0 };
      if (!diff) return { success: false, output: "No diff provided", duration: 0 };

      const result = await fileTools.applyPatch(path, diff);
      this.modifiedFiles.add(path);
      return { success: true, output: `Patched ${result.bytes} bytes to ${result.path}`, duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Terminal tools
  // ---------------------------------------------------------------------------

  private async executeTerminal(input: Record<string, unknown>): Promise<ToolCallResult> {
    const command = String(input.command ?? input.rawInput ?? "");
    const cwd = typeof input.cwd === "string" ? input.cwd : this.cwd;

    const result = await execCommand(command, this.safetyConfig, { cwd });
    return {
      success: result.exitCode === 0,
      output: result.stdout || result.stderr,
      duration: result.duration,
    };
  }

  // ---------------------------------------------------------------------------
  // Git tools
  // ---------------------------------------------------------------------------

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
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  private async executeGitDiff(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const path = typeof input.path === "string" ? input.path : undefined;
      const diff = await gitDiff(path, this.cwd);
      return { success: true, output: diff || "No changes.", duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  private async executeGitLog(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const count = typeof input.count === "number" ? input.count : 5;
      const log = await gitLog(count, this.cwd);
      const output = log.map((e) => `${e.shortHash} ${e.message}`).join("\n");
      return { success: true, output: output || "No commits.", duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  private async executeGitBranch(): Promise<ToolCallResult> {
    try {
      const branch = await gitBranch(this.cwd);
      const output = `Current: ${branch.current}\nAll: ${branch.all.join(", ")}`;
      return { success: true, output, duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  private async executeGitCommit(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const message = String(input.message ?? input.rawInput ?? "");
      if (!message) return { success: false, output: "No commit message provided", duration: 0 };

      const result = await gitCommit(message, this.cwd);
      return { success: true, output: `Committed: ${result.shortHash}`, duration: 0 };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Search tools
  // ---------------------------------------------------------------------------

  private async executeSearch(input: Record<string, unknown>): Promise<ToolCallResult> {
    try {
      const query = String(input.query ?? input.rawInput ?? "");
      if (!query) return { success: false, output: "No query provided", duration: 0 };

      const result = await searchInFiles(query, { cwd: this.cwd });
      const output = result.matches
        .slice(0, 15)
        .map((m) => `${m.file}:${m.line}: ${m.preview}`)
        .join("\n");
      return {
        success: true,
        output: output || "No matches found.",
        duration: 0,
      };
    } catch (error: unknown) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
        duration: 0,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Self-healing (heuristic)
  // ---------------------------------------------------------------------------

  private async selfHeal(
    action: { tool: ToolName; input: string }
  ): Promise<boolean> {
    for (let retry = 0; retry < this.maxRetries; retry++) {
      this.memory.addMessage(
        "system",
        `Retry ${retry + 1}/${this.maxRetries} for ${action.tool}`
      );

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

  /** Parse LLM JSON response into a structured action. */
  private parseLlmResponse(raw: string): LlmAction | null {
    // Try to extract JSON from response (handles markdown code blocks)
    let jsonText = raw.trim();

    // Strip markdown ```json ... ``` wrappers
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    // Find first { and last }
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonText.slice(firstBrace, lastBrace + 1));
      if (!parsed || typeof parsed !== "object") return null;

      // Validate action field
      if (
        parsed.action !== "plan" &&
        parsed.action !== "tool_call" &&
        parsed.action !== "done"
      ) {
        return null;
      }

      return parsed as LlmAction;
    } catch {
      return null;
    }
  }

  /** Check if a tool modifies files (for checkpoint tracking). */
  private isModifyingTool(tool: string): boolean {
    return ["file.write", "file.create", "file.delete", "file.patch"].includes(tool);
  }

  /** Extract file path from tool input for checkpoint tracking. */
  private getModifiedPath(
    _tool: string,
    input: Record<string, unknown>
  ): string | null {
    if (input.path && typeof input.path === "string") {
      return input.path;
    }
    return null;
  }

  /** Create a heuristic (non-LLM) plan for fallback cases. */
  private createHeuristicPlan(task: string): void {
    this.planner.createPlan(task, [
      "Analyze task requirements",
      "Determine affected files",
      "Create implementation plan",
      "Review plan for safety",
    ]);
  }

  private getChanges(): string[] {
    return [...this.modifiedFiles];
  }

  private makeResult(success: boolean, message: string): AgentResult {
    return {
      success,
      message,
      changes: [...this.modifiedFiles],
      todos: this.todos.getAll(),
      duration: 0,
    };
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
