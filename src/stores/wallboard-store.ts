import { create } from 'zustand';
import type { WallboardConfig, Widget, WidgetConfig, LayoutItem } from '@/types';

// ---------------------------------------------------------------------------
// Wallboard Store -- manages wallboard CRUD and editor state
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'calldoc-wallboards';

export interface WallboardSummary {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  widgetCount: number;
  shared: boolean;
}

interface WallboardStoreState {
  /** All wallboard configs */
  wallboards: WallboardConfig[];
  /** Currently loaded wallboard in the editor */
  activeWallboard: WallboardConfig | null;
  /** Selected widget ID in editor */
  selectedWidgetId: string | null;
  /** Editor dirty flag */
  isDirty: boolean;
}

interface WallboardStoreActions {
  /** Load all wallboards from localStorage */
  loadWallboards: () => void;
  /** Get a specific wallboard by ID */
  getWallboard: (id: string) => WallboardConfig | undefined;
  /** Set the active wallboard for editing */
  setActiveWallboard: (wb: WallboardConfig) => void;
  /** Create a new wallboard and return its ID */
  createWallboard: (name: string) => string;
  /** Save the active wallboard */
  saveActiveWallboard: () => void;
  /** Delete a wallboard by ID */
  deleteWallboard: (id: string) => void;
  /** Duplicate a wallboard */
  duplicateWallboard: (id: string) => string;
  /** Update wallboard name */
  updateWallboardName: (name: string) => void;
  /** Add a widget to the active wallboard */
  addWidget: (widget: Widget, layout: LayoutItem) => void;
  /** Remove a widget from the active wallboard */
  removeWidget: (widgetId: string) => void;
  /** Update a widget's config */
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  /** Update widget title */
  updateWidgetTitle: (widgetId: string, title: string) => void;
  /** Update layout */
  setLayout: (layouts: Record<string, LayoutItem[]>) => void;
  /** Select a widget */
  selectWidget: (widgetId: string | null) => void;
  /** Persist all wallboards to localStorage */
  persistWallboards: () => void;
}

type WallboardStore = WallboardStoreState & WallboardStoreActions;

