// ─── DevLink3 SHA1 Challenge-Response Authentication Tests ───────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { computeChallengeResponse } from '../auth';
import { PacketType, ResponseCode } from '@/types/devlink3';

// ---------------------------------------------------------------------------
// Test: SHA1 Challenge Response Computation
// ---------------------------------------------------------------------------

describe('computeChallengeResponse', () => {
  it('should produce a 20-byte SHA1 hash', () => {
    const challenge = Buffer.alloc(16, 0xaa);
    const password = 'admin';

    const result = computeChallengeResponse(challenge, password);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(20); // SHA1 = 160 bits = 20 bytes
  });

  it('should compute the correct hash for a known challenge+password', () => {
    // Known values: challenge = 16 bytes of 0x00, password = "test"
    const challenge = Buffer.alloc(16, 0x00);
    const password = 'test';

    // Manual computation:
    // passwordBytes = Buffer.from('test') = [0x74, 0x65, 0x73, 0x74] padded to 16 bytes
    // hashInput = [0x00 * 16] + [0x74, 0x65, 0x73, 0x74, 0x00 * 12] = 32 bytes
    const pwdBytes = Buffer.from(password, 'utf-8');
    const pwdPadded = Buffer.alloc(16);
    pwdBytes.copy(pwdPadded);
    const hashInput = Buffer.concat([challenge, pwdPadded]);
    const expected = crypto.createHash('sha1').update(hashInput).digest();

    const result = computeChallengeResponse(challenge, password);
    expect(result.equals(expected)).toBe(true);
  });

  it('should produce different hashes for different passwords', () => {
    const challenge = Buffer.alloc(16, 0x42);

    const result1 = computeChallengeResponse(challenge, 'password1');
    const result2 = computeChallengeResponse(challenge, 'password2');

    expect(result1.equals(result2)).toBe(false);
  });

  it('should produce different hashes for different challenges', () => {
    const challenge1 = Buffer.alloc(16, 0x01);
    const challenge2 = Buffer.alloc(16, 0x02);

    const result1 = computeChallengeResponse(challenge1, 'admin');
    const result2 = computeChallengeResponse(challenge2, 'admin');

    expect(result1.equals(result2)).toBe(false);
  });

  it('should truncate passwords longer than 16 bytes', () => {
    const challenge = Buffer.alloc(16, 0x00);
    const longPassword = 'this-is-a-very-long-password-exceeding-16-bytes';

    const result = computeChallengeResponse(challenge, longPassword);
    expect(result.length).toBe(20);

    // Verify truncation: only first 16 bytes of password should be used
    const truncated = longPassword.substring(0, 16);
    const resultWithTruncated = computeChallengeResponse(challenge, truncated);
    expect(result.equals(resultWithTruncated)).toBe(true);
  });

  it('should handle empty password (zero-padded)', () => {
    const challenge = Buffer.alloc(16, 0xff);
    const password = '';

    const result = computeChallengeResponse(challenge, password);
    expect(result.length).toBe(20);

    // With empty password, the second 16 bytes are all zeros
    const hashInput = Buffer.concat([challenge, Buffer.alloc(16, 0x00)]);
    const expected = crypto.createHash('sha1').update(hashInput).digest();
    expect(result.equals(expected)).toBe(true);
  });

  it('should trim whitespace from password', () => {
    const challenge = Buffer.alloc(16, 0xab);

    const result1 = computeChallengeResponse(challenge, '  admin  ');
    const result2 = computeChallengeResponse(challenge, 'admin');
    expect(result1.equals(result2)).toBe(true);
  });

  it('should handle passwords with special characters', () => {
    const challenge = Buffer.alloc(16, 0xcd);
    const password = 'p@ss!w0rd#$';

    const result = computeChallengeResponse(challenge, password);
    expect(result.length).toBe(20);
    // Just verify it does not throw
    expect(result).toBeInstanceOf(Buffer);
  });

  it('should handle random 16-byte challenges', () => {
    const challenge = crypto.randomBytes(16);
    const password = 'randomTest';

    const result = computeChallengeResponse(challenge, password);
    expect(result.length).toBe(20);

    // Recompute should give same result (deterministic)
    const result2 = computeChallengeResponse(challenge, password);
    expect(result.equals(result2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test: Authentication Handshake State Machine
// ---------------------------------------------------------------------------

describe('authenticate - handshake state machine', () => {
  // We test the state machine by simulating the DevLink3Connection event emitter

  function createMockConnection() {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    return {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event)!.push(handler);
      }),
      removeListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        const handlers = listeners.get(event);
        if (handlers) {
          const idx = handlers.indexOf(handler);
          if (idx >= 0) handlers.splice(idx, 1);
        }
      }),
      sendRaw: vi.fn(),
      _emit: (event: string, ...args: unknown[]) => {
        const handlers = listeners.get(event) || [];
        for (const handler of handlers) {
          handler(...args);
        }
      },
      _getListenerCount: (event: string) => {
        return (listeners.get(event) || []).length;
      },
    };
  }

  function buildAuthResponsePayload(responseCode: number, challengeData?: Buffer): Buffer {
    // payload: requestId(4) + responseCode(4) + [challengeLen(4) + challengeData]
    const requestId = Buffer.alloc(4, 0x00);
    const responseCodeBuf = Buffer.alloc(4);
    responseCodeBuf.writeUInt32BE(responseCode, 0);

    if (challengeData) {
      const challengeLen = Buffer.alloc(4);
      challengeLen.writeUInt32BE(challengeData.length, 0);
      return Buffer.concat([requestId, responseCodeBuf, challengeLen, challengeData]);
    }

    return Buffer.concat([requestId, responseCodeBuf]);
  }

  it('should send username packet on start (phase 1)', async () => {
    const conn = createMockConnection();

    // Import authenticate dynamically to use our mock
    const { authenticate } = await import('../auth');

    // Start authentication (don't await - it's waiting for packets)
    const authPromise = authenticate(
      conn as unknown as import('../connection').DevLink3Connection,
      'admin',
      'password'
    );

    // Should have registered a packet listener
    expect(conn.on).toHaveBeenCalledWith('packet', expect.any(Function));

    // Should have sent a raw packet (username submission)
    expect(conn.sendRaw).toHaveBeenCalledTimes(1);
    const sentBuffer = conn.sendRaw.mock.calls[0][0] as Buffer;
    expect(sentBuffer[0]).toBe(0x49); // Magic byte

    // Simulate challenge response from server
    const challenge = crypto.randomBytes(16);
    const challengePayload = buildAuthResponsePayload(ResponseCode.Challenge, challenge);

    conn._emit('packet', {
      type: PacketType.AuthResponse,
      payload: challengePayload,
    });

    // Should have sent the challenge response packet
    expect(conn.sendRaw).toHaveBeenCalledTimes(2);

    // Simulate success response
    const successPayload = buildAuthResponsePayload(ResponseCode.Success);
    conn._emit('packet', {
      type: PacketType.AuthResponse,
      payload: successPayload,
    });

    const result = await authPromise;
    expect(result).toBe(true);

    // Should have cleaned up the listener
    expect(conn.removeListener).toHaveBeenCalled();
  });

  it('should return false when server sends Fail at username phase', async () => {
    const conn = createMockConnection();
    const { authenticate } = await import('../auth');

    const authPromise = authenticate(
      conn as unknown as import('../connection').DevLink3Connection,
      'baduser',
      'password'
    );

    // Simulate immediate failure
    const failPayload = buildAuthResponsePayload(ResponseCode.Fail);
    conn._emit('packet', {
      type: PacketType.AuthResponse,
      payload: failPayload,
    });

    const result = await authPromise;
    expect(result).toBe(false);
    expect(conn.removeListener).toHaveBeenCalled();
  });

  it('should return false when challenge response is rejected', async () => {
    const conn = createMockConnection();
    const { authenticate } = await import('../auth');

    const authPromise = authenticate(
      conn as unknown as import('../connection').DevLink3Connection,
      'admin',
      'wrong-password'
    );

    // Phase 1: send challenge
    const challenge = crypto.randomBytes(16);
    const challengePayload = buildAuthResponsePayload(ResponseCode.Challenge, challenge);
    conn._emit('packet', {
      type: PacketType.AuthResponse,
      payload: challengePayload,
    });

    // Phase 2: send fail
    const failPayload = buildAuthResponsePayload(ResponseCode.Fail);
    conn._emit('packet', {
      type: PacketType.AuthResponse,
      payload: failPayload,
    });

    const result = await authPromise;
    expect(result).toBe(false);
  });

  it('should ignore non-AuthResponse packets', async () => {
    const conn = createMockConnection();
    const { authenticate } = await import('../auth');

    const authPromise = authenticate(
      conn as unknown as import('../connection').DevLink3Connection,
      'admin',
      'password'
    );

    // Send an unrelated packet -- should be ignored
    conn._emit('packet', {
      type: PacketType.TestAck,
      payload: Buffer.alloc(8),
    });

    // Auth should still be waiting (not resolved)
    expect(conn.sendRaw).toHaveBeenCalledTimes(1); // Only the initial username packet

    // Now send the challenge to continue the flow
    const challenge = crypto.randomBytes(16);
    const challengePayload = buildAuthResponsePayload(ResponseCode.Challenge, challenge);
    conn._emit('packet', {
      type: PacketType.AuthResponse,
      payload: challengePayload,
    });

    // Then success
    const successPayload = buildAuthResponsePayload(ResponseCode.Success);
    conn._emit('packet', {
      type: PacketType.AuthResponse,
      payload: successPayload,
    });

    const result = await authPromise;
    expect(result).toBe(true);
  });

  it('should timeout after 15 seconds and return false', async () => {
    vi.useFakeTimers();
    const conn = createMockConnection();
    const { authenticate } = await import('../auth');

    const authPromise = authenticate(
      conn as unknown as import('../connection').DevLink3Connection,
      'admin',
      'password'
    );

    // Advance past the 15s timeout
    vi.advanceTimersByTime(16_000);

    const result = await authPromise;
    expect(result).toBe(false);
    expect(conn.removeListener).toHaveBeenCalled();

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Test: Event Request
// ---------------------------------------------------------------------------

describe('requestEvents', () => {
  function createMockConnection() {
    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    return {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event)!.push(handler);
      }),
      removeListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        const handlers = listeners.get(event);
        if (handlers) {
          const idx = handlers.indexOf(handler);
          if (idx >= 0) handlers.splice(idx, 1);
        }
      }),
      sendRaw: vi.fn(),
      _emit: (event: string, ...args: unknown[]) => {
        const handlers = listeners.get(event) || [];
        for (const handler of handlers) {
          handler(...args);
        }
      },
    };
  }

  function buildEventResponsePayload(responseCode: number): Buffer {
    const requestId = Buffer.alloc(4, 0x00);
    const responseCodeBuf = Buffer.alloc(4);
    responseCodeBuf.writeUInt32BE(responseCode, 0);
    return Buffer.concat([requestId, responseCodeBuf]);
  }

  it('should resolve true on success', async () => {
    const conn = createMockConnection();
    const { requestEvents } = await import('../auth');

    const promise = requestEvents(
      conn as unknown as import('../connection').DevLink3Connection,
      '-CallDelta3 -CMExtn'
    );

    // Simulate success response
    conn._emit('packet', {
      type: PacketType.EventRequestResponse,
      payload: buildEventResponsePayload(ResponseCode.Success),
    });

    const result = await promise;
    expect(result).toBe(true);
  });

  it('should resolve false on failure', async () => {
    const conn = createMockConnection();
    const { requestEvents } = await import('../auth');

    const promise = requestEvents(
      conn as unknown as import('../connection').DevLink3Connection,
      '-InvalidFlag'
    );

    // Simulate failure
    conn._emit('packet', {
      type: PacketType.EventRequestResponse,
      payload: buildEventResponsePayload(ResponseCode.UnknownFlag),
    });

    const result = await promise;
    expect(result).toBe(false);
  });

  it('should timeout after 10 seconds', async () => {
    vi.useFakeTimers();
    const conn = createMockConnection();
    const { requestEvents } = await import('../auth');

    const promise = requestEvents(
      conn as unknown as import('../connection').DevLink3Connection,
      '-CallDelta3'
    );

    vi.advanceTimersByTime(11_000);

    const result = await promise;
    expect(result).toBe(false);

    vi.useRealTimers();
  });
});
