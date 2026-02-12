'use client';

import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Skeleton Variants -- consistent loading states across all pages.
// All skeletons use the shimmer animation from globals.css or
// Tailwind animate-pulse with staggered delays.
// ---------------------------------------------------------------------------

// --- Base skeleton block ---------------------------------------------------

interface SkeletonBlockProps {
  className?: string;
  style?: React.CSSProperties;
}

function SkeletonBlock({ className, style }: SkeletonBlockProps) {
  return (
    <div
      className={cn('skeleton animate-pulse rounded-md', className)}
      style={style}
    />
  );
}

// ---------------------------------------------------------------------------
// TableSkeleton -- mimics DataTable with animated rows
// ---------------------------------------------------------------------------

export interface TableSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Number of columns */
  columns?: number;
  className?: string;
}

export function TableSkeleton({
  rows = 8,
  columns = 6,
  className,
}: TableSkeletonProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface-base',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center border-b border-border bg-surface-card px-4 py-3 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBlock
            key={`th-${i}`}
            className="h-3 flex-1"
            style={{ animationDelay: `${i * 75}ms` }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex items-center border-b border-border px-4 py-3.5 gap-4"
        >
          {Array.from({ length: columns }).map((_, colIdx) => {
            // Vary widths for realistic appearance
            const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-5/6', 'w-2/5'];
            const w = widths[(rowIdx + colIdx) % widths.length];

            return (
              <div key={`cell-${rowIdx}-${colIdx}`} className="flex-1">
                <SkeletonBlock
                  className={cn('h-4', w)}
                  style={{ animationDelay: `${(rowIdx * columns + colIdx) * 50}ms` }}
                />
              </div>
            );
          })}
        </div>
      ))}

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-border bg-surface-card px-4 py-3">
        <SkeletonBlock className="h-3 w-32" />
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock
              key={`pg-${i}`}
              className="h-8 w-8"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardGridSkeleton -- grid of shimmer cards
// ---------------------------------------------------------------------------

export interface CardGridSkeletonProps {
  /** Number of skeleton cards */
  count?: number;
  /** Grid columns (tailwind class) */
  gridCols?: string;
  className?: string;
}

