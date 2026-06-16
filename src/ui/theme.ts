/**
 * UI Theme
 *
 * Color scheme and styling for terminal output.
 */

import pc from "picocolors";

export const theme = {
	primary: pc.cyan,
	success: pc.green,
	warning: pc.yellow,
	error: pc.red,
	muted: pc.gray,
	bold: pc.bold,
	dim: pc.dim,
	info: pc.blue,
} as const;
