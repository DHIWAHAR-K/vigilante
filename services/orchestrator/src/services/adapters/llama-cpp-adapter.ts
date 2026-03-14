import { execFileSync, spawn } from 'child_process'
import { existsSync, readdirSync, statSync, createWriteStream } from 'fs'
import { mkdir, unlink } from 'fs/promises'
import { join, basename } from 'path'
import { homedir } from 'os'
import type { IRuntimeAdapter } from './base'
import type { IProvider } from '@vigilante/providers'
import type { EngineId, RuntimeEngine, InstalledModel, PullJob } from '../../types/runtime'
import { OpenAICompatProvider } from '@vigilante/providers'

const SERVER_PORT = Number(process.env.LLAMA_CPP_PORT) || 8080
const SERVER_URL  = `http://127.0.0.1:${SERVER_PORT}`
const MODELS_DIR  = process.env.LLAMA_CPP_MODELS_DIR
  ?? join(homedir(), '.vigilante', 'models', 'gguf')

const FIXED_BINARY_PATHS = [
  '/usr/local/bin/llama-server',
  '/opt/homebrew/bin/llama-server',
  join(homedir(), '.local', 'bin', 'llama-server'),
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findBinary(): string | null {
  try {
    const result = execFileSync('which', ['llama-server'], {
      encoding: 'utf8',
      stdio:    ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (result && existsSync(result)) return result
  } catch { /* not in $PATH */ }

  for (const p of FIXED_BINARY_PATHS) {
    if (existsSync(p)) return p
  }
  return null
}

function listInstalledModels(): InstalledModel[] {
  if (!existsSync(MODELS_DIR)) return []
  try {
    return readdirSync(MODELS_DIR)
      .filter(f => f.toLowerCase().endsWith('.gguf'))
      .map(f => {
        const filePath = join(MODELS_DIR, f)
        let sizeBytes  = 0
        try { sizeBytes = statSync(filePath).size } catch { /* ignore */ }
        // Extract quantization from filename, e.g. "model-Q4_K_M.gguf"
        const qMatch = f.match(/[_-](Q\d[_A-Z]*)\.gguf$/i)
        return {
          id:            filePath,          // path is the stable ID for file-based models
          name:          f.replace(/\.gguf$/i, ''),
          engineId:      'llama.cpp' as EngineId,
          format:        'gguf' as const,
          sizeBytes,
          parameterSize: null,
          quantization:  qMatch?.[1] ?? null,
          path:          filePath,
        }
      })
  } catch {
    return []
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * LlamaCppAdapter — manages the llama.cpp server (llama-server binary).
 *
 * Detection:   finds `llama-server` in $PATH or known install locations.
 * Models dir:  ~/.vigilante/models/gguf/ — any .gguf file is treated as installed.
 * Server:      OpenAI-compatible HTTP API on :8080 (LLAMA_CPP_PORT to override).
 * Pull:        downloads a GGUF file from a direct HTTPS URL to the models dir.
 *
 * To start the server the adapter uses the first available model.
 * For production use, call POST /api/runtime/select to choose the active model,
 * then POST /api/runtime/ensure to (re)start the server with that model.
 */
export class LlamaCppAdapter implements IRuntimeAdapter {
  readonly engineId:   EngineId = 'llama.cpp'
  readonly engineName = 'llama.cpp'

  // Provider always points at the local server URL — safe to build once.
  private readonly provider = new OpenAICompatProvider(
    'llama.cpp',
    'llama.cpp',
    SERVER_URL,
  )

  // Track the spawned server process so we can kill it on model switch.
  private serverProcess: ReturnType<typeof spawn> | null = null
  // Coalesce concurrent ensure() calls.
  private ensureInFlight: Promise<{
    outcome: 'already_running' | 'started' | 'not_installed' | 'timeout' | 'failed'
    engine:  RuntimeEngine
  }> | null = null

  async probe(): Promise<RuntimeEngine> {
    const probedAt = new Date().toISOString()
    const models   = listInstalledModels()

    // Check if the server is responding.
    try {
      const res = await fetch(`${SERVER_URL}/health`, {
        signal: AbortSignal.timeout(2_000),
      })
      if (res.ok) {
        return {
          id: 'llama.cpp', name: 'llama.cpp',
          status: 'running', version: null, models,
          serverUrl: SERVER_URL, probedAt,
        }
      }
    } catch { /* not running */ }

    return {
      id: 'llama.cpp', name: 'llama.cpp',
      status:   findBinary() ? 'stopped' : 'not_installed',
      version:  null, models,
      serverUrl: SERVER_URL, probedAt,
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

    if (initial.status === 'running') return { outcome: 'already_running', engine: initial }

    const binary = findBinary()
    if (!binary) return { outcome: 'not_installed', engine: initial }

    const firstModel = initial.models[0]
    if (!firstModel?.path) {
      // Binary installed but no GGUF models found — prompt user to pull a model first.
      return { outcome: 'not_installed', engine: { ...initial, status: 'not_installed' } }
    }

    try {
      this.serverProcess?.kill('SIGTERM')
      this.serverProcess = spawn(binary, [
        '--model',    firstModel.path,
        '--port',     String(SERVER_PORT),
        '--host',     '127.0.0.1',
        '--ctx-size', '4096',
      ], { detached: false, stdio: 'ignore' })
    } catch {
      const engine = await this.probe()
      return { outcome: 'failed', engine }
    }

    // Poll up to 30 s (60 × 500 ms).
    let healthy = false
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 500))
      try {
        const res = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(1_000) })
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
    // For llama.cpp, `modelId` is a direct HTTPS URL to a .gguf file.
    // The catalog populates `downloadUrl` with the real URL; callers should
    // pass that URL here (or a HuggingFace resolve URL).
    await mkdir(MODELS_DIR, { recursive: true })

    const fileName = basename(new URL(modelId).pathname)
    const destPath = join(MODELS_DIR, fileName)

    const res = await fetch(modelId, { signal })
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
    if (!res.body) throw new Error('No response body')

    const contentLength = Number(res.headers.get('content-length') ?? 0) || null
    const writer        = createWriteStream(destPath)
    let downloaded      = 0

    onProgress({
      status:          'downloading',
      downloadedBytes: 0,
      totalBytes:      contentLength,
      progressPercent: 0,
    })

    const reader = res.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        writer.write(Buffer.from(value))
        downloaded += value.byteLength

        const pct = contentLength
          ? Math.round((downloaded / contentLength) * 100)
          : 0
        onProgress({
          status:          'downloading',
          downloadedBytes: downloaded,
          totalBytes:      contentLength,
          progressPercent: pct,
        })
      }
      await new Promise<void>((res, rej) => writer.end(err => err ? rej(err) : res()))
      onProgress({ status: 'complete', progressPercent: 100, downloadedBytes: downloaded })
    } catch (err) {
      writer.destroy()
      throw err
    } finally {
      reader.releaseLock()
    }
  }

  async removeModel(modelId: string): Promise<void> {
    // modelId is the absolute file path for llama.cpp models.
    await unlink(modelId)
  }

  getProvider(): IProvider {
    return this.provider
  }
}
