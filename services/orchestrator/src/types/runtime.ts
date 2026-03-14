/**
 * runtime.ts — Engine-neutral runtime types for Vigilante.
 *
 * These replace the Ollama-specific shapes and form the stable API contract
 * between the orchestrator and the frontend.  Any new local runtime (whisper,
 * stable-diffusion, etc.) should be expressible in these terms.
 */

// ─── Engine identity ──────────────────────────────────────────────────────────

export type EngineId = 'ollama' | 'llama.cpp' | 'mlx'

export type EngineStatus =
  | 'running'        // engine process up and responding to health checks
  | 'stopped'        // binary/package found on disk, process not running
  | 'not_installed'  // not found on this system
  | 'error'          // found but returning unexpected errors
  | 'unknown'        // not yet probed this session

// ─── Models ───────────────────────────────────────────────────────────────────

export type ModelFormat = 'gguf' | 'mlx' | 'ollama'

export interface InstalledModel {
  /** Unique within engine.  May be a model tag ("llama3.2:3b") or file path. */
  id:            string
  name:          string
  engineId:      EngineId
  format:        ModelFormat
  sizeBytes:     number
  parameterSize: string | null
  quantization:  string | null
  /** Absolute path for file-based models (gguf); null for managed models. */
  path:          string | null
}

// ─── Engine snapshot ──────────────────────────────────────────────────────────

export interface RuntimeEngine {
  id:        EngineId
  name:      string
  status:    EngineStatus
  version:   string | null
  models:    InstalledModel[]
  serverUrl: string | null
  probedAt:  string
}

// ─── Active selection ─────────────────────────────────────────────────────────

export interface RuntimeSelection {
  engineId: EngineId
  modelId:  string
}

// ─── Pull / install jobs ──────────────────────────────────────────────────────

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
  progressPercent: number           // 0–100
  downloadedBytes: number | null
  totalBytes:      number | null
  message:         string | null    // human-readable status string from the engine
  error:           string | null
  startedAt:       string
  completedAt:     string | null
}

// ─── Model catalog ────────────────────────────────────────────────────────────

export type ModelTag =
  | 'recommended'
  | 'fast'
  | 'smart'
  | 'code'
  | 'multilingual'
  | 'small'
  | 'large'

export interface CatalogModel {
  /** Engine-scoped pull ID — passed to POST /api/models/pull as `modelId`. */
  id:            string
  name:          string
  description:   string
  engineId:      EngineId
  format:        ModelFormat
  sizeBytes:     number
  parameterSize: string
  quantization:  string
  tags:          ModelTag[]
  /** Direct download URL — populated for llama.cpp GGUF models. */
  downloadUrl?:  string
}

// ─── Aggregate runtime status ─────────────────────────────────────────────────

export interface RuntimeStatus {
  engines:   RuntimeEngine[]
  selection: RuntimeSelection | null
  probedAt:  string
}

// ─── Ensure result ────────────────────────────────────────────────────────────

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
