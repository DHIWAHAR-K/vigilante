import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { checkRuntime, getCachedRuntimeStatus, RuntimeModel, RuntimeStatusResponse } from '@/lib/api/client';

export type RuntimeStatus = 'checking' | 'unknown' | 'running' | 'available' | 'stopped' | 'not-installed' | 'error';

export type ModelInfo = {
  id: string;
  name: string;
  size: string;
  modifiedAt: Date;
};

function formatBytesToSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function mapRuntimeModel(model: RuntimeModel): ModelInfo {
  return {
    id: model.name,
    name: model.name,
    size: formatBytesToSize(model.size_bytes),
    modifiedAt: model.modified_at ? new Date(model.modified_at) : new Date(),
  };
}

function mapRuntimeStatus(backendStatus: RuntimeStatus): RuntimeStatus {
  switch (backendStatus) {
    case 'running':
      return 'running';
    case 'available':
      return 'available';
    case 'stopped':
      return 'stopped';
    case 'not-installed':
      return 'not-installed';
    case 'error':
      return 'error';
    default:
      return 'checking';
  }
}

interface RuntimeState {
  status: RuntimeStatus;
  isOnline: boolean;
  models: ModelInfo[];
  selectedModel: string | null;
  isOllamaInstalled: boolean;
  ollamaVersion: string | null;
  baseUrl: string;
  isChecking: boolean;
  error: string | null;
  
  setStatus: (status: RuntimeStatus) => void;
  setOnline: (online: boolean) => void;
  setModels: (models: ModelInfo[]) => void;
  selectModel: (modelId: string) => void;
  setOllamaInstalled: (installed: boolean, version?: string) => void;
  setError: (error: string | null) => void;
  checkRuntime: () => Promise<void>;
  initializeFromCache: () => Promise<void>;
}

export const useRuntimeStore = create<RuntimeState>()(
  persist(
    (set, get) => ({
      status: 'checking',
      isOnline: true,
      models: [],
      selectedModel: null,
      isOllamaInstalled: false,
      ollamaVersion: null,
      baseUrl: 'http://127.0.0.1:11434',
      isChecking: false,
      error: null,

      setStatus: (status) => set({ status }),
      
      setOnline: (online) => set({ isOnline: online }),
      
      setModels: (models) => set({ models }),
      
      selectModel: (modelId) => set({ selectedModel: modelId }),
      
      setOllamaInstalled: (installed, version) => set({ 
        isOllamaInstalled: installed,
        ollamaVersion: version || null,
      }),

      setError: (error) => set({ error }),

      initializeFromCache: async () => {
        try {
          const cached = await getCachedRuntimeStatus();
          const status = mapRuntimeStatus(cached.status);
          
          set({
            status,
            isOllamaInstalled: status !== 'not-installed' && status !== 'unknown',
            ollamaVersion: cached.version || null,
            models: cached.models.map(mapRuntimeModel),
            baseUrl: cached.base_url,
            selectedModel: cached.models.length > 0 ? cached.models[0].name : null,
          });
        } catch (error) {
          console.error('Failed to load cached runtime status:', error);
          set({
            status: 'not-installed',
            isOllamaInstalled: false,
          });
        }
      },

      checkRuntime: async () => {
        set({ isChecking: true, error: null });
        
        try {
          const result: RuntimeStatusResponse = await checkRuntime();
          const status = mapRuntimeStatus(result.status);
          
          const models = result.models.map(mapRuntimeModel);
          
          // Auto-select first model if none selected
          const currentSelected = get().selectedModel;
          const selectedModel = currentSelected && models.some(m => m.id === currentSelected)
            ? currentSelected
            : models.length > 0 ? models[0].id : null;

          set({
            status,
            isOllamaInstalled: status !== 'not-installed' && status !== 'unknown',
            ollamaVersion: result.version || null,
            models,
            baseUrl: result.base_url,
            selectedModel,
            isChecking: false,
            error: null,
          });
        } catch (error) {
          console.error('Runtime check failed:', error);
          set({
            status: 'error',
            isChecking: false,
            error: error instanceof Error ? error.message : 'Failed to check runtime',
          });
        }

        // Listen for online/offline
        window.addEventListener('online', () => get().setOnline(true));
        window.addEventListener('offline', () => get().setOnline(false));
      },
    }),
    {
      name: 'vigilante-runtime-storage',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
      })
    }
  )
);
