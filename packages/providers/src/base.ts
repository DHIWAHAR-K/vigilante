// ─── Shared types ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  model: string
  /** Optional system prompt prepended before conversation history. */
  systemPrompt?: string
  /** Abort signal for cancellation / client disconnect. */
  signal?: AbortSignal
}

export interface StreamChunk {
  /** The text delta for this chunk. Empty string on the final done chunk. */
  content: string
  done: boolean
  usage?: {
    promptTokens?: number
    completionTokens?: number
  }
}

export interface ModelInfo {
  id: string
  name: string
  /** Size in bytes — not always available from remote providers. */
  sizeBytes?: number
  modifiedAt?: string
  family?: string
  parameterSize?: string
  quantization?: string
}

// ─── Provider interface ────────────────────────────────────────────────────────

export interface IProvider {
  readonly id: string
  readonly name: string
  readonly type: 'local' | 'remote'

  /** Return true if the provider is reachable and accepting requests. */
  isAvailable(): Promise<boolean>

  /** List models installed / available for this provider. */
  listModels(): Promise<ModelInfo[]>

  /**
   * Stream a chat completion. Yields chunks in order; the last chunk
   * has done=true and may carry usage stats.
   */
  stream(request: ChatRequest): AsyncIterable<StreamChunk>
}
