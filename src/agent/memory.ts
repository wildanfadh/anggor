/**
 * Session Memory
 *
 * V1.0 in-session memory: stores chat messages, tool results, plans, and todos.
 * Not persisted to disk (that's V1.1 persistent memory bank).
 */

export type MessageRole = "user" | "assistant" | "system";

export interface SessionMessage {
	id: string;
	timestamp: number;
	role: MessageRole;
	content: string;
}

export interface ToolCallRecord {
	id: string;
	timestamp: number;
	tool: string;
	input: string;
	output: string;
	success: boolean;
	duration: number;
}

export interface PlanRecord {
	id: string;
	timestamp: number;
	task: string;
	steps: string[];
	status: "active" | "completed" | "abandoned";
}

export interface TodoItem {
	id: string;
	task: string;
	status: "pending" | "in-progress" | "done" | "failed";
	createdAt: number;
	updatedAt: number;
}

export type MemoryEntry =
	| { kind: "message"; data: SessionMessage }
	| { kind: "tool"; data: ToolCallRecord }
	| { kind: "plan"; data: PlanRecord }
	| { kind: "todo"; data: TodoItem };

// Simple counter for unique IDs
let idCounter = 0;
function nextId(prefix: string): string {
	return `${prefix}-${Date.now()}-${++idCounter}`;
}

// Approximate token count: ~4 chars per token
function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

export interface ContextBudget {
	maxTokens: number;
	reserveForResponse?: number;
}

export class SessionMemory {
	private readonly entries: MemoryEntry[] = [];
	private readonly todos: Map<string, TodoItem> = new Map();

	// ---------------------------------------------------------------------------
	// Messages
	// ---------------------------------------------------------------------------

	addMessage(role: MessageRole, content: string): SessionMessage {
		const msg: SessionMessage = {
			id: nextId("msg"),
			timestamp: Date.now(),
			role,
			content,
		};
		this.entries.push({ kind: "message", data: msg });
		return msg;
	}

	getMessages(): SessionMessage[] {
		return this.entries
			.filter((e): e is { kind: "message"; data: SessionMessage } => e.kind === "message")
			.map((e) => e.data);
	}

	// ---------------------------------------------------------------------------
	// Tool calls
	// ---------------------------------------------------------------------------

	addToolCall(tool: string, input: string, output: string, success: boolean, duration: number): ToolCallRecord {
		const record: ToolCallRecord = {
			id: nextId("tool"),
			timestamp: Date.now(),
			tool,
			input,
			output,
			success,
			duration,
		};
		this.entries.push({ kind: "tool", data: record });
		return record;
	}

	getToolCalls(): ToolCallRecord[] {
		return this.entries
			.filter((e): e is { kind: "tool"; data: ToolCallRecord } => e.kind === "tool")
			.map((e) => e.data);
	}

	// ---------------------------------------------------------------------------
	// Plans
	// ---------------------------------------------------------------------------

	addPlan(task: string, steps: string[]): PlanRecord {
		// Mark previous plans as abandoned
		for (const entry of this.entries) {
			if (entry.kind === "plan" && entry.data.status === "active") {
				entry.data.status = "abandoned";
			}
		}

		const plan: PlanRecord = {
			id: nextId("plan"),
			timestamp: Date.now(),
			task,
			steps,
			status: "active",
		};
		this.entries.push({ kind: "plan", data: plan });
		return plan;
	}

	completePlan(planId: string): void {
		for (const entry of this.entries) {
			if (entry.kind === "plan" && entry.data.id === planId) {
				entry.data.status = "completed";
				break;
			}
		}
	}

	getActivePlan(): PlanRecord | null {
		for (let i = this.entries.length - 1; i >= 0; i--) {
			const entry = this.entries[i];
			if (entry.kind === "plan" && entry.data.status === "active") {
				return entry.data;
			}
		}
		return null;
	}

	// ---------------------------------------------------------------------------
	// Todos
	// ---------------------------------------------------------------------------

