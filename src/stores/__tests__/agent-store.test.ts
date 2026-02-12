// ─── Agent Store Tests ───────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore } from '../agent-store';
import { createMockAgent } from '@/test/helpers';
import type { AgentState } from '@/types/agents';

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useAgentStore.setState({ agents: new Map() });
});

// ---------------------------------------------------------------------------
// updateAgent
// ---------------------------------------------------------------------------

describe('useAgentStore - updateAgent', () => {
  it('adds a new agent to the store', () => {
    const agent = createMockAgent({ id: 'agent-201', name: 'Alice', extension: '201' });
    useAgentStore.getState().updateAgent(agent);

    const state = useAgentStore.getState();
    expect(state.agents.size).toBe(1);
    expect(state.agents.get('agent-201')!.name).toBe('Alice');
  });

  it('updates an existing agent record', () => {
    const agent = createMockAgent({ id: 'agent-201', name: 'Alice', state: 'idle' });
    useAgentStore.getState().updateAgent(agent);

    const updated = { ...agent, name: 'Alice Smith', state: 'talking' as AgentState };
    useAgentStore.getState().updateAgent(updated);

    const state = useAgentStore.getState();
    expect(state.agents.size).toBe(1);
    expect(state.agents.get('agent-201')!.name).toBe('Alice Smith');
    expect(state.agents.get('agent-201')!.state).toBe('talking');
  });

  it('handles multiple agents', () => {
    useAgentStore.getState().updateAgent(createMockAgent({ id: 'agent-201' }));
    useAgentStore.getState().updateAgent(createMockAgent({ id: 'agent-202' }));
    useAgentStore.getState().updateAgent(createMockAgent({ id: 'agent-203' }));

    expect(useAgentStore.getState().agents.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// updateAgentState
// ---------------------------------------------------------------------------

describe('useAgentStore - updateAgentState', () => {
  it('changes the state and updates timestamp', () => {
    const agent = createMockAgent({ id: 'agent-201', state: 'idle' });
    useAgentStore.getState().updateAgent(agent);

    const now = new Date().toISOString();
    useAgentStore.getState().updateAgentState('agent-201', 'talking', now, 'call-1');

    const updated = useAgentStore.getState().agents.get('agent-201')!;
    expect(updated.state).toBe('talking');
    expect(updated.stateStartTime).toBe(now);
    expect(updated.stateDuration).toBe(0);
    expect(updated.activeCallId).toBe('call-1');
  });

  it('sets activeCallId to null when not provided', () => {
    const agent = createMockAgent({ id: 'agent-201', state: 'talking', activeCallId: 'call-1' });
    useAgentStore.getState().updateAgent(agent);

    const now = new Date().toISOString();
    useAgentStore.getState().updateAgentState('agent-201', 'idle', now);

    const updated = useAgentStore.getState().agents.get('agent-201')!;
    expect(updated.state).toBe('idle');
    expect(updated.activeCallId).toBeNull();
  });

  it('does nothing when agent ID is not found', () => {
    const agent = createMockAgent({ id: 'agent-201', state: 'idle' });
    useAgentStore.getState().updateAgent(agent);

    const now = new Date().toISOString();
    useAgentStore.getState().updateAgentState('agent-999', 'talking', now);

    // Original agent unchanged
    expect(useAgentStore.getState().agents.get('agent-201')!.state).toBe('idle');
    expect(useAgentStore.getState().agents.size).toBe(1);
  });

  it('preserves other agent fields when updating state', () => {
    const agent = createMockAgent({
      id: 'agent-201',
      name: 'Alice',
      extension: '201',
      groups: ['group-sales', 'group-support'],
      skills: ['english', 'billing'],
    });
    useAgentStore.getState().updateAgent(agent);

    const now = new Date().toISOString();
    useAgentStore.getState().updateAgentState('agent-201', 'acw', now);

    const updated = useAgentStore.getState().agents.get('agent-201')!;
    expect(updated.name).toBe('Alice');
    expect(updated.extension).toBe('201');
    expect(updated.groups).toEqual(['group-sales', 'group-support']);
    expect(updated.skills).toEqual(['english', 'billing']);
  });
});

// ---------------------------------------------------------------------------
// setAgents (bulk set)
// ---------------------------------------------------------------------------

describe('useAgentStore - setAgents', () => {
  it('bulk-sets all agents replacing previous state', () => {
    useAgentStore.getState().updateAgent(createMockAgent({ id: 'agent-old' }));

    const newAgents = [
      createMockAgent({ id: 'agent-201', name: 'Alice' }),
      createMockAgent({ id: 'agent-202', name: 'Bob' }),
    ];
    useAgentStore.getState().setAgents(newAgents);

    const state = useAgentStore.getState();
    expect(state.agents.size).toBe(2);
    expect(state.agents.has('agent-old')).toBe(false);
    expect(state.agents.get('agent-201')!.name).toBe('Alice');
    expect(state.agents.get('agent-202')!.name).toBe('Bob');
  });
});

// ---------------------------------------------------------------------------
// getAgentsByState selector
// ---------------------------------------------------------------------------

describe('useAgentStore - agents by state selector', () => {
  beforeEach(() => {
    useAgentStore.getState().setAgents([
      createMockAgent({ id: 'agent-201', state: 'idle' }),
      createMockAgent({ id: 'agent-202', state: 'talking' }),
      createMockAgent({ id: 'agent-203', state: 'idle' }),
      createMockAgent({ id: 'agent-204', state: 'acw' }),
      createMockAgent({ id: 'agent-205', state: 'talking' }),
    ]);
  });

  it('returns agents matching a specific state', () => {
    const agents = Array.from(useAgentStore.getState().agents.values());
    const idle = agents.filter((a) => a.state === 'idle');
    expect(idle).toHaveLength(2);
  });

  it('returns empty array when no agents match state', () => {
    const agents = Array.from(useAgentStore.getState().agents.values());
    const dnd = agents.filter((a) => a.state === 'dnd');
    expect(dnd).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Available / busy count selectors
// ---------------------------------------------------------------------------

describe('useAgentStore - count selectors', () => {
  beforeEach(() => {
    useAgentStore.getState().setAgents([
      createMockAgent({ id: 'agent-201', state: 'idle' }),
      createMockAgent({ id: 'agent-202', state: 'talking' }),
      createMockAgent({ id: 'agent-203', state: 'idle' }),
      createMockAgent({ id: 'agent-204', state: 'talking' }),
      createMockAgent({ id: 'agent-205', state: 'hold' }),
    ]);
  });

  it('getAvailableCount returns count of idle agents', () => {
    const agents = Array.from(useAgentStore.getState().agents.values());
    const available = agents.filter((a) => a.state === 'idle').length;
    expect(available).toBe(2);
  });

  it('getBusyCount returns count of talking + hold agents', () => {
    const agents = Array.from(useAgentStore.getState().agents.values());
    const busy = agents.filter((a) => a.state === 'talking' || a.state === 'hold').length;
    expect(busy).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Agent by group selector
// ---------------------------------------------------------------------------

describe('useAgentStore - agents by group', () => {
  it('returns agents belonging to a specific group', () => {
    useAgentStore.getState().setAgents([
      createMockAgent({ id: 'agent-201', groups: ['group-sales'] }),
      createMockAgent({ id: 'agent-202', groups: ['group-support'] }),
      createMockAgent({ id: 'agent-203', groups: ['group-sales', 'group-support'] }),
    ]);

    const agents = Array.from(useAgentStore.getState().agents.values());
    const salesAgents = agents.filter((a) => a.groups.includes('group-sales'));
    expect(salesAgents).toHaveLength(2);
  });
});
