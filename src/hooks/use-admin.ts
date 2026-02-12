import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/types/api';
import type { ApiError } from '@/types/api';
import type {
  User,
  RecordingRule,
  StoragePool,
  HuntGroup,
  SystemConnectionStatus,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemSettings {
  siteName: string;
  timezone: string;
  defaultRetentionDays: number;
  sessionTimeoutMinutes: number;
  maxConcurrentUsers: number;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpFrom: string | null;
  [key: string]: unknown;
}

export interface DevLink3Status {
  connected: boolean;
  status: SystemConnectionStatus;
  host: string;
  port: number;
  uptime: number | null;
  eventsPerSecond: number | null;
  lastEventAt: string | null;
  errorMessage: string | null;
}

// ---------------------------------------------------------------------------
// User Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all users.
 */
export function useUsers() {
  return useQuery<User[], ApiError>({
    queryKey: queryKeys.users.all,
    queryFn: () => fetchJson<User[]>('/api/admin/users'),
  });
}

/**
 * Mutation to create a new user.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<
    User,
    ApiError,
    Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string }
  >({
    mutationFn: (body) =>
      fetchJson<User>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/**
 * Mutation to update an existing user.
 */
export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, Partial<User>>({
    mutationFn: (body) =>
      fetchJson<User>(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.setQueryData(queryKeys.users.detail(id), data);
    },
  });
}

// ---------------------------------------------------------------------------
// System Settings Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch system settings.
 */
export function useSystemSettings() {
  return useQuery<SystemSettings, ApiError>({
    queryKey: queryKeys.settings.all,
    queryFn: () => fetchJson<SystemSettings>('/api/admin/settings'),
  });
}

/**
 * Mutation to update system settings.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation<SystemSettings, ApiError, Partial<SystemSettings>>({
    mutationFn: (body) =>
      fetchJson<SystemSettings>('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings.all, data);
    },
  });
}

// ---------------------------------------------------------------------------
// Recording Rules Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch recording rules.
 */
export function useRecordingRules() {
  return useQuery<RecordingRule[], ApiError>({
    queryKey: queryKeys.recordingRules.all,
    queryFn: () => fetchJson<RecordingRule[]>('/api/admin/recording-rules'),
  });
}

// ---------------------------------------------------------------------------
// Storage Pools Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch storage pools.
 */
export function useStoragePools() {
  return useQuery<StoragePool[], ApiError>({
    queryKey: queryKeys.storagePools.all,
    queryFn: () => fetchJson<StoragePool[]>('/api/admin/storage-pools'),
  });
}

// ---------------------------------------------------------------------------
// Hunt Groups Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch hunt groups.
 */
export function useGroups() {
  return useQuery<HuntGroup[], ApiError>({
    queryKey: queryKeys.groups.all,
    queryFn: () => fetchJson<HuntGroup[]>('/api/groups'),
  });
}

// ---------------------------------------------------------------------------
// DevLink3 Status Hook
// ---------------------------------------------------------------------------

/**
 * Fetch DevLink3 connection health.
 */
export function useDevlink3Status() {
  return useQuery<DevLink3Status, ApiError>({
    queryKey: queryKeys.devlink3.status,
    queryFn: () => fetchJson<DevLink3Status>('/api/admin/devlink3/status'),
    refetchInterval: 15_000, // Poll every 15 seconds
  });
}
