import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/types/api';
import type { ApiError } from '@/types/api';
import type { WallboardConfig } from '@/types';

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

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all wallboard configurations.
 */
export function useWallboards() {
  return useQuery<WallboardConfig[], ApiError>({
    queryKey: queryKeys.wallboards.all,
    queryFn: () => fetchJson<WallboardConfig[]>('/api/wallboards'),
  });
}

/**
 * Fetch a single wallboard by ID.
 */
export function useWallboard(id: string | null) {
  return useQuery<WallboardConfig, ApiError>({
    queryKey: queryKeys.wallboards.detail(id ?? ''),
    queryFn: () => fetchJson<WallboardConfig>(`/api/wallboards/${id}`),
    enabled: !!id,
  });
}

/**
 * Mutation to create a new wallboard.
 */
export function useCreateWallboard() {
  const queryClient = useQueryClient();

  return useMutation<
    WallboardConfig,
    ApiError,
    Omit<WallboardConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  >({
    mutationFn: (body) =>
      fetchJson<WallboardConfig>('/api/wallboards', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallboards.all });
    },
  });
}

/**
 * Mutation to update an existing wallboard.
 */
export function useUpdateWallboard(id: string) {
  const queryClient = useQueryClient();

  return useMutation<WallboardConfig, ApiError, Partial<WallboardConfig>>({
    mutationFn: (body) =>
      fetchJson<WallboardConfig>(`/api/wallboards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallboards.all });
      queryClient.setQueryData(queryKeys.wallboards.detail(id), data);
    },
  });
}

/**
 * Mutation to delete a wallboard.
 */
export function useDeleteWallboard(id: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () =>
      fetchJson<void>(`/api/wallboards/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wallboards.all });
      queryClient.removeQueries({ queryKey: queryKeys.wallboards.detail(id) });
    },
  });
}
