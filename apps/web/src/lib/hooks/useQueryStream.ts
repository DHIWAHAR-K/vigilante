import { useCallback, useRef } from 'react'
import { Source } from '@/store/useConversationStore'
import type { EngineId } from '@/lib/api/client'

const ORCHESTRATOR_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? 'http://localhost:3001'

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

interface UseQueryStreamOptions {
  onToken: (token: string) => void
  onSources: (sources: Source[]) => void
  onFollowups: (questions: string[]) => void
  onDone: (messageId: string, tokensUsed: number) => void
  onError: (error: string) => void
  onComplete: () => void
}

interface UseQueryStreamReturn {
  submitQuery: (
    query: string,
    conversationId: string | null,
    engineId: EngineId | null,
    modelId: string | null,
  ) => void
  isStreaming: boolean
  abort: () => void
}

export function useQueryStream(options: UseQueryStreamOptions): UseQueryStreamReturn {
  const isStreamingRef = useRef(false)
  const abortRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const submitQuery = useCallback(
    (query: string, conversationId: string | null, engineId: EngineId | null, modelId: string | null) => {
      if (isStreamingRef.current) {
        options.onError('Already streaming')
        return
      }
      if (!modelId) {
        options.onError('No model selected')
        return
      }

      isStreamingRef.current = true
      abortRef.current = false
      abortControllerRef.current = new AbortController()

      ;(async () => {
        try {
          const payload: Record<string, unknown> = {
            query,
            conversationId,
            mode: 'ask',
            webSearch: false,
            files: [],
          }
          if (engineId && modelId) {
            payload.provider = { id: engineId, model: modelId }
          }
          const response = await fetch(`${ORCHESTRATOR_URL}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: abortControllerRef.current?.signal,
          })

          if (!response.ok) {
            const text = await response.text()
            options.onError(text || `Orchestrator returned ${response.status}`)
            return
          }

          if (!response.body) {
            options.onError('No response body')
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
              if (abortRef.current) break

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
                    const parsed = JSON.parse(raw) as Record<string, unknown>
                    switch (currentEvent) {
                      case 'token':
                        options.onToken(parsed.token as string)
                        break
                      case 'sources':
                        options.onSources(parsed.sources as Source[])
                        break
                      case 'followups':
                        options.onFollowups(parsed.questions as string[])
                        break
                      case 'done':
                        options.onDone(
                          parsed.messageId as string,
                          (parsed.tokensUsed as number) ?? 0,
                        )
                        break
                      case 'error':
                        options.onError(parsed.message as string)
                        break
                    }
                  } catch {
                    // Skip malformed JSON lines
                  }
                }
              }
            }
          } finally {
            reader.releaseLock()
          }
        } catch (error) {
          if (!abortRef.current) {
            options.onError(error instanceof Error ? error.message : 'Stream failed')
          }
        } finally {
          isStreamingRef.current = false
          abortControllerRef.current = null
          options.onComplete()
        }
      })()
    },
    // options reference changes every render; that's acceptable — the async
    // closure captures the callbacks at submit time which is intentional.
    [options],
  )

  const abort = useCallback(() => {
    abortRef.current = true
    abortControllerRef.current?.abort()
    isStreamingRef.current = false
  }, [])

  return {
    submitQuery,
    get isStreaming() {
      return isStreamingRef.current
    },
    abort,
  }
}
