/**
 * Planner Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Planner } from "./planner.js";
import { SessionMemory } from "./memory.js";

describe("Planner", () => {
  let planner: Planner;
  let memory: SessionMemory;

  beforeEach(() => {
    memory = new SessionMemory();
    planner = new Planner(memory);
  });

  it("should create plan", () => {
    const plan = planner.createPlan("Test task", ["Step 1", "Step 2"]);

    expect(plan.task).toBe("Test task");
    expect(plan.steps.length).toBe(2);
    expect(plan.status).toBe("active");
  });

  it("should get active plan", () => {
    planner.createPlan("Test task");
    const active = planner.getActivePlan();

    expect(active).not.toBeNull();
    expect(active?.task).toBe("Test task");
  });

  it("should add steps", () => {
    planner.createPlan("Test task");
    const step = planner.addStep("New step", "file.read");

    expect(step).not.toBeNull();
    expect(step?.description).toBe("New step");
    expect(step?.tool).toBe("file.read");
  });

  it("should update step status", () => {
    const plan = planner.createPlan("Test task", ["Step 1"]);
    const step = plan.steps[0];

    planner.startStep(step.id);
    expect(planner.getProgress()?.inProgress).toBe(1);

    planner.completeStep(step.id);
    expect(planner.getProgress()?.done).toBe(1);
  });

  it("should get next pending step", () => {
    planner.createPlan("Test task", ["Step 1", "Step 2", "Step 3"]);

    const next = planner.getNextPendingStep();
    expect(next?.description).toBe("Step 1");

    planner.completeStep(next!.id);

    const next2 = planner.getNextPendingStep();
    expect(next2?.description).toBe("Step 2");
  });

  it("should check if plan is complete", () => {
    const plan = planner.createPlan("Test task", ["Step 1", "Step 2"]);

    expect(planner.isPlanComplete()).toBe(false);

    for (const step of plan.steps) {
      planner.completeStep(step.id);
    }

    expect(planner.isPlanComplete()).toBe(true);
  });

  it("should get progress", () => {
    planner.createPlan("Test task", ["Step 1", "Step 2", "Step 3"]);

    const progress = planner.getProgress();
    expect(progress?.total).toBe(3);
    expect(progress?.done).toBe(0);
    expect(progress?.pending).toBe(3);
  });

  it("should format plan", () => {
    planner.createPlan("Test task", ["Step 1", "Step 2"]);
    const formatted = planner.formatPlan();

    expect(formatted).toContain("PLAN: Test task");
    expect(formatted).toContain("Step 1");
    expect(formatted).toContain("Step 2");
  });

  it("should format dry-run plan", () => {
    planner.createPlan("Test task", ["Step 1", "Step 2"]);
    const formatted = planner.formatDryRunPlan(["file.ts"]);

    expect(formatted).toContain("dry-run");
    expect(formatted).toContain("Test task");
    expect(formatted).toContain("file.ts");
  });

  it("should complete plan", () => {
    planner.createPlan("Test task");
    planner.completePlan();

    expect(planner.getActivePlan()).toBeNull();
  });
});
