'use client';

import { cn } from '@/lib/utils';
import type { AgentState } from '@/types';

// ---------------------------------------------------------------------------
// StatusBadge -- colored dot + optional label for agent / call states
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<AgentState, string> = {
  idle: 'bg-event-idle',
  talking: 'bg-event-talking',
  ringing: 'bg-event-ringing',
  hold: 'bg-event-hold',
  acw: 'bg-event-acw',
  dnd: 'bg-event-dnd',
  away: 'bg-[#6B7280]',
  'logged-out': 'bg-[#374151]',
  unknown: 'bg-[#52525B]',
};

const STATE_LABELS: Record<AgentState, string> = {
  idle: 'Idle',
  talking: 'Talking',
  ringing: 'Ringing',
  hold: 'Hold',
  acw: 'ACW',
  dnd: 'DND',
  away: 'Away',
  'logged-out': 'Logged Out',
  unknown: 'Unknown',
};

const DOT_SIZES = {
  sm: 'h-2 w-2',    // 8px
  md: 'h-2.5 w-2.5', // 10px
  lg: 'h-3 w-3',    // 12px
} as const;

export interface StatusBadgeProps {
  /** Agent state determines color */
  status: AgentState;
  /** Dot size */
  size?: 'sm' | 'md' | 'lg';
  /** Display state text beside dot */
  showLabel?: boolean;
  /** Pulse animation (auto-enabled for ringing) */
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showLabel = false,
  pulse,
  className,
}: StatusBadgeProps) {
  const shouldPulse = pulse ?? status === 'ringing';

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'rounded-full shrink-0',
          DOT_SIZES[size],
          STATE_COLORS[status],
          shouldPulse && 'animate-pulse-fast',
        )}
      />
      {showLabel && (
        <span className="text-caption text-content-secondary whitespace-nowrap">
          {STATE_LABELS[status]}
        </span>
      )}
    </span>
  );
}
