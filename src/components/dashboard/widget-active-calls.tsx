'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneIncoming, PhoneOutgoing, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveCalls } from '@/stores/call-store';
import type { Call, CallDirection } from '@/types';

// ---------------------------------------------------------------------------
// ActiveCallsWidget -- live list of active calls with animated transitions
// ---------------------------------------------------------------------------

const DIRECTION_ICONS: Record<CallDirection, React.ReactNode> = {
  inbound: <PhoneIncoming className="h-3.5 w-3.5 text-status-success" />,
  outbound: <PhoneOutgoing className="h-3.5 w-3.5 text-status-info" />,
  internal: <Phone className="h-3.5 w-3.5 text-content-tertiary" />,
};

const STATE_COLORS: Record<string, string> = {
  ringing: 'bg-event-ringing/20 text-event-ringing',
  connected: 'bg-event-talking/20 text-event-talking',
  hold: 'bg-event-hold/20 text-event-hold',
  queued: 'bg-event-queue/20 text-event-queue',
  transferring: 'bg-event-transfer/20 text-event-transfer',
  conferencing: 'bg-event-conference/20 text-event-conference',
  voicemail: 'bg-event-voicemail/20 text-event-voicemail',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface CallRowProps {
  call: Call;
  isNew?: boolean;
  onClick?: (call: Call) => void;
}

function CallRow({ call, isNew, onClick }: CallRowProps) {
  const [elapsed, setElapsed] = useState(call.duration);

  // Live duration counter
  useEffect(() => {
    if (call.state === 'completed' || call.state === 'abandoned') return;

    const start = new Date(call.startTime).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [call.startTime, call.state]);

  const stateClass = STATE_COLORS[call.state] ?? 'bg-surface-elevated text-content-secondary';

  return (
    <button
      onClick={() => onClick?.(call)}
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 rounded-md text-left',
        'hover:bg-surface-elevated transition-all duration-normal',
        isNew && 'animate-slide-up bg-status-success/10',
      )}
    >
      {/* Direction icon */}
      <span className="shrink-0">
        {DIRECTION_ICONS[call.direction]}
      </span>

      {/* Caller / Called info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-content-primary truncate">
            {call.callerNumber}
          </span>
          <span className="text-content-tertiary text-caption">→</span>
          <span className="text-body-sm text-content-secondary truncate">
            {call.calledNumber}
          </span>
        </div>
        {call.agentName && (
          <span className="text-caption text-content-tertiary truncate block">
            {call.agentName}
          </span>
        )}
      </div>

      {/* Duration */}
      <span className="text-mono-sm font-mono text-content-secondary tabular-nums shrink-0">
        {formatDuration(elapsed)}
      </span>

      {/* State badge */}
      <span
        className={cn(
          'text-caption px-2 py-0.5 rounded-sm shrink-0 capitalize',
          stateClass,
        )}
      >
        {call.state}
      </span>
    </button>
  );
}

export interface ActiveCallsWidgetProps {
  onCallClick?: (call: Call) => void;
}

export function ActiveCallsWidget({ onCallClick }: ActiveCallsWidgetProps) {
  const calls = useActiveCalls();
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Track newly-arrived calls for the green flash animation
  useEffect(() => {
    const currentIds = new Set(calls.map((c) => c.id));
    const fresh = new Set<string>();
    for (const id of currentIds) {
      if (!prevIdsRef.current.has(id)) {
        fresh.add(id);
      }
    }
    prevIdsRef.current = currentIds;

    if (fresh.size > 0) {
      setNewIds(fresh);
      const timer = setTimeout(() => setNewIds(new Set()), 300);
      return () => clearTimeout(timer);
    }
  }, [calls]);

  if (calls.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-body-sm text-content-tertiary">
        No active calls
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 h-full overflow-y-auto -mx-1">
      {calls.map((call) => (
        <CallRow
          key={call.id}
          call={call}
          isNew={newIds.has(call.id)}
          onClick={onCallClick}
        />
      ))}
    </div>
  );
}
