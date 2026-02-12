'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// useServiceWorker -- Registers SW, tracks online/offline status.
//
// Features:
// - Registers service worker on mount (production only)
// - Tracks online/offline status via navigator.onLine + events
// - Provides methods to clear cache and retry queued mutations
// - Notifies when queued mutations are retried after coming back online
//
// This is NOT a full PWA -- just connection resilience and caching.
// ---------------------------------------------------------------------------

export interface ServiceWorkerState {
  /** Whether the service worker is registered and active */
  isRegistered: boolean;
  /** Whether the app has network connectivity */
  isOnline: boolean;
  /** Whether the SW is currently updating */
  isUpdating: boolean;
  /** Number of mutations waiting in the retry queue */
  pendingMutations: number;
  /** Error message if SW registration failed */
  error: string | null;
}

export interface ServiceWorkerActions {
  /** Manually trigger retry of queued mutations */
  retryMutations: () => void;
  /** Clear all service worker caches */
  clearCache: () => void;
  /** Check for SW updates */
  checkForUpdate: () => Promise<void>;
}

export type UseServiceWorkerReturn = ServiceWorkerState & ServiceWorkerActions;

export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdating: false,
    pendingMutations: 0,
    error: null,
  });

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Register service worker on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Only register in production or when explicitly enabled
    const shouldRegister =
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENABLE_SW === 'true';

    if (!shouldRegister) return;

    let isActive = true;

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        if (!isActive) return;

        registrationRef.current = registration;

        setState((s) => ({ ...s, isRegistered: true, error: null }));

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          setState((s) => ({ ...s, isUpdating: true }));

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              setState((s) => ({ ...s, isUpdating: false }));
            }
          });
        });
      } catch (err) {
        if (!isActive) return;
        setState((s) => ({
          ...s,
          error:
            err instanceof Error
              ? err.message
              : 'Service worker registration failed',
        }));
      }
    }

    register();

    return () => {
      isActive = false;
    };
  }, []);

  // Online/offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleOnline() {
      setState((s) => ({ ...s, isOnline: true }));
      // Automatically retry queued mutations when coming back online
      if (registrationRef.current?.active) {
        registrationRef.current.active.postMessage({
          type: 'RETRY_MUTATIONS',
        });
      }
    }

    function handleOffline() {
      setState((s) => ({ ...s, isOnline: false }));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for messages from the service worker
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'MUTATIONS_RETRIED') {
        setState((s) => ({
          ...s,
          pendingMutations: Math.max(
            0,
            s.pendingMutations - (event.data.count ?? 0),
          ),
        }));
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Actions
  const retryMutations = useCallback(() => {
    if (registrationRef.current?.active) {
      registrationRef.current.active.postMessage({
        type: 'RETRY_MUTATIONS',
      });
    }
  }, []);

  const clearCache = useCallback(() => {
    if (registrationRef.current?.active) {
      registrationRef.current.active.postMessage({
        type: 'CLEAR_CACHE',
      });
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (registrationRef.current) {
      await registrationRef.current.update();
    }
  }, []);

  return {
    ...state,
    retryMutations,
    clearCache,
    checkForUpdate,
  };
}

// ---------------------------------------------------------------------------
// OfflineBanner -- Shown when the app loses network connectivity.
// Uses the useServiceWorker hook for status detection.
// ---------------------------------------------------------------------------

// Export a component-compatible function (used in layout)
export function useOfflineStatus(): {
  isOffline: boolean;
  pendingMutations: number;
} {
  const { isOnline, pendingMutations } = useServiceWorker();
  return {
    isOffline: !isOnline,
    pendingMutations,
  };
}
