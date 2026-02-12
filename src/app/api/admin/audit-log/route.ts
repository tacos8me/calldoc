// ---------------------------------------------------------------------------
// GET /api/admin/audit-log - Paginated, filterable audit log
// ---------------------------------------------------------------------------
// Admin role required. Returns audit log entries with pagination.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { parseSearchParams, paginatedResponse, serverErrorResponse } from '@/lib/api/validation';
import { queryAuditLogs, type AuditAction } from '@/lib/audit/service';

const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, auditLogQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit, userId, action, resource, from, to } = parsed.data;

  try {
    const result = await queryAuditLogs({
      page,
      limit,
      userId,
      action: action as AuditAction | undefined,
      resource,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });

    return paginatedResponse(result.data, result.total, page, limit);
  } catch (error) {
    console.error('GET /api/admin/audit-log error:', error);
    return serverErrorResponse('Failed to fetch audit log');
  }
}
