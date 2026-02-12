// ─── ConnectionIndicator Component Tests ─────────────────────────────────────
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionIndicator } from '../shared/connection-indicator';
import { useUIStore } from '@/stores/ui-store';

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useUIStore.setState({
    connectionStatus: 'disconnected',
    latency: 0,
  });
});

// ---------------------------------------------------------------------------
// Connected state
// ---------------------------------------------------------------------------

describe('ConnectionIndicator - connected', () => {
  it('shows "Connected" label when connected', () => {
    useUIStore.setState({ connectionStatus: 'connected' });
    render(<ConnectionIndicator />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('displays latency when connected and latency is positive', () => {
    useUIStore.setState({ connectionStatus: 'connected', latency: 42 });
    render(<ConnectionIndicator />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('42ms')).toBeInTheDocument();
  });

  it('does not display latency when latency is zero', () => {
    useUIStore.setState({ connectionStatus: 'connected', latency: 0 });
    render(<ConnectionIndicator />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.queryByText('0ms')).not.toBeInTheDocument();
  });

  it('has accessible label including latency', () => {
    useUIStore.setState({ connectionStatus: 'connected', latency: 55 });
    render(<ConnectionIndicator />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute(
      'aria-label',
      'Connection status: Connected, latency 55ms',
    );
  });
});

// ---------------------------------------------------------------------------
// Disconnected state
// ---------------------------------------------------------------------------

describe('ConnectionIndicator - disconnected', () => {
  it('shows "Disconnected" label when disconnected', () => {
    useUIStore.setState({ connectionStatus: 'disconnected' });
    render(<ConnectionIndicator />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('does not display latency when disconnected', () => {
    useUIStore.setState({ connectionStatus: 'disconnected', latency: 100 });
    render(<ConnectionIndicator />);

    expect(screen.queryByText('100ms')).not.toBeInTheDocument();
  });

  it('has accessible label without latency', () => {
    useUIStore.setState({ connectionStatus: 'disconnected' });
    render(<ConnectionIndicator />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute(
      'aria-label',
      'Connection status: Disconnected',
    );
  });
});

// ---------------------------------------------------------------------------
// Reconnecting state
// ---------------------------------------------------------------------------

describe('ConnectionIndicator - reconnecting', () => {
  it('shows "Reconnecting..." label when connecting', () => {
    useUIStore.setState({ connectionStatus: 'connecting' });
    render(<ConnectionIndicator />);

    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });

  it('does not display latency when reconnecting', () => {
    useUIStore.setState({ connectionStatus: 'connecting', latency: 80 });
    render(<ConnectionIndicator />);

    expect(screen.queryByText('80ms')).not.toBeInTheDocument();
  });

  it('has accessible label for reconnecting', () => {
    useUIStore.setState({ connectionStatus: 'connecting' });
    render(<ConnectionIndicator />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute(
      'aria-label',
      'Connection status: Reconnecting...',
    );
  });
});

// ---------------------------------------------------------------------------
// ARIA role and live region
// ---------------------------------------------------------------------------

describe('ConnectionIndicator - accessibility', () => {
  it('has role="status" for screen reader announcements', () => {
    useUIStore.setState({ connectionStatus: 'connected' });
    render(<ConnectionIndicator />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite" so updates are announced', () => {
    useUIStore.setState({ connectionStatus: 'connected' });
    render(<ConnectionIndicator />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});

// ---------------------------------------------------------------------------
// Custom className
// ---------------------------------------------------------------------------

describe('ConnectionIndicator - className', () => {
  it('applies custom className to the wrapper', () => {
    useUIStore.setState({ connectionStatus: 'connected' });
    render(<ConnectionIndicator className="my-custom-class" />);

    const status = screen.getByRole('status');
    expect(status).toHaveClass('my-custom-class');
  });
});
