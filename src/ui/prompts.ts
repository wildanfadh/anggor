/**
 * Prompt Wrapper (@clack/prompts)
 *
 * User interaction: confirm, select, text input, approval prompts.
 * Used for interactive flows: commit confirm, provider select, chat input,
 * approval prompts for file edits / risky commands.
 */

import * as p from "@clack/prompts";

// ---------------------------------------------------------------------------
// Simple wrappers with consistent styling
// ---------------------------------------------------------------------------

/**
 * Ask the user to confirm an action.
 * Returns true if user confirmed.
 */
export async function confirm(message: string): Promise<boolean> {
	const result = await p.confirm({ message });
	return result === true;
}

/**
 * Present a single-choice menu.
 * Returns the selected value string.
 */
export async function select(options: {
	message: string;
	choices: Array<{ value: string; label: string; hint?: string }>;
	initialValue?: string;
}): Promise<string | symbol> {
	return p.select({
		message: options.message,
		options: options.choices as any,
		initialValue: options.initialValue,
	});
}

/**
 * Ask the user for text input.
 */
export async function text(options: {
	message: string;
	placeholder?: string;
	defaultValue?: string;
	validate?: (value: string) => string | undefined;
}): Promise<string | symbol> {
	return p.text({
		message: options.message,
		placeholder: options.placeholder,
		defaultValue: options.defaultValue,
		validate: options.validate,
	});
}

/**
 * Check if a result is a cancel symbol (user pressed Escape).
 */
export function isCancel(result: unknown): boolean {
	return p.isCancel(result);
}

// ---------------------------------------------------------------------------
// Anggor-specific helpers
// ---------------------------------------------------------------------------

export interface ApprovalOptions {
	/** What the agent wants to do */
	action: string;
	/** Files affected (optional) */
	files?: string[];
	/** Risk level */
	risk: "low" | "medium" | "high";
	/** Whether to show diff (for file operations) */
	showDiff?: boolean;
}

/**
 * Ask the user to approve a tool action.
 * Returns true if approved, false if denied, or a cancel symbol.
 */
export async function approveAction(opts: ApprovalOptions): Promise<boolean | symbol> {
	const riskLabel = opts.risk === "high" ? "⚠ HIGH RISK" : opts.risk === "medium" ? "• MEDIUM" : "✓ LOW";

	const fileList = opts.files && opts.files.length > 0 ? `\n  Files: ${opts.files.join(", ")}` : "";

	const choices: Array<{ value: string; label: string; hint?: string }> = [
		{ value: "yes", label: "Approve" },
		{ value: "no", label: "Deny" },
	];

	if (opts.showDiff) {
		choices.splice(1, 0, {
			value: "diff",
			label: "Show diff first",
		});
	}

	const result = await p.select({
		message: `${riskLabel} ${opts.action}${fileList}`,
		options: choices as any,
	});

	if (p.isCancel(result)) return result;
	return result === "yes";
}
