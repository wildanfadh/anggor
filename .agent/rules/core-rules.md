# Core Rules

## TypeScript
- Use strict mode
- Use ES modules (import/export with .js extensions)
- Prefer `interface` over `type` for object shapes
- Use `zod` for runtime validation
- No `any` - use `unknown` and narrow types

## Naming
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Exports: named exports preferred

## Architecture
- Each module directory has an `index.ts` barrel file
- Providers implement the `Provider` interface
- Tools export a consistent interface
- Skills follow the `skill.json` + `prompt.md` convention
- Config is validated through Zod schemas

## Security
- Never hardcode API keys
- Use `env:` prefix for environment variable references in config
- Validate all user input
- Sanitize shell commands before execution
- No secrets in logs or error messages

## Performance
- Lazy-load providers on first use
- Cache project scan results
- Stream AI responses, don't buffer
- Minimize module imports at startup
- Target < 10ms startup time