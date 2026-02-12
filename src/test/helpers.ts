// ─── Test Utilities & Factories ──────────────────────────────────────────────
// Provides mock data factories and mock service objects for unit tests.

import { vi } from 'vitest';
import type { Call, CallDirection, CallState } from '@/types/calls';
import type { Agent, AgentState } from '@/types/agents';
import type { Recording, RecordingFormat } from '@/types/recordings';

// ---------------------------------------------------------------------------
// Mock Data Factories
// ---------------------------------------------------------------------------

let callCounter = 1000000;
let agentCounter = 100;
let recordingCounter = 1;

/**
 * Create a mock Call object with realistic defaults.
 * All fields can be overridden via the partial parameter.
 */
export function createMockCall(overrides: Partial<Call> = {}): Call {
  const id = `call-${++callCounter}`;
  const now = new Date().toISOString();

  return {
    id,
    direction: 'inbound' as CallDirection,
    state: 'connected' as CallState,
    callerNumber: '+44207555' + String(callCounter).slice(-4),
    callerName: 'External Caller',
    calledNumber: '201',
    calledName: 'Reception',
    queueName: 'Sales',
    queueEntryTime: now,
    agentExtension: '201',
    agentName: 'John Smith',
    trunkId: 'T9001',
    startTime: now,
    answerTime: now,
    endTime: null,
    duration: 120,
    holdCount: 0,
    holdDuration: 0,
    transferCount: 0,
    recordingId: null,
    tags: [],
    ...overrides,
  };
}

/**
 * Create a mock Agent object with realistic defaults.
 */
export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  const ext = String(200 + ++agentCounter);
  const now = new Date().toISOString();

  return {
    id: `agent-${ext}`,
    extension: ext,
    name: `Agent ${ext}`,
    state: 'idle' as AgentState,
    stateStartTime: now,
    stateDuration: 0,
    activeCallId: null,
    groups: ['group-sales'],
    skills: ['english', 'billing'],
    loginTime: now,
    ...overrides,
  };
}

/**
 * Create a mock Recording object with realistic defaults.
 */
export function createMockRecording(overrides: Partial<Recording> = {}): Recording {
  const id = `rec-${++recordingCounter}`;
  const now = new Date().toISOString();
  const fiveMinAgo = new Date(Date.now() - 300_000).toISOString();

  return {
    id,
    callId: `call-${callCounter}`,
    agentId: `agent-201`,
    agentName: 'John Smith',
    callerNumber: '+442075551234',
    calledNumber: '201',
    direction: 'inbound' as CallDirection,
    startTime: fiveMinAgo,
    endTime: now,
    duration: 300,
    fileSize: 2_400_000,
    format: 'wav' as RecordingFormat,
    storagePool: 'pool-local',
    storagePath: `2024/02/10/${id}.wav`,
    hasScorecard: false,
    score: null,
    tags: [],
    retainUntil: new Date(Date.now() + 90 * 86400_000).toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock Database (Drizzle-style)
// ---------------------------------------------------------------------------

/**
 * Creates a mock Drizzle-style database object.
 * Each method returns a chainable object that resolves to configurable results.
 */
export function createMockDb() {
  const createChain = (resolvedValue: unknown = []) => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};

    const methods = [
      'from', 'where', 'orderBy', 'limit', 'offset',
      'leftJoin', 'innerJoin', 'groupBy', 'having',
      'set', 'values', 'returning', 'onConflictDoUpdate',
      'onConflictDoNothing',
    ];

    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }

    // Terminal: make the chain itself thenable
    chain.then = vi.fn().mockImplementation((resolve: (val: unknown) => void) => {
      return Promise.resolve(resolvedValue).then(resolve);
    });

    // Allow executing as a promise
    chain.execute = vi.fn().mockResolvedValue(resolvedValue);

    return chain;
  };

  const select = vi.fn().mockReturnValue(createChain([]));
  const insert = vi.fn().mockReturnValue(createChain({ rowCount: 1 }));
  const update = vi.fn().mockReturnValue(createChain({ rowCount: 1 }));
  const deleteFn = vi.fn().mockReturnValue(createChain({ rowCount: 1 }));

  return {
    select,
    insert,
    update,
    delete: deleteFn,
    /** Helper to configure what select().from()... resolves to */
    _setSelectResult: (result: unknown) => {
      select.mockReturnValue(createChain(result));
    },
    /** Helper to configure what insert().values()... resolves to */
    _setInsertResult: (result: unknown) => {
      insert.mockReturnValue(createChain(result));
    },
  };
}

// ---------------------------------------------------------------------------
// Mock Redis (ioredis-style)
// ---------------------------------------------------------------------------

/**
 * Creates a mock Redis client with pub/sub support.
 */
export function createMockRedis() {
  const subscribers = new Map<string, Array<(channel: string, message: string) => void>>();

  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
    ping: vi.fn().mockResolvedValue('PONG'),
    hget: vi.fn().mockResolvedValue(null),
    hset: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn().mockResolvedValue({}),
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockImplementation((channel: string) => {
      if (!subscribers.has(channel)) {
        subscribers.set(channel, []);
      }
      return Promise.resolve(1);
    }),
    on: vi.fn().mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'message') {
        // Store handler for all channels
        for (const [, handlers] of subscribers) {
          handlers.push(handler as (channel: string, message: string) => void);
        }
      }
    }),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn().mockReturnThis(),
    status: 'ready' as const,

    /** Helper: simulate receiving a message on a channel */
    _simulateMessage: (channel: string, message: string) => {
      const handlers = subscribers.get(channel) || [];
      for (const handler of handlers) {
        handler(channel, message);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Request Factory for API Route Tests
// ---------------------------------------------------------------------------

/**
 * Create a mock NextRequest-like object for testing API route handlers.
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = 'GET', body, headers = {} } = options;

  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}
