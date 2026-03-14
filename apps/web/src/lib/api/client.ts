// ─── Types — stay in sync with packages/providers/src/base.ts ModelInfo ───────

export interface RuntimeModel {
  id: string
  name: string
  sizeBytes?: number
  modifiedAt?: string
  family?: string
  parameterSize?: string
  quantization?: string
}

export interface RuntimeStatusResponse {
  available: boolean
  provider: string
  models: RuntimeModel[]
  defaultModel: string | null
}

export interface QueryRequest {
  query: string
  conversationId: string | null
  mode: 'ask'
  provider: {
    id: string
    model: string
  }
  webSearch?: boolean
  files?: string[]
}

export interface SSETokenEvent {
  event: 'token'
  data: { token: string }
}

export interface SSESourcesEvent {
  event: 'sources'
  data: { sources: Source[] }
}

export interface SSEFollowupsEvent {
  event: 'followups'
  data: { questions: string[] }
}

export interface SSEDoneEvent {
  event: 'done'
  data: { messageId: string; conversationId: string; tokensUsed: number | null }
}

export interface SSEErrorEvent {
  event: 'error'
  data: { message: string }
}

export type SSEEvent =
  | SSETokenEvent
  | SSESourcesEvent
  | SSEFollowupsEvent
  | SSEDoneEvent
  | SSEErrorEvent

export interface Source {
  id: string
  title: string
  url: string
  favicon?: string
  excerpt?: string
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ─── Config ───────────────────────────────────────────────────────────────────

const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? 'http://localhost:3001'

// ─── Runtime ─────────────────────────────────────────────────────────────────

export async function checkRuntime(): Promise<RuntimeStatusResponse> {
  const res = await fetch(`${ORCHESTRATOR_URL}/api/runtime/status`)
  if (!res.ok) throw new Error(`Runtime check failed: HTTP ${res.status}`)
  return res.json() as Promise<RuntimeStatusResponse>
}

export async function listModels(providerId = 'ollama'): Promise<RuntimeModel[]> {
  const res = await fetch(
    `${ORCHESTRATOR_URL}/api/models?provider=${encodeURIComponent(providerId)}`,
  )
  if (!res.ok) return []
  const data = (await res.json()) as { models?: RuntimeModel[] }
  return data.models ?? []
}

// ─── Query streaming ──────────────────────────────────────────────────────────

let abortController: AbortController | null = null

export async function* streamQuery(request: QueryRequest): AsyncGenerator<SSEEvent> {
  abortController = new AbortController()

  const response = await fetch(`${ORCHESTRATOR_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: abortController.signal,
  })

  if (!response.ok) {
    const text = await response.text()
    yield {
      event: 'error',
      data: { message: text || `Request failed: HTTP ${response.status}` },
    }
    return
  }

  if (!response.body) {
    yield { event: 'error', data: { message: 'No response body' } }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let currentEvent = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          const raw = line.slice(5).trim()
          if (!raw) continue
          try {
            const data = JSON.parse(raw) as Record<string, unknown>
            switch (currentEvent) {
              case 'token':
                yield { event: 'token', data: data as SSETokenEvent['data'] }
                break
              case 'sources':
                yield { event: 'sources', data: data as SSESourcesEvent['data'] }
                break
              case 'followups':
                yield { event: 'followups', data: data as SSEFollowupsEvent['data'] }
                break
              case 'done':
                yield { event: 'done', data: data as SSEDoneEvent['data'] }
                break
              case 'error':
                yield { event: 'error', data: data as SSEErrorEvent['data'] }
                break
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
    abortController = null
  }
}

export function abortQuery(): void {
  abortController?.abort()
  abortController = null
}
