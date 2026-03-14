/**
 * client.ts — Vigilante API client
 *
 * All runtime, model management, and query streaming calls go through the orchestrator
 * (Hono backend started by the `vigilante` CLI). No Tauri dependencies.
 *
 * Orchestrator URL defaults to http://localhost:3001.
 * Override via NEXT_PUBLIC_ORCHESTRATOR_URL environment variable.
 */

const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? 'http://localhost:3001'

// ─── Engine types ────────────────────────────────────────────────────────────────

export type EngineId = 'ollama' | 'llama.cpp' | 'mlx'

export type EngineStatus =
  | 'running'
  | 'stopped'
  | 'not_installed'
  | 'error'
  | 'unknown'

export type ModelFormat = 'gguf' | 'mlx' | 'ollama'

// ─── Runtime / Engine types ────────────────────────────────────────────────────

export interface InstalledModel {
  id:            string
  name:          string
  engineId:      EngineId
  format:        ModelFormat
  sizeBytes:     number
  parameterSize: string | null
  quantization:  string | null
  path:          string | null
}

export interface RuntimeEngine {
  id:        EngineId
  name:      string
  status:    EngineStatus
  version:   string | null
  models:    InstalledModel[]
  serverUrl: string | null
  probedAt:  string
}

export interface RuntimeSelection {
  engineId: EngineId
  modelId:  string
}

export interface RuntimeStatus {
  engines:   RuntimeEngine[]
  selection: RuntimeSelection | null
  probedAt:  string
}

export type EnsureOutcome =
  | 'already_running'
  | 'started'
  | 'not_installed'
  | 'timeout'
  | 'failed'

export interface EnsureResult {
  engine:         RuntimeEngine
  startAttempted: boolean
  outcome:        EnsureOutcome
}

// ─── Model catalog types ────────────────────────────────────────────────────────

export type ModelTag =
  | 'recommended'
  | 'fast'
  | 'smart'
  | 'code'
  | 'multilingual'
  | 'small'
  | 'large'

export interface CatalogModel {
  id:            string
  name:          string
  description:   string
  engineId:      EngineId
  format:        ModelFormat
  sizeBytes:     number
  parameterSize: string
  quantization:  string
  tags:          ModelTag[]
  downloadUrl?:  string
}

// ─── Pull job types ────────────────────────────────────────────────────────────

export type PullStatus =
  | 'queued'
  | 'downloading'
  | 'verifying'
  | 'complete'
  | 'failed'
  | 'cancelled'

export interface PullJob {
  id:              string
  engineId:        EngineId
  modelId:         string
  status:          PullStatus
  progressPercent: number
  downloadedBytes: number | null
  totalBytes:      number | null
  message:         string | null
  error:           string | null
  startedAt:       string
  completedAt:     string | null
}

// ─── Query types ──────────────────────────────────────────────────────────────

export interface QueryRequest {
  query:          string
  conversationId: string | null
  mode:           'ask'
  provider?: {
    id:    EngineId
    model: string
  }
  webSearch?: boolean
  files?:     string[]
}

// ─── SSE types ────────────────────────────────────────────────────────────────

export interface SSETokenEvent     { event: 'token';     data: { token: string } }
export interface SSESourcesEvent   { event: 'sources';   data: { sources: Source[] } }
export interface SSEFollowupsEvent { event: 'followups'; data: { questions: string[] } }
export interface SSEDoneEvent      { event: 'done';      data: { messageId: string; conversationId: string; tokensUsed: number | null } }
export interface SSEErrorEvent     { event: 'error';     data: { message: string } }

export type SSEEvent =
  | SSETokenEvent
  | SSESourcesEvent
  | SSEFollowupsEvent
  | SSEDoneEvent
  | SSEErrorEvent

export interface Source {
  id:       string
  title:    string
  url:      string
  favicon?: string
  excerpt?: string
}

// ─── Runtime API ──────────────────────────────────────────────────────────────

/**
 * Tier 2 — Probe all engines. Returns aggregate runtime status with all engines
 * and their installed models. No process management, no side effects.
 * Use for periodic background refresh (e.g. every 30 s).
 */
export async function probeRuntime(): Promise<RuntimeStatus> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/runtime/status`)
  if (!res.ok) throw new Error(`Runtime status check failed: ${res.status}`)
  return res.json() as Promise<RuntimeStatus>
}

/**
 * Tier 3 — Ensure the selected (or default) engine is running.
 * Call this on app launch AND whenever the user hits "Try Again".
 */
export async function ensureRuntimeReady(): Promise<EnsureResult> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/runtime/ensure`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`Ensure runtime failed: ${res.status}`)
  return res.json() as Promise<EnsureResult>
}

/**
 * Get list of all registered engines with their probed status.
 * Use to build the engine picker UI.
 */
