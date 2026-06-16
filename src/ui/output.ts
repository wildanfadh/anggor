/**
 * Terminal Output Utilities
 *
 * Format and display information in the terminal.
 * Backward-compatible with the original print* API.
 * Structured output (table, steps, section) delegates to @poppinss/cliui.
 */

import { theme } from "./theme.js";

// Re-export structured helpers from cliui wrapper
export { printSection, printSteps, printTable as printStructuredTable } from "./cliui.js";

// ---------------------------------------------------------------------------
// Simple text helpers (for quick one-liners, streaming boundaries, etc.)
// ---------------------------------------------------------------------------

export function printHeader(text: string): void {
	console.log(theme.bold(theme.primary(`\n${text}\n`)));
}

export function printSuccess(text: string): void {
	console.log(theme.success(`  ✓ ${text}`));
}

export function printError(text: string): void {
	console.log(theme.error(`  ✗ ${text}`));
}

export function printInfo(text: string): void {
	console.log(theme.info(`  → ${text}`));
}

export function printMuted(text: string): void {
	console.log(theme.muted(`  ${text}`));
}

export function printWarning(text: string): void {
	console.log(theme.warning(`  ⚠ ${text}`));
}

export function printDivider(): void {
	console.log(theme.muted("  ─".repeat(20)));
}

export function printKeyValue(key: string, value: string): void {
	console.log(`  ${theme.bold(key)}: ${value}`);
}

export function printList(items: string[], bullet = "•"): void {
	for (const item of items) {
		console.log(`  ${theme.muted(bullet)} ${item}`);
	}
}

/** Legacy simple key-value table (kept for backward compat). */
export function printTable(rows: Array<[string, string]>): void {
	const maxKeyLen = Math.max(...rows.map(([key]) => key.length));

	for (const [key, value] of rows) {
		const paddedKey = key.padEnd(maxKeyLen);
		console.log(`  ${theme.bold(paddedKey)}  ${value}`);
	}
}

// ---------------------------------------------------------------------------
// Structured output (uses @poppinss/cliui)
// ---------------------------------------------------------------------------

import { printTable as cliuiTable } from "./cliui.js";

/**
 * Print a provider-list style table with an "active" marker.
 */
export function printProviderTable(active: string, providers: Array<{ name: string; models: string }>): void {
	const rows = providers.map((p) => [p.name === active ? `* ${p.name}` : `  ${p.name}`, p.models]);
	cliuiTable(["Provider", "Models"], rows);
}

/**
 * Print a simple list to stdout without wrapping in a box.
 */
export function printSimpleList(title: string, items: string[]): void {
	printMuted(title);
	for (const item of items) {
		printMuted(`  ${item}`);
	}
}
