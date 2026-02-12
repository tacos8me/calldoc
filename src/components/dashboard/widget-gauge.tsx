'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, ANIMATION } from '@/lib/theme';

// ---------------------------------------------------------------------------
// GaugeWidget -- circular SVG gauge with threshold-based coloring
// ---------------------------------------------------------------------------

export interface GaugeWidgetProps {
  /** Current value (0-100 scale for percentage, or actual value with max) */
  value: number;
  /** Maximum value (default 100) */
  max?: number;
  /** Display label */
  label?: string;
  /** Format function for the center value */
  formatValue?: (v: number) => string;
  /** Threshold breakpoints */
  thresholds?: {
    warning: number;
    critical: number;
  };
}

function getGaugeColor(
  value: number,
  thresholds?: { warning: number; critical: number },
): string {
  if (!thresholds) return STATUS_COLORS.success;
  if (value >= thresholds.critical) return STATUS_COLORS.danger;
  if (value >= thresholds.warning) return STATUS_COLORS.warning;
  return STATUS_COLORS.success;
}

export function GaugeWidget({
  value,
  max = 100,
  label,
  formatValue,
  thresholds,
}: GaugeWidgetProps) {
  const pathRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const prevValueRef = useRef(value);

  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;
  const color = getGaugeColor(normalizedValue, thresholds);

  // SVG gauge dimensions
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const startAngle = 135; // Start at 7 o'clock
  const totalAngle = 270; // Sweep 270 degrees

  // Animated gauge fill
  useEffect(() => {
    const prev = prevValueRef.current;
    prevValueRef.current = value;

    if (!pathRef.current || !textRef.current) return;

    const from = (Math.min(Math.max(prev, 0), max) / max) * 100;
    const to = percentage;
    const startTime = performance.now();
    const duration = ANIMATION.durations.counter;

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;

      if (pathRef.current) {
        const dashOffset = circumference - (current / 100) * (circumference * (totalAngle / 360));
        pathRef.current.style.strokeDashoffset = String(dashOffset);
      }

      if (textRef.current) {
        const displayVal = Math.round(
          (normalizedValue * current) / (to || 1),
        );
        textRef.current.textContent = formatValue
          ? formatValue(displayVal)
          : String(displayVal);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }, [value, max, percentage, normalizedValue, circumference, totalAngle, formatValue]);

  const dashArray = circumference;
  const dashOffset = circumference - (percentage / 100) * (circumference * (totalAngle / 360));

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-[135deg]"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={circumference - (circumference * (totalAngle / 360))}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <circle
          ref={pathRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-[stroke] duration-normal"
        />
        {/* Center text */}
        <text
          ref={textRef}
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-content-primary font-mono"
          fontSize="20"
          fontWeight="600"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        >
          {formatValue ? formatValue(normalizedValue) : String(normalizedValue)}
        </text>
      </svg>

      {label && (
        <span className="text-caption text-content-tertiary">{label}</span>
      )}
    </div>
  );
}
