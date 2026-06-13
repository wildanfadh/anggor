import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SearchEngine = "rg" | "grep";

export interface SearchOptions {
  cwd?: string;
  include?: string[];
  maxResults?: number;
}

export interface SearchMatch {
  file: string;
  line: number;
  column?: number;
  preview: string;
}

export interface SearchResult {
  engine: SearchEngine;
  query: string;
  cwd: string;
  matches: SearchMatch[];
}

async function commandExists(command: string): Promise<boolean> {
  const pathEntries = (process.env.PATH ?? "").split(":").filter(Boolean);

  for (const entry of pathEntries) {
    try {
      await access(join(entry, command), constants.X_OK);
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

export async function detectSearchEngine(): Promise<SearchEngine> {
  if (await commandExists("rg")) {
    return "rg";
  }

  return "grep";
}

function buildRipgrepArgs(query: string, options: SearchOptions): string[] {
  const args = ["--line-number", "--with-filename", "--color", "never"];

  if (options.maxResults) {
    args.push("--max-count", String(options.maxResults));
  }

  for (const pattern of options.include ?? []) {
    args.push("--glob", pattern);
  }

  args.push(query, ".");
  return args;
}

function buildGrepArgs(query: string, options: SearchOptions): string[] {
  const args = ["-R", "-n", "-I"];

  for (const pattern of options.include ?? []) {
    args.push("--include", pattern);
  }

  args.push(query, ".");
  return args;
}

function parseRipgrepLine(line: string): SearchMatch | null {
  const match = line.match(/^(.*?):(\d+):(\d+):(.*)$/) ?? line.match(/^(.*?):(\d+):(.*)$/);

  if (!match) {
    return null;
  }

  if (match.length === 5) {
    return {
      file: match[1],
      line: Number(match[2]),
      column: Number(match[3]),
      preview: match[4].trim(),
    };
  }

  return {
    file: match[1],
    line: Number(match[2]),
    preview: match[3].trim(),
  };
}

function parseGrepLine(line: string): SearchMatch | null {
  const match = line.match(/^(.*?):(\d+):(.*)$/);

  if (!match) {
    return null;
  }

  return {
    file: match[1],
    line: Number(match[2]),
    preview: match[3].trim(),
  };
}

async function runSearchCommand(
  engine: SearchEngine,
  query: string,
  options: SearchOptions
): Promise<SearchMatch[]> {
  const cwd = options.cwd ?? process.cwd();
  const command = engine === "rg" ? "rg" : "grep";
  const args = engine === "rg" ? buildRipgrepArgs(query, options) : buildGrepArgs(query, options);

  try {
    const { stdout } = await execFileAsync(command, args, { cwd, maxBuffer: 1024 * 1024 * 10 });
    const parser = engine === "rg" ? parseRipgrepLine : parseGrepLine;
    const matches = stdout
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map(parser)
      .filter((match): match is SearchMatch => match !== null);

    return options.maxResults ? matches.slice(0, options.maxResults) : matches;
  } catch (error: unknown) {
    const execError = error as NodeJS.ErrnoException & { stdout?: string; code?: number };

    if (execError.code === 1) {
      return [];
    }

    if (typeof execError.stdout === "string" && execError.stdout.length > 0) {
      const parser = engine === "rg" ? parseRipgrepLine : parseGrepLine;
      return execError.stdout
        .split("\n")
        .map((line) => line.trimEnd())
        .filter(Boolean)
        .map(parser)
        .filter((match): match is SearchMatch => match !== null);
    }

    throw error;
  }
}

export async function searchInFiles(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const engine = await detectSearchEngine();
  const cwd = options.cwd ?? process.cwd();
  const matches = await runSearchCommand(engine, query, options);

  return {
    engine,
    query,
    cwd,
    matches,
  };
}
