/** Persistent Memory Bank
 *
 * V1.1: saves/loads session context across sessions.
 * Stored at ~/.anggor/memory.json.
 */

import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { PlanRecord, SessionMemory, SessionMessage, TodoItem, ToolCallRecord } from "../agent/memory.js";

export interface PersistentState {
	version: 1;
	updatedAt: number;
	cwd: string;
	messages: SessionMessage[];
	toolCalls: ToolCallRecord[];
	plans: PlanRecord[];
	todos: TodoItem[];
	summary?: string;
}

function defaultPath(): string {
	return join(homedir(), ".anggor", "memory.json");
}

async function ensureDir(filePath: string): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true });
}

export async function saveMemory(memory: SessionMemory, cwd?: string): Promise<string> {
	const state: PersistentState = {
		version: 1,
		updatedAt: Date.now(),
		cwd: cwd ?? process.cwd(),
		messages: memory.getMessages(),
		toolCalls: memory.getToolCalls(),
		plans: [], // plans are already in memory entries
		todos: memory.getTodos(),
		summary: await generateSummary(memory),
	};

	const path = defaultPath();
	await ensureDir(path);
	await writeFile(path, JSON.stringify(state, null, 2), "utf8");

	return path;
}

export async function loadMemory(): Promise<PersistentState | null> {
	const path = defaultPath();

	try {
		await access(path, constants.R_OK);
	} catch {
		return null;
	}

	try {
		const raw = await readFile(path, "utf8");
		const state = JSON.parse(raw) as PersistentState;

		if (state.version !== 1) {
			return null;
		}

		return state;
	} catch {
		return null;
	}
}

export async function clearMemory(): Promise<void> {
	const path = defaultPath();

	try {
		await access(path, constants.F_OK);
		await writeFile(
			path,
			JSON.stringify({
				version: 1,
				updatedAt: Date.now(),
				cwd: process.cwd(),
				messages: [],
				toolCalls: [],
				plans: [],
				todos: [],
			}),
			"utf8",
		);
	} catch {
		// File doesn't exist, nothing to clear
	}
}

async function generateSummary(memory: SessionMemory): Promise<string> {
	const messages = memory.getMessages();
	const toolCalls = memory.getToolCalls();
	const todos = memory.getTodos();

	const parts: string[] = [];
	parts.push(`Messages: ${messages.length}`);
	parts.push(`Tool calls: ${toolCalls.length}`);
	parts.push(`Todos: ${todos.length} (${todos.filter((t) => t.status === "done").length} done)`);

	return parts.join(", ");
}

export function applyLoadedState(memory: SessionMemory, state: PersistentState): void {
	for (const msg of state.messages) {
		memory.addMessage(msg.role, msg.content);
	}

	for (const call of state.toolCalls) {
		memory.addToolCall(call.tool, call.input, call.output, call.success, call.duration);
	}

	for (const todo of state.todos) {
		memory.addTodo(todo.task);
	}
}
