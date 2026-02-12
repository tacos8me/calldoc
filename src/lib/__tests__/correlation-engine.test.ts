// ─── Correlation Engine Tests ────────────────────────────────────────────────
// Tests the CorrelationEngine class in isolation by mocking all external
// dependencies (Redis, database, agent mapping service).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock external modules BEFORE importing the engine
// ---------------------------------------------------------------------------

// Mock the persist layer
const mockUpsertCall = vi.fn().mockResolvedValue({ id: 'db-call-1' });
const mockInsertCallEvent = vi.fn();
const mockFlushPendingEvents = vi.fn().mockResolvedValue(undefined);
const mockUpdateAgentState = vi.fn();
const mockUpdateGroupStats = vi.fn();

vi.mock('@/lib/correlation/persist', () => ({
  upsertCall: (...args: unknown[]) => mockUpsertCall(...args),
  insertCallEvent: (...args: unknown[]) => mockInsertCallEvent(...args),
  flushPendingEvents: () => mockFlushPendingEvents(),
  updateAgentState: (...args: unknown[]) => mockUpdateAgentState(...args),
  updateGroupStats: (...args: unknown[]) => mockUpdateGroupStats(...args),
}));

// Mock agent mapping service
const mockResolveAgent = vi.fn().mockResolvedValue(null);
vi.mock('@/lib/correlation/agent-mapping', () => ({
  agentMappingService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    resolveAgent: (...args: unknown[]) => mockResolveAgent(...args),
  },
}));

// Mock the database
const mockDbSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  }),
});
const mockDbUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue({ rowCount: 1 }),
  }),
});
vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    update: (...args: unknown[]) => mockDbUpdate(...args),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  calls: { id: 'id', externalCallId: 'external_call_id', startTime: 'start_time', agentExtension: 'agent_extension' },
  smdrRecords: { id: 'id', matchedCallId: 'matched_call_id', isReconciled: 'is_reconciled', reconciledAt: 'reconciled_at' },
}));

vi.mock('@/lib/smdr/parser', () => ({
  parseDuration: vi.fn().mockReturnValue(120),
}));

// Mock ioredis
vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    unsubscribe: vi.fn().mockResolvedValue('OK'),
    quit: vi.fn().mockResolvedValue('OK'),
  }));
  return { default: MockRedis };
});

