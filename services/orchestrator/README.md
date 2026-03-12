# Vigilante Orchestrator

Orchestration server for Vigilante: handles query routing, provider dispatch, and conversation persistence.

## Run locally

From repo root:

```bash
pnpm run dev:orchestrator
```

Or from this directory:

```bash
pnpm install && pnpm dev
```

## Environment

Copy `.env.example` to `.env` and set:

- `PORT` — server port (default from config)
- `DEFAULT_MODEL` — default model name when client does not specify one

## API

- `POST /query` — streaming query (SSE); body: `{ query, conversationId?, provider?: { id?, model? } }`
- `GET /runtime/models` — list models from default provider
- Conversation routes — see `src/routes/conversations.ts`
