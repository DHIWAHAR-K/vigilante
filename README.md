# Vigilante

A local-first AI research assistant built as a desktop application. Ask questions, get cited answers — all running on your machine. No data leaves your device.

Vigilante connects to local LLMs (Ollama, LM Studio, or any OpenAI-compatible endpoint), manages conversation threads with full history, and provides a research-grade interface with streaming responses, drafts, and export capabilities.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Desktop App (Tauri)                  │
│  ┌────────────────────────────────────────────────┐   │
│  │              Next.js Frontend                    │   │
│  │  Sidebar · Chat · Command Palette · Settings     │   │
│  │  Framer Motion · Zustand · Tailwind CSS          │   │
│  └──────────────────────┬─────────────────────────┘   │
│                         │ IPC                          │
│  ┌──────────────────────▼─────────────────────────┐   │
│  │              Rust Backend (Tauri)                │   │
│  │  Thread management · Message storage · Settings  │   │
│  │  JSON file store · Atomic writes · RwLock index  │   │
│  └──────────────────────┬─────────────────────────┘   │
│                         │                              │
└─────────────────────────┼──────────────────────────────┘
                          │ HTTP
              ┌───────────▼──────────┐
              │  Orchestrator (Hono)  │
              │  Provider routing     │
              │  Conversation memory  │
              │  Streaming pipeline   │
              └───────────┬──────────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
      ┌─────▼────┐ ┌─────▼────┐ ┌─────▼────┐
      │  Ollama   │ │ LM Studio│ │  OpenAI  │
      │  (local)  │ │  (local) │ │ compat.  │
      └──────────┘ └──────────┘ └──────────┘
```

## Features

- **Local-first** — All conversations stored as JSON files on disk. No cloud, no telemetry, no accounts required
- **Multi-provider support** — Ollama, LM Studio, or any OpenAI-compatible API. Auto-detects available models on startup
- **Streaming responses** — Token-by-token streaming with real-time rendering
- **Conversation threads** — Full thread management with create, rename, search, and delete
- **Command palette** — Quick actions and navigation (Cmd+K)
- **Onboarding flow** — Guided setup: runtime detection → model discovery → ready to chat
- **Draft system** — Save and manage response drafts
- **Activity tracking** — Monitor model usage and conversation activity
- **Export** — Export conversations for sharing or backup
- **Dark/Light mode** — System-aware theme switching
- **Cross-platform** — Tauri builds for macOS, Windows, and Linux

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Shell** | Tauri 2 (Rust) — macOS private API, file system, HTTP, shell, dialog |
| **Frontend** | Next.js 14 · React 18 · TypeScript · Tailwind CSS · Framer Motion · Zustand |
| **Backend (Rust)** | Tokio async runtime · Serde JSON · UUID · Chrono · parking_lot RwLock |
| **Orchestrator** | Hono (TypeScript) · better-sqlite3 · streaming pipelines |
| **LLM Providers** | Ollama · LM Studio · OpenAI-compatible endpoints |
| **Storage** | JSON file store with atomic writes (tempfile → rename) |
| **Build** | Turborepo monorepo · pnpm workspaces |

## Project Structure

```
vigilante/
├── apps/
│   └── web/                        # Tauri desktop app
│       ├── src/
│       │   ├── app/                # Next.js pages (home, settings)
│       │   └── components/
│       │       ├── command/        # Command palette (Cmd+K)
│       │       ├── conversation/   # Chat thread, messages, workspace
│       │       ├── layout/         # App shell, sidebar, theme toggle
│       │       └── onboarding/     # Runtime detection, model discovery
│       └── src-tauri/
│           └── src/
│               ├── commands/       # Tauri IPC: threads, messages, settings, storage, activity
│               ├── models/         # Rust types: thread, message, settings, runtime, attachment
│               ├── services/       # Business logic: thread, draft, storage, runtime, export
│               └── storage/        # JSON file store, migrations, path management
├── packages/
│   ├── cli/                        # CLI launcher for dev/prod
│   ├── db/                         # SQLite schema + queries (conversations, messages)
│   └── providers/                  # LLM provider abstraction (Ollama, OpenAI-compat)
├── services/
│   └── orchestrator/               # Hono server: query routing, model management, streaming
├── package.json                    # Turborepo root
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Rust 1.77+
- Node.js 18+
- pnpm 10+
- Ollama or LM Studio (for local LLM inference)

### Installation

```bash
# Install dependencies
pnpm install

# Start in development mode (launches Tauri + Next.js + Orchestrator)
pnpm dev
```

### Production Build

```bash
pnpm build
```

This produces a native desktop app for your platform via Tauri's bundler.

## Design

Vigilante's UI follows a "precision notch" design language — subtle geometric accents in active states, dividers, and interactive elements that reinforce the brand identity of research and precision. The composer is designed as a command desk with ambient lighting, and the sidebar serves as a research workspace with refined information hierarchy.
