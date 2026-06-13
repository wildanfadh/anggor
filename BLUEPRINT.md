Berikut adalah blueprint final **Anggor** dalam format Markdown, mencakup perencanaan untuk V1.0 hingga V2.0.

```markdown
# Anggor

> Fast, Local-First, Provider-Agnostic Autonomous Coding Agent for the Terminal.

**Anggor** adalah AI Coding Agent berbasis CLI yang dirancang untuk developer yang menginginkan pengalaman coding agent yang cepat, minimalis, dapat diperluas, dan sepenuhnya berjalan di lingkungan lokal mereka.

Berbeda dengan kebanyakan AI coding tools yang fokus pada UI kompleks atau vendor tertentu, Anggor mengutamakan:

- **Startup instan** (<50ms untuk command dasar)
- **Single binary distribution** (bun build --compile)
- **Local-first architecture** (sebagian besar proses berjalan di mesin pengguna)
- **Autonomous execution** (ReAct loop dengan self-healing)
- **Provider agnostic** (bisa pakai OpenAI, Anthropic, Ollama, dll)
- **Extensible via Skills & MCP** (V2.0)

---

## Filosofi Produk

| Prinsip | Penjelasan |
|---------|-------------|
| **Minimalis** | UI terminal bersih tanpa panel berlebihan. Informasi ditampilkan hanya saat dibutuhkan. |
| **Fast by Default** | Startup <50ms untuk command ringan, <200ms untuk load agent. Terasa seperti `git`, `rg`, `fzf`. |
| **Local First** | Scanning, indexing (grep-based), Git analysis, Skill loading dilakukan lokal. LLM hanya menerima konteks relevan. |
| **Autonomous** | Membuat rencana, memilih tool, memodifikasi file, menjalankan test, memperbaiki error, iterasi hingga tugas selesai. |
| **Provider Agnostic** | Tidak terikat vendor tertentu. Bisa pakai OpenAI, Anthropic, Gemini, Ollama, OpenRouter, Groq, DeepSeek, Azure, dll. |
| **Extensible** | Kemampuan diperluas lewat Skills (V1), MCP Servers (V1.1), Plugins (V2). |

---

## Ringkasan Fitur per Versi

| Fitur | V1.0 | V1.1 | V2.0 |
|-------|------|------|------|
| Context-Aware Project Scanner (grep-based) | ✅ | ✅ | ✅ |
| Autonomous File Manipulation (patch-based) | ✅ | ✅ | ✅ |
| Shell Command Executor (dengan safety) | ✅ | ✅ | ✅ |
| Git-Aware Workflow (status, diff, commit) | ✅ | ✅ | ✅ |
| Session Memory (dalam sesi) | ✅ | ✅ | ✅ |
| Planning Mode + Todo Tracking | ✅ | ✅ | ✅ |
| Streaming Output | ✅ | ✅ | ✅ |
| Dry-run Mode | ✅ | ✅ | ✅ |
| Interrupt Handling (Ctrl+C) | ✅ | ✅ | ✅ |
| Persistent Memory Bank (antar sesi) | ❌ | ✅ | ✅ |
| MCP Support (Model Context Protocol) | ❌ | ✅ | ✅ |
| Semantic Search (embedding-based) | ❌ | ❌ | ✅ |
| Skill Marketplace (remote install) | ❌ | ❌ | ✅ |
| Multi-Provider Routing (planner vs coder) | ❌ | ❌ | ✅ |
| Cost Tracking & Estimasi | ❌ | ❌ | ✅ |
| Telemetry (opt-in) | ❌ | ❌ | ✅ |

---

## V1.0 – Core Minimalis (Target rilis: 8 minggu)

### Fitur Lengkap V1.0

#### 1. Context-Aware Project Scanner
- Memindai struktur proyek dengan menghormati `.gitignore`, `.ignore`, dan aturan kustom.
- Menghasilkan *project graph* sederhana (framework, bahasa, dependensi utama) menggunakan heuristik lokal (baca `package.json`, `go.mod`, dll).
- **Mekanisme pencarian konteks:** menggunakan `ripgrep` (jika tersedia) atau fallback ke `grep` untuk menemukan file relevan berdasarkan kueri LLM.

#### 2. Autonomous File Manipulation
- **Tools:**
  - `read_file(path, lineStart?, lineEnd?)`
  - `write_file(path, content)`
  - `apply_patch(path, unified_diff)`
  - `create_file(path, content)`
  - `delete_file(path, safeMode)` → pindah ke trash dulu.
- Semua perubahan dilakukan dengan *patch-based workflow* sehingga mudah di-rollback.

#### 3. Shell Command Execution
- **Tool:** `exec(command, timeout=30000, cwd?)`
- **Keamanan:**
  - Whitelist command yang diizinkan (bisa dikonfigurasi).
  - Pattern matching untuk mendeteksi perintah berbahaya (`rm -rf`, `sudo`, `:(){ :|:& };:`).
  - Timeout otomatis.
  - Environment isolation (tidak mewarisi variabel sensitif secara default).
- **Penggunaan:** Untuk menjalankan test, linter, build, dan validasi.

#### 4. Git-Aware Workflow
- **Tools:**
  - `git_status()` → daftar file yang diubah.
  - `git_diff(path?)` → diff unstaged.
  - `git_log(n=5)` → commit terbaru.
  - `git_branch()` → branch aktif.
  - `git_commit(message)` → membuat commit.
- Agent bisa meng-commit hasil pekerjaannya secara mandiri (dengan persetujuan user di mode `balanced`/`safe`).

#### 5. Session Memory
- Agent mengingat konteks percakapan dalam satu sesi (history chat, rencana, todo).
- Tidak disimpan antar sesi (kecuali di V1.1).

#### 6. Planning Mode + Todo Tracking
- **Command:** `anggor plan "tugas"` → menampilkan rencana langkah-langkah tanpa eksekusi.
- Agent secara internal membuat daftar todo dan menandai selesai.
- User bisa melihat progress kapan saja dengan `anggor status`.

#### 7. Streaming Output
- Setiap token dari LLM ditampilkan langsung (real-time) memberi kesan responsif.
- Tools yang dijalankan juga menampilkan output secara progresif.

#### 8. Dry-run Mode
- **Flag:** `--dry-run`
- Menampilkan rencana eksekusi dan file yang akan diubah, tanpa benar-benar melakukan perubahan.

#### 9. Interrupt Handling
- Menangkap `SIGINT` (Ctrl+C) dengan aman:
  - Hentikan agent loop.
  - Tanyakan apakah ingin menyimpan progress saat ini.
  - Hapus perubahan sementara jika dibatalkan.

#### 10. Provider Support (Single Provider per Sesi)
- **Built-in providers:** OpenAI, Anthropic, Gemini, Ollama, OpenRouter, Groq, DeepSeek.
- **Custom provider:** endpoint kompatibel dengan OpenAI API.
- Konfigurasi di `.anggor.json` hanya satu provider aktif.

### CLI Commands V1.0

```bash
# Interaktif
anggor

