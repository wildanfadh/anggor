/**
 * Context Scanner Tests
 */

import { describe, expect, it } from "bun:test";
import { detectSearchEngine, searchInFiles } from "./grep.js";
import { parsePackageJson } from "./manifest.js";
import { Scanner } from "./scanner.js";

describe("Scanner", () => {
	it("should scan project", async () => {
		const scanner = new Scanner();
		const info = await scanner.scan(".");

		expect(info).toHaveProperty("language");
		expect(info).toHaveProperty("ignorePatterns");
		expect(Array.isArray(info.ignorePatterns)).toBe(true);
	});

	it("should detect TypeScript/JavaScript", async () => {
		const scanner = new Scanner();
		const info = await scanner.scan(".");
		expect(info.language).toBe("TypeScript/JavaScript");
	});
});

describe("Manifest Parser", () => {
	it("should parse package.json", async () => {
		const result = await parsePackageJson(".");
		expect(result).not.toBeNull();

		if (result) {
			expect(result.language).toBe("TypeScript/JavaScript");
			expect(result.packageManager).toBeDefined();
		}
	});
});

describe("Grep/Search", () => {
	it("should detect search engine", async () => {
		const engine = await detectSearchEngine();
		expect(["rg", "grep"]).toContain(engine);
	});

	it("should search for text", async () => {
		const result = await searchInFiles("export", { maxResults: 5 });
		expect(result).toHaveProperty("engine");
		expect(result).toHaveProperty("query", "export");
		expect(result).toHaveProperty("matches");
		expect(Array.isArray(result.matches)).toBe(true);
	});
});
