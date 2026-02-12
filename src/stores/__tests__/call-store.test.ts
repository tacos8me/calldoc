// ─── Call Store Tests ────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useCallStore } from '../call-store';
import { createMockCall } from '@/test/helpers';

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useCallStore.setState({
    activeCalls: new Map(),
    recentCalls: [],
  });
});

// ---------------------------------------------------------------------------
// upsertCall
// ---------------------------------------------------------------------------

describe('useCallStore - upsertCall', () => {
  it('adds a new call to activeCalls', () => {
    const call = createMockCall({ id: 'call-1' });
    useCallStore.getState().upsertCall(call);

    const state = useCallStore.getState();
    expect(state.activeCalls.size).toBe(1);
    expect(state.activeCalls.get('call-1')).toEqual(call);
  });

  it('updates an existing call in activeCalls', () => {
    const call = createMockCall({ id: 'call-1', state: 'ringing' });
    useCallStore.getState().upsertCall(call);

    const updated = { ...call, state: 'connected' as const, answerTime: new Date().toISOString() };
    useCallStore.getState().upsertCall(updated);

    const state = useCallStore.getState();
    expect(state.activeCalls.size).toBe(1);
    expect(state.activeCalls.get('call-1')!.state).toBe('connected');
    expect(state.activeCalls.get('call-1')!.answerTime).not.toBeNull();
  });

  it('can handle multiple concurrent calls', () => {
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-1' }));
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-2' }));
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-3' }));

    expect(useCallStore.getState().activeCalls.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// removeCall
// ---------------------------------------------------------------------------

describe('useCallStore - removeCall', () => {
  it('removes a call from activeCalls', () => {
    const call = createMockCall({ id: 'call-1' });
    useCallStore.getState().upsertCall(call);
    useCallStore.getState().removeCall('call-1');

    expect(useCallStore.getState().activeCalls.size).toBe(0);
  });

  it('adds the removed call to the front of recentCalls', () => {
    const call = createMockCall({ id: 'call-1', callerName: 'Test Caller' });
    useCallStore.getState().upsertCall(call);
    useCallStore.getState().removeCall('call-1');

    const state = useCallStore.getState();
    expect(state.recentCalls).toHaveLength(1);
    expect(state.recentCalls[0].id).toBe('call-1');
    expect(state.recentCalls[0].callerName).toBe('Test Caller');
  });

  it('does not add to recentCalls when removing a non-existent call', () => {
    useCallStore.getState().removeCall('non-existent');
    expect(useCallStore.getState().recentCalls).toHaveLength(0);
  });

  it('maintains order in recentCalls (newest first)', () => {
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-1' }));
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-2' }));

    useCallStore.getState().removeCall('call-1');
    useCallStore.getState().removeCall('call-2');

    const state = useCallStore.getState();
    expect(state.recentCalls[0].id).toBe('call-2');
    expect(state.recentCalls[1].id).toBe('call-1');
  });
});

// ---------------------------------------------------------------------------
// recentCalls ring buffer (max 50)
// ---------------------------------------------------------------------------

describe('useCallStore - recentCalls ring buffer', () => {
  it('caps recentCalls at MAX_RECENT_CALLS (50)', () => {
    // Insert 55 calls and remove them all
    for (let i = 0; i < 55; i++) {
      const call = createMockCall({ id: `call-${i}` });
      useCallStore.getState().upsertCall(call);
      useCallStore.getState().removeCall(`call-${i}`);
    }

    const state = useCallStore.getState();
    expect(state.recentCalls.length).toBe(50);
  });

  it('drops oldest calls when exceeding max', () => {
    for (let i = 0; i < 55; i++) {
      const call = createMockCall({ id: `call-${i}` });
      useCallStore.getState().upsertCall(call);
      useCallStore.getState().removeCall(`call-${i}`);
    }

    const state = useCallStore.getState();
    // The newest call should be call-54 (last removed)
    expect(state.recentCalls[0].id).toBe('call-54');
    // The oldest remaining should be call-5 (0-4 were dropped)
    expect(state.recentCalls[49].id).toBe('call-5');
  });
});

// ---------------------------------------------------------------------------
// getActiveCallCount selector
// ---------------------------------------------------------------------------

describe('useCallStore - active call count', () => {
  it('returns 0 when no active calls', () => {
    expect(useCallStore.getState().activeCalls.size).toBe(0);
  });

  it('returns correct count after adding calls', () => {
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-1' }));
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-2' }));

    expect(useCallStore.getState().activeCalls.size).toBe(2);
  });

  it('returns correct count after removing a call', () => {
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-1' }));
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-2' }));
    useCallStore.getState().removeCall('call-1');

    expect(useCallStore.getState().activeCalls.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getCallsByState selector
// ---------------------------------------------------------------------------

describe('useCallStore - calls by state', () => {
  it('filters active calls by state', () => {
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-1', state: 'ringing' }));
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-2', state: 'connected' }));
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-3', state: 'ringing' }));

    const activeCalls = Array.from(useCallStore.getState().activeCalls.values());
    const ringing = activeCalls.filter((c) => c.state === 'ringing');
    expect(ringing).toHaveLength(2);
    expect(ringing[0].id).toBe('call-1');
    expect(ringing[1].id).toBe('call-3');
  });

  it('returns empty array when no calls match state', () => {
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-1', state: 'connected' }));

    const activeCalls = Array.from(useCallStore.getState().activeCalls.values());
    const queued = activeCalls.filter((c) => c.state === 'queued');
    expect(queued).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

describe('useCallStore - clearAll', () => {
  it('resets both activeCalls and recentCalls', () => {
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-1' }));
    useCallStore.getState().upsertCall(createMockCall({ id: 'call-2' }));
    useCallStore.getState().removeCall('call-1');

    // Verify we have data
    expect(useCallStore.getState().activeCalls.size).toBe(1);
    expect(useCallStore.getState().recentCalls).toHaveLength(1);

    useCallStore.getState().clearAll();

    const state = useCallStore.getState();
    expect(state.activeCalls.size).toBe(0);
    expect(state.recentCalls).toHaveLength(0);
  });

  it('clearAll is idempotent when already empty', () => {
    useCallStore.getState().clearAll();
    useCallStore.getState().clearAll();

    const state = useCallStore.getState();
    expect(state.activeCalls.size).toBe(0);
    expect(state.recentCalls).toHaveLength(0);
  });
});
