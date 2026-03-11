import {
  getConversation,
  insertConversation,
  updateConversation,
  getMessagesForConversation,
  insertMessage,
} from '@vigilante/db'
import type { IProvider } from '@vigilante/providers'
import type { VigilanteDb } from '@vigilante/db'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AskParams {
  query: string
  conversationId?: string
  model: string
  provider: IProvider
  db: VigilanteDb
  signal?: AbortSignal
}

export interface SSEEvent {
  name: string
  data: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function now(): string {
  return new Date().toISOString()
}

function deriveTitle(content: string): string {
  const sentence = content.split(/[.!?\n]/)[0]?.trim() ?? content
  return sentence.length > 60 ? sentence.slice(0, 57) + '…' : sentence
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Ask pipeline — conversational mode, no web search, no RAG.
 *
 * Yields SSE events: token* → sources → followups → done
 * Throws on hard errors; the route handler wraps this and emits an `error` event.
 */
export async function* askPipeline(params: AskParams): AsyncGenerator<SSEEvent> {
  const { query, model, provider, db, signal } = params

  // ── 1. Resolve or create conversation ──────────────────────────────────────
  const convId = params.conversationId ?? generateId()
  const existing = await getConversation(db, convId)

  if (!existing) {
    await insertConversation(db, {
      id: convId,
      title: deriveTitle(query),
      model,
      provider: provider.id,
      createdAt: now(),
      updatedAt: now(),
    })
  } else {
    await updateConversation(db, convId, { updatedAt: now(), model, provider: provider.id })
  }

  // ── 2. Load conversation history ────────────────────────────────────────────
  const history = await getMessagesForConversation(db, convId)

  // ── 3. Persist user message ─────────────────────────────────────────────────
  const userMsgId = generateId()
  await insertMessage(db, {
    id: userMsgId,
    conversationId: convId,
    role: 'user',
    content: query,
    sources: '[]',
    createdAt: now(),
  })

  // ── 4. Build message array for the provider ─────────────────────────────────
  const chatMessages = [
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    { role: 'user' as const, content: query },
  ]

  // ── 5. Stream tokens from the provider ─────────────────────────────────────
  let fullContent = ''
  let promptTokens: number | undefined
  let completionTokens: number | undefined

  for await (const chunk of provider.stream({ messages: chatMessages, model, signal })) {
    if (signal?.aborted) break

    if (!chunk.done) {
      fullContent += chunk.content
      yield { name: 'token', data: { token: chunk.content } }
    } else {
      promptTokens = chunk.usage?.promptTokens
      completionTokens = chunk.usage?.completionTokens
    }
  }

  // ── 6. Persist assistant message ────────────────────────────────────────────
  const assistantMsgId = generateId()
  const totalTokens = (promptTokens ?? 0) + (completionTokens ?? 0)

  await insertMessage(db, {
    id: assistantMsgId,
    conversationId: convId,
    role: 'assistant',
    content: fullContent,
    sources: '[]',
    tokenCount: totalTokens || null,
    createdAt: now(),
  })

  // ── 7. Emit terminal events ─────────────────────────────────────────────────
  yield { name: 'sources', data: { sources: [] } }
  yield { name: 'followups', data: { questions: [] } }
  yield {
    name: 'done',
    data: {
      messageId: assistantMsgId,
      conversationId: convId,
      tokensUsed: totalTokens || null,
    },
  }
}
