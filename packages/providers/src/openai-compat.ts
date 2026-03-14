import type { IProvider, ChatRequest, ModelInfo, StreamChunk } from './base'

// ─── OpenAI SSE response shape ────────────────────────────────────────────────

interface OAIStreamChunk {
  id:      string
  object:  'chat.completion.chunk'
  choices: Array<{
    delta:         { content?: string; role?: string }
    finish_reason: string | null
    index:         number
  }>
  usage?: {
    prompt_tokens:     number
    completion_tokens: number
    total_tokens:      number
  }
}

/**
 * OpenAI-compatible streaming provider.
 *
 * Works with any server that implements the OpenAI /v1/chat/completions
 * streaming API — including llama.cpp server, MLX server, and vLLM.
 */
export class OpenAICompatProvider implements IProvider {
  readonly type = 'local' as const

  constructor(
    readonly id:            string,
    readonly name:          string,
    private readonly baseUrl:       string,
    private readonly defaultModel:  string = '',
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(3_000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(5_000),
      })
      if (!res.ok) return []
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      return (data.data ?? []).map(m => ({ id: m.id, name: m.id }))
    } catch {
      return []
    }
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const model = request.model || this.defaultModel

    const messages = request.systemPrompt
      ? [{ role: 'system', content: request.systemPrompt }, ...request.messages]
      : request.messages

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        model,
        messages,
        stream:         true,
        stream_options: { include_usage: true },
      }),
      signal: request.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`)
      throw new Error(`${this.name} error ${res.status}: ${text}`)
    }
    if (!res.body) throw new Error(`${this.name} returned no response body`)

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer            = ''
    let promptTokens:     number | undefined
    let completionTokens: number | undefined

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (!trimmed.startsWith('data: ')) continue

          let chunk: OAIStreamChunk
          try { chunk = JSON.parse(trimmed.slice(6)) as OAIStreamChunk }
          catch { continue }

          if (chunk.usage) {
            promptTokens     = chunk.usage.prompt_tokens
            completionTokens = chunk.usage.completion_tokens
          }

          const content      = chunk.choices[0]?.delta?.content ?? ''
          const finishReason = chunk.choices[0]?.finish_reason

          if (content) {
            yield { content, done: false }
          }

          if (finishReason === 'stop' || finishReason === 'length') {
            yield {
              content: '',
              done:    true,
              usage:   { promptTokens, completionTokens },
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
