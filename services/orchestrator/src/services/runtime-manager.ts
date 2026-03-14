import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import type { IRuntimeAdapter } from './adapters/base'
import type { RuntimeEngine, RuntimeSelection, EngineId, EnsureResult } from '../types/runtime'
import type { IProvider } from '@vigilante/providers'
import { OllamaAdapter }   from './adapters/ollama-adapter'
import { LlamaCppAdapter } from './adapters/llama-cpp-adapter'
import { MLXAdapter }      from './adapters/mlx-adapter'

// ─── Selection persistence ────────────────────────────────────────────────────

const SELECTION_PATH = join(homedir(), '.vigilante', 'runtime-selection.json')

function loadSelection(): RuntimeSelection | null {
  try {
    if (existsSync(SELECTION_PATH)) {
      return JSON.parse(readFileSync(SELECTION_PATH, 'utf8')) as RuntimeSelection
    }
  } catch { /* ignore malformed file */ }
  return null
}

function saveSelection(sel: RuntimeSelection): void {
  try {
    mkdirSync(dirname(SELECTION_PATH), { recursive: true })
    writeFileSync(SELECTION_PATH, JSON.stringify(sel, null, 2), 'utf8')
  } catch { /* non-critical — selection lives in memory */ }
}

// ─── RuntimeManager ───────────────────────────────────────────────────────────

/**
 * RuntimeManager — the central hub for all local AI engine management.
 *
 * Responsibilities:
 *   - Register and probe engine adapters (Ollama, llama.cpp, MLX).
 *   - Persist and restore the active engine + model selection.
 *   - Route inference requests to the selected engine's IProvider.
 *   - Delegate engine lifecycle (start/stop/pull) to adapters.
 *
 * Route handlers call RuntimeManager, not individual adapters directly.
 * This keeps route handlers thin and engine logic in one place.
 */
export class RuntimeManager {
  private readonly adapters: Map<EngineId, IRuntimeAdapter>
  private selection: RuntimeSelection | null

  constructor() {
    this.adapters = new Map<EngineId, IRuntimeAdapter>([
      ['ollama',    new OllamaAdapter()],
      ['llama.cpp', new LlamaCppAdapter()],
      ['mlx',       new MLXAdapter()],
    ])
    this.selection = loadSelection()
  }

  // ── Adapter access ─────────────────────────────────────────────────────────

  getAdapter(engineId: EngineId): IRuntimeAdapter | undefined {
    return this.adapters.get(engineId)
  }

  listAdapters(): IRuntimeAdapter[] {
    return [...this.adapters.values()]
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  getSelection(): RuntimeSelection | null {
    return this.selection
  }

  setSelection(sel: RuntimeSelection): void {
    this.selection = sel
    saveSelection(sel)
  }

  // ── Probe ──────────────────────────────────────────────────────────────────

  /** Probe all engines concurrently and return their snapshots. */
  async probeAll(): Promise<RuntimeEngine[]> {
    const results = await Promise.allSettled(
      this.listAdapters().map(a => a.probe()),
    )
    return results
      .filter((r): r is PromiseFulfilledResult<RuntimeEngine> => r.status === 'fulfilled')
      .map(r => r.value)
  }

  // ── Ensure ─────────────────────────────────────────────────────────────────

  /**
   * Ensure the active engine is running.
   *
   * Priority order:
   *   1. Use the explicitly selected engine if one is saved.
   *   2. Fall back to Ollama for backward compatibility.
   *
   * Returns an EnsureResult regardless of whether start succeeded — the
   * route handler surfaces the outcome to the frontend.
   */
  async ensureReady(): Promise<EnsureResult> {
    const targetEngineId = this.selection?.engineId ?? 'ollama'
    const adapter = this.adapters.get(targetEngineId)

    if (!adapter) {
      // Should never happen unless someone edits the selection file manually.
      const fallback = this.adapters.get('ollama')!
      const { outcome, engine } = await fallback.ensure()
      return { engine, startAttempted: outcome !== 'already_running', outcome }
    }

    // For MLX, if there's an explicit model selection, start with that model.
    if (targetEngineId === 'mlx' && this.selection?.modelId) {
      const mlx = adapter as MLXAdapter
      const initial = await mlx.probe()
      if (initial.status !== 'running') {
        const { outcome, engine } = await mlx.startWithModel(this.selection.modelId)
        return { engine, startAttempted: true, outcome }
      }
      return { engine: initial, startAttempted: false, outcome: 'already_running' }
    }

    const { outcome, engine } = await adapter.ensure()
    return { engine, startAttempted: outcome !== 'already_running', outcome }
  }

  // ── Inference routing ──────────────────────────────────────────────────────

  /**
   * Return the IProvider for the currently selected engine.
   * Returns null if no engine is configured (caller must handle 503).
   */
  getActiveProvider(): IProvider | null {
    const engineId = this.selection?.engineId ?? 'ollama'
    return this.adapters.get(engineId)?.getProvider() ?? null
  }

  /**
   * Return the active model ID, falling back to the provided default.
   * The default is typically `config.defaultModel`.
   */
  getActiveModelId(fallback: string): string {
    return this.selection?.modelId ?? fallback
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const runtimeManager = new RuntimeManager()
