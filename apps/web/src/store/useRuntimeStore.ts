import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  ensureRuntimeReady,
  probeRuntime,
  setSelection as apiSetSelection,
  getSelection as apiGetSelection,
  getModelCatalog,
  startModelPull,
  getPullJob,
  getInstalledModels,
  EngineId,
  RuntimeEngine,
  InstalledModel,
  RuntimeSelection,
  PullJob,
  CatalogModel,
  formatBytes,
} from '@/lib/api/client'

export type RuntimeStatus =
  | 'checking'
  | 'starting'
  | 'ready'
  | 'no_models'
  | 'error'

export type ModelInfo = {
  id:         string
  name:       string
  engineId:   EngineId
  size:       string
  format:     string
}

function mapInstalledModel(m: InstalledModel): ModelInfo {
  return {
    id:       m.id,
    name:     m.name,
    engineId: m.engineId,
    size:     m.sizeBytes ? formatBytes(m.sizeBytes) : 'Unknown',
    format:   m.format,
  }
}

interface RuntimeState {
  status:          RuntimeStatus
  engines:         RuntimeEngine[]
  selection:       RuntimeSelection | null
  installedModels: ModelInfo[]
  catalogModels:   CatalogModel[]
  pullJob:         PullJob | null
  isChecking:      boolean
  isPulling:       boolean
  error:           string | null

  refreshStatus:     () => Promise<void>
  ensureReady:       () => Promise<void>
  selectModel:       (engineId: EngineId, modelId: string) => Promise<void>
  loadCatalog:       () => Promise<void>
  loadInstalled:     () => Promise<void>
  startPull:         (engineId: EngineId, modelId: string) => Promise<void>
  pollPullJob:       (jobId: string) => Promise<void>
  setError:          (error: string | null) => void
}

export const useRuntimeStore = create<RuntimeState>()(
  persist(
    (set, get) => ({
      status:          'checking',
      engines:         [],
      selection:       null,
      installedModels: [],
      catalogModels:   [],
      pullJob:         null,
      isChecking:      false,
      isPulling:       false,
      error:           null,

      refreshStatus: async () => {
        try {
          const result = await probeRuntime()
          const models = result.engines.flatMap(e => e.models).map(mapInstalledModel)
          set({
            engines:         result.engines,
            selection:       result.selection,
            installedModels: models,
            status:          result.engines.some(e => e.models.length > 0 && e.status === 'running')
              ? 'ready'
              : result.engines.some(e => e.status === 'running')
                ? 'no_models'
                : 'checking',
          })
        } catch {
          set({ status: 'error', error: 'Failed to probe runtime' })
        }
      },

      ensureReady: async () => {
        set({ status: 'starting', isChecking: true, error: null })
        try {
          const result = await ensureRuntimeReady()
          const models = result.engine.models.map(mapInstalledModel)
          set({
            status:          result.engine.models.length > 0 ? 'ready' : 'no_models',
            engines:         [result.engine],
            installedModels: models,
            isChecking:      false,
            error:           null,
          })
        } catch (err) {
          set({
            status:     'error',
            isChecking: false,
            error:      err instanceof Error ? err.message : 'Failed to start runtime',
          })
        }
      },

      selectModel: async (engineId: EngineId, modelId: string) => {
        try {
          const result = await apiSetSelection({ engineId, modelId })
          set({ selection: result.selection })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to select model' })
        }
      },

      loadCatalog: async () => {
        try {
          const result = await getModelCatalog()
          set({ catalogModels: result.catalog })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to load catalog' })
        }
      },

      loadInstalled: async () => {
        try {
          const result = await getInstalledModels()
          set({ installedModels: result.models.map(mapInstalledModel) })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to load models' })
        }
      },

      startPull: async (engineId: EngineId, modelId: string) => {
        set({ isPulling: true, error: null })
        try {
          const result = await startModelPull(engineId, modelId)
          set({ pullJob: result.job })
        } catch (err) {
          set({
            isPulling: false,
            error:     err instanceof Error ? err.message : 'Failed to start pull',
          })
        }
      },

      pollPullJob: async (jobId: string) => {
        try {
          const result = await getPullJob(jobId)
          set({ pullJob: result.job })
          if (result.job.status === 'complete' || result.job.status === 'failed') {
            set({ isPulling: false })
            if (result.job.status === 'complete') {
              await get().loadInstalled()
            }
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to poll job' })
        }
      },

      setError: (error) => set({ error }),
    }),
    {
      name:       'vigilante-runtime-storage',
      partialize: (state) => ({
        selection: state.selection,
      }),
    },
  ),
)
