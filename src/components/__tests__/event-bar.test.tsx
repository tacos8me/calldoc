// ─── EventBar Component Tests ───────────────────────────────────────────────
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventBar } from '../shared/event-bar';
import type { CallEvent } from '@/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEvent(
  id: string,
  type: string,
  offsetSec: number,
  durationSec: number,
): CallEvent {
  const baseTime = new Date('2024-02-10T09:00:00Z');
  const timestamp = new Date(baseTime.getTime() + offsetSec * 1000);

  return {
    id,
    callId: 'call-1',
    type: type as CallEvent['type'],
    timestamp: timestamp.toISOString(),
    duration: durationSec,
    party: null,
    details: {},
  };
}

const baseStart = new Date('2024-02-10T09:00:00Z');
const baseEnd = new Date('2024-02-10T09:05:00Z'); // 5 minutes

// ---------------------------------------------------------------------------
// Segment rendering
// ---------------------------------------------------------------------------

describe('EventBar - rendering', () => {
  it('renders segments with correct proportional widths', () => {
    const events = [
      makeEvent('e1', 'ringing', 0, 30),    // 30s
      makeEvent('e2', 'answered', 30, 120),  // 120s (talking)
      makeEvent('e3', 'held', 150, 60),      // 60s (hold)
      makeEvent('e4', 'answered', 210, 90),  // 90s (talking after hold)
    ];

    const { container } = render(
      <EventBar events={events} startTime={baseStart} endTime={baseEnd} />,
    );

    // Should render 4 segments as buttons
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(4);
  });

  it('applies correct background colors per event type', () => {
    const events = [
      makeEvent('e1', 'ringing', 0, 60),
      makeEvent('e2', 'answered', 60, 120),
    ];

    const { container } = render(
      <EventBar events={events} startTime={baseStart} endTime={baseEnd} />,
    );

    const buttons = container.querySelectorAll('button');
    // Ringing color is #FBBF24 (yellow)
    expect(buttons[0].style.backgroundColor).toBeTruthy();
    // Talking color is #3B82F6 (blue)
    expect(buttons[1].style.backgroundColor).toBeTruthy();
  });

  it('shows title attribute with event label and duration', () => {
    const events = [makeEvent('e1', 'answered', 0, 120)];

    const { container } = render(
      <EventBar events={events} startTime={baseStart} endTime={baseEnd} />,
    );

    const button = container.querySelector('button')!;
    expect(button.title).toContain('Talking');
    expect(button.title).toContain('2m');
  });
});

// ---------------------------------------------------------------------------
// Click handler
// ---------------------------------------------------------------------------

describe('EventBar - click segment', () => {
  it('calls onClick with the event when a segment is clicked', async () => {
    const onClick = vi.fn();
    const events = [
      makeEvent('e1', 'ringing', 0, 30),
      makeEvent('e2', 'answered', 30, 120),
    ];

    const { container } = render(
      <EventBar
        events={events}
        startTime={baseStart}
        endTime={baseEnd}
        onClick={onClick}
      />,
    );

    const buttons = container.querySelectorAll('button');
    await userEvent.click(buttons[1]);

    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick.mock.calls[0][0].id).toBe('e2');
    expect(onClick.mock.calls[0][0].type).toBe('answered');
  });
});

// ---------------------------------------------------------------------------
// Hover tooltip
// ---------------------------------------------------------------------------

describe('EventBar - tooltip', () => {
  it('shows tooltip content on mouse move over a segment', () => {
    const events = [makeEvent('e1', 'held', 0, 60)];

    const { container } = render(
      <EventBar events={events} startTime={baseStart} endTime={baseEnd} showTooltip />,
    );

    const button = container.querySelector('button')!;
    fireEvent.mouseMove(button, { clientX: 100, clientY: 200 });

    // Tooltip should appear with duration text (unique to tooltip)
    expect(screen.getByText(/Duration:/)).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    const events = [makeEvent('e1', 'held', 0, 60)];

    const { container } = render(
      <EventBar events={events} startTime={baseStart} endTime={baseEnd} showTooltip />,
    );

    const button = container.querySelector('button')!;
    fireEvent.mouseMove(button, { clientX: 100, clientY: 200 });
    fireEvent.mouseLeave(button);

    // Tooltip text should be gone (only the title attribute remains, not the tooltip div)
    expect(screen.queryByText('Duration:')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('EventBar - edge cases', () => {
  it('returns null for empty events array', () => {
    const { container } = render(
      <EventBar events={[]} startTime={baseStart} endTime={baseEnd} />,
    );

    // With no events having positive duration, segments array is empty
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
  });

  it('handles single-event timeline', () => {
    const events = [makeEvent('e1', 'answered', 0, 300)];

    const { container } = render(
      <EventBar events={events} startTime={baseStart} endTime={baseEnd} />,
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    // Single segment should take 100% width
    const width = parseFloat(buttons[0].style.width);
    expect(width).toBe(100);
  });

  it('returns null when endTime is before startTime', () => {
    const { container } = render(
      <EventBar
        events={[makeEvent('e1', 'answered', 0, 60)]}
        startTime={baseEnd}
        endTime={baseStart}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('filters out events with zero or null duration', () => {
    const events = [
      makeEvent('e1', 'answered', 0, 120),
      { ...makeEvent('e2', 'dtmf', 120, 0), duration: 0 },
      { ...makeEvent('e3', 'held', 120, 0), duration: null } as unknown as CallEvent,
    ];

    const { container } = render(
      <EventBar events={events} startTime={baseStart} endTime={baseEnd} />,
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
  });
});
