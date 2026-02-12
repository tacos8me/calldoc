// ─── SMDR Writer Tests ──────────────────────────────────────────────────────
// Tests the SmdrWriter class in isolation by mocking all external
// dependencies (Redis, database, SMDR parser).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock external modules BEFORE importing the writer
// ---------------------------------------------------------------------------

// Mock the database
const mockReturning = vi.fn().mockResolvedValue([{ id: 'smdr-rec-1' }]);
const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  smdrRecords: {
    id: 'id',
    systemId: 'system_id',
    callId: 'call_id',
    callStart: 'call_start',
    connectedTime: 'connected_time',
    ringDuration: 'ring_duration',
    callerNumber: 'caller_number',
    direction: 'direction',
    calledNumber: 'called_number',
    dialledNumber: 'dialled_number',
    accountCode: 'account_code',
    isInternal: 'is_internal',
    callDuration: 'call_duration',
    holdDuration: 'hold_duration',
    parkDuration: 'park_duration',
    callingPartyDevice: 'calling_party_device',
    calledPartyDevice: 'called_party_device',
    continuationRecord: 'continuation_record',
    externalTargetingCause: 'external_targeting_cause',
    rawRecord: 'raw_record',
    parsedFields: 'parsed_fields',
    isReconciled: 'is_reconciled',
  },
}));

// Mock parseDuration from SMDR parser
vi.mock('@/lib/smdr/parser', () => ({
  parseDuration: vi.fn().mockReturnValue(120),
}));

// Mock ioredis - track message handlers and publish calls
const mockRedisInstances: Array<Record<string, ReturnType<typeof vi.fn>>> = [];

vi.mock('ioredis', () => {
  function MockRedis() {
    const instance: Record<string, ReturnType<typeof vi.fn>> = {
      connect: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue(1),
      on: vi.fn(),
      unsubscribe: vi.fn().mockResolvedValue('OK'),
      quit: vi.fn().mockResolvedValue('OK'),
      publish: vi.fn().mockResolvedValue(1),
    };
    mockRedisInstances.push(instance);
    return instance;
  }
  return { default: MockRedis };
});

// Now import the writer
import { SmdrWriter } from '../writer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the subscriber Redis instance (first created) */
function getSubscriber() {
  return mockRedisInstances[0];
}

/** Get the publisher Redis instance (second created) */
function getPublisher() {
  return mockRedisInstances[1];
}

/** Extract the message handler registered on the subscriber */
function getMessageHandler(): ((channel: string, message: string) => void) | undefined {
  const sub = getSubscriber();
  if (!sub) return undefined;
  const onCall = sub.on.mock.calls.find(
    (call: unknown[]) => call[0] === 'message'
  );
  return onCall ? onCall[1] as (channel: string, message: string) => void : undefined;
}

