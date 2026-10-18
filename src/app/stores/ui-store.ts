import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModuleId } from '@/shared/types/domain';

export const ALL_MODULES: ModuleId[] = [
  'home',
  'tables',
  'orders',
  'pos',
  'checks',
  'products',
  'kitchen',
  'cash',
  'reports',
  'team',
  'settings',
];

const LOCKED_MODULES: ModuleId[] = ['home', 'settings'];

interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  establishmentId: string;
  enabledModules: ModuleId[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setEstablishmentId: (id: string) => void;
  toggleModule: (id: ModuleId) => void;
  isModuleEnabled: (id: ModuleId) => boolean;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      establishmentId: 'est_centro',
      enabledModules: ALL_MODULES,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setEstablishmentId: (id) => set({ establishmentId: id }),
      toggleModule: (id) => {
        if (LOCKED_MODULES.includes(id)) return;
        const current = get().enabledModules;
        const enabled = current.includes(id);
        set({
          enabledModules: enabled ? current.filter((item) => item !== id) : [...current, id],
        });
      },
      isModuleEnabled: (id) => get().enabledModules.includes(id),
    }),
    {
      name: 'sabli-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        establishmentId: state.establishmentId,
        enabledModules: state.enabledModules,
      }),
    },
  ),
);