function generateId(): string {
  return `wb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateWidgetId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Mock wallboards for initial state
const MOCK_WALLBOARDS: WallboardConfig[] = [
  {
    id: 'wb-sales-overview',
    name: 'Sales Floor Overview',
    createdBy: 'admin',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-02-09T14:30:00Z',
    theme: 'dark',
    resolution: { width: 1920, height: 1080 },
    refreshInterval: 10,
    widgets: [
      { id: 'w-1', type: 'title-value', title: 'Active Calls', config: { metric: 'active_calls' }, thresholds: [{ operator: 'gte', value: 10, color: '#EAB308' }, { operator: 'gte', value: 20, color: '#EF4444' }] },
      { id: 'w-2', type: 'title-value', title: 'Calls in Queue', config: { metric: 'calls_in_queue' }, thresholds: [{ operator: 'gte', value: 5, color: '#EAB308' }] },
      { id: 'w-3', type: 'gauge', title: 'Service Level', config: { metric: 'service_level' }, thresholds: [] },
      { id: 'w-4', type: 'agent-box', title: 'Agent Status', config: {}, thresholds: [] },
      { id: 'w-5', type: 'chart', title: 'Calls by Hour', config: { chartType: 'bar' }, thresholds: [] },
      { id: 'w-6', type: 'clock', title: 'Clock', config: {}, thresholds: [] },
    ],
    layouts: {
      lg: [
        { i: 'w-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'w-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'w-3', x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'w-4', x: 9, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
        { i: 'w-5', x: 0, y: 2, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'w-6', x: 6, y: 3, w: 3, h: 2, minW: 2, minH: 2 },
      ],
    },
  },
  {
    id: 'wb-support-kpis',
    name: 'Support KPIs',
    createdBy: 'admin',
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-02-08T09:15:00Z',
    theme: 'dark',
    resolution: { width: 1920, height: 1080 },
    refreshInterval: 15,
    widgets: [
      { id: 'w-s1', type: 'title-value', title: 'Calls Handled Today', config: { metric: 'calls_handled' }, thresholds: [] },
      { id: 'w-s2', type: 'title-value', title: 'Avg Wait Time', config: { metric: 'avg_wait_time' }, thresholds: [{ operator: 'gte', value: 30, color: '#EAB308' }, { operator: 'gte', value: 60, color: '#EF4444' }] },
      { id: 'w-s3', type: 'leaderboard', title: 'Top Agents', config: { maxItems: 10 }, thresholds: [] },
      { id: 'w-s4', type: 'pie-chart', title: 'Calls by Group', config: {}, thresholds: [] },
    ],
    layouts: {
      lg: [
        { i: 'w-s1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'w-s2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'w-s3', x: 6, y: 0, w: 6, h: 5, minW: 3, minH: 3 },
        { i: 'w-s4', x: 0, y: 2, w: 6, h: 4, minW: 3, minH: 3 },
      ],
    },
  },
  {
    id: 'wb-lobby-display',
    name: 'Lobby Display',
    createdBy: 'supervisor',
    createdAt: '2026-02-05T08:00:00Z',
    updatedAt: '2026-02-10T07:00:00Z',
    theme: 'dark',
    resolution: { width: 1920, height: 1080 },
    refreshInterval: 30,
    widgets: [
      { id: 'w-l1', type: 'clock', title: 'Time', config: { timezone: 'America/New_York' }, thresholds: [] },
      { id: 'w-l2', type: 'marquee', title: 'Announcements', config: { content: 'Welcome to Acme Corp. Our call center team is here to help!', scrollSpeed: 50 }, thresholds: [] },
      { id: 'w-l3', type: 'group-box', title: 'Sales Queue', config: {}, thresholds: [] },
      { id: 'w-l4', type: 'group-box', title: 'Support Queue', config: {}, thresholds: [] },
    ],
    layouts: {
      lg: [
        { i: 'w-l1', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'w-l2', x: 0, y: 2, w: 12, h: 1, minW: 4, minH: 1 },
        { i: 'w-l3', x: 0, y: 3, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'w-l4', x: 6, y: 3, w: 6, h: 3, minW: 3, minH: 2 },
      ],
    },
  },
];

export const useWallboardStore = create<WallboardStore>()((set, get) => ({
  wallboards: MOCK_WALLBOARDS,
  activeWallboard: null,
  selectedWidgetId: null,
  isDirty: false,

  loadWallboards: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set({ wallboards: parsed });
          return;
        }
      }
    } catch {
      // Use defaults
    }
    set({ wallboards: MOCK_WALLBOARDS });
  },

  getWallboard: (id) => {
    return get().wallboards.find((w) => w.id === id);
  },

  setActiveWallboard: (wb) => {
    set({ activeWallboard: wb, selectedWidgetId: null, isDirty: false });
  },

  createWallboard: (name) => {
    const id = generateId();
    const newWb: WallboardConfig = {
      id,
      name,
      createdBy: 'current-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      theme: 'dark',
      resolution: { width: 1920, height: 1080 },
      refreshInterval: 10,
      widgets: [],
      layouts: { lg: [] },
    };
    set((state) => ({
      wallboards: [...state.wallboards, newWb],
      activeWallboard: newWb,
    }));
    get().persistWallboards();
    return id;
  },

  saveActiveWallboard: () => {
    const { activeWallboard, wallboards } = get();
    if (!activeWallboard) return;

    const updated = {
      ...activeWallboard,
      updatedAt: new Date().toISOString(),
    };

    const newList = wallboards.map((wb) =>
      wb.id === updated.id ? updated : wb,
    );

    // If new wallboard, add it
    if (!wallboards.find((wb) => wb.id === updated.id)) {
      newList.push(updated);
    }

    set({ wallboards: newList, activeWallboard: updated, isDirty: false });
    get().persistWallboards();
  },

  deleteWallboard: (id) => {
    set((state) => ({
      wallboards: state.wallboards.filter((wb) => wb.id !== id),
      activeWallboard:
        state.activeWallboard?.id === id ? null : state.activeWallboard,
    }));
    get().persistWallboards();
  },

  duplicateWallboard: (id) => {
    const original = get().wallboards.find((wb) => wb.id === id);
    if (!original) return '';

    const newId = generateId();
    const duplicate: WallboardConfig = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      wallboards: [...state.wallboards, duplicate],
    }));
    get().persistWallboards();
    return newId;
  },

  updateWallboardName: (name) => {
    set((state) => ({
      activeWallboard: state.activeWallboard
        ? { ...state.activeWallboard, name }
        : null,
      isDirty: true,
    }));
  },

  addWidget: (widget, layout) => {
    set((state) => {
      if (!state.activeWallboard) return state;

      const newLayouts = { ...state.activeWallboard.layouts };
      for (const bp of Object.keys(newLayouts)) {
        newLayouts[bp] = [...(newLayouts[bp] || []), layout];
      }
      // If no breakpoints exist yet, create lg
      if (Object.keys(newLayouts).length === 0) {
        newLayouts.lg = [layout];
      }

      return {
        activeWallboard: {
          ...state.activeWallboard,
          widgets: [...state.activeWallboard.widgets, widget],
          layouts: newLayouts,
        },
        isDirty: true,
      };
    });
  },

  removeWidget: (widgetId) => {
    set((state) => {
      if (!state.activeWallboard) return state;

      const newLayouts = { ...state.activeWallboard.layouts };
      for (const bp of Object.keys(newLayouts)) {
        newLayouts[bp] = newLayouts[bp].filter((l) => l.i !== widgetId);
      }

      return {
        activeWallboard: {
          ...state.activeWallboard,
          widgets: state.activeWallboard.widgets.filter((w) => w.id !== widgetId),
          layouts: newLayouts,
        },
        selectedWidgetId:
          state.selectedWidgetId === widgetId ? null : state.selectedWidgetId,
        isDirty: true,
      };
    });
  },

  updateWidgetConfig: (widgetId, config) => {
    set((state) => {
      if (!state.activeWallboard) return state;
      return {
        activeWallboard: {
          ...state.activeWallboard,
          widgets: state.activeWallboard.widgets.map((w) =>
            w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w,
          ),
        },
        isDirty: true,
      };
    });
  },

  updateWidgetTitle: (widgetId, title) => {
    set((state) => {
      if (!state.activeWallboard) return state;
      return {
        activeWallboard: {
          ...state.activeWallboard,
          widgets: state.activeWallboard.widgets.map((w) =>
            w.id === widgetId ? { ...w, title } : w,
          ),
        },
        isDirty: true,
      };
    });
  },

  setLayout: (layouts) => {
    set((state) => {
      if (!state.activeWallboard) return state;
      return {
        activeWallboard: {
          ...state.activeWallboard,
          layouts,
        },
        isDirty: true,
      };
    });
  },

  selectWidget: (widgetId) => set({ selectedWidgetId: widgetId }),

  persistWallboards: () => {
    const { wallboards } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallboards));
    } catch {
      // localStorage may be unavailable
    }
  },
}));

// Generate a widget ID (exported for use by editor)
export { generateWidgetId };
