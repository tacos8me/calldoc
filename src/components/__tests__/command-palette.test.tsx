// ─── CommandPalette Component Tests ──────────────────────────────────────────
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '@/stores/ui-store';
import { useAgentStore } from '@/stores/agent-store';
import { useCallStore } from '@/stores/call-store';

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { CommandPalette } from '../shared/command-palette';

// ---------------------------------------------------------------------------
// Reset stores and mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useUIStore.setState({
    commandPaletteOpen: false,
    theme: 'dark',
    sidebarCollapsed: false,
    connectionStatus: 'connected',
    latency: 0,
  });
  useAgentStore.setState({ agents: new Map() });
  useCallStore.setState({ activeCalls: new Map(), recentCalls: [] });
  mockPush.mockClear();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Opening / closing
// ---------------------------------------------------------------------------

describe('CommandPalette - open/close', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<CommandPalette />);

    expect(container.innerHTML).toBe('');
  });

  it('renders when commandPaletteOpen is true', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens on Cmd+K keydown', () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });

  it('opens on Ctrl+K keydown', () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });

  it('closes when clicking the backdrop', async () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    // The backdrop is the first div inside the fixed container
    const backdrop = document.querySelector('.bg-black\\/50');
    expect(backdrop).toBeInTheDocument();
    await userEvent.click(backdrop!);

    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it('closes on Escape key', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it('toggles closed when Cmd+K is pressed while open', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Navigation items rendering
// ---------------------------------------------------------------------------

describe('CommandPalette - navigation items', () => {
  it('renders page navigation items when open', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Calls')).toBeInTheDocument();
    expect(screen.getByText('Agent Timeline')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Recordings')).toBeInTheDocument();
    expect(screen.getByText('Wallboards')).toBeInTheDocument();
    expect(screen.getByText('Admin Settings')).toBeInTheDocument();
  });

  it('renders quick action items', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByText('Create New Wallboard')).toBeInTheDocument();
    expect(screen.getByText('Generate Report')).toBeInTheDocument();
    expect(screen.getByText('Export Calls')).toBeInTheDocument();
  });

  it('renders action items', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByText('Toggle Theme')).toBeInTheDocument();
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument();
  });

  it('displays keyboard shortcuts for pages', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByText('G D')).toBeInTheDocument();
    expect(screen.getByText('G C')).toBeInTheDocument();
    expect(screen.getByText('G A')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Search filtering
// ---------------------------------------------------------------------------

describe('CommandPalette - search filtering', () => {
  it('renders the search input placeholder', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(
      screen.getByPlaceholderText(
        'Search agents, calls, pages, or type a command...',
      ),
    ).toBeInTheDocument();
  });

  it('shows "No results found." when search matches nothing', async () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const input = screen.getByPlaceholderText(
      'Search agents, calls, pages, or type a command...',
    );
    await userEvent.type(input, 'zzzznonexistent');

    await waitFor(() => {
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Selecting a navigation item
// ---------------------------------------------------------------------------

describe('CommandPalette - item selection', () => {
  it('navigates to /calls when Calls item is selected', async () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const callsItem = screen.getByText('Calls');
    await userEvent.click(callsItem);

    expect(mockPush).toHaveBeenCalledWith('/calls');
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it('navigates to / when Dashboard item is selected', async () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const dashboardItem = screen.getByText('Dashboard');
    await userEvent.click(dashboardItem);

    expect(mockPush).toHaveBeenCalledWith('/');
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it('navigates to /reports when Reports item is selected', async () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    const reportsItem = screen.getByText('Reports');
    await userEvent.click(reportsItem);

    expect(mockPush).toHaveBeenCalledWith('/reports');
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Footer stats
// ---------------------------------------------------------------------------

describe('CommandPalette - footer', () => {
  it('shows the Esc and Enter hints in the footer', () => {
    useUIStore.setState({ commandPaletteOpen: true });
    render(<CommandPalette />);

    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
  });
});
