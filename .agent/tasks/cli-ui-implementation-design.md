# CLI UI Implementation Design

## Goal

Improve Anggor's terminal experience for developers and vibe coders by applying the updated BLUEPRINT.md CLI UI strategy:

- Use `@clack/prompts` for user interaction and prompts.
- Use `@poppinss/cliui` for structured informational output.
- Keep Anggor runtime, scripts, examples, and subprocess assumptions Bun-first, not Node-first.
- Preserve fast startup for lightweight commands such as `anggor --help` and `anggor --version`.

## UX Principles

1. **Fast by default**
   - `--help` and `--version` should stay on a lightweight path.
   - Avoid loading heavy UI modules for commands that only print static text.

2. **Quiet unless useful**
   - Show concise progress, not noisy logs.
   - Hide verbose tool output by default unless a command fails.

3. **Actionable output**
   - Errors should explain what happened and what the developer should do next.
   - Provider/API-key errors should show exact env var setup examples.

4. **Agent transparency**
   - During autonomous execution, users should always know:
     - current phase,
     - current tool,
     - files touched,
     - test/build result,
     - whether approval is required.

5. **Bun-first runtime**
   - Commands, docs, examples, and CLI-generated suggestions must prefer `bun`, not `node`/`npm`, unless the target project clearly uses another package manager.

## Library Responsibilities

### `@clack/prompts`

Use for interactive flows:

- chat input prompt,
- confirm before commit,
- approval prompt for file edits / risky shell commands,
- select provider,
- choose action after failed tests,
- onboarding config wizard.

Examples:

- `confirmAction(message)`
- `selectProvider(providers, activeProvider)`
- `textInput(message, placeholder?)`
- `approvalPrompt(action, riskLevel)`

### `@poppinss/cliui`

Use for structured output:

- plan sections,
- task/progress lists,
- changed-files tables,
- provider tables,
- MCP server tables,
- skill tables,
- final execution summaries,
- warning/error/info boxes.

Examples:

- `section(title, body?)`
- `table(columns, rows)`
- `taskList(tasks)`
- `summary(result)`
- `errorBox(error, nextSteps)`

### Custom streaming

Keep custom streaming for LLM token output and raw progressive logs:

- do not wrap live token streams in boxes/tables,
- use CLI UI only for stream header/footer,
- retain direct `process.stdout.write` where real-time token rendering is needed.

## Proposed File Structure

```text
src/ui/
├── theme.ts              # Existing color helpers via picocolors
├── output.ts             # Compatibility layer; delegates to new UI helpers
├── spinner.ts            # Clack spinner wrapper
├── stream.ts             # Token/tool streaming; remains custom where needed
├── cliui.ts              # New @poppinss/cliui wrapper for structured output
└── prompts.ts            # New @clack/prompts wrapper for user interaction
```

## Command-Level UI Design

### `anggor --help` and `anggor --version`

- Keep current static output path.
- Do not import `@poppinss/cliui` here if it impacts cold start.
- Target remains `<50ms`.

### `anggor plan "task"`

Display:

```text
PLAN  add authentication

1. Analyze task requirements
2. Determine affected files
3. Create implementation plan
4. Review plan for safety
```

Use `@poppinss/cliui` section/list formatting.

### `anggor "task"`

Display compact execution phases:

```text
TASK  fix all lint errors

◷ scan      reading project context
✓ search    found 8 relevant files
✓ edit      patched src/foo.ts
✓ test      bun test passed

RESULT
✓ completed in 4.2s
changed: 2 files
tests: passed
```

Rules:

- Successful tool output is summarized.
- Failed tool output includes concise stderr/stdout excerpt.
- Long output is truncated with a clear continuation note.

### `anggor review`

Display changed files as a table:

```text
Changed files

Status  File
M       src/agent/core.ts
M       src/cli/router.ts
A       AGENT.md
```

### `anggor provider list`

Display provider table:

```text
Providers

Active  Name        Models
*       openai      gpt-4o, gpt-4-turbo, gpt-3.5-turbo
        anthropic   claude-3-5-sonnet, claude-3-opus
```

### `anggor commit`

Replace native `readline` confirmation with `@clack/prompts` confirm/select.

Flow:

