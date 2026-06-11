# Database Rules

Anggor is a CLI tool - local-first architecture.

## Local Storage
- Config: `~/.anggor/config.json`
- Sessions: `~/.anggor/sessions/`
- Skills: `~/.anggor/skills/`
- Cache: `~/.anggor/cache/`

## Policies
- No cloud database dependency
- SQLite for local indexing (if needed)
- File-based config (JSON)
- All local data must be deletable without data loss (re-derivable)