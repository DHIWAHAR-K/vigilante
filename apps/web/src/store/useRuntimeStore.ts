import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RuntimeStatus = 'checking' | 'available' | 'running' | 'stopped' | 'error' | 'not-installed';

export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  modifiedAt: Date;
}

interface RuntimeState {
  status: RuntimeStatus;
  isOnline: boolean;
  models: ModelInfo[];
  selectedModel: string | null;
  isOllamaInstalled: boolean;
  ollamaVersion: string | null;
  
  setStatus: (status: RuntimeStatus) => void;
  setOnline: (online: boolean) => void;
  setModels: (models: ModelInfo[]) => void;
  selectModel: (modelId: string) => void;
  setOllamaInstalled: (installed: boolean, version?: string) => void;
  checkRuntime: () => Promise<void>;
}

export const useRuntimeStore = create<RuntimeState>()(
  persist(
    (set, get) => ({
      status: 'checking',
      isOnline: true,
      models: [],
      selectedModel: 'llama3.2',
      isOllamaInstalled: false,
      ollamaVersion: null,

      setStatus: (status) => set({ status }),
      
      setOnline: (online) => set({ isOnline: online }),
      
      setModels: (models) => set({ models }),
      
      selectModel: (modelId) => set({ selectedModel: modelId }),
      
      setOllamaInstalled: (installed, version) => set({ 
        isOllamaInstalled: installed,
        ollamaVersion: version || null,
        status: installed ? 'available' : 'not-installed'
      }),

      checkRuntime: async () => {
        set({ status: 'checking' });
        
        // Simulate checking for Ollama
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock: Ollama is installed and running
        set({
          status: 'running',
          isOllamaInstalled: true,
          ollamaVersion: '0.5.6',
          models: [
            { id: 'llama3.2', name: 'Llama 3.2', size: '3.8GB', modifiedAt: new Date() },
            { id: 'llama3.1', name: 'Llama 3.1', size: '4.7GB', modifiedAt: new Date(Date.now() - 86400000) },
            { id: 'codellama', name: 'CodeLlama', size: '3.8GB', modifiedAt: new Date(Date.now() - 172800000) },
            { id: 'mistral', name: 'Mistral', size: '4.1GB', modifiedAt: new Date(Date.now() - 259200000) },
          ],
          isOnline: navigator.onLine
        });

        // Listen for online/offline
        window.addEventListener('online', () => get().setOnline(true));
        window.addEventListener('offline', () => get().setOnline(false));
      },
    }),
    {
      name: 'vigilante-runtime-storage',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        isOllamaInstalled: state.isOllamaInstalled,
        ollamaVersion: state.ollamaVersion,
      })
    }
  )
);
