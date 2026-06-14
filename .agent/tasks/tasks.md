# Task Board

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[-]` Blocked / Deferred

## V1.0 Tasks

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 1 | Implement CLI argument parser (command, flags, one-shot mode) | P0 | fullstack-engineer | [x] |
| 2 | Refactor config system to final `.anggor.json` schema | P0 | fullstack-engineer | [x] |
| 3 | Implement OpenAI provider (chat + streaming via Vercel AI SDK) | P0 | fullstack-engineer | [x] |
| 4 | Implement Anthropic provider (chat + streaming via Vercel AI SDK) | P0 | fullstack-engineer | [x] |
| 5 | Implement custom/OpenAI-compatible provider | P1 | fullstack-engineer | [x] |
| 6 | Implement Ollama provider | P1 | fullstack-engineer | [x] |
| 7 | Implement grep/ripgrep wrapper for context search | P0 | fullstack-engineer | [x] |
| 8 | Implement project scanner with `.gitignore` / `.ignore` support | P0 | fullstack-engineer | [x] |
| 9 | Implement file tools (read, write, apply patch, create, delete) | P0 | fullstack-engineer | [x] |
| 10 | Implement shell executor with safety rules | P0 | fullstack-engineer | [x] |
| 11 | Implement git workflow tools | P0 | fullstack-engineer | [x] |
| 12 | Implement session memory (in-session only) | P1 | fullstack-engineer | [x] |
| 13 | Implement planner module | P0 | fullstack-engineer | [x] |
| 14 | Implement todo tracking + `anggor status` | P0 | fullstack-engineer | [x] |
| 15 | Implement agent core ReAct loop | P0 | fullstack-engineer | [x] |
| 16 | Implement streaming output for model + tools | P0 | fullstack-engineer | [x] |
| 17 | Implement dry-run mode (`--dry-run`) | P0 | fullstack-engineer | [x] |
| 18 | Implement interrupt handling (`SIGINT`) | P0 | fullstack-engineer | [x] |
| 19 | Wire provider selection from config (single provider per session) | P0 | fullstack-engineer | [x] |
| 20 | Add Google/Gemini provider | P1 | fullstack-engineer | [x] |
| 21 | Add OpenRouter / Groq / DeepSeek provider support | P2 | fullstack-engineer | [x] |
| 22 | Update README and examples to match V1.0 blueprint | P1 | fullstack-engineer | [x] |
| 23 | Setup Vitest test infrastructure | P0 | test-engineer | [x] |
| 24 | Add unit tests for config loader | P0 | test-engineer | [x] |
| 25 | Add unit tests for providers | P1 | test-engineer | [x] |
| 26 | Add unit tests for file and shell tools | P1 | test-engineer | [x] |
| 27 | Add integration test for agent loop with mock provider | P1 | test-engineer | [x] |
| 28 | Verify startup target `<50ms` for `anggor --help` | P1 | qa-qc-engineer | [x] |
| 29 | Verify startup target `<200ms` for one-shot boot | P1 | qa-qc-engineer | [x] |
| 30 | Verify single-binary build flow | P1 | qa-qc-engineer | [x] |

## V1.1 Deferred Tasks

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 31 | Add persistent memory bank | P2 | fullstack-engineer | [x] |
| 32 | Add MCP client and discovery | P2 | fullstack-engineer | [x] |
| 33 | Add rollback and checkpoint support | P2 | fullstack-engineer | [x] |

## V2.0 Deferred Tasks

| # | Task | Priority | Agent | Status |
|---|------|----------|-------|--------|
| 34 | Add semantic search | P3 | fullstack-engineer | [x] |
| 35 | Add skill marketplace | P3 | fullstack-engineer | [x] |
| 36 | Add multi-provider routing | P3 | fullstack-engineer | [x] |
| 37 | Add cost tracking | P3 | fullstack-engineer | [x] |
| 38 | Add telemetry (opt-in) | P3 | fullstack-engineer | [x] |
| 39 | Add plugin system | P3 | fullstack-engineer | [x] |

## Guidelines
- Prioritize V1.0 until core workflow is usable end-to-end.
- Lock tasks before starting (`tasks/locks/<task-number>.lock`).
- Defer V1.1/V2.0 work unless it directly supports V1.0 implementation.
- Keep commit messages, PR titles, and code comments in English.
