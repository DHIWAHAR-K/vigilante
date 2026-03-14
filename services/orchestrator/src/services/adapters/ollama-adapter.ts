import type { IRuntimeAdapter } from './base'
import type { IProvider } from '@vigilante/providers'
import type { EngineId, RuntimeEngine, InstalledModel, PullJob } from '../../types/runtime'
import { OllamaProvider } from '@vigilante/providers'
import {
  probeOllama,
  ensureOllamaReady,
} from '../ollama-manager'

const BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'

/**
 * OllamaAdapter — wraps the existing ollama-manager for backward compatibility.
 *
 * Ollama is the default/fallback engine when no explicit selection is set.
 * Its lifecycle (binary detection, process spawn, coalesced ensure) is handled
 * by the existing ollama-manager service — this adapter is a thin translation layer.
 */
export class OllamaAdapter implements IRuntimeAdapter {
  readonly engineId:   EngineId = 'ollama'
  readonly engineName = 'Ollama'

  private readonly provider = new OllamaProvider(BASE_URL)

  async probe(): Promise<RuntimeEngine> {
    const status = await probeOllama()

    const models: InstalledModel[] = status.models.map(m => ({
      id:            m.id,
      name:          m.name,
      engineId:      'ollama' as EngineId,
      format:        'ollama',
      sizeBytes:     m.sizeBytes,
      parameterSize: m.parameterSize,
      quantization:  m.quantization,
      path:          null,
    }))

    const engineStatus: RuntimeEngine['status'] =
      status.status === 'running'       ? 'running' :
      status.status === 'available'     ? 'running' :   // reachable, no models — still "running"
      status.status === 'stopped'       ? 'stopped' :
      status.status === 'not_installed' ? 'not_installed' :
      'error'

    return {
      id:        'ollama',
      name:      'Ollama',
      status:    engineStatus,
      version:   status.version,
      models,
      serverUrl: BASE_URL,
      probedAt:  status.probedAt,
    }
  }

  async ensure() {
    const result = await ensureOllamaReady()
    const engine = await this.probe()

    const outcome =
      result.startOutcome === 'already_running' ? 'already_running' as const :
      result.startOutcome === 'started'         ? 'started'         as const :
      result.startOutcome === 'not_installed'   ? 'not_installed'   as const :
      result.startOutcome === 'timeout'         ? 'timeout'         as const :
      'failed'                                                       as const

    return { outcome, engine }
  }

  async pull(
    modelId:    string,
    onProgress: (update: Partial<PullJob>) => void,
    signal?:    AbortSignal,
  ): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/pull`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: modelId, stream: true }),
      signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(`Ollama pull failed: ${text}`)
    }
    if (!res.body) throw new Error('No response body from Ollama pull')

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer    = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          let data: Record<string, unknown>
          try { data = JSON.parse(trimmed) as Record<string, unknown> }
          catch { continue }

          if (data['error']) throw new Error(String(data['error']))

          const total     = Number(data['total'] ?? 0)
          const completed = Number(data['completed'] ?? 0)
          const pct       = total > 0 ? Math.round((completed / total) * 100) : 0

          onProgress({
            status:          data['status'] === 'success' ? 'complete' : 'downloading',
            progressPercent: pct,
            downloadedBytes: completed || null,
            totalBytes:      total     || null,
            message:         typeof data['status'] === 'string' ? data['status'] : null,
          })
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async removeModel(modelId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/delete`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: modelId }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(`Failed to remove Ollama model: ${text}`)
    }
  }

  getProvider(): IProvider {
    return this.provider
  }
}
