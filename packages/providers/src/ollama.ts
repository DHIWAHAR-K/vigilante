import type { IProvider, ChatRequest, ModelInfo, StreamChunk, ChatMessage } from './base'

// ─── Ollama API response shapes ────────────────────────────────────────────────

interface OllamaVersionResponse {
  version: string
}

interface OllamaModel {
  name: string
  size: number
  modified_at: string
  details?: {
    family?: string
    parameter_size?: string
    quantization_level?: string
  }
}

interface OllamaTagsResponse {
  models: OllamaModel[]
}

interface OllamaChatChunk {
  model: string
  created_at: string
  message: { role: string; content: string }
  done: false
}

interface OllamaChatDoneChunk {
  model: string
  created_at: string
  done: true
  done_reason: string
  prompt_eval_count?: number
  eval_count?: number
  total_duration?: number
}

type OllamaChunk = OllamaChatChunk | OllamaChatDoneChunk

// ─── Provider implementation ───────────────────────────────────────────────────

export class OllamaProvider implements IProvider {
  readonly id = 'ollama'
  readonly name = 'Ollama'
  readonly type = 'local' as const

  constructor(private readonly baseUrl: string) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(3_000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(3_000),
      })
      if (!res.ok) return null
      const data = (await res.json()) as OllamaVersionResponse
      return data.version ?? null
    } catch {
      return null
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as OllamaTagsResponse
      return data.models.map((m) => ({
        id: m.name,
        name: m.name,
        sizeBytes: m.size,
        modifiedAt: m.modified_at,
        family: m.details?.family,
        parameterSize: m.details?.parameter_size,
        quantization: m.details?.quantization_level,
      }))
    } catch {
      return []
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const messages: ChatMessage[] = request.systemPrompt
      ? [{ role: 'system', content: request.systemPrompt }, ...request.messages]
      : request.messages

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages,
        stream: true,
      }),
      signal: request.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(`Ollama error ${res.status}: ${text}`)
    }

    if (!res.body) {
      throw new Error('Ollama returned no response body')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Ollama streams NDJSON — split on newlines, keep partial last line
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          let chunk: OllamaChunk
          try {
            chunk = JSON.parse(trimmed) as OllamaChunk
          } catch {
            // Skip malformed lines
            continue
          }

          if (chunk.done) {
            yield {
              content: '',
              done: true,
              usage: {
                promptTokens: (chunk as OllamaChatDoneChunk).prompt_eval_count,
                completionTokens: (chunk as OllamaChatDoneChunk).eval_count,
              },
            }
          } else {
            yield {
              content: (chunk as OllamaChatChunk).message.content,
              done: false,
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
