/**
 * Todo Tracker
 *
 * V1.0 todo tracking that works with session memory.
 * Used by the agent internally and displayed via `anggor status`.
 */

import type { SessionMemory, TodoItem } from "../agent/memory.js";

export interface TodoSummary {
	total: number;
	pending: number;
	inProgress: number;
	done: number;
	failed: number;
}

export class TodoTracker {
	constructor(private readonly memory: SessionMemory) {}

	/**
	 * Add a new todo item.
	 */
	addTodo(task: string): TodoItem {
		return this.memory.addTodo(task);
	}

	/**
	 * Update the status of a todo item.
	 */
	updateStatus(id: string, status: TodoItem["status"]): boolean {
		return this.memory.updateTodoStatus(id, status);
	}

	/**
	 * Mark a todo as in-progress.
	 */
	start(id: string): boolean {
		return this.updateStatus(id, "in-progress");
	}

	/**
	 * Mark a todo as done.
	 */
	complete(id: string): boolean {
		return this.updateStatus(id, "done");
	}

	/**
	 * Mark a todo as failed.
	 */
	fail(id: string): boolean {
		return this.updateStatus(id, "failed");
	}

	/**
	 * Get all todos.
	 */
	getAll(): TodoItem[] {
		return this.memory.getTodos();
	}

	/**
	 * Get pending todos.
	 */
	getPending(): TodoItem[] {
		return this.memory.getPendingTodos();
	}

	/**
	 * Get in-progress todos.
	 */
	getInProgress(): TodoItem[] {
		return this.memory.getInProgressTodos();
	}

	/**
	 * Get summary statistics.
	 */
	getSummary(): TodoSummary {
		const todos = this.getAll();
		return {
			total: todos.length,
			pending: todos.filter((t) => t.status === "pending").length,
			inProgress: todos.filter((t) => t.status === "in-progress").length,
			done: todos.filter((t) => t.status === "done").length,
			failed: todos.filter((t) => t.status === "failed").length,
		};
	}

	/**
	 * Format todos for terminal display.
	 */
	formatTodos(): string {
		const todos = this.getAll();
		if (todos.length === 0) return "No todos.";

		const lines: string[] = [];
		lines.push("TODO");
		lines.push("");

		for (const todo of todos) {
			const status = this.formatStatus(todo.status);
			lines.push(`${status} ${todo.task}`);
		}

		const summary = this.getSummary();
		lines.push("");
		lines.push(
			`Total: ${summary.total} | Done: ${summary.done} | Pending: ${summary.pending} | Failed: ${summary.failed}`,
		);

		return lines.join("\n");
	}

	private formatStatus(status: TodoItem["status"]): string {
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
