import type { IProvider } from '@vigilante/providers'
import type { EngineId, RuntimeEngine, PullJob } from '../../types/runtime'

/**
 * IRuntimeAdapter — contract every local runtime engine must implement.
 *
 * An adapter owns the lifecycle of one engine (binary detection, process
 * management, model storage) and hands out an IProvider for inference.
 * Route handlers never touch engine internals directly — they go through
 * RuntimeManager, which delegates to adapters.
 */
export interface IRuntimeAdapter {
  readonly engineId:   EngineId
  readonly engineName: string

  /**
   * Lightweight probe — no side effects, no process spawning.
   * Returns the current engine state + installed model list.
   * Safe to call on a polling timer.
   */
  probe(): Promise<RuntimeEngine>

  /**
   * Ensure the engine is running. Starts it if stopped.
   * Concurrent calls are safe — adapters should coalesce if needed.
   */
  ensure(): Promise<{
    outcome: 'already_running' | 'started' | 'not_installed' | 'timeout' | 'failed'
    engine:  RuntimeEngine
  }>

  /**
   * Pull (download / install) a model.
   * `onProgress` is called periodically with updated partial PullJob fields.
   * Resolves when complete; rejects on error.
   */
  pull(
    modelId:    string,
    onProgress: (update: Partial<PullJob>) => void,
    signal?:    AbortSignal,
  ): Promise<void>

  /**
   * Remove an installed model.
   */
  removeModel(modelId: string): Promise<void>

  /**
   * Return an IProvider instance for inference via this engine.
   * The provider must be ready to `stream()` once the engine is running.
   */
  getProvider(): IProvider
}
