import { create } from 'zustand';
import type { Widget, WidgetConfig, LayoutItem } from '@/types';

// ---------------------------------------------------------------------------
// Dashboard Store -- widget layout and configuration
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'calldoc-dashboard-layout';

interface DashboardStoreState {
  /** Layout positions per breakpoint (e.g., 'lg', 'md', 'sm') */
  layouts: Record<string, LayoutItem[]>;
  /** All widgets currently on the dashboard */
  widgets: Widget[];
  /** Whether the dashboard is in edit/layout mode */
  editMode: boolean;
  /** Currently selected widget ID (edit mode) */
  selectedWidgetId: string | null;
}

interface DashboardStoreActions {
  /** Set the layout for a specific breakpoint or all breakpoints */
  setLayout: (layouts: Record<string, LayoutItem[]>) => void;
  /** Add a widget with its initial layout position */
  addWidget: (widget: Widget, layout: LayoutItem) => void;
  /** Remove a widget by ID */
  removeWidget: (widgetId: string) => void;
  /** Update a widget's configuration */
  updateWidgetConfig: (widgetId: string, config: Partial<WidgetConfig>) => void;
  /** Toggle edit mode on/off */
  toggleEditMode: () => void;
  /** Select a widget (for config panel) */
  selectWidget: (widgetId: string | null) => void;
  /** Persist current layout to localStorage */
  saveLayout: () => void;
  /** Load layout from localStorage */
  loadLayout: () => void;
}

type DashboardStore = DashboardStoreState & DashboardStoreActions;

// ---------------------------------------------------------------------------
// Default dashboard layout -- 4 KPI widgets across the top row
// ---------------------------------------------------------------------------

const defaultWidgets: Widget[] = [
  {
    id: 'w-active-calls',
    type: 'title-value',
    title: 'Active Calls',
    config: { metric: 'active_calls' },
    thresholds: [
      { operator: 'gte', value: 10, color: '#EAB308' },
      { operator: 'gte', value: 20, color: '#EF4444' },
    ],
  },
  {
    id: 'w-agents-available',
    type: 'agent-box',
    title: 'Agent Status',
    config: { metric: 'agents_available' },
    thresholds: [],
  },
  {
    id: 'w-calls-queue',
    type: 'title-value',
    title: 'Calls in Queue',
    config: { metric: 'calls_in_queue' },
    thresholds: [
      { operator: 'gte', value: 5, color: '#EAB308' },
      { operator: 'gte', value: 10, color: '#EF4444' },
    ],
  },
  {
    id: 'w-avg-wait',
    type: 'gauge',
    title: 'Avg Wait Time',
    config: { metric: 'avg_wait_time' },
    thresholds: [
      { operator: 'gte', value: 30, color: '#EAB308' },
      { operator: 'gte', value: 60, color: '#EF4444' },
    ],
  },
];

const defaultLayouts: Record<string, LayoutItem[]> = {
  lg: [
    { i: 'w-active-calls', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'w-agents-available', x: 3, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
    { i: 'w-calls-queue', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'w-avg-wait', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  ],
  md: [
    { i: 'w-active-calls', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'w-agents-available', x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'w-calls-queue', x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'w-avg-wait', x: 4, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
  ],
  sm: [
    { i: 'w-active-calls', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'w-agents-available', x: 0, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'w-calls-queue', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'w-avg-wait', x: 0, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
  ],
};

export const useDashboardStore = create<DashboardStore>()((set, get) => ({
  layouts: defaultLayouts,
  widgets: defaultWidgets,
  editMode: false,
  selectedWidgetId: null,

  setLayout: (layouts) => set({ layouts }),

  addWidget: (widget, layout) =>
    set((state) => {
      const newLayouts = { ...state.layouts };
      // Add layout item to every breakpoint
      for (const bp of Object.keys(newLayouts)) {
        newLayouts[bp] = [...(newLayouts[bp] || []), layout];
      }
      return {
        widgets: [...state.widgets, widget],
        layouts: newLayouts,
      };
    }),

  removeWidget: (widgetId) =>
    set((state) => {
      const newLayouts = { ...state.layouts };
      for (const bp of Object.keys(newLayouts)) {
        newLayouts[bp] = newLayouts[bp].filter((l) => l.i !== widgetId);
      }
      return {
        widgets: state.widgets.filter((w) => w.id !== widgetId),
        layouts: newLayouts,
        selectedWidgetId:
          state.selectedWidgetId === widgetId ? null : state.selectedWidgetId,
      };
    }),

  updateWidgetConfig: (widgetId, config) =>
    set((state) => ({
      widgets: state.widgets.map((w) =>
        w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w,
      ),
    })),

  toggleEditMode: () =>
    set((s) => ({
      editMode: !s.editMode,
      selectedWidgetId: s.editMode ? null : s.selectedWidgetId,
    })),

  selectWidget: (widgetId) => set({ selectedWidgetId: widgetId }),

  saveLayout: () => {
    const { layouts, widgets } = get();
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ layouts, widgets }),
      );
    } catch {
      // localStorage may be unavailable
    }
  },

  loadLayout: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.layouts && parsed.widgets) {
          set({ layouts: parsed.layouts, widgets: parsed.widgets });
        }
      }
    } catch {
      // Use defaults
    }
  },
}));
