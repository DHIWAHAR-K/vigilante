import { randomBytes } from 'crypto'
import type { PullJob, EngineId, CatalogModel } from '../types/runtime'
import { runtimeManager } from './runtime-manager'

// ─── Model catalog ────────────────────────────────────────────────────────────
//
//  Static curated catalog for v1.  Future: fetch from a remote catalog API
//  so new models appear without an orchestrator update.

export const MODEL_CATALOG: CatalogModel[] = [
  // ── Ollama ────────────────────────────────────────────────────────────────
  {
    id:            'llama3.2:1b',
    name:          'Llama 3.2 1B',
    description:   'Fastest local model — great for quick answers on limited hardware.',
    engineId:      'ollama',
    format:        'ollama',
    sizeBytes:     1_300_000_000,
    parameterSize: '1B',
    quantization:  'Q4_K_M',
    tags:          ['recommended', 'fast', 'small'],
  },
  {
    id:            'llama3.2:3b',
    name:          'Llama 3.2 3B',
    description:   'Best balance of speed and quality — recommended for most users.',
    engineId:      'ollama',
    format:        'ollama',
    sizeBytes:     2_000_000_000,
    parameterSize: '3B',
    quantization:  'Q4_K_M',
    tags:          ['recommended', 'fast'],
  },
  {
    id:            'llama3.1:8b',
    name:          'Llama 3.1 8B',
    description:   'High-quality responses — requires ~8 GB RAM.',
    engineId:      'ollama',
    format:        'ollama',
    sizeBytes:     4_700_000_000,
    parameterSize: '8B',
    quantization:  'Q4_K_M',
    tags:          ['smart'],
  },
  {
    id:            'qwen2.5:3b',
    name:          'Qwen 2.5 3B',
    description:   'Strong multilingual model — excellent for non-English queries.',
    engineId:      'ollama',
    format:        'ollama',
    sizeBytes:     2_000_000_000,
    parameterSize: '3B',
    quantization:  'Q4_K_M',
    tags:          ['recommended', 'multilingual'],
  },
  {
    id:            'phi3.5',
    name:          'Phi 3.5',
    description:   'Microsoft small model — exceptional reasoning for its size.',
    engineId:      'ollama',
    format:        'ollama',
    sizeBytes:     2_200_000_000,
    parameterSize: '3.8B',
    quantization:  'Q4_K_M',
    tags:          ['fast', 'smart'],
  },
  {
    id:            'gemma3:1b',
    name:          'Gemma 3 1B',
    description:   'Google's smallest model — extremely fast on limited hardware.',
    engineId:      'ollama',
    format:        'ollama',
    sizeBytes:     815_000_000,
    parameterSize: '1B',
    quantization:  'Q4_K_M',
    tags:          ['fast', 'small'],
  },
  {
    id:            'codellama:7b',
    name:          'Code Llama 7B',
    description:   'Specialised for code generation, review, and explanation.',
    engineId:      'ollama',
    format:        'ollama',
    sizeBytes:     3_800_000_000,
    parameterSize: '7B',
    quantization:  'Q4_K_M',
    tags:          ['code'],
  },
  {
    id:            'mistral',
    name:          'Mistral 7B',
    description:   'Strong general-purpose model from Mistral AI.',
    engineId:      'ollama',
    format:        'ollama',
    sizeBytes:     4_100_000_000,
    parameterSize: '7B',
    quantization:  'Q4_K_M',
    tags:          ['smart'],
  },

  // ── MLX (Apple Silicon only) ──────────────────────────────────────────────
  {
    id:            'mlx-community/Llama-3.2-3B-Instruct-4bit',
    name:          'Llama 3.2 3B (MLX)',
    description:   'Native Apple Silicon — fastest inference on M-series Macs.',
    engineId:      'mlx',
    format:        'mlx',
    sizeBytes:     1_700_000_000,
    parameterSize: '3B',
    quantization:  '4bit',
    tags:          ['recommended', 'fast'],
  },
  {
    id:            'mlx-community/Qwen2.5-3B-Instruct-4bit',
    name:          'Qwen 2.5 3B (MLX)',
    description:   'Multilingual model with native M-series performance.',
    engineId:      'mlx',
    format:        'mlx',
    sizeBytes:     1_900_000_000,
    parameterSize: '3B',
    quantization:  '4bit',
    tags:          ['multilingual', 'fast'],
  },
  {
    id:            'mlx-community/Llama-3.2-1B-Instruct-4bit',
    name:          'Llama 3.2 1B (MLX)',
    description:   'Smallest MLX model — fastest possible on Apple Silicon.',
    engineId:      'mlx',
    format:        'mlx',
    sizeBytes:     700_000_000,
    parameterSize: '1B',
    quantization:  '4bit',
    tags:          ['fast', 'small'],
  },

  // ── llama.cpp / GGUF ─────────────────────────────────────────────────────
  //
  //  `id` is the HuggingFace repo+file path.
  //  `downloadUrl` is the direct HTTPS URL passed to the adapter's pull().
  {
    id:          'bartowski/Llama-3.2-3B-Instruct-GGUF/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    name:        'Llama 3.2 3B Q4 (GGUF)',
    description: 'Direct GGUF for llama.cpp — no Ollama dependency.',
    engineId:    'llama.cpp',
    format:      'gguf',
    sizeBytes:   2_000_000_000,
    parameterSize: '3B',
    quantization:  'Q4_K_M',
    tags:          ['recommended', 'fast'],
    downloadUrl:   'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  },
  {
    id:          'bartowski/Llama-3.2-1B-Instruct-GGUF/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    name:        'Llama 3.2 1B Q4 (GGUF)',
    description: 'Smallest GGUF — runs on any hardware with llama.cpp.',
    engineId:    'llama.cpp',
    format:      'gguf',
    sizeBytes:   800_000_000,
    parameterSize: '1B',
    quantization:  'Q4_K_M',
    tags:          ['fast', 'small'],
    downloadUrl:   'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  },
]

// ─── Pull job store ───────────────────────────────────────────────────────────
//
//  In-memory for v1.  Survives the request but not an orchestrator restart.
//  Future: persist to SQLite so pull progress survives restarts.

const pullJobs = new Map<string, PullJob>()

export function getJob(id: string): PullJob | undefined {
  return pullJobs.get(id)
}

export function listJobs(): PullJob[] {
  return [...pullJobs.values()]
}

/**
 * Start a background pull job and return the initial PullJob immediately.
 * The caller can poll GET /api/models/pull/:jobId for progress.
 *
 * For llama.cpp, `modelId` should be the catalog entry's `downloadUrl`.
 * For ollama and mlx, `modelId` is the engine-native model identifier.
 */
export function startPull(engineId: EngineId, modelId: string): PullJob {
  const id  = randomBytes(8).toString('hex')
  const job: PullJob = {
    id,
    engineId,
    modelId,
    status:          'queued',
    progressPercent: 0,
    downloadedBytes: null,
    totalBytes:      null,
    message:         null,
    error:           null,
    startedAt:       new Date().toISOString(),
    completedAt:     null,
  }
  pullJobs.set(id, job)

  const adapter = runtimeManager.getAdapter(engineId)
  if (!adapter) {
    job.status      = 'failed'
    job.error       = `Engine "${engineId}" is not registered`
    job.completedAt = new Date().toISOString()
    return job
  }

  job.status = 'downloading'

  // Run in background — the route returns the job snapshot immediately.
  adapter.pull(
    modelId,
    (update: Partial<PullJob>) => { Object.assign(job, update) },
  ).then(() => {
    if (job.status !== 'complete') {
      job.status          = 'complete'
      job.progressPercent = 100
      job.completedAt     = new Date().toISOString()
    }
  }).catch((err: unknown) => {
    job.status      = 'failed'
    job.error       = err instanceof Error ? err.message : String(err)
    job.completedAt = new Date().toISOString()
  })

  return job
}
