'use client';

import * as React from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeRange {
  from: Date;
  to: Date;
}

export type PresetKey =
  | 'last-hour'
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'custom';

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  showNowButton?: boolean;
  onNow?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => TimeRange;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - day);
  return startOfDay(r);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const PRESETS: Preset[] = [
  {
    key: 'last-hour',
    label: 'Last Hour',
    getRange: () => ({
      from: new Date(Date.now() - 60 * 60 * 1000),
      to: new Date(),
    }),
  },
  {
    key: 'today',
    label: 'Today',
    getRange: () => ({
      from: startOfDay(new Date()),
      to: new Date(),
    }),
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    },
  },
  {
    key: 'this-week',
    label: 'This Week',
    getRange: () => ({
      from: startOfWeek(new Date()),
      to: new Date(),
    }),
  },
  {
    key: 'last-week',
    label: 'Last Week',
    getRange: () => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setMilliseconds(-1);
      return { from: lastWeekStart, to: lastWeekEnd };
    },
  },
  {
    key: 'this-month',
    label: 'This Month',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
];

// ---------------------------------------------------------------------------
// Mini calendar
// ---------------------------------------------------------------------------

function MiniCalendar({
  selectedDate,
  onSelect,
  month,
  onMonthChange,
}: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
  month: Date;
  onMonthChange: (d: Date) => void;
}) {
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  function prevMonth() {
    const p = new Date(month);
    p.setMonth(p.getMonth() - 1);
    onMonthChange(p);
  }

  function nextMonth() {
    const n = new Date(month);
    n.setMonth(n.getMonth() + 1);
    onMonthChange(n);
  }

  return (
    <div className="w-[260px]">
      <div className="flex items-center justify-between px-2 pb-2">
        <button
          onClick={prevMonth}
          className="rounded p-1 text-content-tertiary hover:bg-surface-elevated hover:text-content-secondary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-caption font-semibold text-content-primary">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="rounded p-1 text-content-tertiary hover:bg-surface-elevated hover:text-content-secondary transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="py-1 text-[10px] font-semibold text-content-tertiary uppercase">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const date = new Date(year, mo, day);
          const isSelected =
            selectedDate &&
            date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <button
              key={day}
              onClick={() => onSelect(date)}
              className={cn(
                'rounded py-1.5 text-caption transition-colors',
                isSelected
                  ? 'bg-accent text-white'
                  : isToday
                    ? 'bg-accent-subtle text-accent'
                    : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimeRangeSelector Component
// ---------------------------------------------------------------------------

export function TimeRangeSelector({
  value,
  onChange,
  showNowButton = false,
  onNow,
  className,
}: TimeRangeSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<PresetKey | null>(null);
  const [showCustom, setShowCustom] = React.useState(false);
  const [fromMonth, setFromMonth] = React.useState(new Date(value.from));
  const [toMonth, setToMonth] = React.useState(new Date(value.to));
  const [customFrom, setCustomFrom] = React.useState<Date | null>(value.from);
  const [customTo, setCustomTo] = React.useState<Date | null>(value.to);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function selectPreset(preset: Preset) {
    setActivePreset(preset.key);
    const range = preset.getRange();
    onChange(range);
    setOpen(false);
    setShowCustom(false);
  }

  function applyCustom() {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo });
      setActivePreset('custom');
      setOpen(false);
    }
  }

  // Format the display label
  const displayLabel = React.useMemo(() => {
    if (activePreset && activePreset !== 'custom') {
      return PRESETS.find((p) => p.key === activePreset)?.label ?? 'Custom';
    }
    const fromStr = value.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const toStr = value.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fromTime = value.from.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const toTime = value.to.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (fromStr === toStr) return `${fromStr}, ${fromTime} - ${toTime}`;
    return `${fromStr} - ${toStr}`;
  }, [value, activePreset]);

  return (
    <div className={cn('relative flex items-center gap-2', className)} ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-body-sm text-content-primary hover:border-border-strong transition-colors"
      >
        <Calendar className="h-4 w-4 text-content-tertiary" />
        <span>{displayLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-content-tertiary" />
      </button>

      {showNowButton && onNow && (
        <button
          onClick={onNow}
          className="inline-flex items-center gap-1.5 rounded-md bg-status-success/10 px-3 py-2 text-caption font-medium text-status-success hover:bg-status-success/20 transition-colors"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-status-success" />
          Now
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-border bg-surface-card shadow-lg animate-fade-in">
          <div className="flex">
            {/* Presets column */}
            <div className="w-40 border-r border-border p-2">
              <div className="mb-1 px-2 py-1 text-overline uppercase text-content-tertiary">
                Quick Select
              </div>
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => selectPreset(preset)}
                  className={cn(
                    'w-full rounded-md px-3 py-1.5 text-left text-body-sm transition-colors',
                    activePreset === preset.key
                      ? 'bg-accent-subtle text-accent'
                      : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary'
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => setShowCustom(true)}
                className={cn(
                  'w-full rounded-md px-3 py-1.5 text-left text-body-sm transition-colors',
                  showCustom
                    ? 'bg-accent-subtle text-accent'
                    : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary'
                )}
              >
                Custom Range
              </button>
            </div>

            {/* Custom calendar area */}
            {showCustom && (
              <div className="p-4">
                <div className="flex gap-6">
                  <div>
                    <div className="mb-2 text-caption text-content-tertiary">From</div>
                    <MiniCalendar
                      selectedDate={customFrom}
                      onSelect={(d) => setCustomFrom(d)}
                      month={fromMonth}
                      onMonthChange={setFromMonth}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-caption text-content-tertiary">To</div>
                    <MiniCalendar
                      selectedDate={customTo}
                      onSelect={(d) => setCustomTo(endOfDay(d))}
                      month={toMonth}
                      onMonthChange={setToMonth}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-mono-sm text-content-tertiary">
                    {customFrom ? customFrom.toLocaleDateString() : '--'} &mdash;{' '}
                    {customTo ? customTo.toLocaleDateString() : '--'}
                  </div>
                  <button
                    onClick={applyCustom}
                    disabled={!customFrom || !customTo}
                    className="rounded-md bg-accent px-4 py-1.5 text-caption font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
