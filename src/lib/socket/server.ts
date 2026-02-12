// ─── Socket.io Server ────────────────────────────────────────────────────────
// Sets up the Socket.io server that bridges Redis pub/sub events to
// connected browser clients. Handles room-based subscriptions, event
// batching, authentication, and heartbeat.

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  GroupStats,
} from '@/types/socket-events';
import {
  REDIS_CHANNELS,
  type CallEventMessage,
  type AgentStateMessage,
  type GroupStatsMessage,
} from '@/types/redis-events';

/** Batch interval for coalescing events before emitting (ms). */
const BATCH_INTERVAL_MS = 100;

/**
 * Configuration for the Socket.io server.
 */
export interface SocketServerConfig {
  /** Redis connection URL for subscribing to pub/sub channels */
  redisUrl?: string;
  /** CORS origin for Socket.io (default: all origins in dev) */
  corsOrigin?: string | string[];
  /** Session validation function. Return true to allow connection. */
  validateSession?: (cookie: string) => Promise<boolean>;
}

/**
 * Pending events accumulated during a batch interval.
 */
interface EventBatch {
  /** call:update events keyed by call ID (latest wins) */
  callUpdates: Map<string, CallEventMessage>;
  /** call:end events keyed by call ID */
  callEnds: Map<string, { id: string }>;
  /** agent:state events keyed by agent ID (latest wins) */
  agentStates: Map<string, AgentStateMessage>;
  /** group:stats events keyed by group ID (latest wins) */
  groupStats: Map<string, GroupStatsMessage>;
}

/**
 * Create and configure the Socket.io server.
 *
 * Attaches to an existing HTTP server (from Next.js), sets up
 * authentication middleware, room management, Redis subscription,
 * and event batching.
 *
 * @param httpServer - The Node.js HTTP server (from Next.js)
 * @param config     - Socket server configuration
 * @returns The configured Socket.io server instance
 *
 * @example
 * ```ts
 * import { createServer } from 'http';
 * import { createSocketServer } from '@/lib/socket/server';
 *
 * const httpServer = createServer(app);
 * const io = createSocketServer(httpServer, {
 *   redisUrl: 'redis://localhost:6379',
 *   validateSession: async (cookie) => verifySessionCookie(cookie),
 * });
 * ```
 */
