import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/types/api';
import type { PaginatedResponse, ApiError } from '@/types/api';
import type {
  Recording,
  RecordingNote,
  ScoreCard,
  RecordingShareLink,
} from '@/types';

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
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

function toSearchParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
    } else {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordingFilters {
  page?: number;
  limit?: number;
  search?: string;
  agentId?: string;
  direction?: string;
  scored?: 'all' | 'scored' | 'unscored';
  from?: string;
  to?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch paginated recordings list with filters.
 */
export function useRecordings(filters: RecordingFilters = {}) {
  const queryString = toSearchParams(filters as Record<string, unknown>);

  return useQuery<PaginatedResponse<Recording>, ApiError>({
    queryKey: queryKeys.recordings.list(filters as Record<string, unknown>),
    queryFn: () =>
      fetchJson<PaginatedResponse<Recording>>(
        `/api/recordings${queryString ? `?${queryString}` : ''}`,
      ),
  });
}

/**
 * Fetch a single recording with metadata.
 */
export function useRecording(id: string | null) {
  return useQuery<Recording, ApiError>({
    queryKey: queryKeys.recordings.detail(id ?? ''),
    queryFn: () => fetchJson<Recording>(`/api/recordings/${id}`),
    enabled: !!id,
  });
}

/**
 * Fetch notes for a recording.
 */
export function useRecordingNotes(recordingId: string | null) {
  return useQuery<RecordingNote[], ApiError>({
    queryKey: queryKeys.recordings.notes(recordingId ?? ''),
    queryFn: () =>
      fetchJson<RecordingNote[]>(`/api/recordings/${recordingId}/notes`),
    enabled: !!recordingId,
  });
}

/**
 * Mutation to create a note on a recording.
 */
export function useCreateRecordingNote(recordingId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    RecordingNote,
    ApiError,
    { text: string; timestampMs: number }
  >({
    mutationFn: (body) =>
      fetchJson<RecordingNote>(`/api/recordings/${recordingId}/notes`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.recordings.notes(recordingId),
      });
    },
  });
}

/**
 * Mutation to submit a QA scorecard for a recording.
 */
export function useSubmitScore(recordingId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    ScoreCard,
    ApiError,
    { categories: { name: string; weight: number; score: number; criteria: { label: string; score: number; comment: string | null }[] }[]; comments: string | null }
  >({
    mutationFn: (body) =>
      fetchJson<ScoreCard>(`/api/recordings/${recordingId}/score`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.recordings.score(recordingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.recordings.detail(recordingId),
      });
      // Also invalidate the list so the score column updates
      queryClient.invalidateQueries({
        queryKey: queryKeys.recordings.all,
      });
    },
  });
}

/**
 * Mutation to create a share link for a recording.
 */
export function useCreateShareLink(recordingId: string) {
  return useMutation<
    RecordingShareLink,
    ApiError,
    { expiresInHours?: number }
  >({
    mutationFn: (body) =>
      fetchJson<RecordingShareLink>(`/api/recordings/${recordingId}/share`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}