1. Show changed files table.
2. Generate or suggest commit message.
3. Ask:

```text
Commit with this message?
› Yes
  Edit message
  Cancel
```

### `anggor mcp list`

Display configured MCP servers as a table. If empty, show quiet muted message.

### `anggor skill list`

Display built-in and installed skills as table:

```text
Skills

Name       Source    Description
reviewer   builtin   Review code for bugs...
refactor   builtin   Refactor code...
```

## Approval UX

Approval should reflect `config.agent.approvalMode`.

### `safe`

Ask before:

- file writes,
- patches,
- deletes,
- shell commands,
- git commit,
- MCP tool calls,
- plugin tool calls.

### `balanced`

Ask before:

- delete,
- overwrite,
- large patch,
- git commit,
- commands outside common safe commands,
- command with network/package install behavior.

### `auto`

Only block dangerous commands by policy; no routine prompts.

## Bun-First Runtime Rules

1. `package.json` scripts must use Bun commands.
2. CLI examples should prefer:
   - `bun install`
   - `bun test`
   - `bun run typecheck`
   - `bun run dev`
   - `bun run compile`
3. Agent-generated validation commands should prefer Bun when project contains `bun.lock` or `bun.lockb`.
4. Terminal safety allowlist should include `bun` as first-class command.
5. Avoid suggesting direct `node` commands unless:
   - the user asks for Node specifically,
   - the target project has no Bun setup,
   - a tool is only available through Node.

## Error UX

Provider/API key error should be normalized.

Example:

```text
Missing provider key

Provider : openai
Model    : gpt-4o
Env var  : OPENAI_API_KEY

Fix:
  export OPENAI_API_KEY="sk-..."

Or edit .anggor.json:
  { "provider": { "apiKey": "env:OPENAI_API_KEY" } }
```

Shell command failure example:

```text
Command failed

Command : bun test
Exit    : 1

Output:
  src/foo.test.ts:12
  Expected true, got false

Next:
  Anggor can inspect this failure and attempt a fix.
```

## Implementation Phases

### Phase 1 — UI Foundations

- Add `@poppinss/cliui` dependency.
- Add `src/ui/cliui.ts` wrapper.
- Add `src/ui/prompts.ts` wrapper.
- Keep existing `src/ui/output.ts` API as compatibility layer.
- Ensure all runtime scripts continue using Bun.

### Phase 2 — Migrate Read-Only Commands

- Migrate `plan`, `status`, `review`, `provider list`, `mcp list`, `skill list` to structured output.
- Add tests/snapshots for key command output.

### Phase 3 — Migrate Interactive Commands

- Replace `readline` in chat and commit flows with `@clack/prompts`.
- Add approval prompt helpers.
- Add graceful cancel handling.

### Phase 4 — Agent Execution UX

- Add structured phase/task display for scan/search/edit/test.
- Summarize successful tools.
- Show concise failure details and next actions.
- Preserve custom token streaming.

### Phase 5 — Polish & Performance

- Benchmark `./dist/anggor --help` and `--version`.
- Benchmark one-shot startup.
- Check binary size impact.
- Ensure no Node-first examples remain in docs or generated messages.

## Acceptance Criteria

- `bun test` passes.
- `bun run typecheck` passes.
- `bun run compile` produces `dist/anggor`.
- `./dist/anggor --help` remains near the `<50ms` target.
- `anggor plan`, `review`, `provider list`, `mcp list`, and `skill list` use structured output.
- `anggor commit` uses Clack prompt confirmation.
- Provider/API-key errors are actionable.
- Documentation and CLI suggestions are Bun-first.
- `BLUEPRINT.md` is ignored by git and not intended for publishing.

## Risks

| Risk | Mitigation |
|------|------------|
| Startup regression from UI imports | Keep help/version on static path; lazy-load CLI UI wrappers where useful. |
| Streaming output gets messy | Keep token streaming custom; use CLI UI only for boundaries and summaries. |
| Too much visual noise | Default to compact output; only expand on errors. |
| Bun vs other package managers | Detect project lockfiles; prefer Bun only when appropriate. |

## Notes

This task is intentionally UI-layer focused. It should not change provider logic, tool semantics, MCP protocol behavior, or agent reasoning prompts except where needed to improve user-facing command selection and error messages.
