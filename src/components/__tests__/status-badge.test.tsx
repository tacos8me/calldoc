// ─── StatusBadge Component Tests ─────────────────────────────────────────────
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../shared/status-badge';
import type { AgentState } from '@/types';

// ---------------------------------------------------------------------------
// All agent states with expected labels
// ---------------------------------------------------------------------------

const ALL_STATES: { state: AgentState; label: string }[] = [
  { state: 'idle', label: 'Idle' },
  { state: 'talking', label: 'Talking' },
  { state: 'ringing', label: 'Ringing' },
  { state: 'hold', label: 'Hold' },
  { state: 'acw', label: 'ACW' },
  { state: 'dnd', label: 'DND' },
  { state: 'away', label: 'Away' },
  { state: 'logged-out', label: 'Logged Out' },
  { state: 'unknown', label: 'Unknown' },
];

// ---------------------------------------------------------------------------
// Rendering for each agent state
// ---------------------------------------------------------------------------

describe('StatusBadge - agent states', () => {
  it.each(ALL_STATES)(
    'renders colored dot for $state state',
    ({ state }) => {
      const { container } = render(<StatusBadge status={state} />);

      // Should render a dot (inner span with rounded-full class)
      const dot = container.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
    },
  );

  it.each(ALL_STATES)(
    'renders label text "$label" for $state when showLabel is true',
    ({ state, label }) => {
      render(<StatusBadge status={state} showLabel />);

      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it('does not render label text by default', () => {
    render(<StatusBadge status="idle" />);

    expect(screen.queryByText('Idle')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Custom className
// ---------------------------------------------------------------------------

describe('StatusBadge - className', () => {
  it('applies custom className to the wrapper', () => {
    const { container } = render(
      <StatusBadge status="idle" className="my-custom-class" />,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('my-custom-class');
  });
});

// ---------------------------------------------------------------------------
// Pulse animation
// ---------------------------------------------------------------------------

describe('StatusBadge - pulse', () => {
  it('auto-enables pulse animation for ringing state', () => {
    const { container } = render(<StatusBadge status="ringing" />);

    const dot = container.querySelector('.rounded-full');
    expect(dot).toHaveClass('animate-pulse-fast');
  });

  it('does not auto-enable pulse for idle state', () => {
    const { container } = render(<StatusBadge status="idle" />);

    const dot = container.querySelector('.rounded-full');
    expect(dot).not.toHaveClass('animate-pulse-fast');
  });

  it('enables pulse when explicitly set to true', () => {
    const { container } = render(<StatusBadge status="idle" pulse />);

    const dot = container.querySelector('.rounded-full');
    expect(dot).toHaveClass('animate-pulse-fast');
  });

  it('disables pulse for ringing when explicitly set to false', () => {
    const { container } = render(
      <StatusBadge status="ringing" pulse={false} />,
    );

    const dot = container.querySelector('.rounded-full');
    expect(dot).not.toHaveClass('animate-pulse-fast');
  });
});

// ---------------------------------------------------------------------------
// Size variants
// ---------------------------------------------------------------------------

describe('StatusBadge - size', () => {
  it('applies small dot size', () => {
    const { container } = render(<StatusBadge status="idle" size="sm" />);

    const dot = container.querySelector('.rounded-full');
    expect(dot).toHaveClass('h-2', 'w-2');
  });

  it('applies medium dot size by default', () => {
    const { container } = render(<StatusBadge status="idle" />);

    const dot = container.querySelector('.rounded-full');
    expect(dot).toHaveClass('h-2.5', 'w-2.5');
  });

  it('applies large dot size', () => {
    const { container } = render(<StatusBadge status="idle" size="lg" />);

    const dot = container.querySelector('.rounded-full');
    expect(dot).toHaveClass('h-3', 'w-3');
  });
});
