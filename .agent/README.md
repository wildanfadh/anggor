# Anggor - Agent Directory

This directory contains configuration and conventions for AI agents working on this project.

## Structure

```
.agent/
├── agents/          # Agent role definitions
├── instructions/     # Project-specific instructions
├── rules/           # Coding rules and policies
├── tasks/           # Task tracking
├── knowledge/       # Domain knowledge
└── logs/            # Change logs
```

## Quick Links

- [Coordinator Agent](agents/coordinator.md)
- [Developer Instructions](instructions/developer.md)
- [Core Rules](rules/core-rules.md)
- [Database Rules](rules/database.md)
- [Task Board](tasks/tasks.md)

## Project Info

- **Name**: Anggor
- **Stack**: TypeScript + Bun
- **Runtime**: Bun (Node.js compatible)
- **Build**: `bun build --compile` for single binary
- **AI SDK**: Vercel AI SDK
- **Testing**: Vitest
- **Commit Language**: English