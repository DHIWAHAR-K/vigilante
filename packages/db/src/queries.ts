import { eq, desc } from 'drizzle-orm'
import { conversations, messages } from './schema/index'
import type { VigilanteDb } from './client'
import type { Conversation, NewConversation, Message, NewMessage } from './schema/index'

// ─── Conversations ─────────────────────────────────────────────────────────────

export async function getConversation(
  db: VigilanteDb,
  id: string,
): Promise<Conversation | undefined> {
  const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1)
  return row
}

export async function listConversations(db: VigilanteDb): Promise<Conversation[]> {
  return db.select().from(conversations).orderBy(desc(conversations.updatedAt))
}

export async function insertConversation(
  db: VigilanteDb,
  data: NewConversation,
): Promise<void> {
  await db.insert(conversations).values(data)
}

export async function updateConversation(
  db: VigilanteDb,
  id: string,
  data: Partial<Omit<NewConversation, 'id'>>,
): Promise<void> {
  await db.update(conversations).set(data).where(eq(conversations.id, id))
}

export async function deleteConversation(db: VigilanteDb, id: string): Promise<void> {
  // Messages cascade-delete via FK constraint
  await db.delete(conversations).where(eq(conversations.id, id))
}

// ─── Messages ──────────────────────────────────────────────────────────────────

export async function getMessagesForConversation(
  db: VigilanteDb,
  conversationId: string,
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
}

export async function insertMessage(db: VigilanteDb, data: NewMessage): Promise<void> {
  await db.insert(messages).values(data)
}