# One-shot
anggor "fix all lint errors"

# Plan tanpa eksekusi
anggor plan "add authentication"
anggor --dry-run "refactor helpers"

# Resume sesi terakhir (jika terputus)
anggor resume

# Git helper
anggor commit

# Utility
anggor provider list
anggor provider use openai
anggor config set approvalMode balanced
```

### Konfigurasi `.anggor.json` V1.0

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
    "approvalMode": "balanced"  // safe, balanced, auto
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

### Struktur Direktori V1.0

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
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── ollama.ts
│   │   └── custom.ts
│   ├── tools/
│   │   ├── file.ts
│   │   ├── terminal.ts
│   │   ├── git.ts
│   │   ├── search.ts            # grep-based context finder
│   │   ├── todo.ts
│   │   └── index.ts
│   ├── context/
│   │   ├── scanner.ts           # Project scanner (package.json, etc)
│   │   └── grep.ts              # Wrapper untuk ripgrep/grep
│   ├── ui/
│   │   ├── theme.ts
│   │   ├── output.ts
│   │   └── spinner.ts
│   ├── config/
│   │   └── index.ts
│   └── utils/
│       ├── safety.ts
│       └── interrupt.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Technology Stack V1.0

| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| Runtime | Bun | Startup cepat, compile ke binary |
| Bahasa | TypeScript | Type safety untuk tool schema |
| CLI UI | @clack/prompts | Layout vertikal bersih |
| Warna | picocolors | Ultra ringan |
| AI SDK | Vercel AI SDK | Tool calling dan streaming |
| Validasi | Zod | Validasi input dari LLM |
| Pattern matching | micromatch | Untuk ignore rules |

### Target Performa V1.0

- Startup `anggor --help`: <50ms
- Startup `anggor "task"` (load agent): <200ms
- Memory footprint idle: <30MB
- Binary size: ~30-50MB (tergantung provider)

---

## V1.1 – Persistent Memory & MCP Support (Target rilis: +6 minggu dari V1.0)

### Fitur Tambahan V1.1

#### 1. Persistent Memory Bank
- Menyimpan konteks antar sesi di `~/.anggor/memory.json`.
- Isi: ringkasan proyek, pola kode yang dipelajari, masalah umum, keputusan arsitektur.
- Agent dapat membaca/menulis memory secara otomatis.

#### 2. MCP (Model Context Protocol) Support
- Implementasi **MCP client** (stdio transport).
- Discover MCP servers dari konfigurasi `.anggor.json`.
- **Tools MCP** didaftarkan secara dinamis dan bisa dipanggil seperti tool bawaan.
- **Contoh konfigurasi:**
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "env:GITHUB_TOKEN" }
    },
    "postgres": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "mcp/postgres"]
    }
  }
}
```
- **Command MCP:**
```bash
anggor mcp list
anggor mcp add <name> <command>
anggor mcp remove <name>
```

