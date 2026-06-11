````markdown
# Anggor

> Fast, Local-First, Provider-Agnostic Autonomous Coding Agent for the Terminal.

Anggor adalah AI Coding Agent berbasis CLI (Command Line Interface) yang dirancang untuk developer yang menginginkan pengalaman coding agent yang cepat, minimalis, extensible, dan sepenuhnya berjalan di lingkungan lokal mereka.

Berbeda dengan kebanyakan AI coding tools yang berfokus pada UI kompleks atau vendor tertentu, Anggor mengutamakan:

- Startup instan
- Single binary distribution
- Local-first architecture
- Autonomous execution
- Provider agnostic
- MCP extensibility
- Skill-based workflows

---

# Filosofi Produk

## 1. Minimalis

UI terminal bersih tanpa panel yang memenuhi layar.

Informasi ditampilkan hanya ketika dibutuhkan.

```bash
$ anggor "add jwt authentication"

PLAN

1. Analyze current auth flow
2. Create JWT middleware
3. Update routes
4. Add tests
5. Run test suite

Proceed? (Y/n)
```

---

## 2. Fast by Default

Target performa:

- Startup < 10ms
- Memory footprint rendah
- Single binary executable
- Context loading cepat

Anggor harus terasa seperti:

- git
- rg (ripgrep)
- fzf

Bukan seperti aplikasi desktop yang dipindahkan ke terminal.

---

## 3. Local First

Sebagian besar proses dilakukan secara lokal:

- Project scanning
- Context indexing
- Semantic search
- Git analysis
- MCP discovery
- Skill loading

LLM hanya menerima konteks yang benar-benar relevan.

---

## 4. Autonomous

Anggor mampu:

- Membuat rencana kerja
- Memilih tool yang tepat
- Memodifikasi file
- Menjalankan command
- Menjalankan test
- Memperbaiki error secara mandiri
- Melakukan iterasi sampai tugas selesai

---

## 5. Provider Agnostic

Anggor tidak terikat pada vendor AI tertentu.

Pengguna bebas menggunakan:

- OpenAI
- Anthropic
- Gemini
- OpenRouter
- Groq
- DeepSeek
- Ollama
- LM Studio
- Azure OpenAI
- Custom OpenAI-compatible endpoint

---

## 6. Extensible

Kemampuan Anggor dapat diperluas melalui:

- MCP Servers
- Skills
- Providers
- Plugins

---

# Core Features

## Context-Aware Project Scanner

Menganalisis struktur proyek secara cerdas.

Mematuhi:

- .gitignore
- .ignore
- custom ignore rules

Menghasilkan project graph:

```text
Project Graph
├── Framework: Next.js
├── Language: TypeScript
├── ORM: Prisma
├── Auth: NextAuth
├── Test: Vitest
└── Database: PostgreSQL
```

---

## Autonomous File Manipulation

Membaca dan memodifikasi file secara aman.

Tools:

- read_file
- write_file
- apply_patch
- create_file
- delete_file

Perubahan dilakukan menggunakan patch-based workflow.

```diff
@@
-const foo = 1
+const foo = 2
```

---

## Shell Command Execution

Agent dapat menjalankan command lokal:

```bash
npm test
npm run lint
bun test
cargo test
go test ./...
```

Digunakan untuk:

- validation
- self-healing
- autonomous loop

---

## Git-Aware Workflow

Agent memahami repository Git.

Tools:

- git_status
- git_diff
- git_log
- git_branch
- git_commit

Contoh:

```bash
anggor commit
```

Output:

```text
feat(auth): add refresh token support
```

---

## Session Memory

Menyimpan konteks pekerjaan dalam satu sesi.

```bash
anggor
```

```text
> add auth
> add refresh token
> write tests
> fix lint
```

Agent tetap memahami konteks pekerjaan sebelumnya.

---

## Planning Mode

Sebelum melakukan perubahan:

```bash
anggor plan "add authentication"
```

Output:

```text
PLAN

1. Analyze auth architecture
2. Add JWT middleware
3. Update routes
4. Create tests

Affected files:
- src/auth/*
- src/routes/*
```

---

## Todo Tracking

Agent menyimpan progress internal.

```text
TODO

[x] Create middleware
[x] Add routes
[ ] Add tests
[ ] Run validation
```

---

# Provider System

## Built-in Providers

- OpenAI
- Anthropic
- Gemini
- OpenRouter
- Ollama

---

## Custom Provider

Konfigurasi:

```json
{
  "provider": "custom",
  "endpoint": "https://llm.company.local/v1",
  "apiKey": "env:COMPANY_API_KEY",
  "model": "internal-coder"
}
```

---

## Multi-Agent Provider Routing

```json
{
  "planner": "claude",
  "coder": "deepseek",
  "reviewer": "gpt5"
}
```

Workflow:

```text
Planner  -> Claude
Coder    -> DeepSeek
Reviewer -> GPT-5
```

