import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Call } from '@/types';

// ---------------------------------------------------------------------------
// Call Store -- active and recently completed calls
// ---------------------------------------------------------------------------

const MAX_RECENT_CALLS = 50;

interface CallStoreState {
  /** Currently active calls keyed by call ID */
  activeCalls: Map<string, Call>;
  /** Ring-buffer of last N completed calls (newest first) */
  recentCalls: Call[];
}

interface CallStoreActions {
  /** Insert or update a call in the active map */
  upsertCall: (call: Call) => void;
  /** Remove a call from active and push it to recentCalls */
  removeCall: (id: string) => void;
  /** Clear all calls (active + recent) */
  clearAll: () => void;
}

type CallStore = CallStoreState & CallStoreActions;

export const useCallStore = create<CallStore>()((set, get) => ({
  activeCalls: new Map(),
  recentCalls: [],

  upsertCall: (call) =>
    set((state) => {
      const next = new Map(state.activeCalls);
      next.set(call.id, call);
      return { activeCalls: next };
    }),

  removeCall: (id) =>
    set((state) => {
      const next = new Map(state.activeCalls);
      const removed = next.get(id);
      next.delete(id);

      let recent = state.recentCalls;
      if (removed) {
        recent = [removed, ...recent].slice(0, MAX_RECENT_CALLS);
      }

      return { activeCalls: next, recentCalls: recent };
    }),

  clearAll: () =>
    set({ activeCalls: new Map(), recentCalls: [] }),
}));

// ---------------------------------------------------------------------------
// Selector hooks -- stable references via shallow compare on selectors
// ---------------------------------------------------------------------------

/** Returns all active calls as an array (sorted by startTime desc) */
export function useActiveCalls(): Call[] {
  return useCallStore(
    useShallow((s) => {
      const arr = Array.from(s.activeCalls.values());
      arr.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      return arr;
    }),
  );
}

/** Returns a single call by ID (active only), or undefined */
export function useCallById(id: string): Call | undefined {
  return useCallStore((s) => s.activeCalls.get(id));
}

/** Returns the count of active calls */
export function useActiveCallCount(): number {
  return useCallStore((s) => s.activeCalls.size);
}

/** Returns the recent completed calls */
export function useRecentCalls(): Call[] {
  return useCallStore((s) => s.recentCalls);
}
