'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSocket, type UseSocketReturn } from '@/lib/socket/client';
import { useCallStore } from '@/stores/call-store';
import { useAgentStore } from '@/stores/agent-store';
import { useUIStore } from '@/stores/ui-store';
import { useGroupStore } from '@/stores/group-store';
import { useNotificationStore } from '@/components/shared/notification-center';
import { startDemoMode, stopDemoMode, isDemoRunning } from '@/lib/demo/data';
import type { Call, AgentStateUpdate, GroupStats, AlertNotification, SystemStatus } from '@/types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface SocketContextValue extends UseSocketReturn {
  /** Number of events processed since connect */
  eventCount: number;
  /** ISO timestamp of the last received event */
  lastEventTimestamp: string | null;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function useSocketContext(): SocketContextValue | null {
  return useContext(SocketContext);
}

// ---------------------------------------------------------------------------
// Default rooms for the dashboard
// ---------------------------------------------------------------------------

const DEFAULT_ROOMS = ['calls', 'agents', 'groups'];

// ---------------------------------------------------------------------------
// Backpressure queue -- batch-process when events accumulate
// ---------------------------------------------------------------------------

interface QueuedEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

const MAX_QUEUE_SIZE = 100;
const BATCH_FLUSH_MS = 50;

// ---------------------------------------------------------------------------
// SocketProvider
// ---------------------------------------------------------------------------

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketReturn = useSocket(DEFAULT_ROOMS);
  const { isConnected, latency } = socketReturn;

  const prevConnected = useRef<boolean | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string | null>(null);

  // Backpressure queue
  const queueRef = useRef<QueuedEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track event for debugging
  const trackEvent = useCallback(() => {
    setEventCount((c) => c + 1);
    setLastEventTimestamp(new Date().toISOString());
  }, []);

  // Process a batch of queued events
  const flushQueue = useCallback(() => {
    const queue = queueRef.current;
    if (queue.length === 0) return;

    // Take all events from queue
    const batch = queue.splice(0, queue.length);

    // Process each event type
    for (const event of batch) {
      switch (event.type) {
        case 'call:update': {
          const call = event.data as Call;
          useCallStore.getState().upsertCall(call);
          break;
        }
        case 'call:end': {
          const { id } = event.data as { id: string };
          useCallStore.getState().removeCall(id);
          break;
        }
        case 'agent:state': {
          const data = event.data as AgentStateUpdate;
          useAgentStore.getState().updateAgentState(
            data.id,
            data.newState,
            data.timestamp,
            data.callId,
          );
          break;
        }
        case 'group:stats': {
          const data = event.data as GroupStats;
          useGroupStore.getState().updateGroup(data.groupId, {
            id: data.groupId,
            name: data.groupName,
            agentsAvailable: data.agentsAvailable,
            agentsBusy: data.agentsBusy,
            callsWaiting: data.callsWaiting,
            longestWait: data.longestWait,
            serviceLevelPercent: data.serviceLevel,
          });
          break;
        }
        case 'alert': {
          const data = event.data as AlertNotification;
          useNotificationStore.getState().add({
            type: 'alert',
            title: `Alert: ${data.metric}`,
            message: data.message,
            href: '/admin/settings',
          });
          break;
        }
        case 'system:status': {
          const data = event.data as SystemStatus;
          if (data.status === 'connected') {
            useUIStore.getState().setConnectionStatus('connected');
          } else if (data.status === 'disconnected') {
            useUIStore.getState().setConnectionStatus('disconnected');
          } else if (data.status === 'error') {
            useUIStore.getState().setConnectionStatus('disconnected');
          }
          break;
        }
      }
    }
  }, []);

  // Enqueue an event and schedule flush
  const enqueueEvent = useCallback(
    (type: string, data: unknown) => {
      trackEvent();

      const queue = queueRef.current;
      queue.push({ type, data, timestamp: Date.now() });

      // If queue is large, flush immediately (backpressure)
      if (queue.length >= MAX_QUEUE_SIZE) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        flushQueue();
        return;
      }

      // Otherwise schedule a batched flush
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushQueue();
        }, BATCH_FLUSH_MS);
      }
    },
    [trackEvent, flushQueue],
  );

  // Dispatch socket events to Zustand stores via custom DOM events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCallUpdate = (e: Event) => {
      const call = (e as CustomEvent<Call>).detail;
      enqueueEvent('call:update', call);
    };

    const handleCallEnd = (e: Event) => {
      const data = (e as CustomEvent<{ id: string }>).detail;
      enqueueEvent('call:end', data);
    };

    const handleAgentState = (e: Event) => {
      const data = (e as CustomEvent<AgentStateUpdate>).detail;
      enqueueEvent('agent:state', data);
    };

    const handleGroupStats = (e: Event) => {
      const data = (e as CustomEvent<GroupStats>).detail;
      enqueueEvent('group:stats', data);
    };

    const handleAlert = (e: Event) => {
      const data = (e as CustomEvent<AlertNotification>).detail;
      enqueueEvent('alert', data);
    };

    const handleSystemStatus = (e: Event) => {
      const data = (e as CustomEvent<SystemStatus>).detail;
      enqueueEvent('system:status', data);
    };

    window.addEventListener('calldoc:call:update', handleCallUpdate);
    window.addEventListener('calldoc:call:end', handleCallEnd);
    window.addEventListener('calldoc:agent:state', handleAgentState);
    window.addEventListener('calldoc:group:stats', handleGroupStats);
    window.addEventListener('calldoc:alert', handleAlert);
    window.addEventListener('calldoc:system:status', handleSystemStatus);

    return () => {
      window.removeEventListener('calldoc:call:update', handleCallUpdate);
      window.removeEventListener('calldoc:call:end', handleCallEnd);
      window.removeEventListener('calldoc:agent:state', handleAgentState);
      window.removeEventListener('calldoc:group:stats', handleGroupStats);
      window.removeEventListener('calldoc:alert', handleAlert);
      window.removeEventListener('calldoc:system:status', handleSystemStatus);

      // Clean up flush timer
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [enqueueEvent]);

  // Update uiStore connection status and latency
  useEffect(() => {
    const ui = useUIStore.getState();
    ui.setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    ui.setLatency(latency);
  }, [isConnected, latency]);

  // Show toast on disconnect/reconnect
  useEffect(() => {
    if (prevConnected.current === null) {
      // First render -- skip toast
      prevConnected.current = isConnected;
      return;
    }

    if (prevConnected.current && !isConnected) {
      toast.error('Connection lost', {
        description: 'Real-time updates paused. Attempting to reconnect...',
        duration: 8000,
      });
    } else if (!prevConnected.current && isConnected) {
      toast.success('Reconnected', {
        description: 'Real-time updates resumed.',
        duration: 4000,
      });
    }

    prevConnected.current = isConnected;
  }, [isConnected]);

  // Start demo mode when not connected to a live PBX after a brief delay
  useEffect(() => {
    if (isConnected) {
      // Connected to live PBX -- stop demo if running
      if (isDemoRunning()) {
        stopDemoMode();
      }
      return;
    }

    // Wait 3 seconds before starting demo mode (give socket time to connect)
    const timer = setTimeout(() => {
      if (!isDemoRunning()) {
        startDemoMode();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isConnected]);

  // Cleanup demo mode on unmount
  useEffect(() => {
    return () => {
      if (isDemoRunning()) {
        stopDemoMode();
      }
    };
  }, []);

  const contextValue: SocketContextValue = {
    ...socketReturn,
    eventCount,
    lastEventTimestamp,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}
