import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  ensureRuntimeReady,
  probeRuntime,
  setSelection as apiSetSelection,
  getModelCatalog,
  startModelPull,
  getPullJob,
  getInstalledModels,
  deleteModel as apiDeleteModel,
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
  deleteModel:       (engineId: EngineId, modelId: string) => Promise<void>
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

          // If the backend has no persisted selection but models are available,
          // auto-select the first one so the query bar has something to show.
          let selection = result.selection
          if (!selection && models.length > 0) {
            const firstModel = models[0]
            selection = { engineId: firstModel.engineId, modelId: firstModel.id }
            try {
              await apiSetSelection(selection)
            } catch {
              // Non-critical — selection lives in memory if persistence fails
            }
          }

          set({
            engines:         result.engines,
            selection,
            installedModels: models,
            // 'ready'     — at least one engine is running and has models installed
            // 'no_models' — probe succeeded but nothing can serve a query yet
            //               (engines stopped, no models installed, or first launch)
            status: result.engines.some(e => e.models.length > 0 && e.status === 'running')
              ? 'ready'
              : 'no_models',
          })
        } catch {
          set({ status: 'error', error: 'Failed to probe runtime' })
        }
      },

      // ensureReady — explicitly start the selected engine.
      // Called manually (e.g., a "Try Again" button), not on app mount.
      // After the ensure completes, follows up with a full refreshStatus so
      // all engines and their models are reflected in state.
      ensureReady: async () => {
        set({ status: 'starting', isChecking: true, error: null })
        try {
          await ensureRuntimeReady()
          // Refresh all engines so state is complete (ensure only returns one engine).
          await get().refreshStatus()
          set({ isChecking: false })
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
              // Refresh installed models and re-probe engines so new model appears everywhere.
              await get().refreshStatus()
            }
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to poll job' })
        }
      },

      deleteModel: async (engineId: EngineId, modelId: string) => {
        try {
          await apiDeleteModel(engineId, modelId)
          // Backend clears selection if the deleted model was active.
          // refreshStatus re-probes everything and auto-selects if models remain.
          await get().refreshStatus()
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to delete model' })
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
