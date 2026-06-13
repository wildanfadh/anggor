export const CLI_VERSION = "0.1.0";

export function getHelpText(): string {
  return `Anggor v${CLI_VERSION}

Usage:
  anggor                      Start interactive chat mode
  anggor "<prompt>"           Run one-shot mode
  anggor plan "<prompt>"      Create a plan without executing
  anggor --dry-run "<prompt>" Show plan without executing
  anggor status               Show current todos and plan
  anggor review               Review current changes
  anggor explain <file>       Explain a file
  anggor commit               Generate a commit message
  anggor resume               Resume previous session
  anggor mcp <subcommand>     Manage MCP servers
  anggor skill <subcommand>   Manage skills
  anggor provider <subcommand> Manage providers

Global flags:
  -h, --help                  Show help
  -v, --version               Show version
  --dry-run                   Show plan without executing

Examples:
  anggor
  anggor "fix all lint errors"
  anggor plan "add authentication"
  anggor --dry-run "refactor helpers"
  anggor status
  anggor explain src/agent/core.ts
  anggor mcp list
  anggor skill install laravel-reviewer
  anggor provider use openai`;
}
