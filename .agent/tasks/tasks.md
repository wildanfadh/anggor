# Task Board

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[-]` Blocked

## Tasks

| # | Task | Priority | Agent | Status | 
|---|------|----------|-------|--------|
| 1 | Implement CLI argument parser (command, flags, one-shot mode) | P0 | fullstack-engineer | [ ] |
| 2 | Implement config loader (anggor.config.json + ~/.anggor/config.json + env vars) | P0 | fullstack-engineer | [ ] |
| 3 | Implement OpenAI provider (chat + streaming via Vercel AI SDK) | P0 | fullstack-engineer | [ ] |
| 4 | Implement Anthropic provider (chat + streaming via Vercel AI SDK) | P0 | fullstack-engineer | [ ] |
| 5 | Implement Google/Gemini provider (chat + streaming) | P1 | fullstack-engineer | [ ] |
| 6 | Implement Ollama provider (chat + streaming) | P1 | fullstack-engineer | [ ] |
| 7 | Implement Custom/OpenAI-compatible provider | P1 | fullstack-engineer | [ ] |
| 8 | Implement file tools (read, write, patch, create, delete) | P0 | fullstack-engineer | [ ] |
| 9 | Implement terminal/shell command tool | P0 | fullstack-engineer | [ ] |
| 10 | Implement git tools (status, diff, log, branch, commit) | P0 | fullstack-engineer | [ ] |
| 11 | Implement search tools (code search, file find) | P1 | fullstack-engineer | [ ] |
| 12 | Implement todo tracking tool | P1 | fullstack-engineer | [ ] |
| 13 | Implement agent core loop (plan → execute → validate → iterate) | P0 | fullstack-engineer | [ ] |
| 14 | Implement planner module (plan generation, step tracking) | P0 | fullstack-engineer | [ ] |
| 15 | Implement session memory (save/restore/summarize) | P1 | fullstack-engineer | [ ] |
| 16 | Implement approval system (safe/balanced/dangerous modes) | P0 | fullstack-engineer | [ ] |
| 17 | Implement project scanner (detect framework, language, tools) | P1 | fullstack-engineer | [ ] |
| 18 | Implement MCP client (JSON-RPC connection, tool discovery) | P1 | fullstack-engineer | [ ] |
| 19 | Implement MCP discovery & registry | P2 | fullstack-engineer | [ ] |
| 20 | Implement skill loader (built-in + user-installed) | P1 | fullstack-engineer | [ ] |
| 21 | Implement terminal UI (chat mode, spinners, colors, output) | P0 | fullstack-engineer | [ ] |
| 22 | Setup Vitest test infrastructure | P0 | test-engineer | [ ] |
| 23 | Unit tests for config loader (Zod validation) | P1 | test-engineer | [ ] |
| 24 | Unit tests for provider interface | P1 | test-engineer | [ ] |
| 25 | Unit tests for file tools | P1 | test-engineer | [ ] |
| 26 | Integration test: agent loop with mock provider | P1 | test-engineer | [ ] |
| 27 | Verify startup time < 10ms | P1 | qa-qc-engineer | [ ] |
| 28 | Verify single binary build works (tsup compile) | P1 | qa-qc-engineer | [ ] |

## Guidelines
- One task per row, be specific
- Lock tasks before starting (`tasks/locks/<task-number>.lock`)
- Update status when starting/completing
- Link to relevant files or commits in notes