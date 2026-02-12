// ─── Group Store Tests ──────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useGroupStore } from '../group-store';
import type { GroupStatsEntry } from '../group-store';

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useGroupStore.setState({ groups: new Map() });
});

// ---------------------------------------------------------------------------
// Test group factory
// ---------------------------------------------------------------------------

function makeGroup(overrides: Partial<GroupStatsEntry> = {}): GroupStatsEntry {
  return {
    id: 'group-sales',
    name: 'Sales',
    agentsAvailable: 5,
    agentsBusy: 3,
    agentsAway: 1,
    callsWaiting: 2,
    longestWait: 45,
    answeredToday: 120,
    abandonedToday: 8,
    serviceLevelPercent: 85,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// setGroups
// ---------------------------------------------------------------------------

describe('useGroupStore - setGroups', () => {
  it('bulk-sets all groups replacing previous state', () => {
    // Seed a group first
    useGroupStore.getState().updateGroup('group-old', { name: 'Old Group' });

    const newGroups = [
      makeGroup({ id: 'group-sales', name: 'Sales' }),
      makeGroup({ id: 'group-support', name: 'Support' }),
    ];
    useGroupStore.getState().setGroups(newGroups);

    const state = useGroupStore.getState();
    expect(state.groups.size).toBe(2);
    expect(state.groups.has('group-old')).toBe(false);
    expect(state.groups.get('group-sales')!.name).toBe('Sales');
    expect(state.groups.get('group-support')!.name).toBe('Support');
  });

  it('sets an empty map when given an empty array', () => {
    useGroupStore.getState().updateGroup('group-sales', { name: 'Sales' });
    useGroupStore.getState().setGroups([]);

    expect(useGroupStore.getState().groups.size).toBe(0);
  });

  it('uses the group id as the map key', () => {
    const groups = [
      makeGroup({ id: 'group-a' }),
      makeGroup({ id: 'group-b' }),
      makeGroup({ id: 'group-c' }),
    ];
    useGroupStore.getState().setGroups(groups);

    expect(useGroupStore.getState().groups.has('group-a')).toBe(true);
    expect(useGroupStore.getState().groups.has('group-b')).toBe(true);
    expect(useGroupStore.getState().groups.has('group-c')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updateGroup
// ---------------------------------------------------------------------------

describe('useGroupStore - updateGroup', () => {
  it('creates a new group entry when id does not exist', () => {
    useGroupStore.getState().updateGroup('group-sales', {
      name: 'Sales',
      agentsAvailable: 5,
      callsWaiting: 3,
    });

    const state = useGroupStore.getState();
    expect(state.groups.size).toBe(1);
    const group = state.groups.get('group-sales')!;
    expect(group.name).toBe('Sales');
    expect(group.agentsAvailable).toBe(5);
    expect(group.callsWaiting).toBe(3);
  });

  it('defaults missing fields to 0 or id for new groups', () => {
    useGroupStore.getState().updateGroup('group-new', {});

    const group = useGroupStore.getState().groups.get('group-new')!;
    expect(group.id).toBe('group-new');
    expect(group.name).toBe('group-new'); // defaults to id
    expect(group.agentsAvailable).toBe(0);
    expect(group.agentsBusy).toBe(0);
    expect(group.agentsAway).toBe(0);
    expect(group.callsWaiting).toBe(0);
    expect(group.longestWait).toBe(0);
    expect(group.answeredToday).toBe(0);
    expect(group.abandonedToday).toBe(0);
    expect(group.serviceLevelPercent).toBe(0);
  });

  it('merges partial updates into an existing group', () => {
    const group = makeGroup({ id: 'group-sales', agentsAvailable: 5, callsWaiting: 2 });
    useGroupStore.getState().setGroups([group]);

    useGroupStore.getState().updateGroup('group-sales', {
      agentsAvailable: 3,
      callsWaiting: 7,
    });

    const updated = useGroupStore.getState().groups.get('group-sales')!;
    expect(updated.agentsAvailable).toBe(3);
    expect(updated.callsWaiting).toBe(7);
    // Other fields preserved
    expect(updated.name).toBe('Sales');
    expect(updated.agentsBusy).toBe(3);
    expect(updated.longestWait).toBe(45);
  });

  it('does not affect other groups when updating one', () => {
    useGroupStore.getState().setGroups([
      makeGroup({ id: 'group-sales', name: 'Sales' }),
      makeGroup({ id: 'group-support', name: 'Support' }),
    ]);

    useGroupStore.getState().updateGroup('group-sales', {
      callsWaiting: 99,
    });

    const support = useGroupStore.getState().groups.get('group-support')!;
    expect(support.callsWaiting).toBe(2); // unchanged
    expect(support.name).toBe('Support');
  });

  it('handles multiple sequential updates', () => {
    useGroupStore.getState().updateGroup('group-sales', { answeredToday: 10 });
    useGroupStore.getState().updateGroup('group-sales', { answeredToday: 20 });
    useGroupStore.getState().updateGroup('group-sales', { answeredToday: 30 });

    expect(useGroupStore.getState().groups.get('group-sales')!.answeredToday).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

describe('useGroupStore - clearAll', () => {
  it('removes all groups from the store', () => {
    useGroupStore.getState().setGroups([
      makeGroup({ id: 'group-sales' }),
      makeGroup({ id: 'group-support' }),
    ]);
    expect(useGroupStore.getState().groups.size).toBe(2);

    useGroupStore.getState().clearAll();

    expect(useGroupStore.getState().groups.size).toBe(0);
  });

  it('is idempotent when already empty', () => {
    useGroupStore.getState().clearAll();
    useGroupStore.getState().clearAll();

    expect(useGroupStore.getState().groups.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getGroup
// ---------------------------------------------------------------------------

describe('useGroupStore - getGroup', () => {
  it('returns the group entry for a valid id', () => {
    const group = makeGroup({ id: 'group-sales', name: 'Sales' });
    useGroupStore.getState().setGroups([group]);

    const result = useGroupStore.getState().getGroup('group-sales');
    expect(result).toBeDefined();
    expect(result!.name).toBe('Sales');
    expect(result!.id).toBe('group-sales');
  });

  it('returns undefined for a non-existent id', () => {
    const result = useGroupStore.getState().getGroup('group-nonexistent');
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getAllGroups selector
// ---------------------------------------------------------------------------

describe('useGroupStore - getAllGroups', () => {
  it('returns an empty array when no groups exist', () => {
    const result = useGroupStore.getState().getAllGroups();
    expect(result).toEqual([]);
  });

  it('returns all groups as an array', () => {
    useGroupStore.getState().setGroups([
      makeGroup({ id: 'group-sales', name: 'Sales' }),
      makeGroup({ id: 'group-support', name: 'Support' }),
      makeGroup({ id: 'group-billing', name: 'Billing' }),
    ]);

    const result = useGroupStore.getState().getAllGroups();
    expect(result).toHaveLength(3);

    const names = result.map((g) => g.name).sort();
    expect(names).toEqual(['Billing', 'Sales', 'Support']);
  });

  it('reflects updates after updateGroup', () => {
    useGroupStore.getState().setGroups([
      makeGroup({ id: 'group-sales', answeredToday: 100 }),
    ]);

    useGroupStore.getState().updateGroup('group-sales', { answeredToday: 150 });

    const result = useGroupStore.getState().getAllGroups();
    expect(result).toHaveLength(1);
    expect(result[0].answeredToday).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// Group stats updates
// ---------------------------------------------------------------------------

describe('useGroupStore - group stats updates', () => {
  it('tracks service level changes', () => {
    useGroupStore.getState().setGroups([
      makeGroup({ id: 'group-sales', serviceLevelPercent: 90 }),
    ]);

    useGroupStore.getState().updateGroup('group-sales', { serviceLevelPercent: 75 });

    expect(useGroupStore.getState().groups.get('group-sales')!.serviceLevelPercent).toBe(75);
  });

  it('tracks queue stats (callsWaiting and longestWait)', () => {
    useGroupStore.getState().setGroups([
      makeGroup({ id: 'group-support', callsWaiting: 0, longestWait: 0 }),
    ]);

    useGroupStore.getState().updateGroup('group-support', {
      callsWaiting: 5,
      longestWait: 120,
    });

    const group = useGroupStore.getState().groups.get('group-support')!;
    expect(group.callsWaiting).toBe(5);
    expect(group.longestWait).toBe(120);
  });

  it('tracks agent availability across groups', () => {
    useGroupStore.getState().setGroups([
      makeGroup({ id: 'group-sales', agentsAvailable: 5, agentsBusy: 3, agentsAway: 1 }),
      makeGroup({ id: 'group-support', agentsAvailable: 8, agentsBusy: 2, agentsAway: 0 }),
    ]);

    // Simulate agents going busy in sales
    useGroupStore.getState().updateGroup('group-sales', {
      agentsAvailable: 3,
      agentsBusy: 5,
    });

    const sales = useGroupStore.getState().groups.get('group-sales')!;
    expect(sales.agentsAvailable).toBe(3);
    expect(sales.agentsBusy).toBe(5);
    expect(sales.agentsAway).toBe(1); // preserved

    // Support group should be unchanged
    const support = useGroupStore.getState().groups.get('group-support')!;
    expect(support.agentsAvailable).toBe(8);
    expect(support.agentsBusy).toBe(2);
  });

  it('tracks answered and abandoned call counts', () => {
    useGroupStore.getState().setGroups([
      makeGroup({ id: 'group-sales', answeredToday: 50, abandonedToday: 3 }),
    ]);

    useGroupStore.getState().updateGroup('group-sales', {
      answeredToday: 51,
    });

    const group = useGroupStore.getState().groups.get('group-sales')!;
    expect(group.answeredToday).toBe(51);
    expect(group.abandonedToday).toBe(3); // preserved
  });
});
