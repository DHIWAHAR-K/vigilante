# Vigilante

Vigilante is a desktop-only, local-first AI workspace built with Tauri. Chats, exports, attachments, model selections, and managed model downloads all stay on the machine.

The app uses a Next.js renderer inside the Tauri shell and a Rust native layer for storage, runtime control, and desktop integrations. Supported local models are downloaded into Vigilante's app-data directory and served by a Vigilante-managed Ollama runtime.

## What it does

- Local conversation threads with persistent history
- Centered chat composer that docks after the first message
- Desktop settings with supported model downloads and live install progress
- Workspace-aware chat sidebar with delete support
- Markdown/JSON export
- Managed local runtime health and model selection

## Architecture

```
vigilante/
├── apps/
│   └── web/                  # Tauri desktop app + internal Next renderer
│       ├── src/              # Desktop UI
│       └── src-tauri/        # Native commands, storage, runtime management
├── packages/
│   ├── db/                   # Shared database schema/helpers
│   └── providers/            # Provider abstractions
└── services/
    └── orchestrator/         # Supporting service code retained in the monorepo
```

## Development

Prerequisites:

- Rust 1.77+
- Node.js 18+
- pnpm 10+
- Ollama installed locally

Run the desktop app in development:

```bash
pnpm install
pnpm dev
```

Build the native desktop app:

```bash
pnpm build
```

## Storage

Vigilante creates an OS app-data directory for:

- settings
- SQLite data
- thread exports
- attachments
- managed Ollama model downloads

The exact location is shown in the desktop settings screen.
