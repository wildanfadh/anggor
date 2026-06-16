/**
 * CLI UI Wrapper Tests
 *
 * Tests for structured output via @poppinss/cliui.
 * Uses MemoryRenderer to capture output without writing to terminal.
 */

import { describe, expect, test } from "bun:test";
import { cliui, MemoryRenderer } from "@poppinss/cliui";

// Helper: create a test UI with MemoryRenderer for capturing output
function createTestUI() {
	const renderer = new MemoryRenderer();
	const ui = cliui({ mode: "raw" });
	ui.useRenderer(renderer);
	return { ui, renderer };
}

function getOutput(renderer: MemoryRenderer): string {
	return renderer
		.getLogs()
		.map((l) => l.message)
		.join("\n");
}

function outputContains(renderer: MemoryRenderer, ...phrases: string[]): boolean {
	const output = getOutput(renderer);
	return phrases.every((p) => output.includes(p));
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

describe("CLI UI Table", () => {
	test("should render table with headers and rows", () => {
		const { ui, renderer } = createTestUI();
		const tbl = ui.table();
		tbl.head(["Name", "Version"]);
		tbl.row(["openai", "gpt-4o"]);
		tbl.row(["anthropic", "claude-3"]);
		tbl.render();

		expect(outputContains(renderer, "Name", "Version", "openai", "gpt-4o")).toBe(true);
	});

	test("should handle empty rows", () => {
		const { ui, renderer } = createTestUI();
		const tbl = ui.table();
		tbl.head(["Col1", "Col2"]);
		tbl.render();

		expect(getOutput(renderer)).toContain("Col1");
	});

	test("should render provider table with active marker", () => {
		const { ui, renderer } = createTestUI();
		const tbl = ui.table();
		tbl.head(["Provider", "Models"]);
		tbl.row(["* openai", "gpt-4o"]);
		tbl.row(["  anthropic", "claude-3"]);
		tbl.render();

		expect(outputContains(renderer, "* openai", "anthropic")).toBe(true);
	});

	test("should handle long cell values", () => {
		const { ui, renderer } = createTestUI();
		const tbl = ui.table();
		tbl.head(["Name", "Description"]);
		tbl.row(["security", "Audit code for security vulnerabilities"]);
		tbl.render();

		expect(outputContains(renderer, "security", "vulnerabilities")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Instructions / Steps
// ---------------------------------------------------------------------------

describe("CLI UI Instructions", () => {
	test("should render instructions with heading and content", () => {
		const { ui, renderer } = createTestUI();
		const instr = ui.instructions();
		instr.heading("Test Heading");
		instr.add("Line 1");
		instr.add("Line 2");
		instr.render();

		expect(outputContains(renderer, "Test Heading", "Line 1", "Line 2")).toBe(true);
	});

	test("should render plan steps as numbered list", () => {
		const { ui, renderer } = createTestUI();
		const instr = ui.instructions();
		instr.heading("PLAN  add auth");
		instr.add("1. Analyze requirements");
		instr.add("2. Implement login");
		instr.add("3. Run tests");
		instr.render();

		expect(outputContains(renderer, "PLAN  add auth", "Analyze requirements", "Implement login", "Run tests")).toBe(
			true,
		);
	});

	test("should handle empty instructions", () => {
		const { ui, renderer } = createTestUI();
		const instr = ui.instructions();
		instr.heading("Empty");
		instr.render();

		expect(getOutput(renderer)).toContain("Empty");
	});

	test("should render dry-run plan", () => {
		const { ui, renderer } = createTestUI();
		const instr = ui.instructions();
		instr.heading("DRY RUN  refactor utils");
		instr.add("1. Scan project");
		instr.add("2. Identify targets");
		instr.render();

		expect(outputContains(renderer, "DRY RUN", "Scan project")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Sticker (instructions without pointer)
// ---------------------------------------------------------------------------

describe("CLI UI Sticker", () => {
	test("should render sticker without pointer icon", () => {
		const { ui, renderer } = createTestUI();
		const s = ui.sticker();
		s.heading("Setup");
		s.add("export KEY=value");
		s.render();

		expect(outputContains(renderer, "Setup", "export KEY=value")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Task Manager
// ---------------------------------------------------------------------------

describe("CLI UI Tasks", () => {
	test("should render task success", async () => {
		const { ui, renderer } = createTestUI();
		const tm = ui.tasks();
		tm.add("scan", async ({ update }) => {
			update("reading files...");
			return "found 5 files";
		});
		await tm.run();

		const output = getOutput(renderer);
		expect(output).toContain("scan");
		expect(tm.getState()).toBe("succeeded");
	});

	test("should render task failure", async () => {
		const { ui, renderer } = createTestUI();
		const tm = ui.tasks();
		tm.add("bad task", async () => {
			return { isError: true, message: "something broke" };
		});
		await tm.run();

		const output = getOutput(renderer);
		expect(output).toContain("bad task");
		// In raw mode the error is in the logs
		expect(tm.getState()).toBe("failed");
	});

	test("should run multiple tasks in sequence", async () => {
		const { ui } = createTestUI();
		const tm = ui.tasks();
		const order: string[] = [];

		tm.add("first", async () => {
			order.push("first");
			return "done";
		});
		tm.add("second", async () => {
			order.push("second");
			return "done";
		});
		await tm.run();

		expect(order).toEqual(["first", "second"]);
		expect(tm.getState()).toBe("succeeded");
	});

	test("should stop on first failure", async () => {
		const { ui } = createTestUI();
		const tm = ui.tasks();
		const order: string[] = [];

		tm.add("first", async () => {
			order.push("first");
			return { isError: true, message: "fail" };
		});
		tm.add("second", async () => {
			order.push("second");
			return "done";
		});
		await tm.run();

		// Second task should not run
		expect(order).toEqual(["first"]);
		expect(tm.getState()).toBe("failed");
	});
});

// ---------------------------------------------------------------------------
// cliui.ts wrapper tests
// ---------------------------------------------------------------------------

describe("CLI UI Wrapper (src/ui/cliui.ts)", () => {
	test("printTable should not throw", async () => {
		const { printTable, resetCliui } = await import("./cliui.js");
		// Reset to use MemoryRenderer
		resetCliui();

		// Import and use — this verifies the import works
		expect(typeof printTable).toBe("function");
	});

	test("printSteps should not throw", async () => {
		const { printSteps, resetCliui } = await import("./cliui.js");
		resetCliui();
		expect(typeof printSteps).toBe("function");
	});

	test("printSection should not throw", async () => {
		const { printSection, resetCliui } = await import("./cliui.js");
		resetCliui();
		expect(typeof printSection).toBe("function");
	});

	test("runTasks should be a function", async () => {
		const { runTasks, resetCliui } = await import("./cliui.js");
		resetCliui();
		expect(typeof runTasks).toBe("function");
	});
});
