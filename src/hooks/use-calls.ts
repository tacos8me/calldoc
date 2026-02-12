import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { queryKeys } from '@/types/api';
import type { PaginatedResponse, ApiError } from '@/types/api';
import type { Call, CallEvent, CallNote } from '@/types';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: ApiError = {
      code: body.code ?? 'HTTP_ERROR',
      message: body.message ?? `HTTP ${res.status}`,
      details: body.details,
    };
    throw err;
  }
  return res.json();
}

function toSearchParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
    } else if (typeof value === 'object') {
      // Handle nested objects like durationRange, dateRange
      for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
        if (subVal !== undefined && subVal !== null && subVal !== '') {
          params.set(`${key}.${subKey}`, String(subVal));
        }
      }
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface CallFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  caller?: string;
  callerName?: string;
  calledNumber?: string;
  agent?: string[];
  group?: string[];
  direction?: string[];
  state?: string[];
  durationRange?: { min?: number; max?: number };
  dateRange?: { from?: string; to?: string };
  hasRecording?: boolean;
  search?: string;
}

/**
 * Fetch paginated calls from /api/calls with optional filters.
 */
export function useCalls(filters: CallFilters = {}) {
  const queryString = toSearchParams(filters as Record<string, unknown>);

  return useQuery<PaginatedResponse<Call>, ApiError>({
    queryKey: queryKeys.calls.list(filters as Record<string, unknown>),
    queryFn: () =>
      fetchJson<PaginatedResponse<Call>>(
        `/api/calls${queryString ? `?${queryString}` : ''}`,
      ),
  });
}

/**
 * Fetch a single call by ID (including events and notes).
 */
export function useCall(id: string | null) {
  return useQuery<Call & { events: CallEvent[]; notes: CallNote[] }, ApiError>({
    queryKey: queryKeys.calls.detail(id ?? ''),
    queryFn: () =>
      fetchJson<Call & { events: CallEvent[]; notes: CallNote[] }>(
        `/api/calls/${id}`,
      ),
    enabled: !!id,
  });
}

/**
 * Fetch events for a specific call.
 */
export function useCallEvents(callId: string | null) {
  return useQuery<CallEvent[], ApiError>({
    queryKey: queryKeys.calls.events(callId ?? ''),
    queryFn: () => fetchJson<CallEvent[]>(`/api/calls/${callId}/events`),
    enabled: !!callId,
  });
}

/**
 * Mutation to create a note on a call.
 */
export function useCreateCallNote(callId: string) {
  const queryClient = useQueryClient();

  return useMutation<CallNote, ApiError, { text: string }>({
    mutationFn: (body) =>
      fetchJson<CallNote>(`/api/calls/${callId}/notes`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.notes(callId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
    },
  });
}

/**
 * Prefetch the next page of calls (e.g., on hover).
 */
export function usePrefetchCalls() {
  const queryClient = useQueryClient();

  return (filters: CallFilters) => {
    const queryString = toSearchParams(filters as Record<string, unknown>);
    queryClient.prefetchQuery({
      queryKey: queryKeys.calls.list(filters as Record<string, unknown>),
      queryFn: () =>
        fetchJson<PaginatedResponse<Call>>(
          `/api/calls${queryString ? `?${queryString}` : ''}`,
        ),
      staleTime: 30_000,
    });
  };
}
