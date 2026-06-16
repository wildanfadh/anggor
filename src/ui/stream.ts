/**
 * Streaming Output
 *
 * V1.0 streaming display for LLM tokens and tool output.
 * Gives a responsive, real-time feel to the agent.
 */

import { createSpinner } from "./spinner.js";
import { theme } from "./theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamOptions {
	/** Prefix for each line. */
	prefix?: string;
	/** Show timestamps. */
	timestamp?: boolean;
	/** Color for the output. */
	color?: (text: string) => string;
}

export interface ToolStreamOptions extends StreamOptions {
	/** Show tool name. */
	showTool?: boolean;
	/** Show duration. */
	showDuration?: boolean;
}

// ---------------------------------------------------------------------------
// LLM Token Streaming
// ---------------------------------------------------------------------------

/**
 * Create a streaming writer for LLM tokens.
 * Displays tokens as they arrive in real-time.
 */
export function createTokenStream(options: StreamOptions = {}): {
	write: (token: string) => void;
	end: () => void;
} {
	const { prefix = "", color } = options;
	let lineBuffer = "";

	return {
		write: (token: string) => {
			// Split by newlines to handle multi-line tokens
			const parts = token.split("\n");

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];

				if (i > 0) {
					// Newline encountered - flush buffer
					const line = color ? color(lineBuffer) : lineBuffer;
					process.stdout.write(`${prefix}${line}\n`);
					lineBuffer = "";
				}

				lineBuffer += part;
			}

			// Write partial line (without newline)
			if (lineBuffer) {
				const partial = color ? color(lineBuffer) : lineBuffer;
				process.stdout.write(`\r${prefix}${partial}`);
			}
		},
		end: () => {
			if (lineBuffer) {
				const line = color ? color(lineBuffer) : lineBuffer;
				process.stdout.write(`${prefix}${line}\n`);
				lineBuffer = "";
			}
		},
	};
}

/**
 * Stream an async iterable of tokens to the terminal.
 */
export async function streamTokens(tokens: AsyncIterable<string>, options: StreamOptions = {}): Promise<void> {
	const stream = createTokenStream(options);

	for await (const token of tokens) {
		stream.write(token);
	}

	stream.end();
}

// ---------------------------------------------------------------------------
// Tool Output Streaming
// ---------------------------------------------------------------------------

/**
 * Display tool execution with spinner and progressive output.
 */
export async function streamToolExecution<T>(
	toolName: string,
	description: string,
	execute: () => Promise<T>,
	options: ToolStreamOptions = {},
): Promise<T> {
	const { showTool = true, showDuration = true } = options;
	const spinner = createSpinner();
	const startTime = performance.now();

	const toolLabel = showTool ? theme.info(`[${toolName}]`) : "";
	const startMsg = `${toolLabel} ${description}...`;

	spinner.start(startMsg);

	try {
		const result = await execute();
		const duration = Math.round(performance.now() - startTime);
		const durationLabel = showDuration ? theme.muted(` (${duration}ms)`) : "";

		spinner.stop(`${theme.success("✓")} ${toolLabel} ${description}${durationLabel}`);

		return result;
	} catch (error: unknown) {
		const duration = Math.round(performance.now() - startTime);
		const durationLabel = showDuration ? theme.muted(` (${duration}ms)`) : "";

		spinner.stop(`${theme.error("✗")} ${toolLabel} ${description}${durationLabel}`);

		throw error;
	}
}

/**
 * Display a tool call result.
 */
export function printToolResult(toolName: string, success: boolean, output: string, duration?: number): void {
	const icon = success ? theme.success("✓") : theme.error("✗");
	const tool = theme.info(`[${toolName}]`);
	const dur = duration !== undefined ? theme.muted(` (${duration}ms)`) : "";

	console.log(`${icon} ${tool}${dur}`);

	if (output) {
		const lines = output.split("\n").slice(0, 5); // Show max 5 lines
		for (const line of lines) {
			console.log(theme.muted(`  ${line}`));
		}
		if (output.split("\n").length > 5) {
			console.log(theme.muted(`  ... (${output.split("\n").length - 5} more lines)`));
		}
	}
}

// ---------------------------------------------------------------------------
// Plan Streaming
// ---------------------------------------------------------------------------

/**
 * Display plan steps as they're being executed.
 */
export function printPlanStep(
	stepNumber: number,
	totalSteps: number,
	description: string,
	status: "starting" | "done" | "failed",
): void {
	const progress = theme.muted(`[${stepNumber}/${totalSteps}]`);
	const icon = status === "starting" ? theme.info("→") : status === "done" ? theme.success("✓") : theme.error("✗");

	console.log(`${icon} ${progress} ${description}`);
}

/**
 * Display plan header.
 */
export function printPlanHeader(task: string, stepCount: number): void {
	console.log(theme.bold(theme.primary(`\nPLAN: ${task}`)));
	console.log(theme.muted(`  ${stepCount} steps\n`));
}

// ---------------------------------------------------------------------------
// Agent Status Streaming
// ---------------------------------------------------------------------------

/**
 * Display agent iteration progress.
 */
export function printIteration(iteration: number, maxIterations: number): void {
	const progress = theme.muted(`[${iteration}/${maxIterations}]`);
	console.log(theme.info(`\n${progress} Iteration ${iteration}`));
}

/**
 * Display agent completion.
 */
export function printCompletion(success: boolean, message: string, duration: number): void {
	const icon = success ? theme.success("✓") : theme.error("✗");
	const dur = theme.muted(` (${duration}ms)`);

	console.log(`\n${icon} ${message}${dur}`);
}
