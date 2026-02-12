'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Responsive, WidthProvider } from 'react-grid-layout';
import {
  ArrowLeft,
  Edit3,
  Maximize,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRID_CONFIG } from '@/lib/theme';
import { useWallboardStore } from '@/stores/wallboard-store';
import { WIDGET_REGISTRY } from '@/components/dashboard/widget-registry';
import type { Widget, LayoutItem } from '@/types';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// ---------------------------------------------------------------------------
// Wallboard Viewer Page -- read-only display of a saved wallboard
// ---------------------------------------------------------------------------

const ResponsiveGridLayout = WidthProvider(Responsive);

/** Render a widget by type with appropriate mock data */
function ViewerWidgetRenderer({ widget }: { widget: Widget }) {
  const entry = WIDGET_REGISTRY[widget.type];
  if (!entry) return <div className="text-content-tertiary text-caption">Unknown widget</div>;

  const Component = entry.component;

  switch (widget.type) {
    case 'title-value':
      return <Component value={Math.floor(Math.random() * 50) + 5} label={widget.config.metric ?? ''} />;
    case 'gauge':
      return <Component value={72} max={100} label={widget.config.metric ?? 'Metric'} thresholds={{ warning: 60, critical: 80 }} />;
    case 'chart':
      return (
        <Component
          chartType={widget.config.chartType ?? 'bar'}
          data={[
            { label: '8AM', calls: 12 },
            { label: '9AM', calls: 24 },
            { label: '10AM', calls: 35 },
            { label: '11AM', calls: 28 },
            { label: '12PM', calls: 18 },
            { label: '1PM', calls: 30 },
          ]}
        />
      );
    case 'clock':
      return <Component timezone={widget.config.timezone as string | undefined} />;
    case 'marquee':
      return (
        <Component
          content={widget.config.content ?? 'Scrolling announcement text...'}
          scrollSpeed={widget.config.scrollSpeed ?? 60}
          fontSize={widget.config.fontSize}
        />
      );
    case 'text':
      return (
        <Component
          content={widget.config.content ?? 'Text content...'}
          fontSize={widget.config.fontSize}
          textAlign={widget.config.textAlign as 'left' | 'center' | 'right' | undefined}
          textColor={widget.config.foregroundColor}
        />
      );
    case 'image':
      return <Component url={widget.config.url} alt={widget.title} />;
    case 'web-page':
      return <Component url={widget.config.url} refreshInterval={widget.config.refreshInterval} />;
    case 'leaderboard':
      return <Component maxItems={widget.config.maxItems ?? 10} />;
    case 'pie-chart':
      return <Component />;
    case 'group-box':
      return <Component />;
    case 'agent-box':
      return <Component groupId={widget.config.groups?.[0]} />;
    case 'active-calls':
      return <Component />;
    case 'box':
      return (
        <div className="h-full w-full rounded-lg" style={{
          backgroundColor: (widget.config.backgroundColor as string) ?? 'transparent',
          border: `${(widget.config.borderWidth as number) ?? 1}px solid ${(widget.config.borderColor as string) ?? '#3F3F46'}`,
          opacity: (widget.config.opacity as number) ?? 1,
        }} />
      );
    case 'ellipse':
      return (
        <div className="h-full w-full" style={{
          borderRadius: '50%',
          backgroundColor: (widget.config.backgroundColor as string) ?? 'transparent',
          border: `${(widget.config.borderWidth as number) ?? 1}px solid ${(widget.config.borderColor as string) ?? '#3F3F46'}`,
          opacity: (widget.config.opacity as number) ?? 1,
        }} />
      );
    case 'line':
      return (
        <div className="flex items-center justify-center h-full w-full">
          <div style={{
            width: '100%',
            height: `${(widget.config.borderWidth as number) ?? 1}px`,
            backgroundColor: (widget.config.borderColor as string) ?? '#3F3F46',
            opacity: (widget.config.opacity as number) ?? 1,
          }} />
        </div>
      );
    default:
      return <Component />;
  }
}

export default function WallboardViewerPage() {
  const params = useParams();
  const router = useRouter();
  const wallboardId = params.id as string;

  const wallboards = useWallboardStore((s) => s.wallboards);
  const loadWallboards = useWallboardStore((s) => s.loadWallboards);
  const getWallboard = useWallboardStore((s) => s.getWallboard);

  useEffect(() => {
    loadWallboards();
  }, [loadWallboards]);

  const wallboard = useMemo(
    () => getWallboard(wallboardId),
    [wallboardId, wallboards, getWallboard],
  );

  const handleFullscreen = useCallback(() => {
    router.push(`/wallboard/${wallboardId}`);
  }, [router, wallboardId]);

  if (!wallboard) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-body-md text-content-tertiary">Wallboard not found</p>
        <button
          onClick={() => router.push('/wallboards')}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-surface-elevated text-content-secondary hover:text-content-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Wallboards
        </button>
      </div>
    );
  }

  // Make all layout items static (no drag/resize)
  const staticLayouts = useMemo(() => {
    const result: Record<string, LayoutItem[]> = {};
    for (const [bp, items] of Object.entries(wallboard.layouts)) {
      result[bp] = items.map((item) => ({ ...item, static: true }));
    }
    return result;
  }, [wallboard.layouts]);

  return (
    <div className="flex flex-col gap-0 -m-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-surface-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/wallboards')}
            className="p-1.5 rounded-md text-content-tertiary hover:text-content-primary hover:bg-surface-elevated transition-colors"
            aria-label="Back to wallboards"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-heading-md text-content-primary">{wallboard.name}</h1>
          <span className="text-caption text-content-tertiary">
            {wallboard.widgets.length} widgets
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/wallboards/${wallboardId}/edit`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={handleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-sm bg-accent text-white hover:bg-accent-hover transition-colors font-medium"
          >
            <Maximize className="h-4 w-4" />
            Fullscreen
          </button>
        </div>
      </div>

      {/* Wallboard content */}
      <div className="flex-1 bg-surface-base p-4">
        <ResponsiveGridLayout
          className="layout"
          layouts={staticLayouts}
          breakpoints={GRID_CONFIG.breakpoints}
          cols={GRID_CONFIG.cols}
          rowHeight={GRID_CONFIG.rowHeight}
          margin={GRID_CONFIG.margin as [number, number]}
          containerPadding={GRID_CONFIG.containerPadding as [number, number]}
          isDraggable={false}
          isResizable={false}
          useCSSTransforms
        >
          {wallboard.widgets.map((widget) => {
            const isDecorative = ['box', 'ellipse', 'line'].includes(widget.type);

            return (
              <div
                key={widget.id}
                className={cn(
                  'rounded-lg overflow-hidden',
                  !isDecorative && 'bg-surface-card border border-border',
                )}
              >
                {isDecorative ? (
                  <ViewerWidgetRenderer widget={widget} />
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center h-8 px-3 border-b border-border shrink-0">
                      <span className="text-caption text-content-primary truncate font-medium">
                        {widget.title}
                      </span>
                    </div>
                    <div className="flex-1 p-2 min-h-0 overflow-hidden">
                      <ViewerWidgetRenderer widget={widget} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </ResponsiveGridLayout>

        {wallboard.widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-body-md text-content-tertiary">This wallboard has no widgets.</p>
            <button
              onClick={() => router.push(`/wallboards/${wallboardId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors text-body-sm font-medium"
            >
              <Edit3 className="h-4 w-4" />
              Add Widgets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