#### 3. Rollback & Checkpoint
- Sebelum memulai serangkaian perubahan, agent membuat checkpoint (snapshot file yang akan diubah).
- Jika terjadi error fatal atau user membatalkan, bisa rollback ke checkpoint.

### Perubahan Struktur Direktori V1.1

```text
anggor/
├── src/
│   ├── mcp/                     # Baru
│   │   ├── client.ts
│   │   ├── discovery.ts
│   │   └── transport.ts
│   ├── memory/                  # Baru
│   │   ├── bank.ts
│   │   └── serializer.ts
│   └── ...
```

---

## V2.0 – Advanced Intelligence & Ecosystem (Target rilis: +10 minggu dari V1.1)

### Fitur Tambahan V2.0

#### 1. Semantic Search (Embedding-based)
- **Tujuan:** Menemukan kode yang relevan secara semantik, bukan hanya keyword.
- **Implementasi:**
  - Gunakan model embedding lokal (misal `all-MiniLM-L6-v2` melalui `transformers.js`) atau API (OpenAI `text-embedding-3-small`).
  - Indexing dilakukan di background (async) dan disimpan di `~/.anggor/index/`.
  - User bisa menonaktifkan jika tidak ingin.
- **Tool tambahan:** `semantic_search(query, n_results=5)`

#### 2. Skill Marketplace
- **Skill** adalah paket berisi prompt, tools, dan aturan konteks untuk tugas spesifik (review, refactor, test).
- **Skill structure:**
```text
my-skill/
├── skill.json       # metadata, tools yang dibutuhkan
├── prompt.md        # instruksi tambahan
├── rules.md         # aturan konteks
└── examples.md      # few-shot examples
```
- **Registry sederhana** (static JSON di GitHub) untuk daftar skill komunitas.
- **Command:**
```bash
anggor skill search "react"
anggor skill install laravel-reviewer
anggor skill remove laravel-reviewer
anggor skill run my-skill "task"
```
- Skill yang diinstall disimpan di `~/.anggor/skills/`.

