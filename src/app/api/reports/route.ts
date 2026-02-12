// ─── /api/reports ────────────────────────────────────────────────────────────
// GET: List saved report definitions
// POST: Create new report definition

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { reportDefinitions } from '@/lib/db/schema';
import { eq, sql, desc, asc, and, SQL } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import {
  paginationSchema,
  sortSchema,
  parseSearchParams,
  parseBody,
  paginatedResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

const reportsQuerySchema = paginationSchema.merge(sortSchema).extend({
  category: z.enum(['call', 'agent', 'group', 'trunk', 'custom']).optional(),
  active: z.coerce.boolean().optional().default(true),
});

const createReportSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.enum(['call', 'agent', 'group', 'trunk', 'custom']),
  filters: z
    .object({
      dateRange: z.object({ from: z.string(), to: z.string() }).optional(),
      groups: z.array(z.string()).optional(),
      agents: z.array(z.string()).optional(),
      trunks: z.array(z.string()).optional(),
      direction: z.array(z.string()).optional(),
      minDuration: z.number().int().optional().nullable(),
      maxDuration: z.number().int().optional().nullable(),
      dispositions: z.array(z.string()).optional(),
    })
    .optional()
    .default({}),
  columns: z.array(z.string()).optional().default([]),
  groupBy: z.string().optional(),
  interval: z.enum(['15m', '30m', '1h', '1d', '1w', '1M']).optional(),
  chartType: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('reports:view');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, reportsQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit, sort, order, category, active } = parsed.data;

  try {
    const conditions: SQL[] = [eq(reportDefinitions.active, active)];
    if (category) conditions.push(eq(reportDefinitions.category, category));

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reportDefinitions)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const sortColumn =
      sort === 'name' ? reportDefinitions.name :
      sort === 'category' ? reportDefinitions.category :
      reportDefinitions.createdAt;
    const orderFn = order === 'asc' ? asc : desc;

    const rows = await db
      .select()
      .from(reportDefinitions)
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset((page - 1) * limit);

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      isStandard: r.isStandard,
      createdBy: r.createdBy,
      filters: r.filters ?? {},
      columns: r.columns ?? [],
      groupBy: r.groupBy,
      interval: r.interval,
      chartType: r.chartType,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return serverErrorResponse('Failed to fetch reports');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('reports:create');
  if (!auth.authorized) return auth.response;

  const parsed = await parseBody(request, createReportSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [report] = await db
      .insert(reportDefinitions)
      .values({
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
        createdBy: auth.user.userId,
        filters: parsed.data.filters,
        columns: parsed.data.columns,
        groupBy: parsed.data.groupBy ?? null,
        interval: parsed.data.interval ?? null,
        chartType: parsed.data.chartType ?? null,
      })
      .returning();

    return NextResponse.json(
      {
        data: {
          id: report.id,
          name: report.name,
          description: report.description,
          category: report.category,
          isStandard: report.isStandard,
          createdBy: report.createdBy,
          filters: report.filters ?? {},
          columns: report.columns ?? [],
          groupBy: report.groupBy,
          interval: report.interval,
          chartType: report.chartType,
          createdAt: report.createdAt.toISOString(),
          updatedAt: report.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/reports error:', error);
    return serverErrorResponse('Failed to create report');
  }
}
