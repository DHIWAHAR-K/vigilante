import { Hono } from 'hono'
import {
  listConversations,
  getConversation,
  getMessagesForConversation,
  deleteConversation,
} from '@vigilante/db'
import { db } from '../db'

export const conversationRoutes = new Hono()

// ─── List ─────────────────────────────────────────────────────────────────────

conversationRoutes.get('/conversations', async (c) => {
  const rows = await listConversations(db)
  return c.json({ conversations: rows })
})

// ─── Get with messages ────────────────────────────────────────────────────────

conversationRoutes.get('/conversations/:id', async (c) => {
  const id = c.req.param('id')
  const conversation = await getConversation(db, id)

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  const msgs = await getMessagesForConversation(db, id)

  return c.json({
    conversation,
    messages: msgs.map((m) => ({
      ...m,
      sources: JSON.parse(m.sources) as unknown[],
    })),
  })
})

// ─── Delete ───────────────────────────────────────────────────────────────────

conversationRoutes.delete('/conversations/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await getConversation(db, id)

  if (!existing) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  // Messages are deleted via ON DELETE CASCADE
  await deleteConversation(db, id)

  return c.json({ deleted: id })
})
