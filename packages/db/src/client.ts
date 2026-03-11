import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema/index'

/**
 * Create and initialise a Drizzle SQLite database at the given path.
 * Tables are created on first run (no separate migration step needed for Phase 0).
 */
export function createDb(dbPath: string) {
  const sqlite = new Database(dbPath)

  // Performance pragmas
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  // Bootstrap schema — idempotent, safe to run on every startup
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      model       TEXT NOT NULL,
      provider    TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content         TEXT NOT NULL,
      sources         TEXT NOT NULL DEFAULT '[]',
      token_count     INTEGER,
      created_at      TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
      ON messages(conversation_id);

    CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
      ON conversations(updated_at DESC);
  `)

  return drizzle(sqlite, { schema })
}

export type VigilanteDb = ReturnType<typeof createDb>
