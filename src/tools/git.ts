/**
 * Git Tools
 *
 * V1.0 git-aware workflow: status, diff, log, branch, commit.
 * Runs git commands directly (no safety layer needed — git is inherently safe).
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitStatusFile {
	path: string;
	index: string; // staging area status (M, A, D, R, etc. or ' ')
	worktree: string; // working tree status
}

export interface GitStatusResult {
	branch: string;
	files: GitStatusFile[];
	clean: boolean;
}

export interface GitLogEntry {
	hash: string;
	shortHash: string;
	author: string;
	date: string;
	message: string;
}

export interface GitBranchResult {
	current: string;
	all: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function git(args: string[], cwd?: string): Promise<string> {
	try {
		const { stdout } = await execFileAsync("git", args, {
			cwd: cwd ?? process.cwd(),
			maxBuffer: 1024 * 1024 * 10,
			timeout: 30_000,
		});
		return typeof stdout === "string" ? stdout : String(stdout);
	} catch (error: unknown) {
		const err = error as NodeJS.ErrnoException & { stderr?: string; message?: string };
		throw new Error(`git ${args.join(" ")} failed: ${err.stderr ?? err.message ?? "unknown error"}`);
	}
}

// ---------------------------------------------------------------------------
// Git tools
// ---------------------------------------------------------------------------

/**
 * Get git status — list of changed files with their staging/worktree status.
 */
export async function gitStatus(cwd?: string): Promise<GitStatusResult> {
	const output = await git(["status", "--porcelain", "-b"], cwd);
	const lines = output.split("\n").filter((line) => line.length > 0);

	const branchLine = lines[0] ?? "";
	const branchMatch = branchLine.match(/^## (.+?)(?:\.\.\..+)?$/);
	const branch = branchMatch ? branchMatch[1] : "HEAD";

	const files: GitStatusFile[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (line.length < 4) continue;

		const index = line[0] === "?" ? "?" : line[0];
		const worktree = line[1] === "?" ? "?" : line[1];
		const path = line.slice(3).trim();

		files.push({ path, index, worktree });
	}

	return { branch, files, clean: files.length === 0 };
}

/**
 * Get git diff — either for a specific file or entire working tree.
 */
export async function gitDiff(path?: string, cwd?: string): Promise<string> {
	const args = ["diff"];
	if (path) args.push("--", path);
	return git(args, cwd);
}

/**
 * Get recent git log entries.
 */
export async function gitLog(count = 5, cwd?: string): Promise<GitLogEntry[]> {
	const separator = "---ANGGOR_SEP---";
	const format = `%H%n%h%n%an%n%ai%n%s%n${separator}`;
	const output = await git(["log", `--format=${format}`, `-${String(count)}`], cwd);

	const entries: GitLogEntry[] = [];
	const chunks = output.split(separator).filter((chunk) => chunk.trim().length > 0);

	for (const chunk of chunks) {
		const lines = chunk.split("\n").filter((line) => line.length > 0);
		if (lines.length < 5) continue;

		entries.push({
			hash: lines[0],
			shortHash: lines[1],
			author: lines[2],
			date: lines[3],
			message: lines[4],
		});
	}

	return entries;
}

/**
 * Get current branch and list of all branches.
 */
export async function gitBranch(cwd?: string): Promise<GitBranchResult> {
	const output = await git(["branch", "-a"], cwd);
	const lines = output.split("\n").filter((line) => line.length > 0);

	let current = "HEAD";
	const all: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		const isCurrent = trimmed.startsWith("* ");
		const name = isCurrent ? trimmed.slice(2) : trimmed;

		if (isCurrent) current = name;
		if (!name.startsWith("(")) all.push(name);
	}

	return { current, all };
}

/**
 * Create a git commit with the given message.
 * Stages all changes first (git add -A).
 */
export async function gitCommit(message: string, cwd?: string): Promise<{ hash: string; shortHash: string }> {
	await git(["add", "-A"], cwd);
	const output = await git(["commit", "-m", message], cwd);

	// Parse: [main abc1234] message
	const match = output.match(/\[(?:\w+\s+)?(\w+)\s+([a-f0-9]+)\]/);
	if (match) {
		return { hash: match[0], shortHash: match[2] };
	}

	// Fallback: get HEAD hash
	const hashOutput = await git(["rev-parse", "HEAD"], cwd);
	const fullHash = hashOutput.trim();
	return { hash: fullHash, shortHash: fullHash.slice(0, 7) };
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const gitTools = {
	gitStatus,
	gitDiff,
	gitLog,
	gitBranch,
	gitCommit,
} as const;
