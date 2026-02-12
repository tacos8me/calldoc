// ─── Wallboard Store Tests ──────────────────────────────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWallboardStore } from '../wallboard-store';
import type { WallboardConfig, Widget, LayoutItem } from '@/types';

// ---------------------------------------------------------------------------
// Snapshot initial state so we can restore between tests
// ---------------------------------------------------------------------------

const INITIAL_WALLBOARDS = JSON.parse(
  JSON.stringify(useWallboardStore.getState().wallboards),
);

beforeEach(() => {
  useWallboardStore.setState({
    wallboards: JSON.parse(JSON.stringify(INITIAL_WALLBOARDS)),
    activeWallboard: null,
    selectedWidgetId: null,
    isDirty: false,
  });
  // Clear any data written to localStorage by previous tests
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Test factories
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
// Initial state
// ---------------------------------------------------------------------------

describe('useWallboardStore - initial state', () => {
  it('has mock wallboards loaded', () => {
    const state = useWallboardStore.getState();
    expect(state.wallboards.length).toBe(3);
  });

  it('has no active wallboard initially', () => {
    expect(useWallboardStore.getState().activeWallboard).toBeNull();
  });

  it('has no selected widget initially', () => {
    expect(useWallboardStore.getState().selectedWidgetId).toBeNull();
  });

  it('is not dirty initially', () => {
    expect(useWallboardStore.getState().isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getWallboard
// ---------------------------------------------------------------------------

describe('useWallboardStore - getWallboard', () => {
  it('returns a wallboard by id', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview');
    expect(wb).toBeDefined();
    expect(wb!.name).toBe('Sales Floor Overview');
  });

  it('returns undefined for a non-existent id', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-nonexistent');
    expect(wb).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// createWallboard
// ---------------------------------------------------------------------------

describe('useWallboardStore - createWallboard', () => {
  it('creates a new wallboard and adds it to the list', () => {
    const initialCount = useWallboardStore.getState().wallboards.length;

    const id = useWallboardStore.getState().createWallboard('New Dashboard');

    const state = useWallboardStore.getState();
    expect(state.wallboards).toHaveLength(initialCount + 1);
    expect(id).toBeTruthy();
    expect(id.startsWith('wb-')).toBe(true);
  });

  it('sets the new wallboard as active', () => {
    const id = useWallboardStore.getState().createWallboard('New Dashboard');

    const state = useWallboardStore.getState();
    expect(state.activeWallboard).not.toBeNull();
    expect(state.activeWallboard!.id).toBe(id);
    expect(state.activeWallboard!.name).toBe('New Dashboard');
  });

  it('creates wallboard with correct defaults', () => {
    useWallboardStore.getState().createWallboard('My Board');

    const wb = useWallboardStore.getState().activeWallboard!;
    expect(wb.theme).toBe('dark');
    expect(wb.resolution).toEqual({ width: 1920, height: 1080 });
    expect(wb.refreshInterval).toBe(10);
    expect(wb.widgets).toEqual([]);
    expect(wb.layouts).toEqual({ lg: [] });
    expect(wb.createdBy).toBe('current-user');
  });

  it('generates unique IDs for each wallboard', () => {
    const id1 = useWallboardStore.getState().createWallboard('Board A');
    const id2 = useWallboardStore.getState().createWallboard('Board B');

    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// deleteWallboard
// ---------------------------------------------------------------------------

describe('useWallboardStore - deleteWallboard', () => {
  it('removes a wallboard from the list', () => {
    const initialCount = useWallboardStore.getState().wallboards.length;

    useWallboardStore.getState().deleteWallboard('wb-sales-overview');

    const state = useWallboardStore.getState();
    expect(state.wallboards).toHaveLength(initialCount - 1);
    expect(state.wallboards.find((wb) => wb.id === 'wb-sales-overview')).toBeUndefined();
  });

  it('clears activeWallboard when deleting the active one', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);
    expect(useWallboardStore.getState().activeWallboard).not.toBeNull();

    useWallboardStore.getState().deleteWallboard('wb-sales-overview');

    expect(useWallboardStore.getState().activeWallboard).toBeNull();
  });

  it('preserves activeWallboard when deleting a different one', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);

    useWallboardStore.getState().deleteWallboard('wb-support-kpis');

    expect(useWallboardStore.getState().activeWallboard!.id).toBe('wb-sales-overview');
  });

  it('does not error when deleting a non-existent wallboard', () => {
    const initialCount = useWallboardStore.getState().wallboards.length;

    useWallboardStore.getState().deleteWallboard('wb-nonexistent');

    expect(useWallboardStore.getState().wallboards).toHaveLength(initialCount);
  });
});

// ---------------------------------------------------------------------------
// duplicateWallboard
// ---------------------------------------------------------------------------

describe('useWallboardStore - duplicateWallboard', () => {
  it('creates a copy of the wallboard with a new ID', () => {
    const initialCount = useWallboardStore.getState().wallboards.length;

    const newId = useWallboardStore.getState().duplicateWallboard('wb-sales-overview');

    const state = useWallboardStore.getState();
    expect(state.wallboards).toHaveLength(initialCount + 1);
    expect(newId).toBeTruthy();
    expect(newId).not.toBe('wb-sales-overview');
  });

  it('appends (Copy) to the duplicated wallboard name', () => {
    const newId = useWallboardStore.getState().duplicateWallboard('wb-sales-overview');

    const duplicate = useWallboardStore.getState().wallboards.find((wb) => wb.id === newId);
    expect(duplicate).toBeDefined();
    expect(duplicate!.name).toBe('Sales Floor Overview (Copy)');
  });

  it('copies widgets from the original', () => {
    const newId = useWallboardStore.getState().duplicateWallboard('wb-sales-overview');

    const original = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    const duplicate = useWallboardStore.getState().wallboards.find((wb) => wb.id === newId)!;

    expect(duplicate.widgets).toHaveLength(original.widgets.length);
  });

  it('returns empty string when duplicating a non-existent wallboard', () => {
    const result = useWallboardStore.getState().duplicateWallboard('wb-nonexistent');
    expect(result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// setActiveWallboard
// ---------------------------------------------------------------------------

describe('useWallboardStore - setActiveWallboard', () => {
  it('sets the active wallboard', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);

    const state = useWallboardStore.getState();
    expect(state.activeWallboard).not.toBeNull();
    expect(state.activeWallboard!.id).toBe('wb-sales-overview');
  });

  it('clears selectedWidgetId when setting a new active wallboard', () => {
    useWallboardStore.setState({ selectedWidgetId: 'w-old' });

    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);

    expect(useWallboardStore.getState().selectedWidgetId).toBeNull();
  });

  it('resets isDirty when setting a new active wallboard', () => {
    useWallboardStore.setState({ isDirty: true });

    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);

    expect(useWallboardStore.getState().isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateWallboardName
// ---------------------------------------------------------------------------

describe('useWallboardStore - updateWallboardName', () => {
  it('updates the active wallboard name', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);

    useWallboardStore.getState().updateWallboardName('Renamed Board');

    expect(useWallboardStore.getState().activeWallboard!.name).toBe('Renamed Board');
  });

  it('sets isDirty to true', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);

    useWallboardStore.getState().updateWallboardName('Renamed');

    expect(useWallboardStore.getState().isDirty).toBe(true);
  });

  it('does nothing when there is no active wallboard', () => {
    useWallboardStore.getState().updateWallboardName('Renamed');

    expect(useWallboardStore.getState().activeWallboard).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// addWidget (to active wallboard)
// ---------------------------------------------------------------------------

describe('useWallboardStore - addWidget', () => {
  beforeEach(() => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);
  });

  it('adds a widget to the active wallboard', () => {
    const initialCount = useWallboardStore.getState().activeWallboard!.widgets.length;

    const widget = makeWidget('w-new', 'New Widget');
    const layout = makeLayout('w-new');
    useWallboardStore.getState().addWidget(widget, layout);

    const state = useWallboardStore.getState();
    expect(state.activeWallboard!.widgets).toHaveLength(initialCount + 1);
    expect(state.activeWallboard!.widgets.find((w) => w.id === 'w-new')).toBeDefined();
  });

  it('adds layout item to existing breakpoints', () => {
    const widget = makeWidget('w-new');
    const layout = makeLayout('w-new');
    useWallboardStore.getState().addWidget(widget, layout);

    const state = useWallboardStore.getState();
    for (const bp of Object.keys(state.activeWallboard!.layouts)) {
      expect(state.activeWallboard!.layouts[bp].find((l) => l.i === 'w-new')).toBeDefined();
    }
  });

  it('sets isDirty to true', () => {
    useWallboardStore.getState().addWidget(makeWidget('w-new'), makeLayout('w-new'));
    expect(useWallboardStore.getState().isDirty).toBe(true);
  });

  it('does nothing when there is no active wallboard', () => {
    useWallboardStore.setState({ activeWallboard: null });

    useWallboardStore.getState().addWidget(makeWidget('w-new'), makeLayout('w-new'));

    expect(useWallboardStore.getState().activeWallboard).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// removeWidget (from active wallboard)
// ---------------------------------------------------------------------------

describe('useWallboardStore - removeWidget', () => {
  beforeEach(() => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);
  });

  it('removes a widget from the active wallboard', () => {
    const initialCount = useWallboardStore.getState().activeWallboard!.widgets.length;

    useWallboardStore.getState().removeWidget('w-1');

    const state = useWallboardStore.getState();
    expect(state.activeWallboard!.widgets).toHaveLength(initialCount - 1);
    expect(state.activeWallboard!.widgets.find((w) => w.id === 'w-1')).toBeUndefined();
  });

  it('removes layout item from all breakpoints', () => {
    useWallboardStore.getState().removeWidget('w-1');

    const state = useWallboardStore.getState();
    for (const bp of Object.keys(state.activeWallboard!.layouts)) {
      expect(state.activeWallboard!.layouts[bp].find((l) => l.i === 'w-1')).toBeUndefined();
    }
  });

  it('clears selectedWidgetId when removing the selected widget', () => {
    useWallboardStore.getState().selectWidget('w-1');
    useWallboardStore.getState().removeWidget('w-1');

    expect(useWallboardStore.getState().selectedWidgetId).toBeNull();
  });

  it('preserves selectedWidgetId when removing a different widget', () => {
    useWallboardStore.getState().selectWidget('w-2');
    useWallboardStore.getState().removeWidget('w-1');

    expect(useWallboardStore.getState().selectedWidgetId).toBe('w-2');
  });

  it('sets isDirty to true', () => {
    useWallboardStore.getState().removeWidget('w-1');
    expect(useWallboardStore.getState().isDirty).toBe(true);
  });

  it('does nothing when there is no active wallboard', () => {
    useWallboardStore.setState({ activeWallboard: null });
    useWallboardStore.getState().removeWidget('w-1');

    expect(useWallboardStore.getState().activeWallboard).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateWidgetConfig
// ---------------------------------------------------------------------------

describe('useWallboardStore - updateWidgetConfig', () => {
  beforeEach(() => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);
  });

  it('merges new config into the existing widget config', () => {
    useWallboardStore.getState().updateWidgetConfig('w-1', {
      fontSize: 24,
      backgroundColor: '#FF0000',
    });

    const widget = useWallboardStore.getState().activeWallboard!.widgets.find(
      (w) => w.id === 'w-1',
    )!;
    expect(widget.config.metric).toBe('active_calls'); // preserved
    expect(widget.config.fontSize).toBe(24);
    expect(widget.config.backgroundColor).toBe('#FF0000');
  });

  it('does not affect other widgets', () => {
    const before = useWallboardStore.getState().activeWallboard!.widgets.find(
      (w) => w.id === 'w-2',
    )!;
    const originalConfig = { ...before.config };

    useWallboardStore.getState().updateWidgetConfig('w-1', { fontSize: 32 });

    const after = useWallboardStore.getState().activeWallboard!.widgets.find(
      (w) => w.id === 'w-2',
    )!;
    expect(after.config).toEqual(originalConfig);
  });

  it('sets isDirty to true', () => {
    useWallboardStore.getState().updateWidgetConfig('w-1', { fontSize: 18 });
    expect(useWallboardStore.getState().isDirty).toBe(true);
  });

  it('does nothing when there is no active wallboard', () => {
    useWallboardStore.setState({ activeWallboard: null });
    useWallboardStore.getState().updateWidgetConfig('w-1', { fontSize: 18 });

    expect(useWallboardStore.getState().activeWallboard).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateWidgetTitle
// ---------------------------------------------------------------------------

describe('useWallboardStore - updateWidgetTitle', () => {
  beforeEach(() => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);
  });

  it('updates the title of a specific widget', () => {
    useWallboardStore.getState().updateWidgetTitle('w-1', 'Renamed Widget');

    const widget = useWallboardStore.getState().activeWallboard!.widgets.find(
      (w) => w.id === 'w-1',
    )!;
    expect(widget.title).toBe('Renamed Widget');
  });

  it('preserves other widget properties', () => {
    const before = useWallboardStore.getState().activeWallboard!.widgets.find(
      (w) => w.id === 'w-1',
    )!;
    const originalConfig = { ...before.config };

    useWallboardStore.getState().updateWidgetTitle('w-1', 'New Title');

    const after = useWallboardStore.getState().activeWallboard!.widgets.find(
      (w) => w.id === 'w-1',
    )!;
    expect(after.config).toEqual(originalConfig);
    expect(after.type).toBe(before.type);
  });

  it('sets isDirty to true', () => {
    useWallboardStore.getState().updateWidgetTitle('w-1', 'New Title');
    expect(useWallboardStore.getState().isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setLayout
// ---------------------------------------------------------------------------

describe('useWallboardStore - setLayout', () => {
  beforeEach(() => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);
  });

  it('updates layout breakpoints on the active wallboard', () => {
    const newLayouts = {
      lg: [{ i: 'w-1', x: 0, y: 0, w: 6, h: 4 }],
      md: [{ i: 'w-1', x: 0, y: 0, w: 4, h: 3 }],
    };

    useWallboardStore.getState().setLayout(newLayouts);

    const state = useWallboardStore.getState();
    expect(state.activeWallboard!.layouts.lg).toHaveLength(1);
    expect(state.activeWallboard!.layouts.lg[0].w).toBe(6);
    expect(state.activeWallboard!.layouts.md).toHaveLength(1);
  });

  it('sets isDirty to true', () => {
    useWallboardStore.getState().setLayout({ lg: [] });
    expect(useWallboardStore.getState().isDirty).toBe(true);
  });

  it('does nothing when there is no active wallboard', () => {
    useWallboardStore.setState({ activeWallboard: null });
    useWallboardStore.getState().setLayout({ lg: [] });

    expect(useWallboardStore.getState().activeWallboard).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectWidget
// ---------------------------------------------------------------------------

describe('useWallboardStore - selectWidget', () => {
  it('sets the selected widget ID', () => {
    useWallboardStore.getState().selectWidget('w-1');
    expect(useWallboardStore.getState().selectedWidgetId).toBe('w-1');
  });

  it('clears selection when null is passed', () => {
    useWallboardStore.getState().selectWidget('w-1');
    useWallboardStore.getState().selectWidget(null);
    expect(useWallboardStore.getState().selectedWidgetId).toBeNull();
  });

  it('changes selection to a different widget', () => {
    useWallboardStore.getState().selectWidget('w-1');
    useWallboardStore.getState().selectWidget('w-2');
    expect(useWallboardStore.getState().selectedWidgetId).toBe('w-2');
  });
});

// ---------------------------------------------------------------------------
// saveActiveWallboard
// ---------------------------------------------------------------------------

describe('useWallboardStore - saveActiveWallboard', () => {
  it('saves the active wallboard into the wallboards list', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);

    useWallboardStore.getState().updateWallboardName('Updated Name');
    useWallboardStore.getState().saveActiveWallboard();

    const saved = useWallboardStore.getState().wallboards.find(
      (w) => w.id === 'wb-sales-overview',
    );
    expect(saved).toBeDefined();
    expect(saved!.name).toBe('Updated Name');
  });

  it('clears isDirty after saving', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    useWallboardStore.getState().setActiveWallboard(wb);
    useWallboardStore.getState().updateWallboardName('Modified');

    expect(useWallboardStore.getState().isDirty).toBe(true);

    useWallboardStore.getState().saveActiveWallboard();

    expect(useWallboardStore.getState().isDirty).toBe(false);
  });

  it('does nothing when no active wallboard', () => {
    const beforeWallboards = [...useWallboardStore.getState().wallboards];
    useWallboardStore.getState().saveActiveWallboard();

    expect(useWallboardStore.getState().wallboards).toHaveLength(beforeWallboards.length);
  });

  it('updates the updatedAt timestamp', () => {
    const wb = useWallboardStore.getState().getWallboard('wb-sales-overview')!;
    const oldUpdatedAt = wb.updatedAt;
    useWallboardStore.getState().setActiveWallboard(wb);

    useWallboardStore.getState().saveActiveWallboard();

    const saved = useWallboardStore.getState().activeWallboard!;
    expect(saved.updatedAt).not.toBe(oldUpdatedAt);
  });
});

// ---------------------------------------------------------------------------
// loadWallboards / persistWallboards (localStorage)
// ---------------------------------------------------------------------------

describe('useWallboardStore - localStorage persistence', () => {
  it('persistWallboards stores wallboards in localStorage', () => {
    useWallboardStore.getState().persistWallboards();

    const stored = localStorage.getItem('calldoc-wallboards');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(useWallboardStore.getState().wallboards.length);
  });

  it('loadWallboards restores wallboards from localStorage', () => {
    const customWallboards: WallboardConfig[] = [
      {
        id: 'wb-custom',
        name: 'Custom Board',
        createdBy: 'admin',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        theme: 'dark',
        resolution: { width: 1920, height: 1080 },
        refreshInterval: 10,
        widgets: [],
        layouts: { lg: [] },
      },
    ];

    localStorage.setItem('calldoc-wallboards', JSON.stringify(customWallboards));

    useWallboardStore.getState().loadWallboards();

    const state = useWallboardStore.getState();
    expect(state.wallboards).toHaveLength(1);
    expect(state.wallboards[0].id).toBe('wb-custom');
    expect(state.wallboards[0].name).toBe('Custom Board');
  });

  it('loadWallboards handles missing localStorage gracefully', () => {
    // localStorage is already cleared by beforeEach
    useWallboardStore.getState().loadWallboards();

    // Falls back to mock wallboards
    expect(useWallboardStore.getState().wallboards.length).toBe(3);
  });

  it('loadWallboards handles corrupt JSON gracefully', () => {
    localStorage.setItem('calldoc-wallboards', 'not valid json{{{');

    useWallboardStore.getState().loadWallboards();

    // Falls back to mock wallboards
    expect(useWallboardStore.getState().wallboards.length).toBe(3);
  });

  it('loadWallboards falls back to defaults when localStorage has empty array', () => {
    localStorage.setItem('calldoc-wallboards', '[]');

    useWallboardStore.getState().loadWallboards();

    // Falls back to mock wallboards because parsed is empty array
    expect(useWallboardStore.getState().wallboards.length).toBe(3);
  });

  it('persistWallboards handles localStorage errors gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => useWallboardStore.getState().persistWallboards()).not.toThrow();

    spy.mockRestore();
  });
});
