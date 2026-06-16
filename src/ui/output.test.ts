/**
 * Output & Prompts Integration Tests
 *
 * Tests for output helpers and prompt wrapper availability.
 */

import { describe, expect, test } from "bun:test";

// ---------------------------------------------------------------------------
// Output module
// ---------------------------------------------------------------------------

describe("Output Module", () => {
	test("should export printInfo", async () => {
		const { printInfo } = await import("./output.js");
		expect(typeof printInfo).toBe("function");
	});

	test("should export printSuccess", async () => {
		const { printSuccess } = await import("./output.js");
		expect(typeof printSuccess).toBe("function");
	});

	test("should export printWarning", async () => {
		const { printWarning } = await import("./output.js");
		expect(typeof printWarning).toBe("function");
	});

	test("should export printMuted", async () => {
		const { printMuted } = await import("./output.js");
		expect(typeof printMuted).toBe("function");
	});

	test("should export printTable (legacy)", async () => {
		const { printTable } = await import("./output.js");
		expect(typeof printTable).toBe("function");
	});

	test("should export printStructuredTable", async () => {
		const { printStructuredTable } = await import("./output.js");
		expect(typeof printStructuredTable).toBe("function");
	});

	test("should export printProviderTable", async () => {
		const { printProviderTable } = await import("./output.js");
		expect(typeof printProviderTable).toBe("function");
	});

	test("should export printSteps", async () => {
		const { printSteps } = await import("./output.js");
		expect(typeof printSteps).toBe("function");
	});

	test("should export printSection", async () => {
		const { printSection } = await import("./output.js");
		expect(typeof printSection).toBe("function");
	});

	test("should export printList", async () => {
		const { printList } = await import("./output.js");
		expect(typeof printList).toBe("function");
	});

	test("should export printKeyValue", async () => {
		const { printKeyValue } = await import("./output.js");
		expect(typeof printKeyValue).toBe("function");
	});

	test("should export printDivider", async () => {
		const { printDivider } = await import("./output.js");
		expect(typeof printDivider).toBe("function");
	});

	test("should export printSimpleList", async () => {
		const { printSimpleList } = await import("./output.js");
		expect(typeof printSimpleList).toBe("function");
	});

	test("printProviderTable should accept valid input", async () => {
		const { printProviderTable } = await import("./output.js");
		// Should not throw with valid input
		expect(() =>
			printProviderTable("openai", [
				{ name: "openai", models: "gpt-4o" },
				{ name: "anthropic", models: "claude-3" },
			]),
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Prompts module
// ---------------------------------------------------------------------------

describe("Prompts Module", () => {
	test("should export confirm", async () => {
		const { confirm } = await import("./prompts.js");
		expect(typeof confirm).toBe("function");
	});

	test("should export select", async () => {
		const { select } = await import("./prompts.js");
		expect(typeof select).toBe("function");
	});

	test("should export text", async () => {
		const { text } = await import("./prompts.js");
		expect(typeof text).toBe("function");
	});

	test("should export isCancel", async () => {
		const { isCancel } = await import("./prompts.js");
		expect(typeof isCancel).toBe("function");
	});

	test("should export approveAction", async () => {
		const { approveAction } = await import("./prompts.js");
		expect(typeof approveAction).toBe("function");
	});

	test("isCancel should return false for non-cancel values", async () => {
		const { isCancel } = await import("./prompts.js");
		expect(isCancel("hello")).toBe(false);
		expect(isCancel(true)).toBe(false);
		expect(isCancel(undefined)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Stream module
// ---------------------------------------------------------------------------

describe("Stream Module", () => {
	test("should export createTokenStream", async () => {
		const { createTokenStream } = await import("./stream.js");
		expect(typeof createTokenStream).toBe("function");
	});

	test("should export printPlanHeader", async () => {
		const { printPlanHeader } = await import("./stream.js");
		expect(typeof printPlanHeader).toBe("function");
	});

	test("should export printCompletion", async () => {
		const { printCompletion } = await import("./stream.js");
		expect(typeof printCompletion).toBe("function");
	});

	test("should export createSpinner", async () => {
		const { createSpinner } = await import("./spinner.js");
		expect(typeof createSpinner).toBe("function");
	});
});

// ---------------------------------------------------------------------------
// Theme module
// ---------------------------------------------------------------------------

describe("Theme Module", () => {
	test("should have all color properties", async () => {
		const { theme } = await import("./theme.js");
		expect(typeof theme.primary).toBe("function");
		expect(typeof theme.success).toBe("function");
		expect(typeof theme.warning).toBe("function");
		expect(typeof theme.error).toBe("function");
		expect(typeof theme.muted).toBe("function");
		expect(typeof theme.info).toBe("function");
		expect(typeof theme.bold).toBe("function");
		expect(typeof theme.dim).toBe("function");
	});

	test("theme functions should return strings", async () => {
		const { theme } = await import("./theme.js");
		const result = theme.primary("hello");
		expect(typeof result).toBe("string");
		expect(result).toContain("hello");
	});
});
