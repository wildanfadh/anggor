/**
 * Spinner
 *
 * Terminal loading indicator using @clack/prompts.
 */

import { spinner as clackSpinner } from "@clack/prompts";

export interface Spinner {
	start: (message?: string) => void;
	stop: (message?: string) => void;
}

export function createSpinner(initialMessage = ""): Spinner {
	const s = clackSpinner();

	return {
		start: (message?: string) => {
			s.start(message ?? initialMessage);
		},
		stop: (message?: string) => {
			s.stop(message ?? "");
		},
	};
}
