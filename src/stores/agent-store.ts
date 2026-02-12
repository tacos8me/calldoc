import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Agent, AgentState } from '@/types';

// ---------------------------------------------------------------------------
// Agent Store -- real-time agent presence and state
// ---------------------------------------------------------------------------

interface AgentStoreState {
  /** All known agents keyed by agent ID */
  agents: Map<string, Agent>;
}

interface AgentStoreActions {
  /** Update a single agent record (merge) */
  updateAgent: (agent: Agent) => void;
  /** Update only the state-related fields of an agent */
  updateAgentState: (
    id: string,
    state: AgentState,
    stateStartTime: string,
    activeCallId?: string | null,
  ) => void;
  /** Bulk-set all agents (e.g., on initial load) */
  setAgents: (agents: Agent[]) => void;
}

type AgentStore = AgentStoreState & AgentStoreActions;

export const useAgentStore = create<AgentStore>()((set) => ({
  agents: new Map(),

  updateAgent: (agent) =>
    set((state) => {
      const next = new Map(state.agents);
      next.set(agent.id, agent);
      return { agents: next };
    }),

  updateAgentState: (id, agentState, stateStartTime, activeCallId) =>
    set((state) => {
      const existing = state.agents.get(id);
      if (!existing) return state;

      const next = new Map(state.agents);
      next.set(id, {
        ...existing,
        state: agentState,
        stateStartTime,
        stateDuration: 0,
        activeCallId: activeCallId ?? null,
      });
      return { agents: next };
    }),

  setAgents: (agents) =>
    set(() => {
      const map = new Map<string, Agent>();
      for (const agent of agents) {
        map.set(agent.id, agent);
      }
      return { agents: map };
    }),
}));

// ---------------------------------------------------------------------------
// Selector hooks
// ---------------------------------------------------------------------------

/** Returns all agents as an array */
export function useAgents(): Agent[] {
  return useAgentStore(
    useShallow((s) => Array.from(s.agents.values())),
  );
}

/** Returns a single agent by ID, or undefined */
export function useAgentById(id: string): Agent | undefined {
  return useAgentStore((s) => s.agents.get(id));
}

/** Returns agents filtered by a specific state */
export function useAgentsByState(state: AgentState): Agent[] {
  return useAgentStore(
    useShallow((s) =>
      Array.from(s.agents.values()).filter((a) => a.state === state),
    ),
  );
}

/** Returns agents that belong to a specific group */
export function useAgentsByGroup(groupId: string): Agent[] {
  return useAgentStore(
    useShallow((s) =>
      Array.from(s.agents.values()).filter((a) => a.groups.includes(groupId)),
    ),
  );
}