export function CardGridSkeleton({
  count = 6,
  gridCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  className,
}: CardGridSkeletonProps) {
  return (
    <div className={cn('grid gap-4', gridCols, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`card-${i}`}
          className="rounded-xl border border-border bg-surface-card p-5 space-y-4"
        >
          {/* Card header */}
          <div className="flex items-center justify-between">
            <SkeletonBlock
              className="h-4 w-2/3"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            <SkeletonBlock
              className="h-6 w-6 rounded-full"
              style={{ animationDelay: `${i * 100 + 50}ms` }}
            />
          </div>

          {/* Card body lines */}
          <div className="space-y-2">
            <SkeletonBlock
              className="h-8 w-1/2"
              style={{ animationDelay: `${i * 100 + 100}ms` }}
            />
            <SkeletonBlock
              className="h-3 w-3/4"
              style={{ animationDelay: `${i * 100 + 150}ms` }}
            />
          </div>

          {/* Card footer */}
          <div className="flex gap-2">
            <SkeletonBlock
              className="h-6 w-16 rounded-full"
              style={{ animationDelay: `${i * 100 + 200}ms` }}
            />
            <SkeletonBlock
              className="h-6 w-16 rounded-full"
              style={{ animationDelay: `${i * 100 + 250}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimelineSkeleton -- horizontal bars for agent timeline
// ---------------------------------------------------------------------------

export interface TimelineSkeletonProps {
  /** Number of agent rows */
  rows?: number;
  className?: string;
}

export function TimelineSkeleton({ rows = 5, className }: TimelineSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Time header bar */}
      <div className="flex items-center gap-4 px-4 py-2">
        <SkeletonBlock className="h-3 w-24 shrink-0" />
        <div className="flex-1 flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock
              key={`time-${i}`}
              className="h-3 flex-1"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Agent rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`tl-row-${rowIdx}`} className="flex items-center gap-4 px-4">
          {/* Agent name */}
          <SkeletonBlock
            className="h-4 w-28 shrink-0"
            style={{ animationDelay: `${rowIdx * 100}ms` }}
          />

          {/* Timeline bars */}
          <div className="flex-1 flex gap-1 h-10 items-center">
            {Array.from({ length: 4 + (rowIdx % 3) }).map((_, barIdx) => {
              const widths = [60, 120, 80, 200, 100, 40, 160];
              const w = widths[(rowIdx + barIdx) % widths.length];

              return (
                <SkeletonBlock
                  key={`bar-${rowIdx}-${barIdx}`}
                  className="h-8 rounded-sm"
                  style={{
                    width: `${w}px`,
                    minWidth: `${w}px`,
                    animationDelay: `${(rowIdx * 5 + barIdx) * 75}ms`,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChartSkeleton -- rounded rectangle with wave pattern
// ---------------------------------------------------------------------------

export interface ChartSkeletonProps {
  /** Height of the chart area */
  height?: number;
  className?: string;
}

export function ChartSkeleton({ height = 256, className }: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface-card p-5 overflow-hidden',
        className,
      )}
    >
      {/* Chart title */}
      <div className="flex items-center justify-between mb-4">
        <SkeletonBlock className="h-4 w-32" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-6 w-16 rounded-full" style={{ animationDelay: '100ms' }} />
          <SkeletonBlock className="h-6 w-16 rounded-full" style={{ animationDelay: '200ms' }} />
        </div>
      </div>

      {/* Chart area with wave bars */}
      <div
        className="flex items-end gap-2"
        style={{ height }}
      >
        {Array.from({ length: 12 }).map((_, i) => {
          // Generate a wave pattern of heights
          const baseHeight = 0.4;
          const wave = Math.sin((i / 12) * Math.PI * 2) * 0.3 + baseHeight;
          const h = Math.max(0.15, Math.min(0.95, wave + (i % 3) * 0.1));

          return (
            <SkeletonBlock
              key={`chart-bar-${i}`}
              className="flex-1 rounded-t-md"
              style={{
                height: `${h * 100}%`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-2 mt-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock
            key={`x-${i}`}
            className="h-2.5 flex-1"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailPanelSkeleton -- for expanded row content (recording player, call details)
// ---------------------------------------------------------------------------

export interface DetailPanelSkeletonProps {
  className?: string;
}

export function DetailPanelSkeleton({ className }: DetailPanelSkeletonProps) {
  return (
    <div className={cn('space-y-4 p-4', className)}>
      {/* Event timeline bar */}
      <div className="flex gap-1 h-8">
        <SkeletonBlock className="h-full rounded-sm" style={{ width: '15%', animationDelay: '0ms' }} />
        <SkeletonBlock className="h-full rounded-sm" style={{ width: '35%', animationDelay: '100ms' }} />
        <SkeletonBlock className="h-full rounded-sm" style={{ width: '10%', animationDelay: '200ms' }} />
        <SkeletonBlock className="h-full rounded-sm" style={{ width: '25%', animationDelay: '300ms' }} />
        <SkeletonBlock className="h-full rounded-sm" style={{ width: '15%', animationDelay: '400ms' }} />
      </div>

      {/* Detail rows */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={`detail-${i}`} className="space-y-1.5">
            <SkeletonBlock
              className="h-3 w-16"
              style={{ animationDelay: `${i * 75}ms` }}
            />
            <SkeletonBlock
              className="h-4 w-24"
              style={{ animationDelay: `${i * 75 + 50}ms` }}
            />
          </div>
        ))}
      </div>

      {/* Waveform placeholder */}
      <div className="space-y-2">
        <SkeletonBlock className="h-3 w-20" style={{ animationDelay: '600ms' }} />
        <SkeletonBlock className="h-16 w-full rounded-lg" style={{ animationDelay: '700ms' }} />
        {/* Playback controls */}
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-8 w-8 rounded-full" style={{ animationDelay: '800ms' }} />
          <SkeletonBlock className="h-2 flex-1" style={{ animationDelay: '850ms' }} />
          <SkeletonBlock className="h-4 w-12" style={{ animationDelay: '900ms' }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardSkeleton -- full dashboard page skeleton
// ---------------------------------------------------------------------------

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`kpi-${i}`}
            className="rounded-xl border border-border bg-surface-card p-5"
          >
            <SkeletonBlock
              className="h-3 w-20 mb-3"
              style={{ animationDelay: `${i * 100}ms` }}
            />
            <SkeletonBlock
              className="h-8 w-24 mb-2"
              style={{ animationDelay: `${i * 100 + 50}ms` }}
            />
            <SkeletonBlock
              className="h-2.5 w-16"
              style={{ animationDelay: `${i * 100 + 100}ms` }}
            />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton height={200} />
        <ChartSkeleton height={200} />
      </div>

      {/* Table */}
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageSkeleton -- generic page skeleton with title + content
// ---------------------------------------------------------------------------

export interface PageSkeletonProps {
  children?: React.ReactNode;
  className?: string;
}

export function PageSkeleton({ children, className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Page title area */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-6 w-48" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-24 rounded-md" style={{ animationDelay: '100ms' }} />
          <SkeletonBlock className="h-9 w-24 rounded-md" style={{ animationDelay: '200ms' }} />
        </div>
      </div>

      {children ?? <TableSkeleton />}
    </div>
  );
}
