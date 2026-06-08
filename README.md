# AgentClaw

**Agent-based intelligent knowledge base — comprehension over retrieval.**

AgentClaw is a desktop application that uses multi-agent collaboration to collect, understand, organize, and present knowledge. Instead of simply retrieving documents, it builds deep comprehension through AI-powered research, expert conversations, and framework analysis.

## Features

- **Multi-Agent Research** — Schedule automated research sessions using cron expressions; results are automatically stored as knowledge nodes
- **Expert Chat** — Conversational AI experts with domain context, branching conversations, and model switching
- **Knowledge Graph** — Visualize knowledge as an interactive force-directed graph with D3.js/WebGL rendering
- **Hybrid Search** — Vector search + BM25 full-text search with Reciprocal Rank Fusion
- **Framework Analysis** — Built-in analytical frameworks (TRL, Competitive Landscape, Hype Cycle) with decision records
- **Timeline & Predictions** — Track events over time, generate AI-powered trend analysis, and track prediction accuracy
- **Import Pipeline** — Import from URLs, PDFs, and RSS feeds with automatic AI summarization
- **Skill System** — Extensible skills (paper-summarizer, trend-analyzer, connection-finder, domain-expert) with effectiveness tracking
- **Version Control** — Git-based automatic versioning for all knowledge changes with diff review and one-click rollback
- **Security Gates** — Three-tier write permission system (auto-pass / confirm / explicit approval) with diff review queue
- **Command Palette** — `Cmd/Ctrl+K` for instant search, navigation, and slash commands
- **4 Theme Styles** — Linear, Cursor, Notion, PostHog — switch instantly

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, CSS Variables
- **Desktop**: Electron 33 with Utility Process workers
- **Database**: SQLite with WAL mode, SQLite-vec for vector embeddings
- **AI SDK**: pi-mono (multi-provider SDK supporting Anthropic, OpenAI, DeepSeek, Google, Groq, Ollama, OpenRouter, xAI, Mistral)
- **Visualization**: D3.js force-directed graph with WebGL fallback for 1000+ nodes
- **State**: Zustand stores with IPC synchronization

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10+

### Development

```bash
# Install dependencies
pnpm install

# Start dev mode (Next.js + Electron)
pnpm run dev
```

The app launches an Electron window with Next.js rendering the UI via Turbopack HMR.

### Building

```bash
# Type check
pnpm run typecheck

# Lint
pnpm run lint

# Build for current platform
pnpm run dist

# Build for specific platform
pnpm run build:mac    # macOS (DMG, arm64 + x64)
pnpm run build:win    # Windows (NSIS + Portable, x64)
pnpm run build:linux  # Linux (AppImage + deb + rpm, x64)
```

## Project Structure

```
agentclaw/
├── electron/           # Electron main process
│   ├── main.ts         # Window creation, lifecycle
│   ├── preload.ts      # contextBridge API
│   └── window.ts       # BrowserWindow management
├── server/             # Main process services
│   ├── db/             # SQLite schema, migrations, repositories
│   ├── fs/             # File system abstraction, domain directories
│   ├── ipc/            # IPC handlers (13 modules)
│   ├── pi-mono/        # AI SDK integration, custom tools, extensions
│   ├── services/       # Business logic (19 services)
│   └── worker/         # Utility Process workers (embedding, graph, PDF)
├── src/                # Renderer (Next.js)
│   ├── app/            # App Router pages
│   ├── components/     # UI components (20 groups)
│   ├── stores/         # Zustand state management
│   ├── lib/            # Utilities, hooks, commands, error handling
│   ├── styles/         # Design tokens + 4 theme styles
│   └── types/          # TypeScript type definitions
├── resources/          # Built-in skills (SKILL.md files)
└── docs/               # Design specs, history, reference
```

## Configuration

### API Keys

AgentClaw supports 9 AI providers. Add API keys through the Settings > Models page or during the first-run onboarding.

For local-only use without API keys, select the **Ollama** option during setup.

### Domains

Each domain has its own directory structure under `~/AgentClaw/domains/<slug>/`:

```
domains/<slug>/
├── config.yaml       # Domain configuration (models, sources, frameworks, skills)
├── skills/           # Custom domain skills
├── tools/            # Custom tools
├── prompts/          # Custom prompts
└── data/
    ├── knowledge/    # Knowledge node markdown files
    └── inbox/        # Pending inbox items
```

### Slash Commands

| Command | Description |
|---------|-------------|
| `/daily` | Trigger daily research |
| `/deep-dive <topic>` | Deep research on a topic |
| `/summarize` | Summarize current context |
| `/timeline` | Generate timeline analysis |
| `/framework` | Run framework analysis |
| `/connect` | Find knowledge connections |
| `/predict` | Generate prediction |
| `/skill <name>` | Execute a skill |
| `/review` | Review pending changes |
| `/import <url>` | Import from URL |

## Architecture

### IPC Communication

Renderer and main process communicate through typed IPC channels (`module:action` pattern). The preload script exposes a type-safe `window.api` bridge.

### Worker Processes

CPU-intensive operations run in Electron Utility Processes:
- **Embedding Worker** — Vector embedding generation
- **Graph Worker** — Force-directed layout computation
- **PDF Worker** — PDF text extraction

### Knowledge Pipeline

```
Source (URL/PDF/RSS/Note)
  → Import Pipeline (content extraction)
  → Inbox (AI summary + domain suggestion)
  → Knowledge Graph (structured nodes + edges)
  → Search Index (vector + FTS5)
  → Timeline (event extraction)
```

## FAQ

**Q: Which AI providers are supported?**
A: Anthropic, OpenAI, DeepSeek, Google, Groq, Ollama (local), OpenRouter, xAI, and Mistral.

**Q: Can I use it offline?**
A: Yes, with Ollama as the provider. All data is stored locally in SQLite.

**Q: How is my data stored?**
A: Everything stays on your machine — SQLite database + local file system. No cloud sync.

**Q: How do I add custom skills?**
A: Create a `SKILL.md` file in your domain's `skills/` directory with trigger, instructions, and input/output specs.

**Q: What is "comprehension over retrieval"?**
A: Instead of just finding documents, AgentClaw's agents analyze, connect, and synthesize knowledge to build genuine understanding of your domains.

## License

MIT
