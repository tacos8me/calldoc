'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

// ---------------------------------------------------------------------------
// ConnectionIndicator -- top bar connection status + latency display
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  connected: {
    dotClass: 'bg-status-success',
    glowClass: 'shadow-[0_0_6px_rgba(34,197,94,0.5)]',
    label: 'Connected',
    animate: 'animate-pulse',
  },
  connecting: {
    dotClass: 'bg-status-warning',
    glowClass: 'shadow-[0_0_6px_rgba(234,179,8,0.5)]',
    label: 'Reconnecting...',
    animate: 'animate-pulse-fast',
  },
  disconnected: {
    dotClass: 'bg-status-danger',
    glowClass: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]',
    label: 'Disconnected',
    animate: 'animate-pulse-fast',
  },
} as const;

export interface ConnectionIndicatorProps {
  className?: string;
}

export function ConnectionIndicator({ className }: ConnectionIndicatorProps) {
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const latency = useUIStore((s) => s.latency);

  const config = STATUS_CONFIG[connectionStatus];

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${config.label}${connectionStatus === 'connected' && latency > 0 ? `, latency ${latency}ms` : ''}`}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full shrink-0',
          config.dotClass,
          config.glowClass,
          config.animate,
        )}
      />
      <span className="text-caption text-content-secondary whitespace-nowrap">
        {config.label}
      </span>
      {connectionStatus === 'connected' && latency > 0 && (
        <span className="text-mono-sm text-content-tertiary font-mono">
          {latency}ms
        </span>
      )}
    </div>
  );
}
