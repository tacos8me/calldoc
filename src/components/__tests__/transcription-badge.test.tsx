// ─── TranscriptionBadge Component Tests ──────────────────────────────────────
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TranscriptionBadge } from '../recordings/transcription-badge';

// ---------------------------------------------------------------------------
// Null / undefined status
// ---------------------------------------------------------------------------

describe('TranscriptionBadge - null status', () => {
  it('renders "No transcript" text when status is null and not compact', () => {
    render(<TranscriptionBadge status={null} />);

    expect(screen.getByText('No transcript')).toBeInTheDocument();
  });

  it('renders nothing when status is null and compact is true', () => {
    const { container } = render(
      <TranscriptionBadge status={null} compact />,
    );

    expect(container.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Pending state
// ---------------------------------------------------------------------------

describe('TranscriptionBadge - pending', () => {
  it('renders "Pending" label when not compact', () => {
    render(<TranscriptionBadge status="pending" />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('has title "Transcription pending"', () => {
    const { container } = render(<TranscriptionBadge status="pending" />);

    const badge = container.querySelector('[title="Transcription pending"]');
    expect(badge).toBeInTheDocument();
  });

  it('renders the pulsing amber dot', () => {
    const { container } = render(<TranscriptionBadge status="pending" />);

    const pulsingDot = container.querySelector('.animate-ping');
    expect(pulsingDot).toBeInTheDocument();
  });

  it('hides label text in compact mode', () => {
    render(<TranscriptionBadge status="pending" compact />);

    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Processing state
// ---------------------------------------------------------------------------

describe('TranscriptionBadge - processing', () => {
  it('renders "Transcribing..." label when not compact', () => {
    render(<TranscriptionBadge status="processing" />);

    expect(screen.getByText('Transcribing...')).toBeInTheDocument();
  });

  it('has title "Transcribing..."', () => {
    const { container } = render(
      <TranscriptionBadge status="processing" />,
    );

    const badge = container.querySelector('[title="Transcribing..."]');
    expect(badge).toBeInTheDocument();
  });

  it('renders a spinning loader icon', () => {
    const { container } = render(
      <TranscriptionBadge status="processing" />,
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('hides label text in compact mode', () => {
    render(<TranscriptionBadge status="processing" compact />);

    expect(screen.queryByText('Transcribing...')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Completed state
// ---------------------------------------------------------------------------

describe('TranscriptionBadge - completed', () => {
  it('renders confidence percentage when provided', () => {
    render(
      <TranscriptionBadge status="completed" confidence={0.95} />,
    );

    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  it('has title with confidence info', () => {
    const { container } = render(
      <TranscriptionBadge status="completed" confidence={0.87} />,
    );

    const badge = container.querySelector(
      '[title="Transcription complete (87% confidence)"]',
    );
    expect(badge).toBeInTheDocument();
  });

  it('has title without confidence when confidence is null', () => {
    const { container } = render(
      <TranscriptionBadge status="completed" confidence={null} />,
    );

    const badge = container.querySelector(
      '[title="Transcription complete"]',
    );
    expect(badge).toBeInTheDocument();
  });

  it('rounds confidence to nearest integer', () => {
    render(
      <TranscriptionBadge status="completed" confidence={0.876} />,
    );

    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('hides confidence text in compact mode', () => {
    render(
      <TranscriptionBadge status="completed" confidence={0.95} compact />,
    );

    expect(screen.queryByText('95%')).not.toBeInTheDocument();
  });

  it('does not show percentage text when confidence is not provided', () => {
    render(<TranscriptionBadge status="completed" />);

    // No percentage text should appear
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Failed state
// ---------------------------------------------------------------------------

describe('TranscriptionBadge - failed', () => {
  it('renders "Failed" label when not compact', () => {
    render(<TranscriptionBadge status="failed" />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('has title "Transcription failed"', () => {
    const { container } = render(
      <TranscriptionBadge status="failed" />,
    );

    const badge = container.querySelector(
      '[title="Transcription failed"]',
    );
    expect(badge).toBeInTheDocument();
  });

  it('hides label text in compact mode', () => {
    render(<TranscriptionBadge status="failed" compact />);

    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Compact mode general behavior
// ---------------------------------------------------------------------------

describe('TranscriptionBadge - compact mode', () => {
  it('does not apply rounded-full background classes in compact mode', () => {
    const { container } = render(
      <TranscriptionBadge status="pending" compact />,
    );

    const badge = container.querySelector('[title]');
    expect(badge).not.toHaveClass('rounded-full');
  });

  it('applies rounded-full background classes in normal mode', () => {
    const { container } = render(
      <TranscriptionBadge status="pending" />,
    );

    const badge = container.querySelector('[title]');
    expect(badge).toHaveClass('rounded-full');
  });
});
