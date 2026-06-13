/**
 * File Tools
 *
 * V1.0 file manipulation: read, write, create, delete (safe), and apply unified diff patches.
 * All changes use patch-based workflow so they're easy to rollback.
 */

import {
  access,
  mkdir,
  readFile as fsReadFile,
  rename,
  unlink,
  writeFile as fsWriteFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Public tool signatures
// ---------------------------------------------------------------------------

export interface ReadFileOptions {
  /** 1-based start line (inclusive). */
  lineStart?: number;
  /** 1-based end line (inclusive). */
  lineEnd?: number;
}

export interface FileWriteResult {
  path: string;
  bytes: number;
}

export interface FileDeleteResult {
  path: string;
  safe: boolean;
  /** Backup path when safeMode moved the file instead of deleting. */
  backupPath?: string;
}

export interface PatchHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

function resolvePath(input: string, cwd?: string): string {
  return resolve(cwd ?? process.cwd(), input);
}

function readFileContent(path: string, options: ReadFileOptions): string {
  const lines = path.split("\n");
  const start = options.lineStart ?? 1;
  const end = options.lineEnd ?? lines.length;
  const clampedStart = Math.max(1, Math.min(start, lines.length));
  const clampedEnd = Math.max(clampedStart, Math.min(end, lines.length));
  return lines.slice(clampedStart - 1, clampedEnd).join("\n");
}

// ---------------------------------------------------------------------------
// Safe delete – try desktop trash, fallback to .bak rename
// ---------------------------------------------------------------------------

async function tryDesktopTrash(filePath: string): Promise<boolean> {
  const commands = [
    { cmd: "gio", args: ["trash", filePath] },
    { cmd: "kioclient5", args: ["move", filePath, "trash:/"] },
    { cmd: "trash", args: [filePath] },
  ];

  for (const { cmd, args } of commands) {
    try {
      await execFileAsync(cmd, args, { timeout: 3000 });
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

async function safeDeleteFile(filePath: string): Promise<{ backupPath?: string }> {
  if (await tryDesktopTrash(filePath)) {
    return {};
  }

  const backupPath = `${filePath}.bak`;
  await rename(filePath, backupPath);
  return { backupPath };
}

// ---------------------------------------------------------------------------
// Unified diff parser
// ---------------------------------------------------------------------------

function parsePatchHunks(diff: string): PatchHunk[] {
  const lines = diff.split("\n");
  const hunks: PatchHunk[] = [];
  let current: PatchHunk | null = null;

  const hunkHeaderRe = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/;

  for (const line of lines) {
    const headerMatch = line.match(hunkHeaderRe);

    if (headerMatch) {
      if (current) {
        hunks.push(current);
      }

      current = {
        oldStart: Number(headerMatch[1]),
        oldCount: Number(headerMatch[2] ?? 1),
        newStart: Number(headerMatch[3]),
        newCount: Number(headerMatch[4] ?? 1),
        lines: [],
      };

      continue;
    }

    if (current && (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-"))) {
      current.lines.push(line);
    }
  }

  if (current) {
    hunks.push(current);
  }

  return hunks;
}

function applyHunks(original: string, hunks: PatchHunk[]): string {
  const originalLines = original.split("\n");
  const result: string[] = [];
  let srcLine = 0; // 0-indexed pointer into originalLines

  for (const hunk of hunks) {
    // Copy lines before the hunk's old position
    while (srcLine < hunk.oldStart - 1) {
      result.push(originalLines[srcLine]);
      srcLine++;
    }

    let oldLineIdx = 0;

    for (const patchLine of hunk.lines) {
      const prefix = patchLine[0];
      const content = patchLine.slice(1);

      if (prefix === " ") {
        result.push(content);
        oldLineIdx++;
        srcLine++;
      } else if (prefix === "-") {
        oldLineIdx++;
        srcLine++;
      } else if (prefix === "+") {
        result.push(content);
      }
    }
  }

  // Copy remaining lines after last hunk
  while (srcLine < originalLines.length) {
    result.push(originalLines[srcLine]);
    srcLine++;
  }

  return result.join("\n");
}

// ---------------------------------------------------------------------------
// Public file tools
// ---------------------------------------------------------------------------

export async function readFile(
  path: string,
  options: ReadFileOptions = {}
): Promise<string> {
  const fullPath = resolvePath(path);
  const content = await fsReadFile(fullPath, "utf8");
  return readFileContent(content, options);
}

export async function writeFile(
  path: string,
  content: string
): Promise<FileWriteResult> {
  const fullPath = resolvePath(path);

  await ensureDir(fullPath);
  await fsWriteFile(fullPath, content, "utf8");

  return { path: fullPath, bytes: Buffer.byteLength(content, "utf8") };
}

export async function createFile(
  path: string,
  content: string
): Promise<FileWriteResult> {
  const fullPath = resolvePath(path);

  try {
    await access(fullPath, constants.F_OK);
    throw new Error(`File already exists: ${fullPath}`);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await ensureDir(fullPath);
  await fsWriteFile(fullPath, content, "utf8");

  return { path: fullPath, bytes: Buffer.byteLength(content, "utf8") };
}

export async function deleteFile(
  path: string,
  safeMode = true
): Promise<FileDeleteResult> {
  const fullPath = resolvePath(path);

  try {
    await access(fullPath, constants.F_OK);
  } catch {
    throw new Error(`File not found: ${fullPath}`);
  }

  if (safeMode) {
    const { backupPath } = await safeDeleteFile(fullPath);
    return { path: fullPath, safe: true, backupPath };
  }

  await unlink(fullPath);
  return { path: fullPath, safe: false };
}

export async function applyPatch(
  path: string,
  diff: string
): Promise<FileWriteResult> {
  const fullPath = resolvePath(path);
  const original = await fsReadFile(fullPath, "utf8");
  const hunks = parsePatchHunks(diff);

  if (hunks.length === 0) {
    throw new Error(`No valid hunks found in patch for: ${fullPath}`);
  }

  const patched = applyHunks(original, hunks);
  await fsWriteFile(fullPath, patched, "utf8");

  return { path: fullPath, bytes: Buffer.byteLength(patched, "utf8") };
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const fileTools = {
  readFile,
  writeFile,
  createFile,
  deleteFile,
  applyPatch,
} as const;
