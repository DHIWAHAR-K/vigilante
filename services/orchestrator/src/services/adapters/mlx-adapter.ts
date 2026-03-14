import { execFileSync, spawn } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { rm } from 'fs/promises'
import type { IRuntimeAdapter } from './base'
import type { IProvider } from '@vigilante/providers'
import type { EngineId, RuntimeEngine, InstalledModel, PullJob } from '../../types/runtime'
import { OpenAICompatProvider } from '@vigilante/providers'

const SERVER_PORT    = Number(process.env.MLX_PORT) || 8081
const SERVER_URL     = `http://127.0.0.1:${SERVER_PORT}`
const MLX_MODELS_DIR = process.env.MLX_MODELS_DIR
  ?? join(homedir(), '.vigilante', 'models', 'mlx')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMlxPlatform(): boolean {
  // MLX only runs on Apple Silicon macOS.
  return process.platform === 'darwin' && process.arch === 'arm64'
}

/**
 * List MLX models that have been downloaded to the local cache directory.
 * Each subdirectory is named as the HuggingFace repo ID with '/' → '--'.
 * This lets probe() report installed models even when the server is stopped.
 */
function listLocalModels(): InstalledModel[] {
  if (!existsSync(MLX_MODELS_DIR)) return []
  try {
    return readdirSync(MLX_MODELS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        // Undo the pull() naming convention: 'mlx-community--Llama-3.2-3B-Instruct-4bit' → 'mlx-community/Llama-3.2-3B-Instruct-4bit'
        const repoId = d.name.replaceAll('--', '/')
        return {
          id:            repoId,
          name:          repoId,
          engineId:      'mlx' as EngineId,
          format:        'mlx' as const,
          sizeBytes:     0,
          parameterSize: null,
          quantization:  null,
          path:          join(MLX_MODELS_DIR, d.name),
        }
      })
  } catch {
    return []
  }
}

