'use client';

import { WifiOff } from 'lucide-react';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// OfflineBanner -- Sticky banner shown when the app loses network.
// Automatically hides when connectivity returns. Informs users about
// queued mutations that will be retried.
// ---------------------------------------------------------------------------

export function OfflineBanner() {
  const { isOnline, pendingMutations, retryMutations } = useServiceWorker();

  if (isOnline) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-3',
        'bg-status-warning/90 backdrop-blur-sm px-4 py-2.5',
        'text-body-sm font-medium text-black',
        'animate-slide-up',
      )}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        You are currently offline.
        {pendingMutations > 0 && (
          <>
            {' '}
            {pendingMutations} pending {pendingMutations === 1 ? 'change' : 'changes'} will
            be saved when reconnected.
          </>
        )}
      </span>
      {pendingMutations > 0 && (
        <button
          onClick={retryMutations}
          className="rounded-md bg-black/20 px-2.5 py-1 text-caption font-semibold hover:bg-black/30 transition-colors"
        >
          Retry now
        </button>
      )}
    </div>
  );
}
