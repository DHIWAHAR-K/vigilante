import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core'
import { conversations } from './conversations'

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  // Serialised JSON array of { id, url, title, excerpt, favicon } — empty for user messages
  sources: text('sources').notNull().default('[]'),
  tokenCount: integer('token_count'),
  createdAt: text('created_at').notNull(),
})

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
