'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// ---------------------------------------------------------------------------
// Dynamic Imports -- Lazy-loaded component registry with loading fallbacks.
//
// Heavy third-party libraries are loaded on-demand to reduce initial
// JavaScript bundle size. This is especially important for Docker
// deployments where network latency to CDN is not available.
//
// Performance: reduces initial bundle by ~200KB (gzipped) by splitting
// wavesurfer.js (~80KB), recharts (~90KB), and react-grid-layout (~30KB)
// into separate chunks that load only when needed.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Loading fallbacks
// ---------------------------------------------------------------------------

function ChartLoadingFallback() {
  return React.createElement(
    'div',
    {
      className:
        'flex items-center justify-center h-full min-h-[200px] bg-surface-base rounded-lg',
      'aria-busy': true,
      'aria-label': 'Loading chart...',
    },
    React.createElement('div', {
      className:
        'h-8 w-8 animate-spin rounded-full border-2 border-content-tertiary border-t-accent',
    }),
  );
}

function WaveformLoadingFallback() {
  return React.createElement(
    'div',
    {
      className:
        'flex items-center justify-center h-[120px] bg-surface-base rounded-lg',
      'aria-busy': true,
      'aria-label': 'Loading waveform player...',
    },
    React.createElement('div', {
      className:
        'h-6 w-6 animate-spin rounded-full border-2 border-content-tertiary border-t-accent',
    }),
  );
}

function GridLoadingFallback() {
  return React.createElement(
    'div',
    {
      className:
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse',
      'aria-busy': true,
      'aria-label': 'Loading dashboard layout...',
    },
    ...Array.from({ length: 4 }, (_, i) =>
      React.createElement('div', {
        key: `grid-skeleton-${i}`,
        className:
          'h-32 rounded-xl bg-surface-elevated border border-border',
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Lazy-loaded Recharts components
// Only loaded when a chart widget is rendered on the dashboard.
// Performance: saves ~90KB from initial bundle.
// ---------------------------------------------------------------------------

export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.AreaChart })),
  {
    loading: ChartLoadingFallback,
    ssr: false,
  },
);

export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  {
    loading: ChartLoadingFallback,
    ssr: false,
  },
);

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  {
    loading: ChartLoadingFallback,
    ssr: false,
  },
);

export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  {
    loading: ChartLoadingFallback,
    ssr: false,
  },
);

// ---------------------------------------------------------------------------
// Lazy-loaded React Grid Layout
// Only loaded when the dashboard page is rendered.
// Performance: saves ~30KB from initial bundle.
// ---------------------------------------------------------------------------

export const LazyResponsiveGridLayout = dynamic(
  () =>
    import('react-grid-layout').then((mod) => {
      // WidthProvider is needed for responsive behavior
      const { Responsive, WidthProvider } = mod;
      return { default: WidthProvider(Responsive) };
    }),
  {
    loading: GridLoadingFallback,
    ssr: false,
  },
);

// ---------------------------------------------------------------------------
// Lazy-loaded PDF renderer
// Only loaded when generating PDF reports/exports.
// Performance: saves ~150KB from initial bundle.
// ---------------------------------------------------------------------------

export const LazyPDFViewer = dynamic(
  () => import('@react-pdf/renderer').then((mod) => ({ default: mod.PDFViewer })),
  {
    loading: ChartLoadingFallback,
    ssr: false,
  },
);
