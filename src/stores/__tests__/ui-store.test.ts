// ─── UI Store Tests ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../ui-store';

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useUIStore.setState({
    sidebarCollapsed: false,
    theme: 'dark',
    commandPaletteOpen: false,
    activeModal: null,
    connectionStatus: 'disconnected',
    latency: 0,
  });
});

// ---------------------------------------------------------------------------
// toggleSidebar
// ---------------------------------------------------------------------------

describe('useUIStore - toggleSidebar', () => {
  it('toggles sidebar from collapsed false to true', () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });

  it('toggles sidebar back from true to false', () => {
    useUIStore.getState().toggleSidebar(); // false -> true
    useUIStore.getState().toggleSidebar(); // true -> false

    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('toggles multiple times correctly', () => {
    useUIStore.getState().toggleSidebar();
    useUIStore.getState().toggleSidebar();
    useUIStore.getState().toggleSidebar();

    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setSidebarCollapsed
// ---------------------------------------------------------------------------

describe('useUIStore - setSidebarCollapsed', () => {
  it('sets sidebar to collapsed', () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });

  it('sets sidebar to expanded', () => {
    useUIStore.setState({ sidebarCollapsed: true });
    useUIStore.getState().setSidebarCollapsed(false);
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('is idempotent when setting same value', () => {
    useUIStore.getState().setSidebarCollapsed(false);
    useUIStore.getState().setSidebarCollapsed(false);
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// setTheme
// ---------------------------------------------------------------------------

describe('useUIStore - setTheme', () => {
  it('defaults to dark theme', () => {
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('sets theme to light', () => {
    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('sets theme to system', () => {
    useUIStore.getState().setTheme('system');
    expect(useUIStore.getState().theme).toBe('system');
  });

  it('sets theme back to dark', () => {
    useUIStore.getState().setTheme('light');
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });
});

// ---------------------------------------------------------------------------
// command palette
// ---------------------------------------------------------------------------

describe('useUIStore - command palette', () => {
  it('defaults to closed', () => {
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it('opens the command palette', () => {
    useUIStore.getState().openCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });

  it('closes the command palette', () => {
    useUIStore.getState().openCommandPalette();
    useUIStore.getState().closeCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it('open is idempotent when already open', () => {
    useUIStore.getState().openCommandPalette();
    useUIStore.getState().openCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });

  it('close is idempotent when already closed', () => {
    useUIStore.getState().closeCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// activeModal
// ---------------------------------------------------------------------------

describe('useUIStore - activeModal', () => {
  it('defaults to null', () => {
    expect(useUIStore.getState().activeModal).toBeNull();
  });

  it('sets an active modal', () => {
    useUIStore.getState().setActiveModal('settings');
    expect(useUIStore.getState().activeModal).toBe('settings');
  });

  it('changes active modal to another', () => {
    useUIStore.getState().setActiveModal('settings');
    useUIStore.getState().setActiveModal('user-profile');
    expect(useUIStore.getState().activeModal).toBe('user-profile');
  });

  it('clears active modal with null', () => {
    useUIStore.getState().setActiveModal('settings');
    useUIStore.getState().setActiveModal(null);
    expect(useUIStore.getState().activeModal).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// connectionStatus
// ---------------------------------------------------------------------------

describe('useUIStore - connectionStatus', () => {
  it('defaults to disconnected', () => {
    expect(useUIStore.getState().connectionStatus).toBe('disconnected');
  });

  it('sets connection status to connecting', () => {
    useUIStore.getState().setConnectionStatus('connecting');
    expect(useUIStore.getState().connectionStatus).toBe('connecting');
  });

  it('sets connection status to connected', () => {
    useUIStore.getState().setConnectionStatus('connected');
    expect(useUIStore.getState().connectionStatus).toBe('connected');
  });

  it('sets connection status back to disconnected', () => {
    useUIStore.getState().setConnectionStatus('connected');
    useUIStore.getState().setConnectionStatus('disconnected');
    expect(useUIStore.getState().connectionStatus).toBe('disconnected');
  });

  it('follows a typical connection lifecycle', () => {
    useUIStore.getState().setConnectionStatus('connecting');
    expect(useUIStore.getState().connectionStatus).toBe('connecting');

    useUIStore.getState().setConnectionStatus('connected');
    expect(useUIStore.getState().connectionStatus).toBe('connected');

    useUIStore.getState().setConnectionStatus('disconnected');
    expect(useUIStore.getState().connectionStatus).toBe('disconnected');
  });
});

// ---------------------------------------------------------------------------
// latency
// ---------------------------------------------------------------------------

describe('useUIStore - latency', () => {
  it('defaults to 0', () => {
    expect(useUIStore.getState().latency).toBe(0);
  });

  it('sets latency value', () => {
    useUIStore.getState().setLatency(42);
    expect(useUIStore.getState().latency).toBe(42);
  });

  it('updates latency value', () => {
    useUIStore.getState().setLatency(42);
    useUIStore.getState().setLatency(128);
    expect(useUIStore.getState().latency).toBe(128);
  });

  it('sets latency to zero', () => {
    useUIStore.getState().setLatency(100);
    useUIStore.getState().setLatency(0);
    expect(useUIStore.getState().latency).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// State independence (actions do not interfere with each other)
// ---------------------------------------------------------------------------

describe('useUIStore - state independence', () => {
  it('toggling sidebar does not affect other state', () => {
    useUIStore.getState().setTheme('light');
    useUIStore.getState().setConnectionStatus('connected');
    useUIStore.getState().setLatency(50);

    useUIStore.getState().toggleSidebar();

    const state = useUIStore.getState();
    expect(state.sidebarCollapsed).toBe(true);
    expect(state.theme).toBe('light');
    expect(state.connectionStatus).toBe('connected');
    expect(state.latency).toBe(50);
    expect(state.commandPaletteOpen).toBe(false);
    expect(state.activeModal).toBeNull();
  });

  it('opening command palette does not affect other state', () => {
    useUIStore.getState().setSidebarCollapsed(true);
    useUIStore.getState().setActiveModal('settings');

    useUIStore.getState().openCommandPalette();

    const state = useUIStore.getState();
    expect(state.commandPaletteOpen).toBe(true);
    expect(state.sidebarCollapsed).toBe(true);
    expect(state.activeModal).toBe('settings');
  });
});
