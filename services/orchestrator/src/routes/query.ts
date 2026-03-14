import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { askPipeline }   from '../pipelines/ask'
import { db }            from '../db'
import { runtimeManager } from '../services/runtime-manager'
import { config }        from '../config'
import type { EngineId } from '../types/runtime'

// ─── Request shape ─────────────────────────────────────────────────────────────

interface QueryRequest {
  query:          string
  conversationId?: string
  mode?:           string
  /**
   * Optional explicit engine+model override from the frontend.
   * If omitted, the active selection from RuntimeManager is used.
   */
  provider?: {
    id?:    string   // engineId — e.g. "ollama", "llama.cpp", "mlx"
    model?: string
  }
  webSearch?: boolean
  files?:     string[]
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

  console.info('[query] request', { conversationId, mode, queryLength: query?.length ?? 0 })

  if (!query || typeof query !== 'string' || !query.trim()) {
    return c.json({ error: '`query` is required and must be a non-empty string' }, 400)
  }

  if (mode !== 'ask') {
    return c.json(
      { error: `Mode "${mode}" is not supported yet. Only "ask" is available.` },
      400,
    )
  }

  // ── Resolve provider + model ───────────────────────────────────────────────
  //
  //  Priority:
  //    1. Explicit `provider.id` in the request (frontend engine picker override).
  //    2. Active selection stored in RuntimeManager (persisted user preference).
  //    3. Ollama default (backward compatibility when nothing is selected).

  let provider
  let model: string

  if (providerSpec?.id) {
    // Explicit engine requested — validate it exists.
    const adapter = runtimeManager.getAdapter(providerSpec.id as EngineId)
    if (!adapter) {
      return c.json(
        { error: `Engine "${providerSpec.id}" is not available. Check /api/runtime/engines.` },
        400,
      )
    }
    provider = adapter.getProvider()
    model    = providerSpec.model ?? runtimeManager.getActiveModelId(config.defaultModel)
  } else {
    // Use the currently selected engine.
    provider = runtimeManager.getActiveProvider()
    if (!provider) {
      return c.json(
        {
          error:
            'No runtime engine is selected. ' +
            'Open Settings, pick a model, and make sure the engine is running.',
        },
        503,
      )
    }
    model = providerSpec?.model ?? runtimeManager.getActiveModelId(config.defaultModel)
  }

  // ── SSE headers ─────────────────────────────────────────────────────────────

  c.header('Content-Type', 'text/event-stream; charset=utf-8')
  c.header('Cache-Control', 'no-cache, no-transform')
  c.header('Connection',    'keep-alive')
  c.header('X-Accel-Buffering', 'no')  // disable nginx buffering when proxied

  return stream(c, async (s) => {
    const abortController = new AbortController()
    s.onAbort(() => abortController.abort())

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
      let message = err instanceof Error ? err.message : String(err)
      // Unwrap Node.js "fetch failed" to expose the real cause.
      if (message === 'fetch failed' && err instanceof Error && err.cause instanceof Error) {
        message = err.cause.message
      }
      console.error('[query] pipeline error:', err)
      await writeEvent('error', { message })
    }
  })
})
