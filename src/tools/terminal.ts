/**
 * Terminal / Shell Command Tools
 *
 * V1.0 shell executor with:
 * - Blocked/allowed command safety
 * - Automatic timeout
 * - Output capture (stdout + stderr)
 * - Environment isolation
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  buildSafeEnv,
  checkCommandSafety,
  type SafetyConfig,
} from "../utils/safety.js";

const execAsync = promisify(exec);

export interface ExecOptions {
  /** Working directory. Defaults to process.cwd(). */
  cwd?: string;
  /** Timeout in milliseconds. Defaults to 30000 (30s). */
  timeout?: number;
  /** If true, skip safety checks. Defaults to false. */
  unsafe?: boolean;
}

export interface ExecResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  duration: number;
}

const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 600_000; // 10 minutes cap

function getTimeout(override?: number): number {
  if (override === undefined) return DEFAULT_TIMEOUT;
  return Math.max(1000, Math.min(override, MAX_TIMEOUT));
}

export async function execCommand(
  command: string,
  safetyConfig: SafetyConfig,
  options: ExecOptions = {}
): Promise<ExecResult> {
  // 1. Safety check
  if (!options.unsafe) {
    const check = checkCommandSafety(command, safetyConfig);
    if (!check.allowed) {
      return {
        command,
        exitCode: -1,
        stdout: "",
        stderr: check.reason ?? "Command blocked by safety policy",
        timedOut: false,
        duration: 0,
      };
    }
  }

  // 2. Execute
  const timeout = getTimeout(options.timeout);
  const safeEnv = buildSafeEnv();
  const startTime = performance.now();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd ?? process.cwd(),
      timeout,
      env: safeEnv,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });

    return {
      command,
      exitCode: 0,
      stdout: typeof stdout === "string" ? stdout : String(stdout),
      stderr: typeof stderr === "string" ? stderr : String(stderr),
      timedOut: false,
      duration: Math.round(performance.now() - startTime),
    };
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException & {
      code?: string;
      stdout?: string;
      stderr?: string;
      killed?: boolean;
    };

    const timedOut = err.killed === true || err.code === "ETIMEDOUT";

    return {
      command,
      exitCode: typeof err.code === "number" ? err.code : 1,
      stdout: typeof err.stdout === "string" ? err.stdout : "",
      stderr: typeof err.stderr === "string" ? err.stderr : String(err.message ?? ""),
      timedOut,
      duration: Math.round(performance.now() - startTime),
    };
  }
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export const terminalTools = {
  execCommand,
} as const;
