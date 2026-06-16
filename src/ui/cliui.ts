/**
 * CLI UI Wrapper (@poppinss/cliui)
 *
 * Structured terminal output for tables, instructions, and sections.
 * Used for read-only commands: plan, review, provider list, mcp list, skill list.
 * Not for streaming output or raw token rendering.
 */

import { cliui } from "@poppinss/cliui";

// ---------------------------------------------------------------------------
// Singleton UI instance (lazy)
// ---------------------------------------------------------------------------

let _ui: ReturnType<typeof cliui> | null = null;

function ui() {
	if (!_ui) {
		_ui = cliui();
	}
	return _ui;
}

export function resetCliui(): void {
	_ui = null;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

/**
 * Print a simple table with headers and rows.
 * Example: printTable(["Name", "Model"], [["openai", "gpt-4o"], ["anthropic", "claude-3"]])
 */
export function printTable(head: string[], rows: string[][]): void {
	const tbl = ui().table();
	tbl.head(head);
	for (const row of rows) {
		tbl.row(row);
	}
	tbl.render();
}

// ---------------------------------------------------------------------------
// Steps / Plan
// ---------------------------------------------------------------------------

/**
 * Print a numbered list of steps (for `anggor plan`).
 */
export function printSteps(title: string, steps: string[]): void {
	const instructions = ui().instructions();
	instructions.heading(title);
	for (let i = 0; i < steps.length; i++) {
		instructions.add(`${i + 1}. ${steps[i]}`);
	}
	instructions.render();
}

// ---------------------------------------------------------------------------
// Instructions box
// ---------------------------------------------------------------------------

/**
 * Print a titled section with bullet-point lines.
 */
export function printSection(title: string, lines: string[]): void {
	const instructions = ui().instructions();
	instructions.heading(title);
	for (const line of lines) {
		instructions.add(line);
	}
	instructions.render();
}

// ---------------------------------------------------------------------------
// Task runner (for agent execution phases — progressive)
// ---------------------------------------------------------------------------

export interface TaskDef {
	title: string;
	action: (update: (msg: string) => void) => Promise<string | ErrorResult>;
}

export interface ErrorResult {
	isError: true;
	message: string;
}

/**
 * Run a sequence of tasks with progressive rendering.
 * Each task's update() calls show real-time progress.
 * Returns true if all tasks succeeded.
 */
export async function runTasks(tasks: TaskDef[]): Promise<boolean> {
	const tm = ui().tasks();

	for (const t of tasks) {
		tm.add(t.title, async ({ update }) => {
			const result = await t.action(update);
			return result;
		});
	}

	try {
		await tm.run();
	} catch {
		// task manager handles errors internally
	}

	return tm.getState() === "succeeded";
}
