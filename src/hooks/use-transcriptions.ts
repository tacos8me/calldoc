import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/types/api';
import type { PaginatedResponse, ApiError } from '@/types/api';
import type {
  Transcription,
  TranscriptionStats,
  TranscriptionSearchResult,
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

export interface TranscriptionFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  agentId?: string;
  from?: string;
  to?: string;
  minConfidence?: number;
}

// ---------------------------------------------------------------------------
// Transcription response with joined recording metadata
// ---------------------------------------------------------------------------

interface TranscriptionWithRecording extends Transcription {
  agentName: string | null;
  callerNumber: string;
  calledNumber: string;
  direction: string;
  callDate: string;
  recordingDuration: number;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch a single transcription by recording ID.
 */
export function useTranscription(recordingId: string | null) {
  return useQuery<{ data: Transcription }, ApiError>({
    queryKey: queryKeys.transcriptions.detail(recordingId ?? ''),
    queryFn: () =>
      fetchJson<{ data: Transcription }>(
        `/api/recordings/${recordingId}/transcript`
      ),
    enabled: !!recordingId,
  });
}

/**
 * Fetch paginated transcription list with filters.
 */
export function useTranscriptions(filters: TranscriptionFilters = {}) {
  const queryString = toSearchParams(filters as Record<string, unknown>);

  return useQuery<PaginatedResponse<TranscriptionWithRecording>, ApiError>({
    queryKey: queryKeys.transcriptions.list(filters as Record<string, unknown>),
    queryFn: () =>
      fetchJson<PaginatedResponse<TranscriptionWithRecording>>(
        `/api/transcriptions${queryString ? `?${queryString}` : ''}`
      ),
  });
}

/**
 * Fetch aggregate transcription statistics.
 */
export function useTranscriptionStats() {
  return useQuery<{ data: TranscriptionStats }, ApiError>({
    queryKey: queryKeys.transcriptions.stats,
    queryFn: () =>
      fetchJson<{ data: TranscriptionStats }>('/api/transcriptions/stats'),
  });
}

/**
 * Mutation to submit a transcription job for a recording.
 */
export function useSubmitTranscription(recordingId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { data: { transcriptionId: string; jobId: string | null; status: string } },
    ApiError,
    { language?: string }
  >({
    mutationFn: (body) =>
      fetchJson<{ data: { transcriptionId: string; jobId: string | null; status: string } }>(
        `/api/recordings/${recordingId}/transcript`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.transcriptions.detail(recordingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.transcriptions.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.transcriptions.stats,
      });
    },
  });
}

/**
 * Search transcriptions by full-text query.
 * Uses the transcriptions list endpoint with a search param.
 */
export function useTranscriptionSearch(query: string, filters: Omit<TranscriptionFilters, 'search'> = {}) {
  const allFilters = { ...filters, search: query };
  const queryString = toSearchParams(allFilters as Record<string, unknown>);

  return useQuery<PaginatedResponse<TranscriptionWithRecording>, ApiError>({
    queryKey: queryKeys.transcriptions.search(query),
    queryFn: () =>
      fetchJson<PaginatedResponse<TranscriptionWithRecording>>(
        `/api/transcriptions${queryString ? `?${queryString}` : ''}`
      ),
    enabled: query.length >= 2,
  });
}
