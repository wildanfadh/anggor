# Developer Instructions

## Project Setup
```bash
npm install           # Install dependencies
npm run dev           # Run in dev mode
npm run build         # Build for production
npm test              # Run tests
npm run typecheck     # Type check
```

## Architecture
Anggor follows a modular architecture:

```
src/
├── agent/        # Core agent loop, planner, memory, prompts
├── providers/    # AI provider implementations (OpenAI, Anthropic, etc.)
├── tools/        # Agent tools (file, terminal, git, search, todo)
├── mcp/          # Model Context Protocol client and registry
├── skills/       # Built-in and loaded skills
├── context/      # Project scanning, indexing, semantic search
├── ui/           # Terminal UI (colors, spinner, output)
└── config/       # Configuration loading and validation
```

## Key Principles
1. **Fast by default** - startup < 10ms, minimal memory
2. **Local-first** - most processing happens locally
3. **Provider-agnostic** - use Vercel AI SDK as abstraction
4. **Type-safe** - Zod for config validation, strict TS
5. **Modular** - each module is independent and testable

## Commit Convention
Use conventional commits in **English**:
```
feat(scope): description
fix(scope): description
refactor(scope): description
docs(scope): description
test(scope): description
chore(scope): description
```
All commit messages, PR titles, and code comments must be in **English**.