// Now import the engine class
import { CorrelationEngine } from '@/lib/correlation/engine';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('CorrelationEngine', () => {
  let engine: CorrelationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new CorrelationEngine();
  });

  afterEach(async () => {
    try {
      await engine.stop();
    } catch {
      // Ignore cleanup errors
    }
  });

  // -------------------------------------------------------------------------
  // Stats tracking
  // -------------------------------------------------------------------------

  describe('getStats', () => {
    it('returns initial zeroed stats', () => {
      const stats = engine.getStats();
      expect(stats.devlinkEventsReceived).toBe(0);
      expect(stats.smdrRecordsReceived).toBe(0);
      expect(stats.matchedCount).toBe(0);
      expect(stats.unmatchedCount).toBe(0);
      expect(stats.avgMatchLatencyMs).toBe(0);
      expect(stats.isRunning).toBe(false);
      expect(stats.startedAt).toBeNull();
      expect(stats.errors).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // DevLink3 call event processing
  // -------------------------------------------------------------------------

  describe('handleCallEvent (via handleMessage)', () => {
    it('upserts a call record from a DevLink3 call:created event', async () => {
      const message = JSON.stringify({
        type: 'call:created',
        callId: 'ext-123',
        timestamp: new Date().toISOString(),
        data: {
          direction: 'inbound',
          state: 'ringing',
          callerNumber: '+442075551234',
          calledNumber: '201',
          agentExtension: '201',
          startTime: new Date().toISOString(),
        },
      });

      // Access private method via prototype
      await (engine as any).handleMessage('ipo:calls', message);

      expect(mockUpsertCall).toHaveBeenCalledOnce();
      const callData = mockUpsertCall.mock.calls[0][0];
      expect(callData.externalCallId).toBe('ext-123');
      expect(callData.direction).toBe('inbound');
      expect(callData.state).toBe('ringing');
      expect(callData.callerNumber).toBe('+442075551234');
    });

    it('inserts a call event for call:created type', async () => {
      const message = JSON.stringify({
        type: 'call:created',
        callId: 'ext-456',
        timestamp: new Date().toISOString(),
        data: {
          direction: 'inbound',
          state: 'ringing',
          callerNumber: '+442075555678',
          calledNumber: '202',
          startTime: new Date().toISOString(),
        },
      });

      await (engine as any).handleMessage('ipo:calls', message);

      expect(mockInsertCallEvent).toHaveBeenCalledOnce();
      const eventData = mockInsertCallEvent.mock.calls[0][0];
      expect(eventData.eventType).toBe('initiated');
      expect(eventData.callId).toBe('db-call-1');
    });

    it('increments devlinkEventsReceived counter', async () => {
      const message = JSON.stringify({
        type: 'call:created',
        callId: 'ext-789',
        data: {
          direction: 'inbound',
          state: 'ringing',
          callerNumber: '+442075559999',
          calledNumber: '203',
          startTime: new Date().toISOString(),
        },
      });

      await (engine as any).handleMessage('ipo:calls', message);

      const stats = engine.getStats();
      expect(stats.devlinkEventsReceived).toBe(1);
    });

    it('skips non-call event types', async () => {
      const message = JSON.stringify({
        type: 'smdr:record',
        data: {},
      });

      await (engine as any).handleMessage('ipo:calls', message);

      expect(mockUpsertCall).not.toHaveBeenCalled();
    });

    it('handles malformed JSON gracefully', async () => {
      await (engine as any).handleMessage('ipo:calls', 'not valid json');

      const stats = engine.getStats();
      expect(stats.errors).toBe(1);
      expect(mockUpsertCall).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Agent resolution
  // -------------------------------------------------------------------------

  describe('agent resolution', () => {
    it('resolves agent via mapping service when extension is present', async () => {
      mockResolveAgent.mockResolvedValueOnce({ id: 'agent-201', name: 'Alice' });

      const message = JSON.stringify({
        type: 'call:created',
        callId: 'ext-agent-test',
        data: {
          direction: 'inbound',
          state: 'connected',
          callerNumber: '+442075551234',
          calledNumber: '201',
          agentExtension: '201',
          startTime: new Date().toISOString(),
        },
      });

      await (engine as any).handleMessage('ipo:calls', message);

      expect(mockResolveAgent).toHaveBeenCalledWith('201');
      const callData = mockUpsertCall.mock.calls[0][0];
      expect(callData.agentId).toBe('agent-201');
    });

    it('skips placeholder agent IDs', async () => {
      mockResolveAgent.mockResolvedValueOnce({ id: 'placeholder-201', name: 'Ext 201' });

      const message = JSON.stringify({
        type: 'call:created',
        callId: 'ext-placeholder-test',
        data: {
          direction: 'inbound',
          state: 'connected',
          callerNumber: '+442075551234',
          calledNumber: '201',
          agentExtension: '201',
          startTime: new Date().toISOString(),
        },
      });

      await (engine as any).handleMessage('ipo:calls', message);

      const callData = mockUpsertCall.mock.calls[0][0];
      expect(callData.agentId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // SMDR record processing
  // -------------------------------------------------------------------------

  describe('handleSmdrRecord', () => {
    it('increments smdrRecordsReceived counter', async () => {
      const message = JSON.stringify({
        type: 'smdr:record',
        smdrRecordId: 'smdr-1',
        data: {
          callId: 9999,
          direction: 'I',
          callStart: new Date().toISOString(),
          connectedTime: '00:02:00',
          ringTime: 5,
          holdTime: 0,
          parkTime: 0,
          party1Device: 'E201',
          party1Name: 'Ext 201',
          party2Name: 'T9001',
          caller: '+442075551234',
          calledNumber: '201',
          isInternal: 0,
          callCharge: 0,
          currency: 'GBP',
          account: '',
          externalTargetingCause: '',
        },
        timestamp: new Date().toISOString(),
      });

      await (engine as any).handleMessage('ipo:smdr:correlated', message);

      const stats = engine.getStats();
      expect(stats.smdrRecordsReceived).toBe(1);
    });

    it('matches SMDR record by externalCallId via pending calls', async () => {
      // First, create a call via DevLink3 event
      const callMessage = JSON.stringify({
        type: 'call:created',
        callId: '12345',
        data: {
          direction: 'inbound',
          state: 'connected',
          callerNumber: '+442075551234',
          calledNumber: '201',
          agentExtension: '201',
          startTime: new Date().toISOString(),
        },
      });
      await (engine as any).handleMessage('ipo:calls', callMessage);

      // Then, send an SMDR record with matching callId
      const smdrMessage = JSON.stringify({
        type: 'smdr:record',
        smdrRecordId: 'smdr-match-1',
        data: {
          callId: 12345,
          direction: 'I',
          callStart: new Date().toISOString(),
          connectedTime: '00:02:00',
          ringTime: 5,
          holdTime: 10,
          parkTime: 0,
          party1Device: 'E201',
          party1Name: 'Ext 201',
          party2Name: '',
          caller: '+442075551234',
          calledNumber: '201',
          isInternal: 0,
          callCharge: 0,
          currency: 'GBP',
          account: '',
          externalTargetingCause: '',
        },
        timestamp: new Date().toISOString(),
      });
      await (engine as any).handleMessage('ipo:smdr:correlated', smdrMessage);

      const stats = engine.getStats();
      expect(stats.matchedCount).toBe(1);
      expect(stats.unmatchedCount).toBe(0);
    });

    it('creates standalone call when no match found', async () => {
      const smdrMessage = JSON.stringify({
        type: 'smdr:record',
        smdrRecordId: 'smdr-nomatch-1',
        data: {
          callId: 99999,
          direction: 'I',
          callStart: new Date().toISOString(),
          connectedTime: '00:01:30',
          ringTime: 3,
          holdTime: 0,
          parkTime: 0,
          party1Device: 'E205',
          party1Name: 'Ext 205',
          party2Name: '',
          caller: '+442075559999',
          calledNumber: '205',
          isInternal: 0,
          callCharge: 0,
          currency: 'GBP',
          account: '',
          externalTargetingCause: '',
        },
        timestamp: new Date().toISOString(),
      });

      await (engine as any).handleMessage('ipo:smdr:correlated', smdrMessage);

      const stats = engine.getStats();
      expect(stats.unmatchedCount).toBe(1);
      expect(mockUpsertCall).toHaveBeenCalled();
    });

    it('handles malformed SMDR JSON gracefully', async () => {
      await (engine as any).handleMessage('ipo:smdr:correlated', 'bad json');

      const stats = engine.getStats();
      expect(stats.errors).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Stale call cleanup
  // -------------------------------------------------------------------------

  describe('cleanupStalePendingCalls', () => {
    it('removes pending calls older than 10 minutes', async () => {
      // Create a call to populate pendingCalls
      const callMessage = JSON.stringify({
        type: 'call:created',
        callId: 'stale-call',
        data: {
          direction: 'inbound',
          state: 'ringing',
          callerNumber: '+442075551234',
          calledNumber: '201',
          startTime: new Date().toISOString(),
        },
      });
      await (engine as any).handleMessage('ipo:calls', callMessage);

      // Manually age the pending call
      const pending = (engine as any).pendingCalls.get('stale-call');
      if (pending) {
        pending.receivedAt = Date.now() - 11 * 60 * 1000; // 11 minutes ago
      }

      // Run cleanup
      (engine as any).cleanupStalePendingCalls();

      expect((engine as any).pendingCalls.size).toBe(0);
    });

    it('preserves recent pending calls', async () => {
      const callMessage = JSON.stringify({
        type: 'call:created',
        callId: 'recent-call',
        data: {
          direction: 'inbound',
          state: 'ringing',
          callerNumber: '+442075551234',
          calledNumber: '201',
          startTime: new Date().toISOString(),
        },
      });
      await (engine as any).handleMessage('ipo:calls', callMessage);

      (engine as any).cleanupStalePendingCalls();

      expect((engine as any).pendingCalls.size).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Call event type mapping
  // -------------------------------------------------------------------------

  describe('mapCallEventType', () => {
    it('maps call:created to initiated', () => {
      expect((engine as any).mapCallEventType('call:created')).toBe('initiated');
    });

    it('maps call:ended to completed', () => {
      expect((engine as any).mapCallEventType('call:ended')).toBe('completed');
    });

    it('maps call:updated with ringing state to ringing', () => {
      expect((engine as any).mapCallEventType('call:updated', 'ringing')).toBe('ringing');
    });

    it('maps call:updated with connected state to answered', () => {
      expect((engine as any).mapCallEventType('call:updated', 'connected')).toBe('answered');
    });

    it('maps call:updated with hold state to held', () => {
      expect((engine as any).mapCallEventType('call:updated', 'hold')).toBe('held');
    });

    it('returns null for unknown state', () => {
      expect((engine as any).mapCallEventType('call:updated', 'idle')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Extension extraction
  // -------------------------------------------------------------------------

  describe('extractExtensionFromDevice', () => {
    it('extracts extension from E-prefixed device', () => {
      expect((engine as any).extractExtensionFromDevice('E1001')).toBe('1001');
    });

    it('returns null for T-prefixed (trunk) device', () => {
      expect((engine as any).extractExtensionFromDevice('T9001')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect((engine as any).extractExtensionFromDevice('')).toBeNull();
    });

    it('returns null for single character', () => {
      expect((engine as any).extractExtensionFromDevice('E')).toBeNull();
    });
  });
});