---

# MCP Support

Anggor mendukung Model Context Protocol (MCP).

MCP memungkinkan agent menggunakan tools eksternal.

Contoh:

- GitHub
- PostgreSQL
- Docker
- Jira
- Notion
- Slack

---

## MCP Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ]
    }
  }
}
```

---

## MCP Discovery

```bash
anggor mcp list
```

Output:

```text
CONNECTED MCP SERVERS

✓ github
✓ postgres
✓ docker
```

---

# Skills System

Skills adalah workflow yang terdiri dari:

- Prompt
- Context Rules
- Tool Selection
- Execution Strategy

---

## Skill Structure

```text
skills/
└── code-review/
    ├── skill.json
    ├── prompt.md
    └── examples.md
```

---

## Example Skill

```json
{
  "name": "code-review",
  "description": "Review code changes",
  "tools": [
    "git_diff",
    "read_file"
  ]
}
```

---

## Built-in Skills

### Reviewer

```bash
anggor review
```

Fokus:

- bugs
- maintainability
- performance
- security

---

### Refactor

```bash
anggor refactor
```

Fokus:

- complexity
- duplication
- readability

---

### Tester

```bash
anggor test
```

Fokus:

- coverage
- edge cases
- regression tests

---

### Architect

```bash
anggor architect
```

Fokus:

- system design
- scalability
- maintainability

---

### Security Audit

```bash
anggor audit
```

Fokus:

- secrets
- auth
- vulnerabilities
- injections

---

## Skill Marketplace

Instal skill komunitas:

```bash
anggor skill install laravel-reviewer
```

Lokasi:

```text
~/.anggor/skills
```

---

# Safety System

## Approval Modes

### Safe

Semua perubahan perlu persetujuan.

```json
{
  "approvalMode": "safe"
}
```

---

### Balanced

Perubahan file otomatis.

Command berbahaya meminta konfirmasi.

```json
{
  "approvalMode": "balanced"
}
```

---

### Dangerous

Mode penuh otomatis.

```json
{
  "approvalMode": "dangerous"
}
```

---

# CLI Commands

## Chat Mode

```bash
anggor
```

---

## One Shot

```bash
anggor "fix all lint errors"
```

---

## Plan

```bash
anggor plan "add authentication"
```

---

## Resume Session

```bash
anggor resume
```

---

## Review

```bash
anggor review
```

---

## Explain Code

```bash
anggor explain src/auth.ts
```

---

## Commit Generator

```bash
anggor commit
```

---

## MCP Commands

```bash
anggor mcp list
anggor mcp add
anggor mcp remove
```

---

## Skill Commands

```bash
anggor skill list
anggor skill install
anggor skill remove
anggor skill run
```

---

## Provider Commands

```bash
anggor provider list
anggor provider add
anggor provider remove
anggor provider use
```

---

# Technology Stack

| Component | Technology |
|------------|------------|
| Runtime | Bun |
| Language | TypeScript |
| CLI UI | @clack/prompts |
| Colors | picocolors |
| AI SDK | Vercel AI SDK |
| Validation | Zod |
| Config | JSON |
| Binary Build | bun build --compile |

---

# Project Structure

```text
anggor/
├── src/
│
├── agent/
│   ├── core.ts
│   ├── planner.ts
│   ├── memory.ts
│   ├── prompts.ts
│   └── skill-loader.ts
│
├── providers/
│   ├── index.ts
│   ├── openai.ts
│   ├── anthropic.ts
│   ├── google.ts
│   ├── ollama.ts
│   └── custom.ts
│
├── tools/
│   ├── file.ts
│   ├── terminal.ts
│   ├── git.ts
│   ├── search.ts
│   ├── todo.ts
│   └── index.ts
│
├── mcp/
│   ├── client.ts
│   ├── discovery.ts
│   └── registry.ts
│
├── skills/
│   ├── builtins/
│   │   ├── reviewer/
│   │   ├── architect/
│   │   ├── tester/
│   │   ├── refactor/
│   │   └── security/
│   │
│   └── loader.ts
│
├── context/
│   ├── scanner.ts
│   ├── graph.ts
│   ├── semantic-search.ts
│   └── indexer.ts
│
├── ui/
│   ├── theme.ts
│   ├── output.ts
│   └── spinner.ts
│
├── config/
│   └── index.ts
│
└── index.ts
```

---

# Long-Term Vision

Anggor bukan sekadar AI coding assistant.

Anggor adalah platform agent lokal untuk developer.

```text
Git      -> Version Control Platform
Neovim   -> Editor Platform
Docker   -> Container Platform
Anggor   -> Coding Agent Platform
```

Tujuan akhirnya adalah menjadi fondasi yang memungkinkan developer membangun, menggabungkan, dan mengotomasi workflow AI mereka sendiri melalui Providers, MCP Servers, Skills, dan Plugins dalam satu CLI yang cepat dan ringan.
````

