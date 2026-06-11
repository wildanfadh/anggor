/**
 * Agent Planner
 *
 * Creates execution plans before making changes.
 */

export interface PlanStep {
  id: number;
  description: string;
  tool?: string;
  status: "pending" | "in-progress" | "done" | "failed";
}

export interface Plan {
  task: string;
  steps: PlanStep[];
  affectedFiles: string[];
}

export class Planner {
  // TODO: Generate plan from task description
  // TODO: Track step execution status
  // TODO: Support plan mode (plan only, no execution)
}