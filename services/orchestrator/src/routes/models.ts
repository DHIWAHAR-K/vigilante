import { Hono } from 'hono'
import {
  MODEL_CATALOG,
  startPull,
  getJob,
  listJobs,
} from '../services/model-manager'
import { runtimeManager } from '../services/runtime-manager'
import type { EngineId } from '../types/runtime'

export const modelRoutes = new Hono()

// ─── GET /api/models/catalog ──────────────────────────────────────────────────
//
//  Browse models available to download.
//  Optional query params: ?engine=ollama  to filter by engine.
//
//  Response: { catalog: CatalogModel[] }

modelRoutes.get('/models/catalog', (c) => {
  const engineFilter = c.req.query('engine')
  const catalog = engineFilter
    ? MODEL_CATALOG.filter(m => m.engineId === engineFilter)
    : MODEL_CATALOG
  return c.json({ catalog })
})

// ─── GET /api/models/installed ────────────────────────────────────────────────
//
//  List all locally installed models across every registered engine.
//  Optional query params: ?engine=ollama  to filter by engine.
//
//  Response: { models: InstalledModel[] }

modelRoutes.get('/models/installed', async (c) => {
  const engineFilter = c.req.query('engine')
  const engines = await runtimeManager.probeAll()
  const models  = engines
    .filter(e => !engineFilter || e.id === engineFilter)
    .flatMap(e => e.models)
  return c.json({ models })
})

// ─── POST /api/models/pull ────────────────────────────────────────────────────
//
//  Start a model download / install job.  Returns immediately with the job
//  snapshot — poll GET /api/models/pull/:jobId for progress.
//
//  Body: { engineId: string, modelId: string }
//
//  For llama.cpp, pass the catalog entry's `downloadUrl` as `modelId` — it is
//  treated as a direct HTTPS URL to download the .gguf file.
//  For ollama, `modelId` is the Ollama tag (e.g., "llama3.2:3b").
//  For mlx, `modelId` is the HuggingFace repo ID.
//
//  Response: { job: PullJob }

modelRoutes.post('/models/pull', async (c) => {
  let body: { engineId?: string; modelId?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { engineId, modelId } = body
  if (!engineId || !modelId) {
    return c.json({ error: '`engineId` and `modelId` are required' }, 400)
  }

  if (!runtimeManager.getAdapter(engineId as EngineId)) {
    return c.json({ error: `Unknown engine: ${engineId}` }, 400)
  }

  const job = startPull(engineId as EngineId, modelId)
  return c.json({ job }, 202)
})

// ─── GET /api/models/pull/:jobId ──────────────────────────────────────────────
//
//  Poll pull job progress.
//  Response: { job: PullJob }

modelRoutes.get('/models/pull/:jobId', (c) => {
  const jobId = c.req.param('jobId')
  const job   = getJob(jobId)
  if (!job) return c.json({ error: 'Job not found' }, 404)
  return c.json({ job })
})

// ─── GET /api/models/pull ─────────────────────────────────────────────────────
//
//  List all pull jobs (active + recently completed).
//  Response: { jobs: PullJob[] }

modelRoutes.get('/models/pull', (c) => {
  return c.json({ jobs: listJobs() })
})

// ─── DELETE /api/models/:engineId/:modelId ────────────────────────────────────
//
//  Remove an installed model.  The `modelId` segment is URL-encoded.
//
//  Response: { deleted: { engineId, modelId } }

modelRoutes.delete('/models/:engineId/:modelId{.+}', async (c) => {
  const engineId = c.req.param('engineId') as EngineId
  const modelId  = decodeURIComponent(c.req.param('modelId'))

  const adapter = runtimeManager.getAdapter(engineId)
  if (!adapter) {
    return c.json({ error: `Unknown engine: ${engineId}` }, 400)
  }

  try {
    await adapter.removeModel(modelId)
    return c.json({ deleted: { engineId, modelId } })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
