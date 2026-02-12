'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { cn } from '@/lib/utils';
import { GRID_CONFIG } from '@/lib/theme';
import { useWallboardStore } from '@/stores/wallboard-store';
import { WIDGET_REGISTRY } from '@/components/dashboard/widget-registry';
import type { Widget, WallboardConfig, LayoutItem } from '@/types';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// ---------------------------------------------------------------------------
// Fullscreen Wallboard Mode -- standalone page, no sidebar/topbar
// ---------------------------------------------------------------------------

const ResponsiveGridLayout = WidthProvider(Responsive);

/** Render widget in fullscreen mode with appropriate mock data */
function FullscreenWidgetRenderer({ widget }: { widget: Widget }) {
  const entry = WIDGET_REGISTRY[widget.type];
  if (!entry) return null;

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
      return <Component timezone={widget.config.timezone as string | undefined} showSeconds />;
    case 'marquee':
      return (
        <Component
          content={widget.config.content ?? 'Scrolling announcement text...'}
          scrollSpeed={widget.config.scrollSpeed ?? 60}
          fontSize={widget.config.fontSize ?? 20}
        />
      );
    case 'text':
      return (
        <Component
          content={widget.config.content ?? 'Text content...'}
          fontSize={widget.config.fontSize ?? 16}
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

export default function FullscreenWallboardPage() {
  const params = useParams();
  const router = useRouter();
  const wallboardId = params.id as string;
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const wallboards = useWallboardStore((s) => s.wallboards);
  const loadWallboards = useWallboardStore((s) => s.loadWallboards);
  const getWallboard = useWallboardStore((s) => s.getWallboard);

  const [showControls, setShowControls] = useState(true);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationInterval, setRotationInterval] = useState(30);

  // Load wallboards
  useEffect(() => {
    loadWallboards();
  }, [loadWallboards]);

  const wallboard = useMemo(
    () => getWallboard(wallboardId),
    [wallboardId, wallboards, getWallboard],
  );

  // Request fullscreen on mount
  useEffect(() => {
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Fullscreen might be blocked by browser
      });
    }
  }, []);

  // Hide cursor after 3s of inactivity
  useEffect(() => {
    function handleMouseMove() {
      setCursorHidden(false);
      setShowControls(true);

      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
      }

      cursorTimerRef.current = setTimeout(() => {
        setCursorHidden(true);
        setShowControls(false);
      }, 3000);
    }

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (cursorTimerRef.current) {
        clearTimeout(cursorTimerRef.current);
      }
    };
  }, []);

  // Escape to exit fullscreen and go back
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        router.push(`/wallboards/${wallboardId}`);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [router, wallboardId]);

  // Auto-rotation
  useEffect(() => {
    if (!rotationEnabled || wallboards.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % wallboards.length);
    }, rotationInterval * 1000);

    return () => clearInterval(interval);
  }, [rotationEnabled, rotationInterval, wallboards.length]);

  // Get the currently displayed wallboard (supports rotation)
  const displayWallboard = useMemo(() => {
    if (rotationEnabled && wallboards.length > 0) {
      return wallboards[currentIndex % wallboards.length];
    }
    return wallboard;
  }, [rotationEnabled, wallboards, currentIndex, wallboard]);

  // Make all layout items static
  const staticLayouts = useMemo(() => {
    if (!displayWallboard) return {};
    const result: Record<string, LayoutItem[]> = {};
    for (const [bp, items] of Object.entries(displayWallboard.layouts)) {
      result[bp] = items.map((item) => ({ ...item, static: true }));
    }
    return result;
  }, [displayWallboard]);

  if (!displayWallboard) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-body-md text-zinc-500">Wallboard not found</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative min-h-screen bg-black',
        cursorHidden && 'cursor-none',
      )}
    >
      {/* Wallboard content */}
      <div className="w-full min-h-screen">
        <ResponsiveGridLayout
          className="layout"
          layouts={staticLayouts}
          breakpoints={GRID_CONFIG.breakpoints}
          cols={GRID_CONFIG.cols}
          rowHeight={GRID_CONFIG.rowHeight}
          margin={GRID_CONFIG.margin as [number, number]}
          containerPadding={[16, 16] as [number, number]}
          isDraggable={false}
          isResizable={false}
          useCSSTransforms
        >
          {displayWallboard.widgets.map((widget) => {
            const isDecorative = ['box', 'ellipse', 'line'].includes(widget.type);

            return (
              <div
                key={widget.id}
                className={cn(
                  'rounded-lg overflow-hidden',
                  !isDecorative && 'bg-zinc-900 border border-zinc-800',
                )}
              >
                {isDecorative ? (
                  <FullscreenWidgetRenderer widget={widget} />
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center h-8 px-3 border-b border-zinc-800 shrink-0">
                      <span className="text-caption text-zinc-300 truncate font-medium">
                        {widget.title}
                      </span>
                    </div>
                    <div className="flex-1 p-2 min-h-0 overflow-hidden">
                      <FullscreenWidgetRenderer widget={widget} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>

      {/* Floating control bar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 flex items-center justify-between h-10 px-4',
          'bg-black/80 backdrop-blur-sm border-t border-zinc-800',
          'transition-opacity duration-smooth',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-4">
          <span className="text-caption text-zinc-500">
            ESC to exit
          </span>

          {/* Rotation controls */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rotationEnabled}
                onChange={(e) => setRotationEnabled(e.target.checked)}
                className="rounded border-zinc-600"
              />
              <span className="text-caption text-zinc-400">Auto-rotate</span>
            </label>
            {rotationEnabled && (
              <select
                value={rotationInterval}
                onChange={(e) => setRotationInterval(parseInt(e.target.value))}
                className="text-caption bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={120}>120s</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-caption text-zinc-500 font-medium">
            {displayWallboard.name}
          </span>
          <button
            onClick={() => router.push(`/wallboards/${wallboardId}/edit`)}
            className="text-caption text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Edit
          </button>
          <span className="text-caption text-zinc-600">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