#### 3. Multi-Provider Routing
- **Workflow terbagi:**
  - **Planner** (model murah & cepat, misal GPT-3.5) → menyusun rencana.
  - **Coder** (model kuat, misal Claude 3.5) → menulis kode.
  - **Reviewer** (model kedua) → memeriksa hasil.
- **Konfigurasi:**
```json
{
  "routing": {
    "planner": "ollama/llama3",
    "coder": "openai/gpt-4-turbo",
    "reviewer": "anthropic/claude-3-haiku"
  }
}
```

#### 4. Cost Tracking & Estimasi
- **Akumulasi token per provider.**
- Estimasi biaya sebelum eksekusi (`anggor --cost "task"`).
- Batas maksimal biaya per sesi (safety).
- **Command:**
```bash
anggor cost show
anggor cost reset
```

#### 5. Telemetry (Opt-in)
- Mengumpulkan metrik anonim: perintah yang dijalankan, provider yang dipilih, tingkat keberhasilan, lama eksekusi.
- Data digunakan untuk meningkatkan fitur populer.
- User bisa mengaktifkan dengan:
```bash
anggor config set telemetry.enabled true
```

#### 6. Plugin System (Advanced)
- Plugin adalah kode JavaScript/TypeScript yang bisa menambahkan tools, provider, atau hook ke agent.
- Plugin dijalankan dalam sandbox (menggunakan `isolated-vm` atau worker thread).
- **Command:**
```bash
anggor plugin install ./my-plugin.js
anggor plugin list
```

### Perubahan Struktur Direktori V2.0

```text
anggor/
├── src/
│   ├── skills/
│   │   ├── loader.ts
│   │   ├── registry.ts
│   │   └── builtins/          # Reviewer, Refactor, Tester, Architect, Security
│   ├── semantic/
│   │   ├── embedder.ts
│   │   ├── indexer.ts
│   │   └── search.ts
│   ├── routing/
│   │   ├── orchestrator.ts
│   │   └── router.ts
│   ├── telemetry/
│   │   └── collector.ts
│   └── plugins/
│       ├── sandbox.ts
│       └── loader.ts
```

---

## Roadmap Lengkap

| Fase | Durasi | Target | Fitur Utama |
|------|--------|--------|--------------|
| **Alpha** | 4 minggu | Internal testing | Foundation: CLI, config, provider OpenAI, basic ReAct, tools (file, terminal) |
| **Beta** | 4 minggu | Private beta | V1.0 semua fitur, Git tools, session memory, dry-run, streaming |
| **V1.0** | - | Public release | Stable, binary compiled, dokumentasi lengkap |
| **V1.1** | +6 minggu | Minor update | Persistent memory, MCP support, rollback |
| **V2.0** | +10 minggu | Major update | Semantic search, skill marketplace, multi-provider routing, cost tracking |

---

## Long-Term Vision (V3.0 dan seterusnya)

- **Anggor sebagai platform:** Developer bisa membuat, menjual, dan berbagi skill/plugin.
- **Kolaborasi multi-agent:** Beberapa agent Anggor bekerja sama pada proyek besar.
- **IDE integration:** Neovim, VS Code extension menggunakan Anggor sebagai backend.
- **Self-hosted web UI** untuk manajemen proyek dan monitoring agent.

---

## Kontribusi & Lisensi

- **Lisensi:** MIT (open source).
- **Repository:** https://github.com/anggor/anggor (placeholder)
- **Kontribusi:** Panduan di `CONTRIBUTING.md`, ikuti kode etik.

---

*Blueprint ini adalah dokumen hidup. Perubahan akan dilakukan berdasarkan feedback pengguna dan perkembangan teknologi.*