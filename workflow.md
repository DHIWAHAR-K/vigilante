# Vigilante — Project Workflow

> An open-source, model-agnostic AI research engine. A self-hostable Perplexity alternative where the user owns the model, the data, and the workflow.

---

## Table of Contents

1. [Vision](#1-vision)
2. [Project Philosophy](#2-project-philosophy)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Core Pipeline: How an Answer is Produced](#5-core-pipeline-how-an-answer-is-produced)
6. [Module Breakdown](#6-module-breakdown)
   - [Frontend (apps/web)](#61-frontend-appsweb)
   - [Orchestration Server (services/orchestrator)](#62-orchestration-server-servicesorchestrator)
   - [Provider Abstraction (packages/providers)](#63-provider-abstraction-packagesproviders)
   - [Search & Retrieval (packages/search)](#64-search--retrieval-packagessearch)
   - [RAG Engine (packages/rag)](#65-rag-engine-packagesrag)
   - [Database Layer (packages/db)](#66-database-layer-packagesdb)
   - [Plugin System (packages/plugins)](#67-plugin-system-packagesplugins)
7. [Feature Specification](#7-feature-specification)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [API Contract](#9-api-contract)
10. [Tech Stack Decisions](#10-tech-stack-decisions)
11. [Development Phases (MVP Roadmap)](#11-development-phases-mvp-roadmap)
12. [Contributing Guidelines](#12-contributing-guidelines)

---

## 1. Vision

Vigilante is a local-first AI research engine. It gives users a Perplexity-style experience — conversational search with cited sources, follow-up questions, document reasoning, and agentic tasks — while letting them pick which model powers it. Users can run a 7B parameter model on their laptop, point it at Ollama, connect to OpenAI or Anthropic for heavier tasks, or mix providers per session.

The core promise is: **you control the intelligence layer, Vigilante handles everything around it.**

---

## 2. Project Philosophy

- **Model-agnostic first.** No feature should hard-code a specific model or provider. Every inference call goes through the provider interface.
- **Offline-capable, internet-optional.** The app runs without internet. Web search is a mode the user enables, not a dependency.
- **Transparent by default.** Every answer shows its sources. Every search shows its queries. No magic black boxes.
- **Plugin-driven extensibility.** Search connectors, document loaders, model providers, and agent tools are all plugins. Contributors add capabilities without touching core.
- **Single binary simplicity.** A new user should be able to install and run Vigilante with one command. No Docker required for basic usage.

---

## 3. High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        User Interface                       │
│              Next.js Web App  /  Tauri Desktop App          │
└────────────────────────────┬───────────────────────────────┘
                             │ HTTP / WebSocket / SSE
┌────────────────────────────▼───────────────────────────────┐
│               Orchestration Server (Node.js / Hono)         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Router  │  │  Search  │  │   RAG    │  │   Agents   │  │
│  │ & Intent │  │ Pipeline │  │ Pipeline │  │  Runtime   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
└───────┼─────────────┼─────────────┼───────────────┼─────────┘
        │             │             │               │
┌───────▼─────────────▼─────────────▼───────────────▼─────────┐
│                    Provider Abstraction Layer                 │
│   Ollama │ llama.cpp │ OpenAI │ Anthropic │ Groq │ Gemini    │
└──────────────────────────────────────────────────────────────┘
        │                           │
┌───────▼──────────┐           ┌────────▼────────────┐
│  Local Model     │           │  External API Call   │
│  (CPU / GPU)     │           │  (user's API key)    │
└──────────────────┘           └─────────────────────┘
```

The frontend never calls a model directly. It talks to the Orchestration Server only. The Orchestration Server knows nothing about the UI. Every layer is independently replaceable.

---

## 4. Monorepo Structure

```
vigilante/
├── apps/
│   ├── web/                      # Next.js web application (primary UI)
│   └── desktop/                  # Tauri wrapper for desktop distribution
│
├── services/
│   └── orchestrator/             # Core backend — Hono.js on Node.js
│       ├── src/
│       │   ├── routes/           # HTTP + WebSocket route handlers
│       │   ├── pipelines/        # ask.ts, research.ts, rag.ts, agent.ts
│       │   ├── middleware/       # auth, rate limiting, error handling
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── providers/                # Model provider adapters
│   │   ├── src/
│   │   │   ├── base.ts           # IProvider interface
│   │   │   ├── ollama.ts
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── groq.ts
│   │   │   ├── gemini.ts
│   │   │   └── openrouter.ts
│   │   └── package.json
│   │
│   ├── search/                   # Web search & page extraction
│   │   ├── src/
│   │   │   ├── base.ts           # ISearchProvider interface
│   │   │   ├── brave.ts
│   │   │   ├── serper.ts
│   │   │   ├── searxng.ts        # Self-hosted, fully offline option
│   │   │   ├── scraper.ts        # Page content extractor (Playwright)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── rag/                      # Retrieval-Augmented Generation engine
│   │   ├── src/
│   │   │   ├── chunker.ts        # Text chunking strategies
│   │   │   ├── embedder.ts       # Embedding model wrapper
│   │   │   ├── vectorstore.ts    # LanceDB / Qdrant adapter
│   │   │   ├── reranker.ts       # Cross-encoder reranking
│   │   │   └── retriever.ts      # Orchestrates embed → search → rerank
│   │   └── package.json
│   │
│   ├── db/                       # Database schemas & client (Drizzle ORM)
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── conversations.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── sources.ts
│   │   │   │   ├── documents.ts
│   │   │   │   └── settings.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── plugins/                  # Plugin registry and loader
│   │   ├── src/
│   │   │   ├── base.ts           # IPlugin interface
│   │   │   ├── registry.ts       # Plugin discovery and registration
│   │   │   └── loader.ts         # Dynamic plugin loading at runtime
│   │   └── package.json
│   │
│   └── ui/                       # Shared UI component library (shadcn/ui base)
│       ├── src/
│       │   ├── components/
│       │   └── hooks/
│       └── package.json
│
├── docs/                         # Documentation site (Nextra or Astro Starlight)
│   └── pages/
│
├── workflow.md                   # This file
├── turbo.json                    # Turborepo task pipeline
├── pnpm-workspace.yaml
└── package.json
```

The project uses **pnpm workspaces + Turborepo** to manage the monorepo. Every package is independently buildable and testable.

---

## 5. Core Pipeline: How an Answer is Produced

This is the most important part of the system. Every user query goes through a structured pipeline. Understanding this flow is essential before writing any code.

### Step 1 — Query Intake
The user submits a query. The frontend sends it as a POST request to `/api/query` with:
- `query`: string
- `conversationId`: string (for memory)
- `mode`: `"ask" | "research" | "rag" | "agent"`
- `provider`: `{ id: string, model: string }`
- `webSearch`: `boolean`
- `files`: `string[]` (document IDs if any)

### Step 2 — Intent Classification
The orchestrator runs a lightweight classification step to determine:
- Is this a factual lookup, a reasoning task, a creative task, or an agent task?
- Does it require web search even if the user hasn't forced it on?
- Should it use the conversation history as primary context?

This classification is done by the model itself using a short system prompt. For local models, it can be a cheaper/faster model than the synthesis model.

### Step 3 — Parallel Retrieval
Based on intent, the orchestrator fans out to multiple retrieval sources simultaneously:
- **Web search** (if enabled): query rewriting → search API call → top N URLs returned
- **Page extraction**: Playwright/Cheerio fetches and strips clean text from each URL
- **Vector search** (if documents uploaded): embed query → search vector store → retrieve top K chunks
- **Conversation memory**: retrieve last M turns and any referenced documents from the DB

All retrieval tasks run in parallel using `Promise.all` to minimize latency.

### Step 4 — Reranking
Retrieved chunks and page extracts are passed to a reranker. The reranker scores each passage for relevance to the query and keeps the top N. This is critical for quality — without reranking, the context window fills with low-relevance text.

For local deployments: use a cross-encoder model via `transformers.js` (runs in Node.js, no Python needed).
For cloud deployments: use Cohere Rerank or Jina Rerank API.

### Step 5 — Context Assembly
The orchestrator assembles a structured context object:
```
[System Prompt]
[Conversation History (last M turns)]
[Retrieved Context Block — each passage tagged with its source URL/doc]
[Instructions: cite sources inline, answer in markdown, generate follow-ups]
[User Query]
```
Each source passage is numbered so the model can cite them by index.

### Step 6 — Synthesis (Streaming)
The assembled prompt is sent to the selected provider. The response streams back token by token via SSE (Server-Sent Events) to the frontend.

### Step 7 — Post-Processing
As the stream completes, the orchestrator:
- Parses inline citations from the model output and maps them to real source URLs
- Generates 3 follow-up question suggestions (second model call or extracted from response)
- Saves the full conversation turn (query, answer, sources) to the database

### Step 8 — Frontend Rendering
The frontend renders the streamed response with:
- Markdown parsing
- Inline source badges (hoverable, showing title + URL + excerpt)
- Follow-up question chips
- Copy, share, and regenerate controls

---

## 6. Module Breakdown

### 6.1 Frontend (apps/web)

**Technology:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui

**Key pages:**
- `/` — Home / new query
- `/c/[id]` — Conversation thread view
- `/library` — Uploaded documents and collections
- `/settings` — Provider configuration, API keys, appearance
- `/history` — Past conversations

**Key components:**
- `<QueryInput />` — Main search bar with mode selector, provider indicator, web search toggle
- `<AnswerStream />` — Streaming markdown renderer with citation highlighting
- `<SourceCard />` — Collapsible source panel with favicon, title, URL, excerpt
- `<FollowUpChips />` — Suggested follow-up queries
- `<ProviderSelector />` — Modal for picking model and provider
- `<DocumentUploader />` — Drag-and-drop file upload with indexing progress
- `<ConversationHistory />` — Sidebar list of past conversations

**State management:** Zustand for global state (current provider, settings). React Query / SWR for server state and streaming.

**Streaming:** The frontend subscribes to an SSE endpoint. As tokens arrive, they are appended to the message state. The citation parser runs as a post-processing pass once the stream ends.

---

### 6.2 Orchestration Server (services/orchestrator)

**Technology:** Node.js, Hono.js (fast, edge-compatible HTTP framework), TypeScript

**Why Hono over Express:** Hono has first-class streaming support, runs on Node/Bun/Deno/edge, and has a much smaller footprint. This matters for users who self-host on constrained hardware.

**Routes:**
```
POST   /api/query              — Main query pipeline entry point
GET    /api/query/:id/stream   — SSE stream for an in-progress query
GET    /api/conversations      — List conversations
GET    /api/conversations/:id  — Get conversation with messages
DELETE /api/conversations/:id  — Delete conversation
POST   /api/documents          — Upload and index a document
GET    /api/documents          — List indexed documents
DELETE /api/documents/:id      — Remove document from vector store
GET    /api/providers          — List available/configured providers
POST   /api/providers/test     — Test a provider connection
GET    /api/models             — List models for a given provider
GET    /api/health             — Health check
```

**Pipeline files (src/pipelines/):**
- `ask.ts` — Fast conversational mode, no web search, just model + memory
- `research.ts` — Full pipeline: search → extract → rerank → synthesize
- `rag.ts` — Local document retrieval pipeline
- `agent.ts` — Multi-step tool-using agent loop

---

### 6.3 Provider Abstraction (packages/providers)

Every provider must implement the `IProvider` interface:

```typescript
interface IProvider {
  id: string;
  name: string;
  type: 'local' | 'remote';

  listModels(): Promise<ModelInfo[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<StreamChunk>;
  embed(texts: string[]): Promise<number[][]>;
  isAvailable(): Promise<boolean>;
}
```

**Local providers (no API key needed):**
- `OllamaProvider` — talks to local Ollama instance via its REST API
- `LlamaCppProvider` — spawns llama.cpp server and communicates via HTTP

**Remote providers (user supplies API key in settings):**
- `OpenAIProvider` — GPT-4o, o3, o4-mini, etc.
- `AnthropicProvider` — Claude 3.x, Claude 4.x
- `GroqProvider` — Ultra-fast inference via Groq Cloud
- `GeminiProvider` — Google Gemini models
- `OpenRouterProvider` — Aggregator covering 100+ models

**Provider resolution:** The orchestrator uses a `ProviderRegistry` singleton that loads configured providers at startup. When a request arrives with `{ provider: "ollama", model: "llama3.2" }`, the registry resolves the correct adapter and hands off the call.

---

### 6.4 Search & Retrieval (packages/search)

**ISearchProvider interface:**
```typescript
interface ISearchProvider {
  id: string;
  name: string;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}
```

**Search providers:**
- `BraveSearchProvider` — Brave Search API (privacy-focused, requires free API key)
- `SerperProvider` — Google results via Serper.dev API
- `SearXNGProvider` — Self-hosted open source metasearch, fully offline option

**Page extraction (scraper.ts):**
1. Accept a list of URLs
2. Fetch HTML (Playwright for JS-heavy pages, Cheerio for static)
3. Strip navigation, ads, footers using `@mozilla/readability`
4. Return clean text + title + metadata

**Query rewriting:** Before searching, the model rewrites the user's conversational query into 2–3 optimized search queries. For example, "how does rust handle memory without GC" becomes `["Rust ownership model memory management", "Rust borrower checker explained", "Rust vs GC language memory"]`. This dramatically improves search relevance.

---

### 6.5 RAG Engine (packages/rag)

**Supported file types:** PDF, DOCX, TXT, MD, HTML, EPUB, CSV, JSON

**Chunking strategies:**
- Fixed-size chunking (simple, fast)
- Sentence-aware chunking (respects sentence boundaries)
- Semantic chunking (groups sentences by topic using embedding similarity)

**Embeddings:** Pluggable. Default is `nomic-embed-text` via Ollama (local, free). Can be swapped to OpenAI `text-embedding-3-small` or Cohere embed for better quality.

**Vector store:** LanceDB as the default (embedded, no server needed, files stored locally). Qdrant as the optional cloud/server option.

**Reranking:** Cross-encoder model scores each retrieved chunk against the query and returns a relevance score. Top K chunks (default 6) are passed to the context window.

---

### 6.6 Database Layer (packages/db)

**Technology:** Drizzle ORM + SQLite (better-sqlite3) for local. PostgreSQL optional for self-hosted server deployments.

**Schema summary:**
```
conversations      — id, title, createdAt, updatedAt, model, provider
messages           — id, conversationId, role, content, sources, createdAt
sources            — id, messageId, url, title, excerpt, favicon
documents          — id, name, type, size, indexedAt, collectionId
document_chunks    — id, documentId, content, embedding, metadata
settings           — key, value (JSON), updatedAt
```

**Why SQLite:** It requires zero setup for end users, is a single file they can back up and move, and handles the read/write patterns of a local research app just fine. PostgreSQL can be swapped in for teams self-hosting on a server.

---

### 6.7 Plugin System (packages/plugins)

The plugin system lets the community extend Vigilante without forking it.

**Plugin types:**
- `SearchPlugin` — Add a new web search provider
- `ProviderPlugin` — Add a new model provider
- `LoaderPlugin` — Add support for a new document file type
- `ToolPlugin` — Add a new agent tool (e.g., code execution, calendar, GitHub)

**Plugin manifest (vigilante-plugin.json):**
```json
{
  "id": "vigilante-plugin-arxiv",
  "name": "arXiv Search",
  "version": "1.0.0",
  "type": "search",
  "entry": "dist/index.js"
}
```

Plugins are discovered at startup from the user's local `~/.vigilante/plugins/` directory or from a curated registry in the docs.

---

## 7. Feature Specification

### Phase 1 — Core (MVP)
| Feature | Description |
|---|---|
| Conversational Ask | Chat with a local or remote model. Full markdown rendering. |
| Web Search Mode | Enable/disable web search per query. Shows source cards. |
| Multi-turn Memory | Conversation history stored locally, sent as context. |
| Provider Selector | UI to pick provider and model before each conversation. |
| Streaming Responses | SSE-based token streaming from model to browser. |
| Inline Citations | Model cites sources inline. Frontend renders as badges. |
| Follow-up Questions | 3 suggested follow-ups generated after each answer. |
| Settings Page | Configure API keys, default provider, search engine. |
| Conversation History | Sidebar listing all past conversations, searchable. |

### Phase 2 — Power Features
| Feature | Description |
|---|---|
| Document Upload & RAG | Upload PDFs/docs and ask questions about them. |
| Collections | Group documents into named collections for scoped retrieval. |
| Model Comparison | Run the same query against two models side by side. |
| Prompt Templates | Save and reuse system prompts for different use cases. |
| Export | Export conversation as Markdown, PDF, or JSON. |
| Search Provider Choice | Switch between Brave, Serper, SearXNG per session. |
| Image Understanding | Send images in query when provider supports vision. |

### Phase 3 — Agents & Advanced
| Feature | Description |
|---|---|
| Agent Mode | Multi-step planning + tool use for complex research tasks. |
| Code Execution Tool | Agent can write and run code in a sandboxed environment. |
| Web Browsing Tool | Agent can navigate pages and fill forms autonomously. |
| GitHub Tool | Agent can read/search GitHub repos during research. |
| Scheduled Research | Run a research query on a schedule and save results. |
| Desktop App | Tauri-wrapped desktop binary with system tray, hotkey. |
| Plugin Marketplace | Community-contributed plugins distributed via registry. |

---

## 8. Data Flow Diagrams

### Research Mode (Web Search On)
```
User Input
    │
    ▼
[Query Intake] → save query to DB
    │
    ▼
[Intent Classifier] → determine if web search needed, rewrite queries
    │
    ├──► [Web Search API] → [Page Extractor] → raw chunks
    │
    ├──► [Vector Store Search] → relevant document chunks (if docs uploaded)
    │
    └──► [Conversation Memory] → last N messages
    │
    ▼
[Reranker] → score all chunks, keep top 6
    │
    ▼
[Context Assembler] → build final prompt with sources numbered
    │
    ▼
[Provider / Model] → stream tokens back
    │
    ▼
[Post-Processor] → parse citations, generate follow-ups, save to DB
    │
    ▼
[Frontend Renderer] → streamed markdown + source cards + follow-up chips
```

### Ask Mode (Web Search Off)
```
User Input → [Context Assembler (history only)] → [Provider] → [Stream] → Frontend
```

### RAG Mode (Document Question)
```
User Input → [Embed Query] → [Vector Store] → [Reranker] → [Context Assembler] → [Provider] → [Stream] → Frontend
```

---

## 9. API Contract

### POST /api/query

**Request:**
```json
{
  "query": "What are the tradeoffs between RAG and fine-tuning?",
  "conversationId": "conv_abc123",
  "mode": "research",
  "provider": {
    "id": "ollama",
    "model": "llama3.2:latest"
  },
  "webSearch": true,
  "files": []
}
```

**Response (SSE stream):**
```
event: token
data: {"token": "The"}

event: token
data: {"token": " key"}

event: sources
data: {"sources": [{"id": 1, "url": "...", "title": "...", "excerpt": "..."}]}

event: followups
data: {"questions": ["...", "...", "..."]}

event: done
data: {"messageId": "msg_xyz", "tokensUsed": 1240}
```

---

## 10. Tech Stack Decisions

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Best-in-class RSC, streaming, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Fast, composable, highly customizable |
| Backend | Hono.js on Node.js | Lightweight, first-class streaming, multi-runtime |
| Database | SQLite via Drizzle ORM | Zero-config, portable, no server needed |
| Vector Store | LanceDB | Embedded, no server, fast ANN, Arrow-native |
| Monorepo | pnpm workspaces + Turborepo | Fast builds, clear package boundaries |
| Local Models | Ollama (primary) | Best UX for local model management |
| Search | Brave Search (default) | Privacy-respecting, free tier, good quality |
| Self-hosted Search | SearXNG | Fully offline, no API key needed |
| Desktop | Tauri | Smaller binary than Electron, Rust-based, secure |
| Reranking | transformers.js (local) | Runs cross-encoder in Node.js, no Python required |

---

## 11. Development Phases (MVP Roadmap)

### Phase 0 — Foundation (Week 1–2)
- [ ] Initialize monorepo with pnpm + Turborepo
- [ ] Scaffold `apps/web`, `services/orchestrator`, `packages/providers`, `packages/db`
- [ ] Set up Drizzle ORM with SQLite, define base schema
- [ ] Implement `IProvider` interface + Ollama adapter
- [ ] Implement basic `POST /api/query` → Ollama → SSE stream
- [ ] Build minimal frontend: query input, streaming text output

### Phase 1 — Ask Mode Complete (Week 3–4)
- [ ] Multi-turn conversation with history
- [ ] Provider selector UI (Ollama + model list)
- [ ] Conversation sidebar + history page
- [ ] Settings page (API keys, default provider)
- [ ] Add OpenAI and Anthropic providers
- [ ] Error handling, loading states, retry logic

### Phase 2 — Research Mode (Week 5–7)
- [ ] Implement `packages/search` with Brave and SearXNG adapters
- [ ] Page extractor with Readability
- [ ] Query rewriting prompt
- [ ] `research.ts` pipeline (search → extract → assemble → synthesize)
- [ ] Source cards UI with favicon, title, excerpt
- [ ] Inline citation rendering
- [ ] Follow-up question chips

### Phase 3 — RAG Mode (Week 8–10)
- [ ] Document upload API and file storage
- [ ] Implement `packages/rag`: chunker, embedder, LanceDB store
- [ ] Retriever + reranker pipeline
- [ ] Library page (document list, collections)
- [ ] RAG pipeline integration with conversation context
- [ ] Support PDF, DOCX, TXT, MD

### Phase 4 — Polish & Open Source Launch (Week 11–12)
- [ ] Plugin system scaffold
- [ ] Model comparison view
- [ ] Export conversation as Markdown/PDF
- [ ] Comprehensive README with quickstart
- [ ] Docker Compose for self-hosting
- [ ] One-command install script
- [ ] Contribution guide
- [ ] MIT License
- [ ] Public GitHub release

---

## 12. Contributing Guidelines

### Branch naming
- `feat/<feature-name>` — new features
- `fix/<issue-description>` — bug fixes
- `docs/<what-changed>` — documentation only
- `refactor/<scope>` — code restructuring, no behavior change

### Commit convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add Groq provider adapter`
- `fix: resolve SSE stream disconnection on slow networks`
- `docs: update RAG pipeline diagram in workflow.md`
- `chore: upgrade LanceDB to 0.9`

### Adding a new provider
1. Create `packages/providers/src/<name>.ts`
2. Implement the `IProvider` interface fully
3. Add the provider to `packages/providers/src/index.ts`
4. Add tests in `packages/providers/tests/<name>.test.ts`
5. Document configuration in `docs/providers/<name>.md`
6. Open a PR — the CI will validate the interface contract

### Adding a new search provider
1. Create `packages/search/src/<name>.ts`
2. Implement the `ISearchProvider` interface
3. Register in `packages/search/src/index.ts`
4. Follow the same test + docs + PR flow above

---

*This document is a living spec. It will be updated as the project evolves. If you're contributing, always check this file for the current direction before opening a PR.*