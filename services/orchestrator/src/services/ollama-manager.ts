/**
 * ollama-manager.ts
 *
 * Handles the full Ollama runtime lifecycle for the orchestrator:
 *   - Binary detection (PATH + fixed macOS paths)
 *   - HTTP probing (version + model list)
 *   - Process spawning (`ollama serve`)
 *   - Health polling (up to 30 s)
 *
 * Exposed to the frontend via POST /api/runtime/ensure.
 * GET /api/runtime/status uses probeOllama() for lightweight polling.
 */

import { execFileSync } from 'child_process'
import { existsSync }   from 'fs'
import { spawn }        from 'child_process'

// ─── Types — match client.ts on the frontend ──────────────────────────────────

export type OllamaStatus =
  | 'unknown'        // not yet probed
  | 'running'        // reachable + at least one model installed
  | 'available'      // reachable but no models downloaded
  | 'stopped'        // binary on disk, process not responding
  | 'not_installed'  // binary absent — user must install Ollama
  | 'error'          // unexpected HTTP error

export type StartOutcome =
  | 'already_running'
  | 'started'
  | 'not_installed'
  | 'timeout'
  | 'failed'

export interface OllamaModel {
  id: string
  name: string
  sizeBytes: number
  modifiedAt: string | null
  family: string | null
  parameterSize: string | null
  quantization: string | null
}

export interface OllamaRuntimeStatus {
  status: OllamaStatus
  version: string | null
  models: OllamaModel[]
  baseUrl: string
  probedAt: string
}

export interface EnsureReadyResult {
  runtime: OllamaRuntimeStatus
  startAttempted: boolean
  startOutcome: StartOutcome | null
}

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'

const FIXED_PATHS = [
  '/usr/local/bin/ollama',
  '/opt/homebrew/bin/ollama',
  '/Applications/Ollama.app/Contents/Resources/ollama',
]

// ─── Binary detection ─────────────────────────────────────────────────────────

export function findOllamaBinary(): string | null {
  try {
    const result = execFileSync('which', ['ollama'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (result && existsSync(result)) return result
  } catch { /* not in $PATH */ }

  for (const p of FIXED_PATHS) {
    if (existsSync(p)) return p
  }
  return null
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/version`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null
  }
}

async function fetchModels(): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { models?: any[] }
    return (data.models ?? []).map((m: any) => ({
      id:            m.name,
      name:          m.name,
      sizeBytes:     m.size          ?? 0,
      modifiedAt:    m.modified_at   ?? null,
      family:        m.details?.family            ?? null,
      parameterSize: m.details?.parameter_size    ?? null,
      quantization:  m.details?.quantization_level ?? null,
    }))
  } catch {
    return []
  }
}

// ─── Probe — lightweight, no side effects ─────────────────────────────────────

export async function probeOllama(): Promise<OllamaRuntimeStatus> {
  const probedAt = new Date().toISOString()
  const version  = await fetchVersion()

  if (version !== null) {
    const models = await fetchModels()
    return {
      status:   models.length > 0 ? 'running' : 'available',
      version,
      models,
      baseUrl:  BASE_URL,
      probedAt,
    }
  }

  // Offline — distinguish installed-but-stopped vs not-installed
  const binary = findOllamaBinary()
  return {
    status:   binary ? 'stopped' : 'not_installed',
    version:  null,
    models:   [],
    baseUrl:  BASE_URL,
    probedAt,
  }
}

// ─── Ensure — full lifecycle (probe → start → poll) ──────────────────────────

// Prevent concurrent ensure calls from spawning Ollama twice.
let ensureInFlight: Promise<EnsureReadyResult> | null = null

async function _ensureOllamaReady(): Promise<EnsureReadyResult> {
  const initial = await probeOllama()

  if (initial.status === 'running' || initial.status === 'available') {
    return { runtime: initial, startAttempted: false, startOutcome: 'already_running' }
  }

  if (initial.status === 'not_installed') {
    return { runtime: initial, startAttempted: false, startOutcome: 'not_installed' }
  }

  // Stopped — try to start
  const binary = findOllamaBinary()
  if (!binary) {
    const runtime = { ...initial, status: 'not_installed' as OllamaStatus }
    return { runtime, startAttempted: false, startOutcome: 'not_installed' }
  }

  try {
    const child = spawn(binary, ['serve'], { detached: true, stdio: 'ignore' })
    child.unref()
  } catch {
    const runtime = await probeOllama()
    return { runtime, startAttempted: true, startOutcome: 'failed' }
  }

  // Poll up to 30 s (60 × 500 ms)
  let healthy = false
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 500))
    const v = await fetchVersion()
    if (v !== null) { healthy = true; break }
  }

  const runtime = await probeOllama()
  return {
    runtime,
    startAttempted: true,
    startOutcome:   healthy ? 'started' : 'timeout',
  }
}

export function ensureOllamaReady(): Promise<EnsureReadyResult> {
  // Coalesce concurrent callers onto the same in-flight promise.
  if (!ensureInFlight) {
    ensureInFlight = _ensureOllamaReady().finally(() => {
      ensureInFlight = null
    })
  }
  return ensureInFlight
}
