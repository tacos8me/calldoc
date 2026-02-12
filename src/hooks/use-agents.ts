import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/types/api';
import type { ApiError } from '@/types/api';
import type { Agent, AgentTimelineEntry } from '@/types';

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw {
      code: body.code ?? 'HTTP_ERROR',
      message: body.message ?? `HTTP ${res.status}`,
      details: body.details,
    } as ApiError;
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all agents from /api/agents.
 * staleTime: Infinity because the Zustand agent store is source of truth
 * for real-time state. This query is used for the initial agent list only.
 */
export function useAgentList() {
  return useQuery<Agent[], ApiError>({
    queryKey: queryKeys.agents.list(),
    queryFn: () => fetchJson<Agent[]>('/api/agents'),
    staleTime: Infinity,
  });
}

/**
 * Fetch a single agent by ID.
 */
export function useAgent(id: string | null) {
  return useQuery<Agent, ApiError>({
    queryKey: queryKeys.agents.state(id ?? ''),
    queryFn: () => fetchJson<Agent>(`/api/agents/${id}`),
    enabled: !!id,
    staleTime: Infinity,
  });
}

/**
 * Fetch agent state timeline for a date range.
 */
export function useAgentTimeline(
  agentId: string | null,
  from: string | null,
  to: string | null,
) {
  const dateKey = from && to ? `${from}_${to}` : '';

  return useQuery<AgentTimelineEntry[], ApiError>({
    queryKey: queryKeys.agents.timeline(agentId ?? '', dateKey),
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      return fetchJson<AgentTimelineEntry[]>(
        `/api/agents/${agentId}/timeline?${params.toString()}`,
      );
    },
    enabled: !!agentId && !!from && !!to,
  });
}