export async function getEngines(): Promise<{ engines: RuntimeEngine[] }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/runtime/engines`)
  if (!res.ok) throw new Error(`Get engines failed: ${res.status}`)
  return res.json() as Promise<{ engines: RuntimeEngine[] }>
}

/**
 * Get the persisted engine+model selection (null if none saved yet).
 */
export async function getSelection(): Promise<{ selection: RuntimeSelection | null }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/runtime/selection`)
  if (!res.ok) throw new Error(`Get selection failed: ${res.status}`)
  return res.json() as Promise<{ selection: RuntimeSelection | null }>
}

/**
 * Set the active engine + model. Persisted to disk.
 */
export async function setSelection(selection: RuntimeSelection): Promise<{ selection: RuntimeSelection }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/runtime/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selection),
  })
  if (!res.ok) throw new Error(`Set selection failed: ${res.status}`)
  return res.json() as Promise<{ selection: RuntimeSelection }>
}

// ─── Model catalog API ──────────────────────────────────────────────────────────

/**
 * Get available models to download. Optional ?engine=ollama filter.
 */
export async function getModelCatalog(engine?: EngineId): Promise<{ catalog: CatalogModel[] }> {
  const url = engine
    ? `${ORCHESTRATOR_URL}/api/models/catalog?engine=${engine}`
    : `${ORCHESTRATOR_URL}/api/models/catalog`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Get catalog failed: ${res.status}`)
  return res.json() as Promise<{ catalog: CatalogModel[] }>
}

/**
 * Get all installed models across all engines.
 */
export async function getInstalledModels(engine?: EngineId): Promise<{ models: InstalledModel[] }> {
  const url = engine
    ? `${ORCHESTRATOR_URL}/api/models/installed?engine=${engine}`
    : `${ORCHESTRATOR_URL}/api/models/installed`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Get installed models failed: ${res.status}`)
  return res.json() as Promise<{ models: InstalledModel[] }>
}

/**
 * Start a model download/install job. Returns immediately with the job snapshot.
 */
export async function startModelPull(engineId: EngineId, modelId: string): Promise<{ job: PullJob }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/models/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ engineId, modelId }),
  })
  if (!res.ok) throw new Error(`Start pull failed: ${res.status}`)
  return res.json() as Promise<{ job: PullJob }>
}

/**
 * Poll pull job progress.
 */
export async function getPullJob(jobId: string): Promise<{ job: PullJob }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/models/pull/${jobId}`)
  if (!res.ok) throw new Error(`Get pull job failed: ${res.status}`)
  return res.json() as Promise<{ job: PullJob }>
}

/**
 * List all pull jobs (active + recently completed).
 */
export async function listPullJobs(): Promise<{ jobs: PullJob[] }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/models/pull`)
  if (!res.ok) throw new Error(`List pull jobs failed: ${res.status}`)
  return res.json() as Promise<{ jobs: PullJob[] }>
}

/**
 * Remove an installed model.
 */
export async function deleteModel(engineId: EngineId, modelId: string): Promise<{ deleted: { engineId: EngineId; modelId: string } }> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/models/${engineId}/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Delete model failed: ${res.status}`)
  return res.json() as Promise<{ deleted: { engineId: EngineId; modelId: string } }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k     = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i     = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ─── Query streaming — via orchestrator ──────────────────────────────────────
//
//  Routes through POST /api/query which:
//    - Persists conversation history in SQLite
//    - Streams SSE tokens in the standard format
//    - Handles multi-turn context automatically

let abortController: AbortController | null = null

export async function* streamQuery(request: QueryRequest): AsyncGenerator<SSEEvent> {
  abortController = new AbortController()

  try {
    const payload: Record<string, unknown> = {
      query:          request.query,
      conversationId: request.conversationId ?? undefined,
      mode:           request.mode,
      webSearch:      request.webSearch,
      files:          request.files,
    }
    if (request.provider) {
      payload.provider = { id: request.provider.id, model: request.provider.model }
    }
    const response = await fetch(`${ORCHESTRATOR_URL}/api/query`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string }
      yield { event: 'error', data: { message: body.error ?? `Server error ${response.status}` } }
      return
    }

    if (!response.body) {
      yield { event: 'error', data: { message: 'No response stream from server' } }
      return
    }

    // Parse proper SSE stream (event: <name>\ndata: <json>\n\n)
    const reader  = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer    = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE events are separated by blank lines (\n\n)
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() ?? ''

        for (const block of blocks) {
          if (!block.trim()) continue

          let eventName = 'message'
          let dataStr   = ''

          for (const line of block.split('\n')) {
            if (line.startsWith('event: '))      eventName = line.slice(7).trim()
            else if (line.startsWith('data: '))  dataStr   = line.slice(6).trim()
          }

          if (!dataStr) continue

          try {
            const data = JSON.parse(dataStr)
            yield { event: eventName, data } as SSEEvent
          } catch { /* skip malformed event */ }
        }
      }
    } finally {
      reader.releaseLock()
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    yield {
      event: 'error',
      data:  { message: 'Failed to connect to AI service. Open Settings to select a runtime and model.' },
    }
  } finally {
    abortController = null
  }
}

export function abortQuery(): void {
  abortController?.abort()
  abortController = null
}