function createSmdrMessage(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: 'smdr:raw',
    data: {
      callStart: '2024-02-10T14:30:00.000Z',
      connectedTime: '00:02:00',
      ringTime: 5,
      caller: '+442075551234',
      direction: 'I',
      calledNumber: '201',
      dialledNumber: '201',
      account: 'ACCT001',
      isInternal: 0,
      callId: 1000014160,
      continuation: 0,
      party1Device: 'E201',
      party1Name: 'John Smith',
      party2Device: 'T9001',
      party2Name: 'LINE 1.1',
      holdTime: 10,
      parkTime: 0,
      authValid: 0,
      authCode: 'n/a',
      callCharge: 0,
      currency: 'GBP',
      externalTargetingCause: 'HG:fb',
      ...overrides,
    },
    timestamp: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SmdrWriter', () => {
  let writer: SmdrWriter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstances.length = 0;
    // Reset DB mock chain
    mockReturning.mockResolvedValue([{ id: 'smdr-rec-1' }]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    writer = new SmdrWriter();
  });

  afterEach(async () => {
    try {
      await writer.stop();
    } catch {
      // Ignore cleanup errors
    }
  });

  // -------------------------------------------------------------------------
  // Stats tracking
  // -------------------------------------------------------------------------

  describe('getStats', () => {
    it('returns initial zeroed stats', () => {
      const stats = writer.getStats();
      expect(stats.recordsReceived).toBe(0);
      expect(stats.recordsWritten).toBe(0);
      expect(stats.writeErrors).toBe(0);
      expect(stats.isRunning).toBe(false);
      expect(stats.lastWriteAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // start / stop lifecycle
  // -------------------------------------------------------------------------

  describe('start', () => {
    it('connects to Redis and subscribes to SMDR channel', async () => {
      await writer.start();

      const sub = getSubscriber();
      const pub = getPublisher();
      expect(sub).toBeDefined();
      expect(pub).toBeDefined();
      expect(sub.connect).toHaveBeenCalledOnce();
      expect(pub.connect).toHaveBeenCalledOnce();
      expect(sub.subscribe).toHaveBeenCalledWith('ipo:smdr');
      expect(sub.on).toHaveBeenCalledWith('message', expect.any(Function));

      const stats = writer.getStats();
      expect(stats.isRunning).toBe(true);
    });
  });

  describe('stop', () => {
    it('unsubscribes and disconnects from Redis', async () => {
      await writer.start();
      const sub = getSubscriber();
      const pub = getPublisher();

      await writer.stop();

      expect(sub.unsubscribe).toHaveBeenCalledWith('ipo:smdr');
      expect(sub.quit).toHaveBeenCalled();
      expect(pub.quit).toHaveBeenCalled();

      const stats = writer.getStats();
      expect(stats.isRunning).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // handleMessage (via simulated Redis message)
  // -------------------------------------------------------------------------

  describe('handleMessage', () => {
    async function simulateMessage(message: string): Promise<void> {
      await writer.start();
      const handler = getMessageHandler();
      expect(handler).toBeDefined();

      // Simulate receiving a message on the SMDR channel
      handler!('ipo:smdr', message);

      // Allow async handler to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    it('increments recordsReceived on each message', async () => {
      await simulateMessage(createSmdrMessage());

      const stats = writer.getStats();
      expect(stats.recordsReceived).toBe(1);
    });

    it('inserts record into database via db.insert', async () => {
      await simulateMessage(createSmdrMessage());

      expect(mockInsert).toHaveBeenCalledOnce();
      expect(mockValues).toHaveBeenCalledOnce();

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.callId).toBe('1000014160');
      expect(insertedValues.direction).toBe('inbound');
      expect(insertedValues.callerNumber).toBe('+442075551234');
      expect(insertedValues.calledNumber).toBe('201');
      expect(insertedValues.isInternal).toBe(false);
      expect(insertedValues.isReconciled).toBe(false);
    });

    it('maps direction I to inbound', async () => {
      await simulateMessage(createSmdrMessage({ direction: 'I' }));

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.direction).toBe('inbound');
    });

    it('maps direction O to outbound', async () => {
      await simulateMessage(createSmdrMessage({ direction: 'O' }));

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.direction).toBe('outbound');
    });

    it('increments recordsWritten on successful DB insert', async () => {
      await simulateMessage(createSmdrMessage());

      const stats = writer.getStats();
      expect(stats.recordsWritten).toBe(1);
      expect(stats.lastWriteAt).not.toBeNull();
    });

    it('publishes to correlation channel after successful write', async () => {
      await simulateMessage(createSmdrMessage());

      const pub = getPublisher();
      expect(pub.publish).toHaveBeenCalledOnce();
      const [channel, messageStr] = pub.publish.mock.calls[0];
      expect(channel).toBe('ipo:smdr:correlated');

      const published = JSON.parse(messageStr as string);
      expect(published.type).toBe('smdr:written');
      expect(published.smdrRecordId).toBe('smdr-rec-1');
      expect(published.data).toBeDefined();
      expect(published.timestamp).toBeDefined();
    });

    it('increments writeErrors on DB failure', async () => {
      mockReturning.mockRejectedValueOnce(new Error('DB connection lost'));

      await simulateMessage(createSmdrMessage());

      const stats = writer.getStats();
      expect(stats.writeErrors).toBe(1);
      expect(stats.recordsWritten).toBe(0);
    });

    it('does not publish to correlation channel on DB failure', async () => {
      mockReturning.mockRejectedValueOnce(new Error('DB error'));

      await simulateMessage(createSmdrMessage());

      const pub = getPublisher();
      expect(pub.publish).not.toHaveBeenCalled();
    });

    it('increments writeErrors on malformed JSON', async () => {
      await simulateMessage('not valid json');

      const stats = writer.getStats();
      expect(stats.writeErrors).toBe(1);
      expect(stats.recordsReceived).toBe(1);
      expect(stats.recordsWritten).toBe(0);
    });

    it('skips record when data field is missing', async () => {
      await simulateMessage(JSON.stringify({ type: 'smdr:raw' }));

      const stats = writer.getStats();
      expect(stats.recordsReceived).toBe(1);
      expect(stats.recordsWritten).toBe(0);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('sets systemId from config when provided', async () => {
      const configuredWriter = new SmdrWriter();
      await configuredWriter.start({ systemId: 'ipo-main' });

      const handler = getMessageHandler();
      expect(handler).toBeDefined();
      handler!('ipo:smdr', createSmdrMessage());
      await new Promise((resolve) => setTimeout(resolve, 50));

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.systemId).toBe('ipo-main');

      await configuredWriter.stop();
    });

    it('sets systemId to null when not configured', async () => {
      await simulateMessage(createSmdrMessage());

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.systemId).toBeNull();
    });

    it('handles continuation records correctly', async () => {
      await simulateMessage(createSmdrMessage({ continuation: 1 }));

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.continuationRecord).toBe(true);
    });

    it('sets accountCode to null for empty account', async () => {
      await simulateMessage(createSmdrMessage({ account: '' }));

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.accountCode).toBeNull();
    });

    it('ignores messages on non-SMDR channels', async () => {
      await writer.start();
      const handler = getMessageHandler();
      expect(handler).toBeDefined();

      // Simulate message on a different channel
      handler!('ipo:other', createSmdrMessage());
      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = writer.getStats();
      expect(stats.recordsReceived).toBe(0);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
});
