# Examples

## Basic Usage

### One-shot mode
```bash
anggor "fix all lint errors"
```

### Plan mode (dry-run)
```bash
anggor plan "add authentication"
```

### Dry-run with flag
```bash
anggor --dry-run "refactor helpers"
```

### Show status
```bash
anggor status
```

## Programmatic Usage

### Create an Agent

```typescript
import { Agent } from "./src/agent/core.js";
import type { Config } from "./src/config/schema.js";

const config: Config = {
  provider: { name: "openai", model: "gpt-4-turbo-preview" },
  agent: { maxIterations: 15, temperature: 0.7, approvalMode: "balanced" },
  context: { maxTokens: 8000, ignorePatterns: [], scanDepth: 3 },
  safety: {
    blockedCommands: ["rm -rf", "sudo"],
    allowedCommands: ["npm", "git", "node"],
  },
  theme: { primary: "cyan", secondary: "dim", error: "red", success: "green" },
  mcpServers: {},
};

const agent = new Agent({ config });
```

### Execute a Task

```typescript
const result = await agent.execute("Fix lint errors in src/");

console.log(result.success);  // true/false
console.log(result.message);  // Task completed in 3 iterations
console.log(result.changes);  // ['terminal.exec', 'file.patch']
console.log(result.duration); // 1234
```

### Plan Only (Dry-run)

```typescript
const result = await agent.planOnly("Add authentication");

console.log(result.message);
// PLAN (dry-run)
//
// Task: Add authentication
//
// Steps:
//   1. Analyze task requirements
//   2. Determine affected files
//   3. Create implementation plan
//   4. Review plan for safety
```

### Get Status

```typescript
const status = agent.getStatus();

console.log(status);
// PLAN: Add authentication
//
// [x] 1. Analyze task requirements
// [ ] 2. Determine affected files
// [ ] 3. Create implementation plan
//
// TODO
//
// [done] Analyze task requirements
// [pending] Determine affected files
```

### Interrupt Handling

```typescript
import { createInterruptHandler } from "./src/utils/interrupt.js";

const agent = new Agent({ config });
const interrupt = createInterruptHandler(agent);
interrupt.register();

// Agent will stop gracefully on Ctrl+C
const result = await agent.execute("Long running task");

if (interrupt.isInterrupted()) {
  console.log("Execution was interrupted");
}

interrupt.unregister();
```

## Tool Usage

### File Tools

```typescript
import { readFile, writeFile, applyPatch, createFile, deleteFile } from "./src/tools/file.js";

// Read file
const content = await readFile("src/index.ts");

// Read with line range
const lines = await readFile("src/index.ts", { lineStart: 10, lineEnd: 20 });

// Write file
await writeFile("output.txt", "Hello, world!");

// Create file (fails if exists)
await createFile("new-file.txt", "content");

// Delete file (safe mode - moves to trash)
await deleteFile("old-file.txt", true);

// Apply patch
const diff = `--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,3 @@
 line1
-old line
+new line
 line3
`;
await applyPatch("file.txt", diff);
```

### Terminal Tools

```typescript
import { execCommand } from "./src/tools/terminal.js";

const safetyConfig = {
  blockedCommands: ["rm -rf", "sudo"],
  allowedCommands: ["npm", "git", "node"],
};

const result = await execCommand("bun test", safetyConfig);

console.log(result.exitCode);  // 0
console.log(result.stdout);    // Test output
console.log(result.duration);  // 1234
```

### Git Tools

```typescript
import { gitStatus, gitDiff, gitLog, gitBranch, gitCommit } from "./src/tools/git.js";

// Get status
const status = await gitStatus(".");
console.log(status.branch);  // main
console.log(status.files);   // [{ path: "file.ts", index: "M", worktree: " " }]

// Get diff
const diff = await gitDiff(".");

// Get log
const log = await gitLog(5);
console.log(log[0].message);  // feat: add feature

// Get branch
const branch = await gitBranch(".");
console.log(branch.current);  // main

// Commit
const commit = await gitCommit("feat: add new feature");
console.log(commit.shortHash);  // abc1234
```

### Search Tools

```typescript
import { searchInFiles } from "./src/context/grep.js";

const result = await searchInFiles("TODO", { cwd: "." });

console.log(result.engine);  // rg or grep
console.log(result.matches); // [{ file: "...", line: 10, preview: "// TODO: fix" }]
```

## Streaming Output

```typescript
import { streamTokens, streamToolExecution } from "./src/ui/stream.js";

// Stream LLM tokens
async function* generateTokens() {
  yield "Hello";
  yield " ";
  yield "world";
}
await streamTokens(generateTokens());

// Stream tool execution with spinner
const result = await streamToolExecution(
  "terminal.exec",
  "Running tests",
  async () => {
    return await execCommand("bun test", safetyConfig);
  }
);
```

## Project Scanner

```typescript
import { Scanner } from "./src/context/scanner.js";
import { ProjectGraph } from "./src/context/graph.js";

const scanner = new Scanner();
const info = await scanner.scan(".");

console.log(info.language);      // TypeScript/JavaScript
console.log(info.framework);     // Next.js
console.log(info.testFramework); // Vitest

const graph = new ProjectGraph();
console.log(graph.format(info));
// Project Graph
// ├── Framework: Next.js
// ├── Language: TypeScript/JavaScript
// └── Test: Vitest
```
