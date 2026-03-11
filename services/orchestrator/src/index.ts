import 'dotenv/config'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'

import { corsMiddleware } from './middleware/cors'
import { queryRoutes } from './routes/query'
import { runtimeRoutes } from './routes/runtime'
import { conversationRoutes } from './routes/conversations'
import { config } from './config'

// Eagerly initialise DB (creates tables if they don't exist)
import './db'

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono()

// Global middleware
app.use('*', corsMiddleware)
app.use('*', logger())

// Routes — all nested under /api
app.route('/api', queryRoutes)
app.route('/api', runtimeRoutes)
app.route('/api', conversationRoutes)

// Catch-all 404
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Global error handler
app.onError((err, c) => {
  console.error('[orchestrator] unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// ─── Start ────────────────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`
╔═══════════════════════════════════════════════╗
║         Vigilante Orchestrator                ║
╠═══════════════════════════════════════════════╣
║  Listening on  http://localhost:${info.port}        ║
║  Ollama URL    ${config.ollamaBaseUrl.padEnd(32)}║
║  Database      ${config.dbPath.padEnd(32)}║
╚═══════════════════════════════════════════════╝
`)
})
