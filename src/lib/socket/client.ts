// ─── Socket.io Client Hook for React ─────────────────────────────────────────
// Provides a React hook (useSocket) for connecting to the Socket.io server,
// managing room subscriptions, and updating Zustand stores on events.

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/socket-events';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Return type for the useSocket hook.
 */
export interface UseSocketReturn {
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Current round-trip latency in milliseconds */
  latency: number;
  /** Subscribe to additional rooms */
  subscribe: (rooms: string[]) => void;
  /** Unsubscribe from rooms */
  unsubscribe: (rooms: string[]) => void;
  /** The raw Socket.io instance (for advanced use) */
  socket: TypedSocket | null;
}

// ─── Singleton Socket Management ─────────────────────────────────────────────
// The socket connection is shared across all components that call useSocket().
// We use a module-level ref to ensure only one connection exists.

let globalSocket: TypedSocket | null = null;
let refCount = 0;

/**
 * Get or create the singleton Socket.io connection.
 */
function getOrCreateSocket(): TypedSocket {
  if (!globalSocket) {
    const url = typeof window !== 'undefined' ? window.location.origin : '';

    globalSocket = io(url, {
      // Send session cookies for authentication
      withCredentials: true,
      // Prefer WebSocket, fall back to polling
      transports: ['websocket', 'polling'],
      // Auto-reconnect with backoff
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      // Timeout for initial connection
      timeout: 10000,
    });
  }

  refCount++;
  return globalSocket;
}

/**
 * Release a reference to the singleton socket.
 * When all consumers disconnect, the socket is closed.
 */
function releaseSocket(): void {
  refCount--;
  if (refCount <= 0 && globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
    refCount = 0;
  }
}

/**
 * React hook for Socket.io connectivity.
 *
 * Provides a singleton Socket.io connection shared across all components.
 * Manages room subscriptions (join/leave based on `rooms` parameter),
 * tracks connection status and latency, and dispatches events to Zustand stores.
 *
 * @param rooms - Optional list of rooms to subscribe to.
 *                Common rooms: 'calls', 'agents', 'groups', 'call:{id}', 'agent:{id}'
 * @returns Connection state and subscription management functions
 *
 * @example
 * ```tsx
 * function LiveCallBoard() {
 *   const { isConnected, latency, subscribe } = useSocket(['calls', 'agents']);
 *
 *   return (
 *     <div>
 *       <span>{isConnected ? 'Live' : 'Disconnected'}</span>
 *       <span>Latency: {latency}ms</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSocket(rooms?: string[]): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const socketRef = useRef<TypedSocket | null>(null);
  const currentRoomsRef = useRef<Set<string>>(new Set());
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to rooms
  const subscribe = useCallback((newRooms: string[]) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const toJoin = newRooms.filter((r) => !currentRoomsRef.current.has(r));
    if (toJoin.length > 0) {
      socket.emit('subscribe', toJoin);
      toJoin.forEach((r) => currentRoomsRef.current.add(r));
    }
  }, []);

  // Unsubscribe from rooms
  const unsubscribe = useCallback((roomsToLeave: string[]) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const toLeave = roomsToLeave.filter((r) => currentRoomsRef.current.has(r));
    if (toLeave.length > 0) {
      socket.emit('unsubscribe', toLeave);
      toLeave.forEach((r) => currentRoomsRef.current.delete(r));
    }
  }, []);

  useEffect(() => {
    const socket = getOrCreateSocket();
    socketRef.current = socket;

    // ── Connection events ──
    const onConnect = () => {
      setIsConnected(true);

      // Re-subscribe to rooms on reconnect
      const allRooms = Array.from(currentRoomsRef.current);
      if (allRooms.length > 0) {
        socket.emit('subscribe', allRooms);
      }

      // Start heartbeat ping
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        socket.emit('ping', { timestamp: Date.now() });
      }, 15_000);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };

    // ── Server events (update stores) ──
    const onCallUpdate = (data: Parameters<ServerToClientEvents['call:update']>[0]) => {
      // Zustand stores will be imported dynamically to avoid circular deps
      // in a real implementation. For now, we emit a custom DOM event
      // that stores can listen to.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calldoc:call:update', { detail: data }));
      }
    };

    const onCallEnd = (data: Parameters<ServerToClientEvents['call:end']>[0]) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calldoc:call:end', { detail: data }));
      }
    };

    const onAgentState = (data: Parameters<ServerToClientEvents['agent:state']>[0]) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calldoc:agent:state', { detail: data }));
      }
    };

    const onGroupStats = (data: Parameters<ServerToClientEvents['group:stats']>[0]) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calldoc:group:stats', { detail: data }));
      }
    };

    const onSystemStatus = (data: Parameters<ServerToClientEvents['system:status']>[0]) => {
      // Extract latency from heartbeat response
      if (data.service === 'socket' && data.details?.latency != null) {
        setLatency(data.details.latency as number);
      }
    };

    const onAlert = (data: Parameters<ServerToClientEvents['alert']>[0]) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('calldoc:alert', { detail: data }));
      }
    };

    // Register event handlers
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('call:update', onCallUpdate);
    socket.on('call:end', onCallEnd);
    socket.on('agent:state', onAgentState);
    socket.on('group:stats', onGroupStats);
    socket.on('system:status', onSystemStatus);
    socket.on('alert', onAlert);

    // If already connected (e.g. hot reload), trigger connect handler
    if (socket.connected) {
      onConnect();
    }

    // Subscribe to initial rooms
    if (rooms && rooms.length > 0) {
      rooms.forEach((r) => currentRoomsRef.current.add(r));
      if (socket.connected) {
        socket.emit('subscribe', rooms);
      }
    }

    // ── Cleanup ──
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('call:update', onCallUpdate);
      socket.off('call:end', onCallEnd);
      socket.off('agent:state', onAgentState);
      socket.off('group:stats', onGroupStats);
      socket.off('system:status', onSystemStatus);
      socket.off('alert', onAlert);

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Unsubscribe from rooms
      const allRooms = Array.from(currentRoomsRef.current);
      if (allRooms.length > 0 && socket.connected) {
        socket.emit('unsubscribe', allRooms);
      }
      currentRoomsRef.current.clear();

      socketRef.current = null;
      releaseSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle room changes after initial mount
  useEffect(() => {
    if (!socketRef.current?.connected || !rooms) return;

    const desired = new Set(rooms);
    const current = currentRoomsRef.current;

    // Join new rooms
    const toJoin = rooms.filter((r) => !current.has(r));
    if (toJoin.length > 0) {
      socketRef.current.emit('subscribe', toJoin);
      toJoin.forEach((r) => current.add(r));
    }

    // Leave rooms no longer desired
    const toLeave = Array.from(current).filter((r) => !desired.has(r));
    if (toLeave.length > 0) {
      socketRef.current.emit('unsubscribe', toLeave);
      toLeave.forEach((r) => current.delete(r));
    }
  }, [rooms]);

  return {
    isConnected,
    latency,
    subscribe,
    unsubscribe,
    socket: socketRef.current,
  };
}
