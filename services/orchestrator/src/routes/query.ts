import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { askPipeline } from '../pipelines/ask'
import { db } from '../db'
import { registry } from '../providers'
import { config } from '../config'

// ─── Request shape ─────────────────────────────────────────────────────────────

interface QueryRequest {
  query: string
  conversationId?: string
  mode?: string
  provider?: { id?: string; model?: string }
  webSearch?: boolean
  files?: string[]
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const queryRoutes = new Hono()

queryRoutes.post('/query', async (c) => {
  let body: QueryRequest

  try {
    body = await c.req.json<QueryRequest>()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { query, conversationId, mode = 'ask', provider: providerSpec } = body

  if (!query || typeof query !== 'string' || !query.trim()) {
    return c.json({ error: '`query` is required and must be a non-empty string' }, 400)
  }

  // Phase 0: only "ask" mode is supported
  if (mode !== 'ask') {
    return c.json(
      { error: `Mode "${mode}" is not supported yet. Only "ask" is available in this version.` },
      400,
    )
  }

  const providerId = providerSpec?.id ?? 'ollama'
  const model = providerSpec?.model ?? config.defaultModel

  let provider
  try {
    provider = registry.getOrThrow(providerId)
  } catch (err) {
    return c.json({ error: String(err) }, 400)
  }

  // ── SSE headers ─────────────────────────────────────────────────────────────
  c.header('Content-Type', 'text/event-stream; charset=utf-8')
  c.header('Cache-Control', 'no-cache, no-transform')
  c.header('Connection', 'keep-alive')
  c.header('X-Accel-Buffering', 'no') // Disable nginx buffering when proxied

  return stream(c, async (s) => {
    // Wire up abort when the client disconnects
    const abortController = new AbortController()
    s.onAbort(() => abortController.abort())

    /**
     * Write a single SSE event.
     * Format: "event: <name>\ndata: <json>\n\n"
     */
    const writeEvent = async (name: string, data: unknown): Promise<void> => {
      await s.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    try {
      const gen = askPipeline({
        query: query.trim(),
        conversationId,
        model,
        provider,
        db,
        signal: abortController.signal,
      })

      for await (const event of gen) {
        if (abortController.signal.aborted) break
        await writeEvent(event.name, event.data)
      }
    } catch (err) {
      // Surface errors to the client as a structured SSE event
      const message = err instanceof Error ? err.message : String(err)
      console.error('[query] pipeline error:', err)
      await writeEvent('error', { message })
    }
  })
})
