import { Hono } from 'hono'
import { registry } from '../providers'
import { config } from '../config'

export const runtimeRoutes = new Hono()

// ─── Health ───────────────────────────────────────────────────────────────────

runtimeRoutes.get('/health', (c) =>
  c.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }),
)

// ─── Providers ────────────────────────────────────────────────────────────────

/**
 * List all registered providers with their availability status.
 * Availability is checked in parallel — each provider gets a 3s timeout
 * (handled inside the provider's isAvailable() implementation).
 */
runtimeRoutes.get('/providers', async (c) => {
  const providers = registry.list()

  const statuses = await Promise.all(
    providers.map(async (p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      available: await p.isAvailable(),
    })),
  )

  return c.json({ providers: statuses })
})

/**
 * Test connectivity to a specific provider.
 * POST /api/providers/test  { "id": "ollama" }
 */
runtimeRoutes.post('/providers/test', async (c) => {
  const { id } = await c.req.json<{ id?: string }>()
  if (!id) return c.json({ error: '`id` is required' }, 400)

  if (!registry.has(id)) {
    return c.json({ error: `Provider "${id}" is not registered` }, 404)
  }

  const provider = registry.getOrThrow(id)
  const available = await provider.isAvailable()
  return c.json({ id, available })
})

// ─── Models ───────────────────────────────────────────────────────────────────

/**
 * List models for a given provider.
 * GET /api/models?provider=ollama
 */
runtimeRoutes.get('/models', async (c) => {
  const providerId = c.req.query('provider') ?? 'ollama'

  if (!registry.has(providerId)) {
    return c.json({ error: `Provider "${providerId}" is not registered` }, 404)
  }

  const provider = registry.getOrThrow(providerId)

  try {
    const models = await provider.listModels()
    return c.json({ provider: providerId, models, defaultModel: config.defaultModel })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Failed to list models: ${message}` }, 502)
  }
})

/**
 * Quick runtime status — is Ollama up and which models are installed?
 * The frontend polls this on mount to show the RuntimeStatusChip.
 * GET /api/runtime/status
 */
runtimeRoutes.get('/runtime/status', async (c) => {
  const ollama = registry.get('ollama')
  if (!ollama) {
    return c.json({ available: false, models: [], defaultModel: null })
  }

  const available = await ollama.isAvailable()
  const models = available ? await ollama.listModels() : []

  return c.json({
    available,
    provider: 'ollama',
    models,
    defaultModel: config.defaultModel,
  })
})
