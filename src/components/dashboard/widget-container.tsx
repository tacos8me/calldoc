'use client';

import React, { useMemo } from 'react';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Widget, ThresholdRule } from '@/types';

// ---------------------------------------------------------------------------
// WidgetContainer -- wrapper card for all dashboard widgets
// ---------------------------------------------------------------------------

export interface WidgetContainerProps {
  widget: Widget;
  /** Current metric value (for threshold border color) */
  value?: number;
  /** Whether the dashboard is in edit mode */
  editMode?: boolean;
  /** Called when gear icon is clicked */
  onConfigure?: () => void;
  /** Child widget content */
  children: React.ReactNode;
  /** Last update timestamp (ISO string) */
  lastUpdated?: string;
  className?: string;
}

function evaluateThresholdColor(
  value: number | undefined,
  thresholds: ThresholdRule[],
): string | null {
  if (value === undefined || thresholds.length === 0) return null;

  // Sort by value descending to find the highest matching threshold
  const sorted = [...thresholds].sort((a, b) => b.value - a.value);

  for (const rule of sorted) {
    let matches = false;
    switch (rule.operator) {
      case 'gt':
        matches = value > rule.value;
        break;
      case 'gte':
        matches = value >= rule.value;
        break;
      case 'lt':
        matches = value < rule.value;
        break;
      case 'lte':
        matches = value <= rule.value;
        break;
      case 'eq':
        matches = value === rule.value;
        break;
    }
    if (matches) return rule.color;
  }
  return null;
}

function formatTimeAgo(iso: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 1000,
  );
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function WidgetContainerInner({
  widget,
  value,
  editMode = false,
  onConfigure,
  children,
  lastUpdated,
  className,
}: WidgetContainerProps) {
  const borderColor = useMemo(
    () => evaluateThresholdColor(value, widget.thresholds),
    [value, widget.thresholds],
  );

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-lg border overflow-hidden',
        'bg-surface-card border-border transition-all duration-normal',
        editMode && 'border-dashed border-accent',
        'hover:shadow-sm',
        className,
      )}
      style={
        borderColor
          ? { borderColor, borderStyle: 'solid', borderWidth: 2 }
          : undefined
      }
    >
      {/* Header -- 40px */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {editMode && (
            <span className="text-content-tertiary cursor-grab active:cursor-grabbing shrink-0">
              <svg
                width="10"
                height="14"
                viewBox="0 0 10 14"
                fill="currentColor"
              >
                <circle cx="2" cy="2" r="1.5" />
                <circle cx="8" cy="2" r="1.5" />
                <circle cx="2" cy="7" r="1.5" />
                <circle cx="8" cy="7" r="1.5" />
                <circle cx="2" cy="12" r="1.5" />
                <circle cx="8" cy="12" r="1.5" />
              </svg>
            </span>
          )}
          <h3 className="text-heading-md text-content-primary truncate">
            {widget.title}
          </h3>
        </div>
        {editMode && onConfigure && (
          <button
            onClick={onConfigure}
            className="p-1 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-elevated transition-colors duration-fast"
            aria-label="Configure widget"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Body -- fills remaining space */}
      <div className="flex-1 p-4 min-h-0 overflow-hidden">{children}</div>

      {/* Footer -- 28px */}
      {lastUpdated && (
        <div className="flex items-center justify-between h-7 px-4 border-t border-border shrink-0">
          <span className="text-caption text-content-tertiary">
            Updated {formatTimeAgo(lastUpdated)}
          </span>
        </div>
      )}
    </div>
  );
}

export const WidgetContainer = React.memo(WidgetContainerInner, (prev, next) => {
  return (
    prev.widget.id === next.widget.id &&
    prev.widget.title === next.widget.title &&
    prev.value === next.value &&
    prev.editMode === next.editMode &&
    prev.lastUpdated === next.lastUpdated &&
    prev.children === next.children
  );
});

WidgetContainer.displayName = 'WidgetContainer';