	addTodo(task: string): TodoItem {
		const item: TodoItem = {
			id: nextId("todo"),
			task,
			status: "pending",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};
		this.todos.set(item.id, item);
		this.entries.push({ kind: "todo", data: item });
		return item;
	}

	updateTodoStatus(id: string, status: TodoItem["status"]): boolean {
		const item = this.todos.get(id);
		if (!item) return false;

		item.status = status;
		item.updatedAt = Date.now();
		return true;
	}

	getTodos(): TodoItem[] {
		return [...this.todos.values()];
	}

	getPendingTodos(): TodoItem[] {
		return [...this.todos.values()].filter((t) => t.status === "pending");
	}

	getInProgressTodos(): TodoItem[] {
		return [...this.todos.values()].filter((t) => t.status === "in-progress");
	}

	// ---------------------------------------------------------------------------
	// Context for LLM
	// ---------------------------------------------------------------------------

	/**
	 * Build context string for LLM within a token budget.
	 * Prioritizes: system messages → recent messages → active plan → todos → recent tool calls.
	 */
	getContext(budget: ContextBudget): string {
		const maxTokens = budget.maxTokens - (budget.reserveForResponse ?? 2048);
		const parts: string[] = [];
		let usedTokens = 0;

		function canAdd(text: string): boolean {
			const tokens = estimateTokens(text);
			if (usedTokens + tokens > maxTokens) return false;
			usedTokens += tokens;
			return true;
		}

		// 1. System messages (always include)
		const systemMsgs = this.getMessages().filter((m) => m.role === "system");
		for (const msg of systemMsgs) {
			if (canAdd(msg.content)) {
				parts.push(`[system] ${msg.content}`);
			}
		}

		// 2. Active plan
		const plan = this.getActivePlan();
		if (plan) {
			const planText = `Current Plan: ${plan.task}\n${plan.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`;
			if (canAdd(planText)) {
				parts.push(planText);
			}
		}

		// 3. Todos
		const todos = this.getTodos();
		if (todos.length > 0) {
			const todoText = `Todos:\n${todos.map((t) => `  [${t.status}] ${t.task}`).join("\n")}`;
			if (canAdd(todoText)) {
				parts.push(todoText);
			}
		}

		// 4. Recent messages (from newest to oldest, skip system)
		const recentMsgs = this.getMessages()
			.filter((m) => m.role !== "system")
			.reverse();

		const recentParts: string[] = [];
		for (const msg of recentMsgs) {
			const text = `[${msg.role}] ${msg.content}`;
			if (!canAdd(text)) break;
			recentParts.unshift(text);
		}
		parts.push(...recentParts);

		// 5. Recent tool calls (last 3)
		const recentTools = this.getToolCalls().slice(-3);
		for (const tool of recentTools) {
			const text = `[tool:${tool.tool}] ${tool.success ? "success" : "failed"}: ${tool.output.slice(0, 200)}`;
			if (canAdd(text)) {
				parts.push(text);
			}
		}

		return parts.join("\n\n");
	}

	/**
	 * Get approximate token count of current memory.
	 */
	getEstimatedTokens(): number {
		let total = 0;
		for (const entry of this.entries) {
			if (entry.kind === "message") {
				total += estimateTokens(entry.data.content);
			} else if (entry.kind === "tool") {
				total += estimateTokens(entry.data.input) + estimateTokens(entry.data.output);
			} else if (entry.kind === "plan") {
				total += estimateTokens(entry.data.task) + entry.data.steps.reduce((sum, s) => sum + estimateTokens(s), 0);
			} else if (entry.kind === "todo") {
				total += estimateTokens(entry.data.task);
			}
		}
		return total;
	}

	// ---------------------------------------------------------------------------
	// Session management
	// ---------------------------------------------------------------------------

	getEntryCount(): number {
		return this.entries.length;
	}

	clear(): void {
		this.entries.length = 0;
		this.todos.clear();
		idCounter = 0;
	}
}
