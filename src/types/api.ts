// ─── Shared API Types ───────────────────────────────────────────────────────
// Source: COMPONENT_ARCHITECTURE.md Section 7, VALIDATION_API_CONTRACTS.md Section 7

/**
 * Standard paginated response envelope for list endpoints.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface PaginatedResponse<T> {
  /** Array of result items */
  data: T[];
  /** Pagination metadata */
  meta: {
    /** Total number of matching records */
    total: number;
    /** Current page number (1-indexed) */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    pageCount: number;
  };
}

/**
 * Standard API error shape.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface ApiError {
  /** Machine-readable error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details (field-level validation errors, etc.) */
  details?: Record<string, unknown>;
}

/**
 * Discriminated union for API responses.
 * Every endpoint returns either { data } on success or { error } on failure.
 */
export type ApiResponse<T> = { data: T } | { error: ApiError };

/**
 * Toast notification for UI feedback.
 * Source: COMPONENT_ARCHITECTURE.md Section 7.
 */
export interface Toast {
  /** Unique toast identifier */
  id: string;
  /** Toast severity */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Toast heading */
  title: string;
  /** Optional supporting text */
  description?: string;
  /** Auto-dismiss timeout in milliseconds (default: 5000) */
  duration?: number;
}

// ─── TanStack Query Key Factory ─────────────────────────────────────────────
// Expanded from COMPONENT_ARCHITECTURE.md Section 3.2 to cover all endpoints
// including the 15 missing ones identified in VALIDATION_API_CONTRACTS.md Section 7.

/**
 * Centralized query key factory for TanStack Query.
 * Provides type-safe, consistent cache key generation for all API endpoints.
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.calls.list(filters), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.calls.all })
 */
export const queryKeys = {
  // ── Calls ──
  calls: {
    all: ['calls'] as const,
    list: (filters: Record<string, unknown>) => ['calls', filters] as const,
    detail: (id: string) => ['calls', id] as const,
    events: (id: string) => ['calls', id, 'events'] as const,
    notes: (id: string) => ['calls', id, 'notes'] as const,
  },

  // ── Reports ──
  reports: {
    all: ['reports'] as const,
    list: (filters: Record<string, unknown>) => ['reports', filters] as const,
    detail: (id: string) => ['reports', id] as const,
    export: (id: string, format: string) => ['reports', id, 'export', format] as const,
    schedules: ['reports', 'schedules'] as const,
  },

  // ── Recordings ──
  recordings: {
    all: ['recordings'] as const,
    list: (filters: Record<string, unknown>) => ['recordings', filters] as const,
    detail: (id: string) => ['recordings', id] as const,
    notes: (id: string) => ['recordings', id, 'notes'] as const,
    score: (id: string) => ['recordings', id, 'score'] as const,
  },

  // ── Agents ──
  agents: {
    all: ['agents'] as const,
    list: () => ['agents', 'list'] as const,
    state: (id: string) => ['agents', id, 'state'] as const,
    timeline: (id: string, date: string) => ['agents', id, 'timeline', date] as const,
  },

  // ── Wallboards ──
  wallboards: {
    all: ['wallboards'] as const,
    list: (filters?: Record<string, unknown>) => ['wallboards', 'list', filters] as const,
    detail: (id: string) => ['wallboards', id] as const,
  },

  // ── Users ──
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    preferences: (id: string) => ['users', id, 'preferences'] as const,
    mapping: (id: string) => ['users', id, 'mapping'] as const,
  },

  // ── System Settings ──
  settings: {
    all: ['settings'] as const,
  },

  // ── DevLink3 ──
  devlink3: {
    status: ['devlink3', 'status'] as const,
  },

  // ── Hunt Groups ──
  groups: {
    all: ['groups'] as const,
    list: (filters?: Record<string, unknown>) => ['groups', 'list', filters] as const,
    detail: (id: string) => ['groups', id] as const,
  },

  // ── Trunks ──
  trunks: {
    all: ['trunks'] as const,
    list: (filters?: Record<string, unknown>) => ['trunks', 'list', filters] as const,
  },

  // ── Alerts ──
  alerts: {
    all: ['alerts'] as const,
    rules: ['alerts', 'rules'] as const,
    history: (filters?: Record<string, unknown>) => ['alerts', 'history', filters] as const,
  },

  // ── Scorecard Templates ──
  scorecardTemplates: {
    all: ['scorecard-templates'] as const,
    detail: (id: string) => ['scorecard-templates', id] as const,
  },

  // ── Recording Rules ──
  recordingRules: {
    all: ['recording-rules'] as const,
    detail: (id: string) => ['recording-rules', id] as const,
  },

  // ── Storage Pools ──
  storagePools: {
    all: ['storage-pools'] as const,
    detail: (id: string) => ['storage-pools', id] as const,
  },

  // ── Saved Filters ──
  savedFilters: {
    all: ['saved-filters'] as const,
    list: (context?: string) => ['saved-filters', context] as const,
  },

  // ── System Connections ──
  connections: {
    all: ['connections'] as const,
    detail: (id: string) => ['connections', id] as const,
    status: ['connections', 'status'] as const,
  },

  // ── SAML ──
  saml: {
    config: ['saml', 'config'] as const,
  },

  // ── Skill Groups ──
  skillGroups: {
    all: ['skill-groups'] as const,
    detail: (id: string) => ['skill-groups', id] as const,
  },

  // ── Transcriptions ──
  transcriptions: {
    all: ['transcriptions'] as const,
    list: (filters: Record<string, unknown>) => ['transcriptions', filters] as const,
    detail: (recordingId: string) => ['transcriptions', recordingId] as const,
    stats: ['transcriptions', 'stats'] as const,
    search: (query: string) => ['transcriptions', 'search', query] as const,
  },
} as const;
