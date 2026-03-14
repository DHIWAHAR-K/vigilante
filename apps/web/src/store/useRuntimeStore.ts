import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { checkRuntime, RuntimeModel, formatBytes } from '@/lib/api/client'

export type RuntimeStatus = 'checking' | 'unknown' | 'running' | 'available' | 'stopped' | 'not-installed' | 'error'

export type ModelInfo = {
  id: string
  name: string
  size: string
  modifiedAt: Date
}

function mapRuntimeModel(model: RuntimeModel): ModelInfo {
  return {
    id: model.id,
    name: model.name,
    size: model.sizeBytes !== undefined ? formatBytes(model.sizeBytes) : 'Unknown',
    modifiedAt: model.modifiedAt ? new Date(model.modifiedAt) : new Date(),
  }
}

interface RuntimeState {
  status: RuntimeStatus
  isOnline: boolean
  models: ModelInfo[]
  selectedModel: string | null
  isChecking: boolean
  error: string | null

  setStatus: (status: RuntimeStatus) => void
  setOnline: (online: boolean) => void
  setModels: (models: ModelInfo[]) => void
  selectModel: (modelId: string) => void
  setError: (error: string | null) => void
  checkRuntime: () => Promise<void>
}

export const useRuntimeStore = create<RuntimeState>()(
  persist(
    (set, get) => ({
      status: 'checking',
      isOnline: true,
      models: [],
      selectedModel: null,
      isChecking: false,
      error: null,

      setStatus: (status) => set({ status }),

      setOnline: (online) => set({ isOnline: online }),

      setModels: (models) => set({ models }),

      selectModel: (modelId) => set({ selectedModel: modelId }),

      setError: (error) => set({ error }),

      checkRuntime: async () => {
        set({ isChecking: true, error: null })

        try {
          const result = await checkRuntime()
          const models = result.models.map(mapRuntimeModel)

          const currentSelected = get().selectedModel
          const defaultModel = result.defaultModel ?? null

          // Keep current selection if still available; fall back to
          // configured default, then first installed model.
          const selectedModel =
            currentSelected && models.some((m) => m.id === currentSelected)
              ? currentSelected
              : models.some((m) => m.id === defaultModel)
                ? defaultModel
                : models.length > 0
                  ? models[0].id
                  : null

          set({
            status: result.available ? 'running' : 'stopped',
            models,
            selectedModel,
            isChecking: false,
            error: null,
          })
        } catch (error) {
          set({
            status: 'error',
            isChecking: false,
            error: error instanceof Error ? error.message : 'Failed to reach orchestrator',
          })
        }

        window.addEventListener('online', () => get().setOnline(true))
        window.addEventListener('offline', () => get().setOnline(false))
      },
    }),
    {
      name: 'vigilante-runtime-storage',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
      }),
    },
  ),
)
