/**
 * Agent Planner
 *
 * V1.0 planning module: create execution plans, track step progress,
 * support plan-only mode (plan without execution).
 */

import type { SessionMemory } from "./memory.js";

export interface PlanStep {
  id: number;
  description: string;
  tool?: string;
  status: "pending" | "in-progress" | "done" | "failed";
}

export interface Plan {
  id: string;
  task: string;
  steps: PlanStep[];
  status: "active" | "completed" | "abandoned";
  createdAt: number;
  updatedAt: number;
}

export interface CreatePlanOptions {
  /** If true, only show the plan without executing. */
  dryRun?: boolean;
  /** Affected files (for display). */
  affectedFiles?: string[];
}

export interface PlanDisplayOptions {
  /** Show affected files. */
  showAffectedFiles?: boolean;
  /** Show step status icons. */
  showStatus?: boolean;
  /** Show tool names. */
  showTools?: boolean;
}

// Simple counter for unique plan IDs
let planIdCounter = 0;
function nextPlanId(): string {
  return `plan-${Date.now()}-${++planIdCounter}`;
}

// Simple counter for step IDs
let stepIdCounter = 0;
function nextStepId(): number {
  return ++stepIdCounter;
}

export class Planner {
  private readonly plans: Map<string, Plan> = new Map();
  private activePlanId: string | null = null;

  constructor(private readonly memory?: SessionMemory) {}

  // ---------------------------------------------------------------------------
  // Plan creation
  // ---------------------------------------------------------------------------

  /**
   * Create a new plan for the given task.
   * Steps can be provided upfront or added later.
   */
  createPlan(task: string, steps: string[] = []): Plan {
    // Mark previous active plan as abandoned
    if (this.activePlanId) {
      const prev = this.plans.get(this.activePlanId);
      if (prev) prev.status = "abandoned";
    }

    const plan: Plan = {
      id: nextPlanId(),
      task,
      steps: steps.map((desc) => ({
        id: nextStepId(),
        description: desc,
        status: "pending",
      })),
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.plans.set(plan.id, plan);
    this.activePlanId = plan.id;

    // Store in session memory if available
    if (this.memory) {
      this.memory.addPlan(task, steps);
    }

    return plan;
  }

  // ---------------------------------------------------------------------------
  // Step management
  // ---------------------------------------------------------------------------

  /**
   * Add a step to the active plan.
   */
  addStep(description: string, tool?: string): PlanStep | null {
    const plan = this.getActivePlan();
    if (!plan) return null;

    const step: PlanStep = {
      id: nextStepId(),
      description,
      tool,
      status: "pending",
    };

    plan.steps.push(step);
    plan.updatedAt = Date.now();
    return step;
  }

  /**
   * Update the status of a step.
   */
  updateStepStatus(stepId: number, status: PlanStep["status"]): boolean {
    const plan = this.getActivePlan();
    if (!plan) return false;

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) return false;

    step.status = status;
    plan.updatedAt = Date.now();
    return true;
  }

  /**
   * Mark a step as in-progress.
   */
  startStep(stepId: number): boolean {
    return this.updateStepStatus(stepId, "in-progress");
  }

  /**
   * Mark a step as done.
   */
  completeStep(stepId: number): boolean {
    return this.updateStepStatus(stepId, "done");
  }

  /**
   * Mark a step as failed.
   */
  failStep(stepId: number): boolean {
    return this.updateStepStatus(stepId, "failed");
  }

  // ---------------------------------------------------------------------------
  // Plan status
  // ---------------------------------------------------------------------------

  getActivePlan(): Plan | null {
    if (!this.activePlanId) return null;
    return this.plans.get(this.activePlanId) ?? null;
  }

  getPlan(planId: string): Plan | null {
    return this.plans.get(planId) ?? null;
  }

  getAllPlans(): Plan[] {
    return [...this.plans.values()];
  }

  /**
   * Check if all steps in the active plan are done.
   */
  isPlanComplete(): boolean {
    const plan = this.getActivePlan();
    if (!plan) return false;
    return plan.steps.length > 0 && plan.steps.every((s) => s.status === "done");
  }

  /**
   * Get the next pending step in the active plan.
   */
  getNextPendingStep(): PlanStep | null {
    const plan = this.getActivePlan();
    if (!plan) return null;
    return plan.steps.find((s) => s.status === "pending") ?? null;
  }

  /**
   * Get progress summary.
   */
  getProgress(): { total: number; done: number; failed: number; pending: number; inProgress: number } | null {
    const plan = this.getActivePlan();
    if (!plan) return null;

    return {
      total: plan.steps.length,
      done: plan.steps.filter((s) => s.status === "done").length,
      failed: plan.steps.filter((s) => s.status === "failed").length,
      pending: plan.steps.filter((s) => s.status === "pending").length,
      inProgress: plan.steps.filter((s) => s.status === "in-progress").length,
    };
  }

  /**
   * Complete the active plan.
   */
  completePlan(): boolean {
    const plan = this.getActivePlan();
    if (!plan) return false;

    plan.status = "completed";
    plan.updatedAt = Date.now();

    if (this.memory) {
      this.memory.completePlan(plan.id);
    }

    this.activePlanId = null;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Display
  // ---------------------------------------------------------------------------

  /**
   * Format the active plan for terminal display.
   */
  formatPlan(options: PlanDisplayOptions = {}): string {
    const plan = this.getActivePlan();
    if (!plan) return "No active plan.";

    const { showStatus = true, showTools = true } = options;
    const lines: string[] = [];

    lines.push(`PLAN: ${plan.task}`);
    lines.push("");

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const num = `${i + 1}.`;
      const status = showStatus ? this.formatStepStatus(step.status) : "";
      const tool = showTools && step.tool ? ` [${step.tool}]` : "";
      lines.push(`${status} ${num} ${step.description}${tool}`);
    }

    const progress = this.getProgress();
    if (progress) {
      lines.push("");
      lines.push(`Progress: ${progress.done}/${progress.total} done`);
      if (progress.failed > 0) lines.push(`Failed: ${progress.failed}`);
    }

    return lines.join("\n");
  }

  /**
   * Format the plan in plan-only mode (dry run).
   */
  formatDryRunPlan(affectedFiles: string[] = []): string {
    const plan = this.getActivePlan();
    if (!plan) return "No active plan.";

    const lines: string[] = [];
    lines.push("PLAN (dry-run)");
    lines.push("");
    lines.push(`Task: ${plan.task}`);
    lines.push("");
    lines.push("Steps:");

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const tool = step.tool ? ` [${step.tool}]` : "";
      lines.push(`  ${i + 1}. ${step.description}${tool}`);
    }

    if (affectedFiles.length > 0) {
      lines.push("");
      lines.push("Affected files:");
      for (const file of affectedFiles) {
        lines.push(`  - ${file}`);
      }
    }

    return lines.join("\n");
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private formatStepStatus(status: PlanStep["status"]): string {
    switch (status) {
      case "pending":
        return "[ ]";
      case "in-progress":
        return "[~]";
      case "done":
        return "[x]";
      case "failed":
        return "[-]";
    }
  }
}
