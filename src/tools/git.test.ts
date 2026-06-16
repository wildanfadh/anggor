/**
 * Git Tools Tests
 */

import { describe, expect, it } from "bun:test";
import { gitBranch, gitDiff, gitLog, gitStatus } from "./git.js";

describe("Git Tools", () => {
	describe("gitStatus", () => {
		it("should return git status", async () => {
			const status = await gitStatus(".");
			expect(status).toHaveProperty("branch");
			expect(status).toHaveProperty("files");
			expect(status).toHaveProperty("clean");
			expect(typeof status.branch).toBe("string");
			expect(Array.isArray(status.files)).toBe(true);
		});
	});

	describe("gitDiff", () => {
		it("should return git diff", async () => {
			const diff = await gitDiff(undefined, ".");
			expect(typeof diff).toBe("string");
		});
	});

	describe("gitLog", () => {
		it("should return git log entries", async () => {
			const log = await gitLog(3, ".");
			expect(Array.isArray(log)).toBe(true);

			if (log.length > 0) {
				expect(log[0]).toHaveProperty("hash");
				expect(log[0]).toHaveProperty("shortHash");
				expect(log[0]).toHaveProperty("author");
				expect(log[0]).toHaveProperty("date");
				expect(log[0]).toHaveProperty("message");
			}
		});
	});

	describe("gitBranch", () => {
		it("should return current branch", async () => {
			const branch = await gitBranch(".");
			expect(branch).toHaveProperty("current");
			expect(branch).toHaveProperty("all");
			expect(typeof branch.current).toBe("string");
			expect(Array.isArray(branch.all)).toBe(true);
		});
	});
});
