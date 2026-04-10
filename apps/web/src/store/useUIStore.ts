import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isSidebarCollapsed: boolean;
  isProviderSelectorOpen: boolean;
  isRuntimeCenterOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setProviderSelectorOpen: (open: boolean) => void;
  setRuntimeCenterOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isProviderSelectorOpen: false,
      isRuntimeCenterOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      setProviderSelectorOpen: (open) => set({ isProviderSelectorOpen: open }),
      setRuntimeCenterOpen: (open) => set({ isRuntimeCenterOpen: open }),
    }),
    {
      name: 'vigilante-ui-storage',
    }
  )
);
