// ─── Dashboard Store Tests ──────────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDashboardStore } from '../dashboard-store';
import type { Widget, LayoutItem, WidgetConfig } from '@/types';

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

// Deep-clone the initial defaults so that mutations in one test never leak
const initialSnapshot = JSON.parse(
  JSON.stringify({
    widgets: useDashboardStore.getState().widgets,
    layouts: useDashboardStore.getState().layouts,
  }),
);

beforeEach(() => {
  // Restore from a fresh deep clone each time
  const fresh = JSON.parse(JSON.stringify(initialSnapshot));
  useDashboardStore.setState({
    widgets: fresh.widgets,
    layouts: fresh.layouts,
    editMode: false,
    selectedWidgetId: null,
  });
});

// ---------------------------------------------------------------------------
// Test widget factory
// ---------------------------------------------------------------------------

function makeWidget(id: string, title: string = 'Test Widget'): Widget {
  return {
    id,
    type: 'title-value',
    title,
    config: { metric: 'test_metric' },
    thresholds: [],
  };
}

function makeLayout(id: string): LayoutItem {
  return { i: id, x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 };
}

// ---------------------------------------------------------------------------
// addWidget
// ---------------------------------------------------------------------------

describe('useDashboardStore - addWidget', () => {
  it('adds a widget to the widgets array', () => {
    const initialCount = useDashboardStore.getState().widgets.length;
    const widget = makeWidget('w-new');
    const layout = makeLayout('w-new');

    useDashboardStore.getState().addWidget(widget, layout);

    const state = useDashboardStore.getState();
    expect(state.widgets).toHaveLength(initialCount + 1);
    expect(state.widgets.find((w) => w.id === 'w-new')).toBeDefined();
  });

  it('adds layout item to every breakpoint', () => {
    const widget = makeWidget('w-new');
    const layout = makeLayout('w-new');

    useDashboardStore.getState().addWidget(widget, layout);

    const state = useDashboardStore.getState();
    for (const bp of Object.keys(state.layouts)) {
      const bpLayouts = state.layouts[bp];
      expect(bpLayouts.find((l) => l.i === 'w-new')).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// removeWidget
// ---------------------------------------------------------------------------

describe('useDashboardStore - removeWidget', () => {
  it('removes a widget from the widgets array and layout', () => {
    const widget = makeWidget('w-to-remove');
    const layout = makeLayout('w-to-remove');
    useDashboardStore.getState().addWidget(widget, layout);

    useDashboardStore.getState().removeWidget('w-to-remove');

    const state = useDashboardStore.getState();
    expect(state.widgets.find((w) => w.id === 'w-to-remove')).toBeUndefined();
    for (const bp of Object.keys(state.layouts)) {
      expect(state.layouts[bp].find((l) => l.i === 'w-to-remove')).toBeUndefined();
    }
  });

  it('clears selectedWidgetId when removing the selected widget', () => {
    useDashboardStore.setState({ selectedWidgetId: 'w-active-calls' });
    useDashboardStore.getState().removeWidget('w-active-calls');

    expect(useDashboardStore.getState().selectedWidgetId).toBeNull();
  });

  it('preserves selectedWidgetId when removing a different widget', () => {
    const widget = makeWidget('w-temp');
    const layout = makeLayout('w-temp');
    useDashboardStore.getState().addWidget(widget, layout);
    useDashboardStore.setState({ selectedWidgetId: 'w-active-calls' });

    useDashboardStore.getState().removeWidget('w-temp');

    expect(useDashboardStore.getState().selectedWidgetId).toBe('w-active-calls');
  });
});

// ---------------------------------------------------------------------------
// updateWidgetConfig
// ---------------------------------------------------------------------------

describe('useDashboardStore - updateWidgetConfig', () => {
  it('merges new config into the existing widget config', () => {
    useDashboardStore.getState().updateWidgetConfig('w-active-calls', {
      fontSize: 24,
      backgroundColor: '#FF0000',
    });

    const widget = useDashboardStore.getState().widgets.find(
      (w) => w.id === 'w-active-calls',
    )!;
    expect(widget.config.metric).toBe('active_calls'); // preserved
    expect(widget.config.fontSize).toBe(24);
    expect(widget.config.backgroundColor).toBe('#FF0000');
  });

  it('does not affect other widgets', () => {
    const beforeWidget = useDashboardStore.getState().widgets.find(
      (w) => w.id === 'w-agents-available',
    )!;
    const originalConfig = { ...beforeWidget.config };

    useDashboardStore.getState().updateWidgetConfig('w-active-calls', {
      fontSize: 32,
    });

    const afterWidget = useDashboardStore.getState().widgets.find(
      (w) => w.id === 'w-agents-available',
    )!;
    expect(afterWidget.config).toEqual(originalConfig);
  });
});

// ---------------------------------------------------------------------------
// setLayout
// ---------------------------------------------------------------------------

describe('useDashboardStore - setLayout', () => {
  it('updates layout breakpoints', () => {
    const newLayouts = {
      lg: [{ i: 'w-active-calls', x: 0, y: 0, w: 6, h: 4 }],
      md: [{ i: 'w-active-calls', x: 0, y: 0, w: 4, h: 3 }],
    };

    useDashboardStore.getState().setLayout(newLayouts);

    const state = useDashboardStore.getState();
    expect(state.layouts.lg).toHaveLength(1);
    expect(state.layouts.lg[0].w).toBe(6);
    expect(state.layouts.md).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// editMode toggle
// ---------------------------------------------------------------------------

describe('useDashboardStore - editMode', () => {
  it('toggles editMode on and off', () => {
    expect(useDashboardStore.getState().editMode).toBe(false);

    useDashboardStore.getState().toggleEditMode();
    expect(useDashboardStore.getState().editMode).toBe(true);

    useDashboardStore.getState().toggleEditMode();
    expect(useDashboardStore.getState().editMode).toBe(false);
  });

  it('clears selectedWidgetId when exiting edit mode', () => {
    useDashboardStore.getState().toggleEditMode(); // enter edit mode
    useDashboardStore.getState().selectWidget('w-active-calls');
    expect(useDashboardStore.getState().selectedWidgetId).toBe('w-active-calls');

    useDashboardStore.getState().toggleEditMode(); // exit edit mode
    expect(useDashboardStore.getState().selectedWidgetId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectWidget
// ---------------------------------------------------------------------------

describe('useDashboardStore - selectWidget', () => {
  it('sets the selected widget ID', () => {
    useDashboardStore.getState().selectWidget('w-active-calls');
    expect(useDashboardStore.getState().selectedWidgetId).toBe('w-active-calls');
  });

  it('clears selection when null is passed', () => {
    useDashboardStore.getState().selectWidget('w-active-calls');
    useDashboardStore.getState().selectWidget(null);
    expect(useDashboardStore.getState().selectedWidgetId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveLayout / loadLayout persistence
// ---------------------------------------------------------------------------

describe('useDashboardStore - layout persistence', () => {
  it('saveLayout stores current state in localStorage', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    useDashboardStore.getState().saveLayout();

    expect(spy).toHaveBeenCalledWith(
      'calldoc-dashboard-layout',
      expect.any(String),
    );
    spy.mockRestore();
  });

  it('loadLayout restores state from localStorage', () => {
    const customWidgets = [makeWidget('w-custom', 'Custom Widget')];
    const customLayouts = {
      lg: [{ i: 'w-custom', x: 0, y: 0, w: 6, h: 4 }],
    };

    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({ widgets: customWidgets, layouts: customLayouts }),
    );

    useDashboardStore.getState().loadLayout();

    const state = useDashboardStore.getState();
    expect(state.widgets).toHaveLength(1);
    expect(state.widgets[0].id).toBe('w-custom');
    expect(state.layouts.lg).toHaveLength(1);

    vi.restoreAllMocks();
  });

  it('loadLayout handles missing localStorage gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    // Should not throw
    useDashboardStore.getState().loadLayout();

    // Widgets should remain as they are
    expect(useDashboardStore.getState().widgets.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  it('loadLayout handles corrupt JSON gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('not valid json{{{');

    // Should not throw
    useDashboardStore.getState().loadLayout();

    expect(useDashboardStore.getState().widgets.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
  });

  it('saveLayout handles localStorage errors gracefully', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    // Should not throw
    expect(() => useDashboardStore.getState().saveLayout()).not.toThrow();

    vi.restoreAllMocks();
  });
});
