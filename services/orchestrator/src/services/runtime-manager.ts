import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
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

  clearSelection(): void {
    this.selection = null
    try {
      if (existsSync(SELECTION_PATH)) unlinkSync(SELECTION_PATH)
    } catch { /* non-critical */ }
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
   *   2. Fall back to Ollama when nothing is selected (backward compatibility).
   *
   * For engines that require a specific model at startup (llama.cpp, MLX),
   * if a model is explicitly selected via Settings, that model is used.
   * If only the engine is selected but no model, the adapter falls back to
   * its default heuristic (first GGUF for llama.cpp; returns not_installed for MLX).
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

    // For engines that need a model at server start time, use the selected model.
    // Both llama.cpp and MLX require a model path/id at startup.
    if (targetEngineId === 'mlx' && this.selection?.modelId) {
      const mlx = adapter as MLXAdapter
      const initial = await mlx.probe()
      if (initial.status !== 'running') {
        const { outcome, engine } = await mlx.startWithModel(this.selection.modelId)
        return { engine, startAttempted: true, outcome }
      }
      return { engine: initial, startAttempted: false, outcome: 'already_running' }
    }

    if (targetEngineId === 'llama.cpp' && this.selection?.modelId) {
      const llamaCpp = adapter as LlamaCppAdapter
      const initial = await llamaCpp.probe()
      if (initial.status !== 'running') {
        const { outcome, engine } = await llamaCpp.startWithModel(this.selection.modelId)
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
   * Returns null if no selection has been made — caller MUST return 503.
   *
   * There is NO implicit Ollama fallback here. If nothing is selected the query
   * route must refuse to run and direct the user to Settings. This prevents
   * confusing "Ollama isn't running" errors on systems that don't use Ollama.
   */
  getActiveProvider(): IProvider | null {
    if (!this.selection) return null
    return this.adapters.get(this.selection.engineId)?.getProvider() ?? null
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
