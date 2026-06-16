/**
 * Interrupt Handling
 *
 * V1.0 SIGINT (Ctrl+C) handling for graceful shutdown.
 * Captures interrupt signal, stops agent loop, and optionally saves progress.
 */

import type { Agent } from "../agent/core.js";
import { printInfo, printMuted, printWarning } from "../ui/output.js";
import { theme } from "../ui/theme.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InterruptOptions {
	/** Whether to ask user about saving progress. */
	askSave?: boolean;
	/** Whether to show interrupt message. */
	showMessage?: boolean;
	/** Callback when interrupt is triggered. */
	onInterrupt?: () => void;
}

export interface InterruptHandler {
	/** Register the interrupt handler. */
	register: () => void;
	/** Unregister the interrupt handler. */
	unregister: () => void;
	/** Check if interrupted. */
	isInterrupted: () => boolean;
	/** Reset interrupt state. */
	reset: () => void;
}

// ---------------------------------------------------------------------------
// Interrupt Handler
// ---------------------------------------------------------------------------

let interrupted = false;
let agentRef: Agent | null = null;
let cleanupFn: (() => void) | null = null;

/**
 * Create an interrupt handler for the given agent.
 */
export function createInterruptHandler(agent: Agent, options: InterruptOptions = {}): InterruptHandler {
	const { showMessage = true, onInterrupt } = options;

	const handleInterrupt = () => {
		if (interrupted) {
			// Double Ctrl+C - force exit
			if (showMessage) {
				console.log("\n");
				printWarning("Force exit.");
			}
			process.exit(1);
		}

		interrupted = true;
		agentRef = agent;

		// Notify agent to stop
		agent.interrupt();

		if (showMessage) {
			console.log("\n");
			printWarning("Interrupted! Stopping agent...");
			printMuted("Press Ctrl+C again to force exit.");
		}

		if (onInterrupt) {
			onInterrupt();
		}
	};

	return {
		register: () => {
			process.on("SIGINT", handleInterrupt);
			process.on("SIGTERM", handleInterrupt);
			cleanupFn = () => {
				process.removeListener("SIGINT", handleInterrupt);
				process.removeListener("SIGTERM", handleInterrupt);
			};
		},
		unregister: () => {
			if (cleanupFn) {
				cleanupFn();
				cleanupFn = null;
			}
		},
		isInterrupted: () => interrupted,
		reset: () => {
			interrupted = false;
			agentRef = null;
		},
	};
}

/**
 * Check if the process was interrupted.
 */
export function isInterrupted(): boolean {
	return interrupted;
}

/**
 * Reset interrupt state (for new commands).
 */
export function resetInterrupt(): void {
	interrupted = false;
	agentRef = null;
}

/**
 * Display interrupt summary.
 */
export function printInterruptSummary(): void {
	if (!agentRef) return;

	const status = agentRef.getStatus();
	if (status && status !== "No active plan or todos.") {
		console.log("\n");
		printInfo("Current progress:");
		console.log(theme.muted(`  ${status.split("\n").join("\n  ")}`));
	}
}

/**
 * Register a simple SIGINT handler (for non-agent commands).
 */
export function registerSimpleInterrupt(): void {
	const handler = () => {
		console.log("\n");
		printWarning("Interrupted.");
		process.exit(0);
	};

	process.on("SIGINT", handler);
	process.on("SIGTERM", handler);
}