function findMlxServer(): string | null {
  // The mlx_lm package exposes mlx_lm.server as a Python module entry point.
  // Check for the `mlx_lm` Python import as the canonical detection method.
  try {
    execFileSync('python3', ['-c', 'import mlx_lm'], {
      encoding: 'utf8',
      stdio:    ['ignore', 'pipe', 'pipe'],
    })
    return 'python3'  // use `python3 -m mlx_lm.server` to start
  } catch { /* not installed */ }
  return null
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * MLXAdapter — manages the mlx_lm.server process for Apple Silicon inference.
 *
 * Requirements:  macOS arm64 (Apple Silicon), Python 3, mlx and mlx_lm packages.
 * Detection:     `python3 -c "import mlx_lm"` must succeed.
 * Models:        HuggingFace repo IDs (e.g., "mlx-community/Llama-3.2-3B-Instruct-4bit").
 *                The server can pull and cache models directly from HuggingFace.
 * Server:        OpenAI-compatible HTTP API on :8081 (MLX_PORT to override).
 * Pull:          Uses `huggingface_hub.snapshot_download` via Python to cache locally.
 *
 * Note: MLX cannot be the default fallback engine because it requires Apple Silicon.
 * The RuntimeManager only starts it when it is explicitly selected.
 */
export class MLXAdapter implements IRuntimeAdapter {
  readonly engineId:   EngineId = 'mlx'
  readonly engineName = 'MLX'

  private readonly provider = new OpenAICompatProvider(
    'mlx',
    'MLX',
    SERVER_URL,
  )

  private serverProcess: ReturnType<typeof spawn> | null = null
  private ensureInFlight: Promise<{
    outcome: 'already_running' | 'started' | 'not_installed' | 'timeout' | 'failed'
    engine:  RuntimeEngine
  }> | null = null

  async probe(): Promise<RuntimeEngine> {
    const probedAt = new Date().toISOString()

    if (!isMlxPlatform()) {
      return {
        id: 'mlx', name: 'MLX',
        status:    'not_installed',
        version:   null,
        models:    [],
        serverUrl: SERVER_URL,
        probedAt,
      }
    }

    // Check if the server is responding and get its model list.
    try {
      const res = await fetch(`${SERVER_URL}/v1/models`, {
        signal: AbortSignal.timeout(2_000),
      })
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<{ id: string }> }
        const models: InstalledModel[] = (data.data ?? []).map(m => ({
          id:            m.id,
          name:          m.id,
          engineId:      'mlx' as EngineId,
          format:        'mlx' as const,
          sizeBytes:     0,
          parameterSize: null,
          quantization:  null,
          path:          null,
        }))
        return {
          id: 'mlx', name: 'MLX',
          status: 'running', version: null, models,
          serverUrl: SERVER_URL, probedAt,
        }
      }
    } catch { /* not running */ }

    // Server not running — report cached local models so Settings can show them.
    return {
      id: 'mlx', name: 'MLX',
      status:    findMlxServer() ? 'stopped' : 'not_installed',
      version:   null,
      models:    listLocalModels(),
      serverUrl: SERVER_URL,
      probedAt,
    }
  }

  ensure(): Promise<{
    outcome: 'already_running' | 'started' | 'not_installed' | 'timeout' | 'failed'
    engine:  RuntimeEngine
  }> {
    if (!this.ensureInFlight) {
      this.ensureInFlight = this._ensure().finally(() => {
        this.ensureInFlight = null
      })
    }
    return this.ensureInFlight
  }

  private async _ensure(): Promise<{
    outcome: 'already_running' | 'started' | 'not_installed' | 'timeout' | 'failed'
    engine:  RuntimeEngine
  }> {
    const initial = await this.probe()

    if (initial.status === 'running')       return { outcome: 'already_running', engine: initial }
    if (initial.status === 'not_installed') return { outcome: 'not_installed',   engine: initial }

    const python = findMlxServer()
    if (!python) return { outcome: 'not_installed', engine: initial }

    // MLX server requires a model to start — the caller must select one first.
    // We use the selection from RuntimeManager; if none, we cannot start.
    // This returns 'not_installed' as a signal to the frontend to pick a model.
    return { outcome: 'not_installed', engine: { ...initial, status: 'not_installed' } }
  }

  /**
   * Start the MLX server with a specific model ID.
   * Called by RuntimeManager when a model is explicitly selected.
   */
  async startWithModel(modelId: string): Promise<{
    outcome: 'started' | 'timeout' | 'failed'
    engine:  RuntimeEngine
  }> {
    this.serverProcess?.kill('SIGTERM')

    try {
      this.serverProcess = spawn('python3', [
        '-m', 'mlx_lm.server',
        '--model', modelId,
        '--port',  String(SERVER_PORT),
        '--host',  '127.0.0.1',
      ], { detached: false, stdio: 'ignore' })
    } catch {
      const engine = await this.probe()
      return { outcome: 'failed', engine }
    }

    let healthy = false
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 500))
      try {
        const res = await fetch(`${SERVER_URL}/v1/models`, { signal: AbortSignal.timeout(1_000) })
        if (res.ok) { healthy = true; break }
      } catch { /* keep polling */ }
    }

    const engine = await this.probe()
    return { outcome: healthy ? 'started' : 'timeout', engine }
  }

  async pull(
    modelId:    string,
    onProgress: (update: Partial<PullJob>) => void,
    signal?:    AbortSignal,
  ): Promise<void> {
    // modelId is a HuggingFace repo ID: "mlx-community/Llama-3.2-3B-Instruct-4bit"
    // We download it using huggingface_hub via Python.
    const localDir = join(MLX_MODELS_DIR, modelId.replaceAll('/', '--'))

    onProgress({ status: 'downloading', progressPercent: 0, message: 'Downloading from HuggingFace…' })

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', ['-c', `
from huggingface_hub import snapshot_download
import sys
snapshot_download(repo_id="${modelId}", local_dir="${localDir}")
print("done")
`], { stdio: ['ignore', 'pipe', 'pipe'] })

      signal?.addEventListener('abort', () => proc.kill())

      proc.stdout.on('data', (d: Buffer) => {
        const line = d.toString().trim()
        if (line === 'done') {
          onProgress({ status: 'complete', progressPercent: 100, message: null })
        } else {
          onProgress({ status: 'downloading', message: line })
        }
      })

      proc.on('exit', code => {
        if (code === 0) resolve()
        else reject(new Error(`MLX download process exited with code ${code}`))
      })
      proc.on('error', reject)
    })
  }

  async removeModel(modelId: string): Promise<void> {
    const localDir = join(MLX_MODELS_DIR, modelId.replaceAll('/', '--'))
    await rm(localDir, { recursive: true, force: true })
  }

  getProvider(): IProvider {
    return this.provider
  }
}
