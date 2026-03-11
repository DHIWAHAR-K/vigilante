import { cors as honoCors } from 'hono/cors'
import { config } from '../config'

/**
 * CORS middleware — allows the Next.js dev server (and any configured origin)
 * to reach the orchestrator with full headers and methods.
 */
export const corsMiddleware = honoCors({
  origin: config.corsOrigins,
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposeHeaders: ['Content-Type'],
  maxAge: 86400,
})
