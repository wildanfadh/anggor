/**
 * Todo Tracking Tools
 *
 * Track progress within an agent session.
 */

export interface TodoItem {
  id: string;
  task: string;
  status: "pending" | "in-progress" | "done" | "failed";
}

export const todoTools = {
  // TODO: Implement todo tracking
  // create_todo, update_todo, list_todos
} as const;