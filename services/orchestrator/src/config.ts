/**
 * Central configuration derived from environment variables.
 * Load dotenv before importing this module (done in index.ts).
 */
export const config = {
  port: Number(process.env.PORT) || 3001,

  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',

  dbPath: process.env.DB_PATH ?? './vigilante.db',

  /** Origins the frontend is served from — allows the browser to reach us. */
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((s) => s.trim()),

  defaultModel: process.env.DEFAULT_MODEL ?? 'llama3.2:latest',
} as const
