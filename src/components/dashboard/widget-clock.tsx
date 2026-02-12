'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// ClockWidget -- digital clock with date display for wallboards
// ---------------------------------------------------------------------------

export interface ClockWidgetProps {
  /** Timezone (IANA format, e.g. 'America/New_York') */
  timezone?: string;
  /** Whether to show seconds */
  showSeconds?: boolean;
  /** Date format: 'short' | 'long' | 'none' */
  dateFormat?: 'short' | 'long' | 'none';
}

function formatTime(date: Date, timezone?: string, showSeconds = true): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...(showSeconds ? { second: '2-digit' } : {}),
    ...(timezone ? { timeZone: timezone } : {}),
  };
  return new Intl.DateTimeFormat('en-GB', opts).format(date);
}

function formatDate(date: Date, format: 'short' | 'long', timezone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    ...(timezone ? { timeZone: timezone } : {}),
    ...(format === 'long'
      ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' }),
  };
  return new Intl.DateTimeFormat('en-US', opts).format(date);
}

export function ClockWidget({
  timezone,
  showSeconds = true,
  dateFormat = 'long',
}: ClockWidgetProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = formatTime(now, timezone, showSeconds);
  const dateStr = dateFormat !== 'none' ? formatDate(now, dateFormat, timezone) : null;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      {/* Time display */}
      <span
        className={cn(
          'font-mono tabular-nums text-content-primary font-semibold tracking-wide',
          'text-display-md',
        )}
      >
        {timeStr}
      </span>

      {/* Date display */}
      {dateStr && (
        <span className="text-body-md text-content-secondary">
          {dateStr}
        </span>
      )}

      {/* Timezone label */}
      {timezone && (
        <span className="text-caption text-content-tertiary">
          {timezone.replace(/_/g, ' ')}
        </span>
      )}
    </div>
  );
}
