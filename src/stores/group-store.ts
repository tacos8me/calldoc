import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// ---------------------------------------------------------------------------
// Group Store -- real-time hunt group metrics
// ---------------------------------------------------------------------------

export interface GroupStatsEntry {
  /** Hunt group identifier */
  id: string;
  /** Hunt group display name */
  name: string;
  /** Number of agents in idle/available state */
  agentsAvailable: number;
  /** Number of agents currently on calls */
  agentsBusy: number;
  /** Number of agents in away/dnd state */
  agentsAway: number;
  /** Number of calls waiting in queue */
  callsWaiting: number;
  /** Longest wait time in seconds for any call in queue */
  longestWait: number;
  /** Calls answered today */
  answeredToday: number;
  /** Calls abandoned today */
  abandonedToday: number;
  /** Current service level percentage (0-100) */
  serviceLevelPercent: number;
}

interface GroupStoreState {
  /** All known groups keyed by group ID */
  groups: Map<string, GroupStatsEntry>;
}

interface GroupStoreActions {
  /** Update stats for a single group (merge/upsert) */
  updateGroup: (id: string, stats: Partial<GroupStatsEntry>) => void;
  /** Get stats for a single group */
  getGroup: (id: string) => GroupStatsEntry | undefined;
  /** Get all groups as an array */
  getAllGroups: () => GroupStatsEntry[];
  /** Bulk-set all groups */
  setGroups: (groups: GroupStatsEntry[]) => void;
  /** Clear all groups */
  clearAll: () => void;
}

type GroupStore = GroupStoreState & GroupStoreActions;

export const useGroupStore = create<GroupStore>()((set, get) => ({
  groups: new Map(),

  updateGroup: (id, stats) =>
    set((state) => {
      const next = new Map(state.groups);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, ...stats });
      } else {
        next.set(id, {
          id,
          name: stats.name ?? id,
          agentsAvailable: stats.agentsAvailable ?? 0,
          agentsBusy: stats.agentsBusy ?? 0,
          agentsAway: stats.agentsAway ?? 0,
          callsWaiting: stats.callsWaiting ?? 0,
          longestWait: stats.longestWait ?? 0,
          answeredToday: stats.answeredToday ?? 0,
          abandonedToday: stats.abandonedToday ?? 0,
          serviceLevelPercent: stats.serviceLevelPercent ?? 0,
        });
      }
      return { groups: next };
    }),

  getGroup: (id) => get().groups.get(id),

  getAllGroups: () => Array.from(get().groups.values()),

  setGroups: (groups) =>
    set(() => {
      const map = new Map<string, GroupStatsEntry>();
      for (const group of groups) {
        map.set(group.id, group);
      }
      return { groups: map };
    }),

  clearAll: () => set({ groups: new Map() }),
}));

// ---------------------------------------------------------------------------
// Selector hooks
// ---------------------------------------------------------------------------

/** Returns stats for a specific group */
export function useGroupStats(groupId: string): GroupStatsEntry | undefined {
  return useGroupStore((s) => s.groups.get(groupId));
}

/** Returns all groups as an array */
export function useAllGroups(): GroupStatsEntry[] {
  return useGroupStore(
    useShallow((s) => Array.from(s.groups.values())),
  );
}
