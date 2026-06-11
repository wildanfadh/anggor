# Anggor

> Fast, Local-First, Provider-Agnostic Autonomous Coding Agent for the Terminal.

Anggor adalah AI Coding Agent berbasis CLI yang dirancang untuk developer yang menginginkan pengalaman coding agent yang cepat, minimalis, extensible, dan sepenuhnya berjalan di lingkungan lokal mereka.

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

## Architecture

```
src/
├── agent/        # Core agent loop, planner, memory, prompts
├── providers/    # AI provider implementations
├── tools/        # Agent tools (file, terminal, git, search, todo)
├── mcp/          # Model Context Protocol support
├── skills/       # Built-in and loaded skills
├── context/      # Project scanning, indexing, semantic search
├── ui/           # Terminal UI (colors, spinner, output)
└── config/       # Configuration loading and validation
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Bun (Node.js compatible) |
| Language | TypeScript |
| CLI UI | @clack/prompts |
| Colors | picocolors |
| AI SDK | Vercel AI SDK |
| Validation | Zod |
| Config | JSON |
| Build | tsup |
| Test | Vitest |

## Development

```bash
npm run dev          # Development mode
npm run build        # Production build
npm test             # Run tests
npm run test:watch   # Watch mode
npm run lint         # Lint code
npm run typecheck    # Type check
```

## Configuration

Create `anggor.config.json` in your project root:

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "approvalMode": "balanced",
  "providers": {},
  "mcpServers": {}
}
```

## License

MIT