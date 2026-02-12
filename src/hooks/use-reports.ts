import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/types/api';
import type { ApiError } from '@/types/api';
import type {
  Report,
  ReportSchedule,
  ReportExportFormat,
  ReportFilterState,
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

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  chartType: string;
}

export interface GenerateReportParams {
  templateId: string;
  filters: ReportFilterState;
}

export interface GenerateReportResult {
  data: Record<string, unknown>[];
  meta: { rowCount: number; generatedAt: string };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch saved report template definitions.
 */
export function useReportTemplates() {
  return useQuery<ReportTemplate[], ApiError>({
    queryKey: queryKeys.reports.all,
    queryFn: () => fetchJson<ReportTemplate[]>('/api/reports/templates'),
  });
}

/**
 * Mutation to generate a report from a template and filters.
 */
export function useGenerateReport() {
  return useMutation<GenerateReportResult, ApiError, GenerateReportParams>({
    mutationFn: (params) =>
      fetchJson<GenerateReportResult>('/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}

/**
 * Fetch saved report schedules.
 */
export function useReportSchedules() {
  return useQuery<ReportSchedule[], ApiError>({
    queryKey: queryKeys.reports.schedules,
    queryFn: () => fetchJson<ReportSchedule[]>('/api/reports/schedules'),
  });
}

/**
 * Mutation to create a new report schedule.
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation<
    ReportSchedule,
    ApiError,
    Omit<ReportSchedule, 'enabled'> & { reportId: string }
  >({
    mutationFn: (body) =>
      fetchJson<ReportSchedule>('/api/reports/schedules', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.schedules });
    },
  });
}

/**
 * Trigger a report export download.
 * Returns a blob URL that can be used for the download link.
 */
export function useExportReport() {
  return useMutation<
    string,
    ApiError,
    { reportId: string; format: ReportExportFormat }
  >({
    mutationFn: async ({ reportId, format }) => {
      const res = await fetch(`/api/reports/${reportId}/export?format=${format}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw {
          code: body.code ?? 'HTTP_ERROR',
          message: body.message ?? `HTTP ${res.status}`,
        } as ApiError;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      return url;
    },
  });
}
