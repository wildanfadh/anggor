/**
 * Safety Utilities
 *
 * Shell command safety checks for V1.0.
 * Checks against blocked patterns, allowed whitelist, and dangerous shell constructs.
 */

export interface SafetyConfig {
  blockedCommands: string[];
  allowedCommands: string[];
}

const DANGEROUS_PATTERNS: RegExp[] = [
  // Fork bomb
  /:\(\)\s*\{.*\|.*\&\s*\}/,
  // rm -rf on root or home
  /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+\/(\s|$)/,
  /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+~\/?/,
  // sudo anywhere
  /\bsudo\b/,
  // dd to raw device
  /\bdd\b.*of=\/dev\//,
  // mkfs on device
  /\bmkfs\b/,
  // chmod 777 on system dirs
  /\bchmod\b.*777\s*\//,
  // piping to bash from curl/wget
  /curl\b.*\|\s*(ba)?sh/,
  /wget\b.*\|\s*(ba)?sh/,
  // drop database (SQL)
  /\bdrop\s+database\b/i,
  // shutdown/reboot
  /\bshutdown\b/,
  /\breboot\b/,
  // System-level package managers
  /\bapt(-get)?\s+(install|remove|purge)\b/,
  /\bdnf\s+(install|remove)\b/,
  /\byum\s+(install|remove)\b/,
  /\bpacman\s+(-S|-R)\b/,
];

const SENSITIVE_ENV_PATTERNS: RegExp[] = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
  /auth/i,
  /private[_-]?key/i,
];

const SAFE_ENV_VARS = new Set([
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TERM",
  "TMPDIR",
  "TEMP",
  "TMP",
  "XDG_RUNTIME_DIR",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_CACHE_HOME",
  "NODE_ENV",
  "NODE_PATH",
  "BUN_INSTALL",
  "NVM_DIR",
]);

function extractBaseCommand(command: string): string {
  // Extract the first token from the command (the program being run)
  // Handles: "npm test", "node script.js", "git status", "npx vitest run"
  const trimmed = command.trim();

  // Handle env var assignments at the start: NODE_ENV=production npm test
  const withoutEnvVars = trimmed.replace(/^([A-Z_][A-Z0-9_]*=\S+\s+)*/, "");
  const firstToken = withoutEnvVars.split(/\s+/)[0];

  // Handle full paths: /usr/bin/node → node
  const basename = firstToken.split("/").pop() ?? firstToken;

  return basename;
}

function isDangerousPattern(command: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}

function isBlockedByConfig(command: string, blocked: string[]): boolean {
  const lowerCommand = command.toLowerCase();
  return blocked.some((pattern) => lowerCommand.includes(pattern.toLowerCase()));
}

function isAllowedByConfig(command: string, allowed: string[]): boolean {
  if (allowed.length === 0) {
    // Empty allowed list = all commands allowed (no whitelist)
    return true;
  }

  const base = extractBaseCommand(command).toLowerCase();
  return allowed.some((cmd) => cmd.toLowerCase() === base);
}

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkCommandSafety(
  command: string,
  config: SafetyConfig
): SafetyCheckResult {
  // 1. Check dangerous patterns
  if (isDangerousPattern(command)) {
    return {
      allowed: false,
      reason: `Command contains a dangerous pattern: \`${command.trim()}\``,
    };
  }

  // 2. Check blocked commands
  if (isBlockedByConfig(command, config.blockedCommands)) {
    return {
      allowed: false,
      reason: `Command is blocked: \`${command.trim()}\``,
    };
  }

  // 3. Check allowed whitelist
  if (!isAllowedByConfig(command, config.allowedCommands)) {
    return {
      allowed: false,
      reason: `Command not in allowlist: \`${extractBaseCommand(command)}\` (allowed: ${config.allowedCommands.join(", ")})`,
    };
  }

  return { allowed: true };
}

/**
 * Build a sanitized environment for subprocess execution.
 * Strips out sensitive-looking env vars while keeping safe ones.
 */
export function buildSafeEnv(
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const safeEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;

    if (SAFE_ENV_VARS.has(key)) {
      safeEnv[key] = value;
      continue;
    }

    const isSensitive = SENSITIVE_ENV_PATTERNS.some((p) => p.test(key));
    if (!isSensitive) {
      safeEnv[key] = value;
    }
  }

  return safeEnv;
}
