'use client';

import * as React from 'react';
import { EVENT_COLORS } from '@/lib/theme';
import type { CallEvent, CallEventType } from '@/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventBarProps {
  events: CallEvent[];
  startTime: Date;
  endTime: Date;
  colorMap?: Record<string, string>;
  height?: number;
  onClick?: (event: CallEvent) => void;
  showTooltip?: boolean;
  className?: string;
}

// Map CallEventType to the display name and visual event color key
const EVENT_TYPE_DISPLAY: Record<string, { label: string; colorKey: keyof typeof EVENT_COLORS }> = {
  initiated: { label: 'Initiated', colorKey: 'dialing' },
  queued: { label: 'Queued', colorKey: 'queue' },
  dequeued: { label: 'Dequeued', colorKey: 'queue' },
  ringing: { label: 'Ringing', colorKey: 'ringing' },
  answered: { label: 'Talking', colorKey: 'talking' },
  held: { label: 'Hold', colorKey: 'hold' },
  retrieved: { label: 'Talking', colorKey: 'talking' },
  transferred: { label: 'Transfer', colorKey: 'transfer' },
  conferenced: { label: 'Conference', colorKey: 'conference' },
  parked: { label: 'Parked', colorKey: 'park' },
  unparked: { label: 'Unparked', colorKey: 'park' },
  voicemail: { label: 'Voicemail', colorKey: 'voicemail' },
  completed: { label: 'Completed', colorKey: 'idle' },
  abandoned: { label: 'Abandoned', colorKey: 'calling-drop' },
  dtmf: { label: 'DTMF', colorKey: 'auto-attendant' },
  recording_started: { label: 'Recording', colorKey: 'listen' },
  recording_stopped: { label: 'Recording Ended', colorKey: 'listen' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m ${s}s`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function getEventColor(eventType: string, colorMap?: Record<string, string>): string {
  if (colorMap && colorMap[eventType]) return colorMap[eventType];
  const display = EVENT_TYPE_DISPLAY[eventType];
  if (display) return EVENT_COLORS[display.colorKey];
  return EVENT_COLORS.idle;
}

function getEventLabel(eventType: string): string {
  return EVENT_TYPE_DISPLAY[eventType]?.label ?? eventType;
}

// ---------------------------------------------------------------------------
// Segment type for processed events
// ---------------------------------------------------------------------------

interface Segment {
  event: CallEvent;
  startMs: number;
  endMs: number;
  durationMs: number;
  widthPercent: number;
  color: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Tooltip component
// ---------------------------------------------------------------------------

function SegmentTooltip({
  segment,
  position,
}: {
  segment: Segment;
  position: { x: number; y: number };
}) {
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-border bg-surface-overlay px-3 py-2 shadow-lg"
      style={{
        left: position.x,
        top: position.y - 80,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: segment.color }}
        />
        <span className="text-caption font-semibold text-content-primary">{segment.label}</span>
      </div>
      <div className="space-y-0.5 text-mono-sm text-content-secondary">
        <div>Duration: {formatDuration(segment.durationMs / 1000)}</div>
        {segment.event.party && <div>Party: {segment.event.party}</div>}
        <div>
          {formatTime(new Date(segment.startMs))}
          {' - '}
          {formatTime(new Date(segment.endMs))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventBar Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// SVG pattern definitions for colorblind accessibility (WCAG 1.4.1)
// These patterns provide additional visual differentiation beyond color.
// ---------------------------------------------------------------------------

function EventBarPatterns() {
  return (
    <svg className="absolute h-0 w-0" aria-hidden="true">
      <defs>
        {/* Hold: diagonal hatching */}
        <pattern id="pattern-hold" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        </pattern>
        {/* ACW/After Call Work: dots */}
        <pattern id="pattern-acw" patternUnits="userSpaceOnUse" width="6" height="6">
          <circle cx="3" cy="3" r="1" fill="rgba(255,255,255,0.3)" />
        </pattern>
        {/* Queue: horizontal lines */}
        <pattern id="pattern-queue" patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="3" x2="6" y2="3" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        </pattern>
        {/* Transfer: crosshatch */}
        <pattern id="pattern-transfer" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="0" y1="0" x2="6" y2="0" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </pattern>
        {/* Voicemail: waves */}
        <pattern id="pattern-voicemail" patternUnits="userSpaceOnUse" width="8" height="8">
          <path d="M0 4 Q2 2 4 4 Q6 6 8 4" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        </pattern>
        {/* DND: dense diagonal */}
        <pattern id="pattern-dnd" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        </pattern>
      </defs>
    </svg>
  );
}

// Map event types to their accessibility patterns
const EVENT_PATTERN_MAP: Record<string, string> = {
  held: 'url(#pattern-hold)',
  hold: 'url(#pattern-hold)',
  acw: 'url(#pattern-acw)',
  queued: 'url(#pattern-queue)',
  queue: 'url(#pattern-queue)',
  transferred: 'url(#pattern-transfer)',
  transfer: 'url(#pattern-transfer)',
  voicemail: 'url(#pattern-voicemail)',
  dnd: 'url(#pattern-dnd)',
};

export function EventBar({
  events,
  startTime,
  endTime,
  colorMap,
  height = 32,
  onClick,
  showTooltip = true,
  className,
}: EventBarProps) {
  const [hoveredSegment, setHoveredSegment] = React.useState<Segment | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  const totalDuration = endTime.getTime() - startTime.getTime();
  if (totalDuration <= 0) return null;

  // Process events into segments
  const segments: Segment[] = React.useMemo(() => {
    const MIN_WIDTH_PERCENT = 3; // minimum ~3% so it's visible
    const sorted = [...events]
      .filter((e) => e.duration !== null && e.duration > 0)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (sorted.length === 0) return [];

    const raw = sorted.map((event) => {
      const eventStart = new Date(event.timestamp).getTime();
      const duration = (event.duration ?? 0) * 1000;
      const eventEnd = eventStart + duration;

      return {
        event,
        startMs: eventStart,
        endMs: eventEnd,
        durationMs: duration,
        widthPercent: (duration / totalDuration) * 100,
        color: getEventColor(event.type, colorMap),
        label: getEventLabel(event.type),
      };
    });

    // Enforce minimum width
    return raw.map((seg) => ({
      ...seg,
      widthPercent: Math.max(seg.widthPercent, MIN_WIDTH_PERCENT),
    }));
  }, [events, totalDuration, colorMap]);

  // Normalize widths to sum to 100%
  const totalWidth = segments.reduce((sum, s) => sum + s.widthPercent, 0);
  const normalizedSegments = segments.map((s) => ({
    ...s,
    widthPercent: (s.widthPercent / totalWidth) * 100,
  }));

  function handleMouseMove(e: React.MouseEvent, segment: Segment) {
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setHoveredSegment(segment);
  }

  return (
    <div className={cn('relative', className)} role="img" aria-label="Call event timeline">
      {/* SVG pattern definitions for colorblind accessibility */}
      <EventBarPatterns />

      <div
        className="flex w-full overflow-hidden rounded-md bg-surface-base"
        style={{ height }}
      >
        {normalizedSegments.map((segment, i) => {
          const patternFill = EVENT_PATTERN_MAP[segment.event.type];
          return (
            <button
              key={`${segment.event.id}-${i}`}
              className="relative transition-all duration-fast hover:brightness-125 hover:z-10 focus:outline-none focus:ring-1 focus:ring-accent"
              style={{
                width: `${segment.widthPercent}%`,
                backgroundColor: segment.color,
                minWidth: '4px',
              }}
              onMouseMove={(e) => showTooltip && handleMouseMove(e, segment)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(segment.event);
              }}
              title={`${segment.label}: ${formatDuration(segment.durationMs / 1000)}`}
              aria-label={`${segment.label}: ${formatDuration(segment.durationMs / 1000)}`}
            >
              {/* Pattern overlay for colorblind accessibility */}
              {patternFill && (
                <svg
                  className="absolute inset-0 h-full w-full pointer-events-none"
                  aria-hidden="true"
                >
                  <rect
                    width="100%"
                    height="100%"
                    fill={patternFill}
                  />
                </svg>
              )}
              {/* Show label if segment is wide enough */}
              {segment.widthPercent > 12 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 truncate px-1">
                  {segment.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tooltip */}
      {showTooltip && hoveredSegment && (
        <SegmentTooltip segment={hoveredSegment} position={tooltipPos} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event detail list (shown below the bar in expanded rows)
// ---------------------------------------------------------------------------

export function EventDetailList({
  events,
  colorMap,
}: {
  events: CallEvent[];
  colorMap?: Record<string, string>;
}) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="space-y-1">
      {sorted.map((event) => {
        const color = getEventColor(event.type, colorMap);
        const label = getEventLabel(event.type);

        return (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-surface-elevated/50 transition-colors"
          >
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="w-24 flex-shrink-0 text-caption font-medium text-content-primary">
              {label}
            </span>
            <span className="w-20 flex-shrink-0 font-mono text-mono-sm text-content-secondary">
              {event.duration != null ? formatDuration(event.duration) : '--'}
            </span>
            <span className="w-24 flex-shrink-0 font-mono text-mono-sm text-content-tertiary">
              {new Date(event.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            {event.party && (
              <span className="text-body-sm text-content-secondary">{event.party}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
