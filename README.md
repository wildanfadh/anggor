# Anggor

> Fast, Local-First, Provider-Agnostic Autonomous Coding Agent for the Terminal.

Anggor adalah AI Coding Agent berbasis CLI yang dirancang untuk developer yang menginginkan pengalaman coding agent yang cepat, minimalis, dapat diperluas, dan berjalan local-first.

## Fitur V1.0

| Fitur | Status |
|-------|--------|
| Context-Aware Project Scanner (grep-based) | ✅ |
| Autonomous File Manipulation (patch-based) | ✅ |
| Shell Command Executor (dengan safety) | ✅ |
| Git-Aware Workflow (status, diff, commit) | ✅ |
| Session Memory (dalam sesi) | ✅ |
| Planning Mode + Todo Tracking | ✅ |
| Streaming Output | ✅ |
| Dry-run Mode | ✅ |
| Interrupt Handling (Ctrl+C) | ✅ |
| Single Provider per Session | ✅ |

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test
```

## CLI Commands

```bash
# Interactive chat mode
anggor

# One-shot mode
anggor "fix all lint errors"

# Plan without executing
anggor plan "add authentication"

# Dry-run mode (show plan only)
anggor --dry-run "refactor helpers"

# Show current status
anggor status

# Review changes
anggor review

# Explain a file
anggor explain src/agent/core.ts

# Generate commit message
anggor commit

# Resume previous session
anggor resume

# MCP commands (V1.1)
anggor mcp list
anggor mcp add <name> <command>
anggor mcp remove <name>

# Skill commands (V2.0)
anggor skill list
anggor skill install <name>
anggor skill run <name> "<task>"

# Provider commands
anggor provider list
anggor provider use <name>

# Config commands
anggor config set approvalMode balanced
```

## Configuration

Anggor uses `anggor.config.json` in the project root:

```json
{
  "provider": {
    "name": "openai",
    "model": "gpt-4-turbo-preview",
    "apiKey": "env:OPENAI_API_KEY"
  },
  "agent": {
    "maxIterations": 15,
    "temperature": 0.7,
    "approvalMode": "balanced"
  },
  "context": {
    "maxTokens": 8000,
    "ignorePatterns": ["node_modules", "dist", ".git", "*.log"],
    "scanDepth": 3
  },
  "safety": {
    "blockedCommands": ["rm -rf", "sudo", "drop database", "mkfs"],
    "allowedCommands": ["npm", "yarn", "bun", "go", "python", "node", "git"]
  },
  "theme": {
    "primary": "cyan",
    "secondary": "dim",
    "error": "red",
    "success": "green"
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANGGOR_PROVIDER` | Provider name (openai, anthropic, etc.) |
| `ANGGOR_MODEL` | Model name |
| `ANGGOR_API_KEY` | API key |
| `ANGGOR_ENDPOINT` | Custom endpoint |
| `ANGGOR_APPROVAL_MODE` | Approval mode (safe, balanced, auto) |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_API_KEY` | Google API key |
| `OLLAMA_HOST` | Ollama endpoint |

## Architecture

```text
anggor/
├── src/
│   ├── index.ts                 # Entry point CLI
│   ├── agent/
│   │   ├── core.ts              # ReAct loop
│   │   ├── planner.ts           # Plan generation
│   │   ├── memory.ts            # Session memory
│   │   └── prompts.ts           # System prompts
│   ├── providers/
│   │   ├── index.ts             # Provider registry
│   │   ├── openai.ts            # OpenAI provider
│   │   ├── anthropic.ts         # Anthropic provider
│   │   ├── google.ts            # Google provider
│   │   ├── ollama.ts            # Ollama provider
│   │   └── custom.ts            # Custom provider
│   ├── tools/
│   │   ├── file.ts              # File manipulation
│   │   ├── terminal.ts          # Shell execution
│   │   ├── git.ts               # Git workflow
│   │   ├── search.ts            # Code search
│   │   ├── todo.ts              # Todo tracking
│   │   └── todo-tracker.ts      # Todo tracker class
│   ├── context/
│   │   ├── scanner.ts           # Project scanner
│   │   ├── manifest.ts          # Manifest parser
│   │   ├── grep.ts              # Grep/ripgrep wrapper
│   │   └── graph.ts             # Project graph
│   ├── ui/
│   │   ├── theme.ts             # Color theme
│   │   ├── output.ts            # Output utilities
│   │   ├── spinner.ts           # Loading spinner
│   │   └── stream.ts            # Streaming output
│   ├── config/
│   │   ├── index.ts             # Config exports
│   │   ├── schema.ts            # Zod schema
│   │   ├── loader.ts            # Config loader
│   │   └── paths.ts             # Path resolution
│   ├── cli/
│   │   ├── index.ts             # CLI exports
│   │   ├── parser.ts            # Argument parser
│   │   ├── router.ts            # Command router
│   │   ├── types.ts             # CLI types
│   │   └── help.ts              # Help text
│   └── utils/
│       ├── safety.ts            # Safety checks
│       └── interrupt.ts         # Interrupt handling
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Tech Stack

| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| Runtime | Bun / Node.js | Startup cepat |
| Bahasa | TypeScript | Type safety |
| CLI UI | @clack/prompts | Layout vertikal bersih |
| Warna | picocolors | Ultra ringan |
| AI SDK | Vercel AI SDK | Tool calling dan streaming |
| Validasi | Zod | Validasi input |
| Build | tsup | Fast bundling |
| Test | Vitest | Unit & integration tests |

## Target Performa

| Metric | Target |
|--------|--------|
| `anggor --help` | <50ms |
| `anggor "task"` | <200ms |
| Memory footprint idle | <30MB |
| Binary size | ~30-50MB |

## Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run typecheck

# Clean
npm run clean
```

## Roadmap

### V1.0 – Core Minimalis (Current)
- Context-aware project scanner
- Autonomous file manipulation
- Shell command executor with safety
- Git-aware workflow
- Session memory
- Planning mode + todo tracking
- Streaming output
- Dry-run mode
- Interrupt handling
- Single provider per session

### V1.1 – Persistent Memory & MCP
- Persistent memory bank
- MCP support
- Rollback & checkpoint

### V2.0 – Advanced Intelligence
- Semantic search
- Skill marketplace
- Multi-provider routing
- Cost tracking
- Telemetry (opt-in)
- Plugin system

## License

MIT
