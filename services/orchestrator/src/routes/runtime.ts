import { Hono } from 'hono'
import { runtimeManager }            from '../services/runtime-manager'
import type { EngineId, RuntimeSelection } from '../types/runtime'

export const runtimeRoutes = new Hono()

// ─── Health ───────────────────────────────────────────────────────────────────

runtimeRoutes.get('/health', (c) =>
  c.json({
    status:    'ok',
    version:   '0.1.0',
    timestamp: new Date().toISOString(),
  }),
)

// ─── GET /api/runtime/status ──────────────────────────────────────────────────
//
//  Probe all registered engines and return their state + the current selection.
//  Replaces the old Ollama-only probe with an engine-neutral aggregate view.
//
//  Response: { engines: RuntimeEngine[], selection: RuntimeSelection | null, probedAt }

runtimeRoutes.get('/runtime/status', async (c) => {
  const engines = await runtimeManager.probeAll()
  return c.json({
    engines,
    selection: runtimeManager.getSelection(),
    probedAt:  new Date().toISOString(),
  })
})

// ─── POST /api/runtime/ensure ─────────────────────────────────────────────────
//
//  Ensure the selected (or default) engine is running.
//  Semantics are unchanged from before; response shape is now engine-neutral.
//
//  Response: { engine: RuntimeEngine, startAttempted: boolean, outcome: EnsureOutcome }

runtimeRoutes.post('/runtime/ensure', async (c) => {
  const result = await runtimeManager.ensureReady()
  return c.json(result)
})

// ─── GET /api/runtime/engines ─────────────────────────────────────────────────
//
//  List all registered runtime engines with their probed status.
//  Use this to build the engine picker UI.
//
//  Response: { engines: RuntimeEngine[] }

runtimeRoutes.get('/runtime/engines', async (c) => {
  const engines = await runtimeManager.probeAll()
  return c.json({ engines })
})

// ─── POST /api/runtime/select ─────────────────────────────────────────────────
//
//  Set the active engine + model.  Persisted to disk so it survives restarts.
//  Subsequent /api/query calls route through this selection.
//
//  Body:     { engineId: string, modelId: string }
//  Response: { selection: RuntimeSelection }

runtimeRoutes.post('/runtime/select', async (c) => {
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

  const selection: RuntimeSelection = { engineId: engineId as EngineId, modelId }
  runtimeManager.setSelection(selection)
  return c.json({ selection })
})

// ─── GET /api/runtime/selection ───────────────────────────────────────────────
//
//  Return the persisted engine+model selection (null if none saved yet).

runtimeRoutes.get('/runtime/selection', (c) => {
  return c.json({ selection: runtimeManager.getSelection() })
})

// ─── Backward-compatibility shims ─────────────────────────────────────────────
//
//  Kept so existing frontend code that still calls the old endpoints doesn't break.

// GET /api/models — merged list of all installed models across all engines
runtimeRoutes.get('/models', async (c) => {
  const engines = await runtimeManager.probeAll()
  return c.json({
    models:    engines.flatMap(e => e.models),
    selection: runtimeManager.getSelection(),
  })
})

// GET /api/providers — one entry per engine (legacy field names)
runtimeRoutes.get('/providers', async (c) => {
  const engines = await runtimeManager.probeAll()
  return c.json({
    providers: engines.map(e => ({
      id:        e.id,
      name:      e.name,
      type:      'local',
      available: e.status === 'running',
    })),
  })
})
