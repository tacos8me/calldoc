// ─── /api/reports/schedules ──────────────────────────────────────────────────
// GET: List report schedules
// POST: Create schedule
// PUT: Update schedule
// DELETE: Delete schedule

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { reportSchedules, reportDefinitions } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import {
  parseBody,
  paginationSchema,
  parseSearchParams,
  paginatedResponse,
  serverErrorResponse,
  notFoundResponse,
} from '@/lib/api/validation';

const schedulesQuerySchema = paginationSchema;

const createScheduleSchema = z.object({
  reportId: z.string().uuid(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  recipients: z.array(z.string().email()).min(1),
  format: z.enum(['csv', 'pdf', 'xlsx']).default('pdf'),
  filters: z
    .object({
      dateRangeType: z.enum(['yesterday', 'last_week', 'last_month', 'custom']).optional(),
      groups: z.array(z.string()).optional(),
      agents: z.array(z.string()).optional(),
    })
    .optional()
    .default({}),
});

const updateScheduleSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(['csv', 'pdf', 'xlsx']).optional(),
  filters: z
    .object({
      dateRangeType: z.enum(['yesterday', 'last_week', 'last_month', 'custom']).optional(),
      groups: z.array(z.string()).optional(),
      agents: z.array(z.string()).optional(),
    })
    .optional(),
});

const deleteScheduleSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('reports:view');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, schedulesQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit } = parsed.data;

  try {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reportSchedules);

    const total = countResult?.count ?? 0;

    const rows = await db
      .select({
        id: reportSchedules.id,
        reportDefinitionId: reportSchedules.reportDefinitionId,
        reportName: reportDefinitions.name,
        enabled: reportSchedules.enabled,
        frequency: reportSchedules.frequency,
        time: reportSchedules.time,
        dayOfWeek: reportSchedules.dayOfWeek,
        dayOfMonth: reportSchedules.dayOfMonth,
        recipients: reportSchedules.recipients,
        format: reportSchedules.format,
        filters: reportSchedules.filters,
        lastRunAt: reportSchedules.lastRunAt,
        lastRunStatus: reportSchedules.lastRunStatus,
        nextRunAt: reportSchedules.nextRunAt,
        createdBy: reportSchedules.createdBy,
        createdAt: reportSchedules.createdAt,
        updatedAt: reportSchedules.updatedAt,
      })
      .from(reportSchedules)
      .leftJoin(reportDefinitions, eq(reportSchedules.reportDefinitionId, reportDefinitions.id))
      .orderBy(desc(reportSchedules.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const data = rows.map((s) => ({
      id: s.id,
      reportDefinitionId: s.reportDefinitionId,
      reportName: s.reportName ?? 'Unknown',
      enabled: s.enabled,
      frequency: s.frequency,
      time: s.time,
      dayOfWeek: s.dayOfWeek,
      dayOfMonth: s.dayOfMonth,
      recipients: s.recipients,
      format: s.format,
      filters: s.filters ?? {},
      lastRunAt: s.lastRunAt?.toISOString() ?? null,
      lastRunStatus: s.lastRunStatus,
      nextRunAt: s.nextRunAt?.toISOString() ?? null,
      createdBy: s.createdBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error('GET /api/reports/schedules error:', error);
    return serverErrorResponse('Failed to fetch schedules');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('reports:create');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, createScheduleSchema);
  if (!parsed.success) return parsed.response;

  try {
    // Verify report exists
    const [report] = await db
      .select({ id: reportDefinitions.id })
      .from(reportDefinitions)
      .where(eq(reportDefinitions.id, parsed.data.reportId))
      .limit(1);

    if (!report) return notFoundResponse('Report definition');

    const [schedule] = await db
      .insert(reportSchedules)
      .values({
        reportDefinitionId: parsed.data.reportId,
        createdBy: auth.user.userId,
        frequency: parsed.data.frequency,
        time: parsed.data.time,
        dayOfWeek: parsed.data.dayOfWeek ?? null,
        dayOfMonth: parsed.data.dayOfMonth ?? null,
        recipients: parsed.data.recipients,
        format: parsed.data.format,
        filters: parsed.data.filters,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: schedule.id,
          reportDefinitionId: schedule.reportDefinitionId,
          enabled: schedule.enabled,
          frequency: schedule.frequency,
          time: schedule.time,
          dayOfWeek: schedule.dayOfWeek,
          dayOfMonth: schedule.dayOfMonth,
          recipients: schedule.recipients,
          format: schedule.format,
          filters: schedule.filters ?? {},
          createdBy: schedule.createdBy,
          createdAt: schedule.createdAt.toISOString(),
          updatedAt: schedule.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/reports/schedules error:', error);
    return serverErrorResponse('Failed to create schedule');
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission('reports:create');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, updateScheduleSchema);
  if (!parsed.success) return parsed.response;

  try {
    const { id, ...updates } = parsed.data;

    const [existing] = await db
      .select({ id: reportSchedules.id })
      .from(reportSchedules)
      .where(eq(reportSchedules.id, id))
      .limit(1);

    if (!existing) return notFoundResponse('Schedule');

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.enabled !== undefined) updateValues.enabled = updates.enabled;
    if (updates.frequency) updateValues.frequency = updates.frequency;
    if (updates.time) updateValues.time = updates.time;
    if (updates.dayOfWeek !== undefined) updateValues.dayOfWeek = updates.dayOfWeek;
    if (updates.dayOfMonth !== undefined) updateValues.dayOfMonth = updates.dayOfMonth;
    if (updates.recipients) updateValues.recipients = updates.recipients;
    if (updates.format) updateValues.format = updates.format;
    if (updates.filters) updateValues.filters = updates.filters;

    const [updated] = await db
      .update(reportSchedules)
      .set(updateValues)
      .where(eq(reportSchedules.id, id))
      .returning();

    return NextResponse.json({
      data: {
        id: updated.id,
        reportDefinitionId: updated.reportDefinitionId,
        enabled: updated.enabled,
        frequency: updated.frequency,
        time: updated.time,
        dayOfWeek: updated.dayOfWeek,
        dayOfMonth: updated.dayOfMonth,
        recipients: updated.recipients,
        format: updated.format,
        filters: updated.filters ?? {},
        createdBy: updated.createdBy,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('PUT /api/reports/schedules error:', error);
    return serverErrorResponse('Failed to update schedule');
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission('reports:create');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, deleteScheduleSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [existing] = await db
      .select({ id: reportSchedules.id })
      .from(reportSchedules)
      .where(eq(reportSchedules.id, parsed.data.id))
      .limit(1);

    if (!existing) return notFoundResponse('Schedule');

    await db
      .delete(reportSchedules)
      .where(eq(reportSchedules.id, parsed.data.id));

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('DELETE /api/reports/schedules error:', error);
    return serverErrorResponse('Failed to delete schedule');
  }
}
