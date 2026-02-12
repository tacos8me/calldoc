'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// WebPageWidget -- embedded iframe for external content on wallboards
// ---------------------------------------------------------------------------

export interface WebPageWidgetProps {
  /** URL to embed */
  url?: string;
  /** Auto-refresh interval in seconds (0 = disabled) */
  refreshInterval?: number;
}

export function WebPageWidget({
  url,
  refreshInterval = 0,
}: WebPageWidgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setKey((k) => k + 1);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(handleRefresh, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, handleRefresh]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-content-tertiary">
        <Globe className="h-10 w-10 opacity-50" />
        <span className="text-caption">No URL configured</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full">
      {/* Refresh button */}
      <div className="absolute top-1 right-1 z-10">
        <button
          onClick={handleRefresh}
          className={cn(
            'p-1 rounded-md bg-surface-elevated/80 backdrop-blur-sm',
            'text-content-tertiary hover:text-content-primary',
            'transition-colors duration-fast',
          )}
          aria-label="Refresh page"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-base/80 z-10">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      )}

      {/* Sandboxed iframe */}
      <iframe
        ref={iframeRef}
        key={key}
        src={url}
        title="Embedded web page"
        className="flex-1 w-full border-0 rounded-sm"
        sandbox="allow-scripts allow-same-origin allow-popups"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
