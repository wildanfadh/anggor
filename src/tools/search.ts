/**
 * Search Tools
 *
 * grep/ripgrep-based local context search for V1.0.
 */

import { type SearchOptions, type SearchResult, searchInFiles } from "../context/grep.js";

async function searchCode(query: string, options: SearchOptions = {}): Promise<SearchResult> {
	return searchInFiles(query, options);
}

export const searchTools = {
	searchCode,
} as const;
