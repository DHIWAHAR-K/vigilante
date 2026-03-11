import { createDb } from '@vigilante/db'
import type { VigilanteDb } from '@vigilante/db'
import { config } from './config'

/**
 * Singleton Drizzle database instance for the orchestrator process.
 * Tables are bootstrapped automatically on first connection.
 */
export const db: VigilanteDb = createDb(config.dbPath)
