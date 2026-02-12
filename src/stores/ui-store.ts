import { create } from 'zustand';

// ---------------------------------------------------------------------------
// UI Store -- chrome, theme, transient UI state
// ---------------------------------------------------------------------------

type Theme = 'light' | 'dark' | 'system';
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface UIStoreState {
  /** Whether the sidebar is in collapsed (icon-only) mode */
  sidebarCollapsed: boolean;
  /** Current color theme */
  theme: Theme;
  /** Whether the command palette is open */
  commandPaletteOpen: boolean;
  /** ID of the currently-open modal, or null */
  activeModal: string | null;
  /** WebSocket connection status */
  connectionStatus: ConnectionStatus;
  /** Round-trip latency in ms */
  latency: number;
  /** Whether the dashboard is showing demo data (no live PBX) */
  demoMode: boolean;
}

interface UIStoreActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: Theme) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setActiveModal: (id: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLatency: (ms: number) => void;
  setDemoMode: (demo: boolean) => void;
}

type UIStore = UIStoreState & UIStoreActions;

export const useUIStore = create<UIStore>()((set) => ({
  sidebarCollapsed: false,
  theme: 'dark',
  commandPaletteOpen: false,
  activeModal: null,
  connectionStatus: 'disconnected',
  latency: 0,
  demoMode: false,

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  setTheme: (theme) => set({ theme }),

  openCommandPalette: () => set({ commandPaletteOpen: true }),

  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  setActiveModal: (id) => set({ activeModal: id }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setLatency: (ms) => set({ latency: ms }),

  setDemoMode: (demo) => set({ demoMode: demo }),
}));