export function createSocketServer(
  httpServer: HttpServer,
  config: SocketServerConfig = {}
): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.corsOrigin ?? '*',
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
    transports: ['websocket', 'polling'],
  });

  // ─── Authentication Middleware ───────────────────────────────────────────
  if (config.validateSession) {
    const validate = config.validateSession;

    io.use(async (socket, next) => {
      try {
        const cookie = socket.handshake.headers.cookie ?? '';
        const isValid = await validate(cookie);

        if (!isValid) {
          log(`Auth failed for ${socket.id} from ${socket.handshake.address}`);
          next(new Error('Authentication failed'));
          return;
        }

        log(`Auth passed for ${socket.id}`);
        next();
      } catch (err) {
        log(`Auth error for ${socket.id}: ${err instanceof Error ? err.message : err}`);
        next(new Error('Authentication error'));
      }
    });
  }

  // ─── Redis Subscriber ───────────────────────────────────────────────────
  const redisUrl = config.redisUrl ?? 'redis://localhost:6379';
  const subscriber = new Redis(redisUrl, {
    retryStrategy: (times) => Math.min(times * 500, 5000),
    maxRetriesPerRequest: null, // Subscriber mode needs this
    lazyConnect: true,
  });

  // Event batch accumulator
  let batch: EventBatch = createEmptyBatch();
  let batchTimer: ReturnType<typeof setTimeout> | null = null;

  // Connect and subscribe to Redis channels
  subscriber
    .connect()
    .then(() => {
      log('Redis subscriber connected');
      return subscriber.subscribe(
        REDIS_CHANNELS.calls,
        REDIS_CHANNELS.agents,
        REDIS_CHANNELS.groups
      );
    })
    .then(() => {
      log('Subscribed to Redis channels');
    })
    .catch((err) => {
      log(`Redis subscriber error: ${err.message}`);
    });

  // Handle Redis messages
  subscriber.on('message', (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);
      accumulateEvent(channel, data);
    } catch (err) {
      log(`Error parsing Redis message: ${err instanceof Error ? err.message : err}`);
    }
  });

  /**
   * Accumulate an event into the current batch.
   * Events of the same type and key are deduplicated (latest wins).
   */
  function accumulateEvent(channel: string, data: unknown): void {
    if (channel === REDIS_CHANNELS.calls) {
      const msg = data as unknown as CallEventMessage;
      if (msg.type === 'call:ended') {
        batch.callEnds.set(msg.callId, { id: msg.callId });
        batch.callUpdates.delete(msg.callId);
      } else {
        batch.callUpdates.set(msg.callId, msg);
      }
    } else if (channel === REDIS_CHANNELS.agents) {
      const msg = data as unknown as AgentStateMessage;
      batch.agentStates.set(msg.agentId, msg);
    } else if (channel === REDIS_CHANNELS.groups) {
      const msg = data as unknown as GroupStatsMessage;
      batch.groupStats.set(msg.groupId, msg);
    }

    // Schedule flush if not already scheduled
    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        flushBatch();
      }, BATCH_INTERVAL_MS);
    }
  }

  /**
   * Flush the accumulated batch: emit all events to appropriate Socket.io rooms.
   */
  function flushBatch(): void {
    batchTimer = null;

    const currentBatch = batch;
    batch = createEmptyBatch();

    // Emit call updates
    for (const [callId, msg] of currentBatch.callUpdates) {
      if (msg.data) {
        // Emit to 'calls' room (all calls) and specific call room
        // The CallEventMessage.data is Partial<Call> but contains all fields for created/updated
        const callData = msg.data as Parameters<ServerToClientEvents['call:update']>[0];
        io.to('calls').emit('call:update', callData);
        io.to(`call:${callId}`).emit('call:update', callData);
      }
    }

    // Emit call ends
    for (const [callId, data] of currentBatch.callEnds) {
      io.to('calls').emit('call:end', data);
      io.to(`call:${callId}`).emit('call:end', data);
    }

    // Emit agent states
    for (const [agentId, msg] of currentBatch.agentStates) {
      io.to('agents').emit('agent:state', {
        id: msg.agentId,
        extension: msg.extension,
        previousState: msg.previousState,
        newState: msg.newState,
        timestamp: msg.timestamp,
        callId: msg.callId,
      });
      io.to(`agent:${agentId}`).emit('agent:state', {
        id: msg.agentId,
        extension: msg.extension,
        previousState: msg.previousState,
        newState: msg.newState,
        timestamp: msg.timestamp,
        callId: msg.callId,
      });
    }

    // Emit group stats
    for (const [groupId, msg] of currentBatch.groupStats) {
      const stats: GroupStats = {
        groupId: msg.groupId,
        groupName: msg.groupId, // Will be enriched by the service layer
        agentsAvailable: msg.agentsAvailable,
        agentsBusy: msg.agentsBusy,
        callsWaiting: msg.callsWaiting,
        longestWait: msg.longestWait,
        serviceLevel: 0, // Computed externally
      };
      io.to('groups').emit('group:stats', stats);
      io.to(`group:${groupId}`).emit('group:stats', stats);
    }
  }

  // ─── Connection Handling ────────────────────────────────────────────────
  io.on('connection', (socket) => {
    log(`Client connected: ${socket.id} from ${socket.handshake.address}`);

    // ── Room subscription management ──
    socket.on('subscribe', (rooms: string[]) => {
      for (const room of rooms) {
        socket.join(room);
        log(`${socket.id} joined room: ${room}`);
      }
    });

    socket.on('unsubscribe', (rooms: string[]) => {
      for (const room of rooms) {
        socket.leave(room);
        log(`${socket.id} left room: ${room}`);
      }
    });

    // ── Heartbeat / latency measurement ──
    socket.on('ping', (data: { timestamp: number }) => {
      const now = Date.now();
      const latency = now - data.timestamp;
      // Socket.io has built-in acknowledgements; we emit back as a regular event
      // The client measures round-trip time from its own timestamp
      socket.emit('system:status', {
        service: 'socket',
        status: 'connected',
        lastChecked: new Date().toISOString(),
        details: {
          latency,
          serverTime: now,
        },
      });
    });

    // ── Disconnection ──
    socket.on('disconnect', (reason) => {
      log(`Client disconnected: ${socket.id} (${reason})`);
    });
  });

  // ─── Cleanup on server close ──────────────────────────────────────────
  httpServer.on('close', () => {
    if (batchTimer) clearTimeout(batchTimer);
    subscriber.unsubscribe().catch(() => {});
    subscriber.quit().catch(() => {});
    log('Socket server shutting down');
  });

  log('Socket.io server initialized');
  return io;
}

/**
 * Create an empty event batch.
 */
function createEmptyBatch(): EventBatch {
  return {
    callUpdates: new Map(),
    callEnds: new Map(),
    agentStates: new Map(),
    groupStats: new Map(),
  };
}

/**
 * Internal logging helper.
 */
function log(message: string): void {
  console.log(`[${new Date().toISOString()}] [Socket.io] ${message}`);
}
