# AGENT.md

Guidelines for AI coding agents contributing to the **Anggor** project.

## Project Summary

**Anggor** is a terminal-based AI coding agent with the following product principles:

- Fast by default
- Local-first
- Provider-agnostic
- Autonomous ReAct loop
- Minimal terminal UI
- Extensible via Skills, MCP, and plugins

The main project blueprint is [`BLUEPRINT.md`](./BLUEPRINT.md). All implementation work should maintain alignment with that blueprint.

## Primary Architecture Target

The project should follow the **V1.0 Core Minimalist** target:

- Primary runtime: **Bun**
- Language: TypeScript
- Distribution: single binary via `bun build --compile`
- CLI entrypoint: `src/index.ts`
- Primary config file: `.anggor.json`
- Provider support: OpenAI, Anthropic, Gemini/Google, Ollama, OpenRouter, Groq, DeepSeek, Azure/custom OpenAI-compatible providers
- Agent loop: ReAct with plan → tool call → observe → self-heal → validate
- Core tools:
  - file read/write/create/delete/patch
  - shell command executor with safety checks
  - git status/diff/log/branch/commit
  - grep/ripgrep search
  - todo tracking

## Implementation Principles

1. **Treat `BLUEPRINT.md` as the source of truth.**
2. **Preserve local-first behavior.** Do not send excessive project context to the LLM.
3. **Tool execution must be safe.** Use allowlists/blocklists and timeouts.
4. **File modifications must be rollback-friendly.** Prefer patch/checkpoint workflows.
5. **Never expose secrets.** Resolve `env:VAR_NAME` at runtime without printing the value.
6. **Lightweight commands must remain fast.** `--help` and `--version` should not load config/providers unless necessary.
7. **Stay provider-agnostic.** Avoid hardcoding any specific provider in the agent core.
8. **Run tests and typecheck before reporting completion.**

## Important Directory Structure

```text
src/
├── index.ts              # CLI entry point
├── runtime.ts            # Runtime context
├── agent/                # ReAct loop, memory, planner, prompts
├── cli/                  # Parser, router, help, CLI types
├── config/               # Schema, loader, config path resolution
├── providers/            # Provider registry and adapters
├── tools/                # File, terminal, git, search, todo tools
├── context/              # Scanner, grep, manifest, project graph
├── ui/                   # Output, spinner, stream, theme
├── utils/                # Safety and interrupt handling
├── memory/               # Persistent memory/checkpoint
├── mcp/                  # MCP support target V1.1
├── skills/               # Skill system target V2.0
├── semantic/             # Semantic search target V2.0
├── routing/              # Multi-provider routing target V2.0
├── telemetry/            # Opt-in telemetry target V2.0
└── plugins/              # Plugin system target V2.0
```

## Build and Runtime Policy

This project is intended to be **Bun-first**, according to the blueprint.

Expected commands:

```bash
bun install
bun run dev
bun run typecheck
bun test
bun run build
bun run compile
```

Target distribution:

```bash
bun build src/index.ts --compile --outfile dist/anggor
```

If Bun is not available in the current environment, do not move the project back to Node.js. Instead, report that Bun verification could not be performed in this environment.

## Required V1.0 CLI Commands

```bash
anggor
anggor "fix all lint errors"
anggor plan "add authentication"
anggor --dry-run "refactor helpers"
anggor resume
anggor commit
anggor provider list
anggor provider use openai
anggor config set approvalMode balanced
```

Notes:

- `--help` and `--version` must run without loading config/provider state.
- `provider use` and `config set` must actually update `.anggor.json`, not only print manual instructions.
- `commit` must request user approval in `safe` and `balanced` approval modes.

## Config Policy

The primary project config file is:

```text
.anggor.json
```

`anggor.config.json` may be supported as a compatibility fallback, but documentation and CLI output must prefer `.anggor.json`.

API key format:

```json
{
  "provider": {
    "name": "openai",
    "model": "gpt-4-turbo-preview",
    "apiKey": "env:OPENAI_API_KEY"
  }
}
```

The agent must resolve `env:OPENAI_API_KEY` to the corresponding environment variable at runtime. Do not treat the literal string `env:OPENAI_API_KEY` as the API key.

## Agent Core Requirements

The agent must:

1. Create a plan before modifying files.
2. Read files before editing them.
3. Use real tools, not placeholders.
4. Record tool calls in memory.
5. Run relevant validation such as tests, lint, or build commands.
6. Perform self-healing when a command/tool fails.
7. Stop when `maxIterations` is reached.
8. Respect interrupts (`Ctrl+C`).
9. Create checkpoints before write/patch/delete operations.
10. Roll back on failure or user cancellation when possible.

## Tool Safety Rules

For shell commands:

- Use allowlists and blocklists from config.
- Block destructive commands such as `rm -rf /`, `sudo`, `mkfs`, fork bombs, and system-level package manager operations unless explicitly approved.
- Use a default timeout of 30 seconds.
- Sanitize the environment; do not pass tokens/secrets by default.

For file operations:

- Do not operate outside the project root unless explicitly requested.
- `delete` must use safe delete/trash/backup behavior.
- `patch` must be valid and fail if hunks do not match.
- Create checkpoints before changes.

For git:

- `git commit` may stage changes, but requires approval in `safe` and `balanced` modes.
- Never push automatically unless the user explicitly requests it.

## Testing Policy

Before reporting completion, run the relevant checks:

```bash
bun run typecheck
bun test
bun run build
```

If Bun is unavailable, run the available fallback checks only for diagnosis and clearly report the limitation. Do not change the target runtime back to Node.js just because Bun is unavailable.

## Documentation and README

When adding or changing CLI features:

- Update `README.md`.
- Make sure feature status does not overclaim.
- Do not mark a feature as ✅ if it is still a stub or instruction-only.

## Known Compliance Gaps to Prioritize

When the agent encounters the following gaps, prioritize fixing them:

1. Full migration to Bun-first scripts and single-binary compilation.
2. Implement `config set`.
3. Make `provider use` actually update `.anggor.json`.
4. Resolve `env:VAR_NAME` in the config loader.
5. Integrate streaming output from providers into the CLI.
6. Make checkpoints effective before file write/patch/delete in the LLM path.
7. Optimize lightweight command startup time toward the `<50ms` target.
8. Enforce approval modes for destructive file actions and git commits.

## Code Style

- Use strict TypeScript.
- Use ESM imports with `.js` extensions for runtime compatibility.
- Avoid `any`; prefer `unknown` plus validation.
- Keep modules small and focused.
- Prefer exact, testable behavior over broad abstractions.

## Reporting Work Results

When finishing a task, report:

1. Files changed.
2. Behavior changed.
3. Verification commands run.
4. Typecheck/test/build results.
5. Remaining risks or limitations.
