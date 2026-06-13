/**
 * Todo Tracking Tools
 *
 * V1.0 todo tracking that works with session memory.
 * Used by the agent internally and displayed via `anggor status`.
 */

import type { SessionMemory } from "../agent/memory.js";
import { TodoTracker } from "./todo-tracker.js";

export { TodoTracker } from "./todo-tracker.js";
export type { TodoSummary } from "./todo-tracker.js";

export const todoTools = {
  createTracker: (memory: SessionMemory) => new TodoTracker(memory),
} as const;
