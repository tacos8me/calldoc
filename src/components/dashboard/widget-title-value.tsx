'use client';

import { useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANIMATION } from '@/lib/theme';

// ---------------------------------------------------------------------------
// TitleValueWidget -- large KPI number with label and optional trend
// ---------------------------------------------------------------------------

export interface TitleValueWidgetProps {
  /** Current numeric value */
  value: number;
  /** Display label below the number */
  label?: string;
  /** Format function (e.g. seconds -> "2:30") */
  formatValue?: (v: number) => string;
  /** Trend indicator */
  trend?: {
    direction: 'up' | 'down' | 'flat';
    percent: number;
  };
  /** Threshold color override (hex string) */
  thresholdColor?: string | null;
}

/**
 * Custom hook for animated counter using requestAnimationFrame.
 * Smoothly transitions from previous value to new value.
 */
function useAnimatedCounter(target: number, duration = ANIMATION.durations.counter) {
  const displayRef = useRef(target);
  const animatingRef = useRef(false);
  const rafRef = useRef<number>(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const formatRef = useRef<((v: number) => string) | null>(null);

  const animate = useCallback(
    (from: number, to: number) => {
      if (animatingRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      animatingRef.current = true;
      const start = performance.now();

      function step(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Spring easing: cubic-bezier(0.16, 1, 0.3, 1)
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = from + (to - from) * eased;

        displayRef.current = current;
        if (elementRef.current) {
          const fmt = formatRef.current;
          elementRef.current.textContent = fmt
            ? fmt(Math.round(current))
            : String(Math.round(current));
        }

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          animatingRef.current = false;
          displayRef.current = to;
        }
      }

      rafRef.current = requestAnimationFrame(step);
    },
    [duration],
  );

  useEffect(() => {
    const prev = displayRef.current;
    if (prev !== target) {
      animate(prev, target);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, animate]);

  return { elementRef, formatRef };
}

export function TitleValueWidget({
  value,
  label,
  formatValue,
  trend,
  thresholdColor,
}: TitleValueWidgetProps) {
  const { elementRef, formatRef } = useAnimatedCounter(value);

  // Keep format function ref updated
  useEffect(() => {
    formatRef.current = formatValue ?? null;
  }, [formatValue, formatRef]);

  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      {/* Large number display */}
      <span
        ref={elementRef}
        className={cn(
          'text-display-sm font-mono tabular-nums',
          thresholdColor ? '' : 'text-content-primary',
        )}
        style={thresholdColor ? { color: thresholdColor } : undefined}
      >
        {displayValue}
      </span>

      {/* Label */}
      {label && (
        <span className="text-caption text-content-tertiary">{label}</span>
      )}

      {/* Trend indicator */}
      {trend && (
        <div
          className={cn(
            'flex items-center gap-1 text-caption',
            trend.direction === 'up' && 'text-status-success',
            trend.direction === 'down' && 'text-status-danger',
            trend.direction === 'flat' && 'text-content-tertiary',
          )}
        >
          {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
          {trend.direction === 'down' && (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{trend.percent}%</span>
        </div>
      )}
    </div>
  );
}
