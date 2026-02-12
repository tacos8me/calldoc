// ─── POST /api/reports/generate ──────────────────────────────────────────────
// Generate a report based on a template, date range, filters, and aggregation
// parameters. Supports both the new template-based engine and the legacy
// reportType-based approach for backwards compatibility.
//
// Request body:
//   { templateId, dateRange: { from, to }, filters, groupBy?, format? }
//   OR legacy: { reportType, filters: { from, to, ... }, interval, ... }
//
// Query params:
//   ?format=csv|xlsx|pdf  -- Direct export (returns file buffer)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { calls, agents, huntGroups, huntGroupMembers } from '@/lib/db/schema';
import { and, eq, gte, lte, sql, SQL, desc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { parseBody, serverErrorResponse } from '@/lib/api/validation';
import { generateReport, type ReportFilters, type DateRange } from '@/lib/reports/engine';
import { exportCSV, exportXLSX, exportPDF } from '@/lib/reports/export';
import { getTemplate, REPORT_TEMPLATES_LIST } from '@/lib/reports/templates';

// ---------------------------------------------------------------------------
// Schema: Template-based generation (new)
// ---------------------------------------------------------------------------

const templateGenerateSchema = z.object({
  templateId: z.string().min(1),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
  filters: z
    .object({
      groups: z.array(z.string()).optional(),
      agents: z.array(z.string()).optional(),
      trunks: z.array(z.string()).optional(),
      direction: z.array(z.enum(['inbound', 'outbound', 'internal'])).optional(),
      minDuration: z.number().int().optional().nullable(),
      maxDuration: z.number().int().optional().nullable(),
      dispositions: z.array(z.string()).optional(),
    })
    .optional()
    .default({}),
  groupBy: z.string().optional(),
  interval: z.enum(['15m', '30m', '1h', '1d', '1w', '1M']).optional(),
  serviceLevelThreshold: z.number().int().min(1).max(300).optional(),
  format: z.enum(['csv', 'xlsx', 'pdf']).optional(),
});

// ---------------------------------------------------------------------------
// Schema: Legacy reportType-based generation (backwards compat)
// ---------------------------------------------------------------------------

const legacyGenerateSchema = z.object({
  reportType: z.enum(['call', 'agent', 'group']),
  filters: z.object({
    from: z.string(),
    to: z.string(),
    groups: z.array(z.string()).optional(),
    agents: z.array(z.string()).optional(),
    direction: z.array(z.enum(['inbound', 'outbound', 'internal'])).optional(),
    minDuration: z.number().int().optional(),
    maxDuration: z.number().int().optional(),
  }),
  columns: z.array(z.string()).optional(),
  interval: z.enum(['15m', '30m', '1h', '1d', '1w', '1M']).optional().default('1h'),
  groupBy: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helper: interval to SQL
// ---------------------------------------------------------------------------

function intervalToSql(interval: string): string {
  switch (interval) {
    case '15m': return '15 minutes';
    case '30m': return '30 minutes';
    case '1h': return '1 hour';
    case '1d': return '1 day';
    case '1w': return '7 days';
    case '1M': return '1 month';
    default: return '1 hour';
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requirePermission('reports:view');
  if (!auth.authorized) return auth.response;

  // Try to parse the body as JSON first to determine which schema to use
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  // Check if this is a template-based request
  const isTemplateRequest = typeof rawBody === 'object' && rawBody !== null && 'templateId' in rawBody;

  if (isTemplateRequest) {
    return handleTemplateGeneration(rawBody);
  }

  // Fall back to legacy reportType-based generation
  return handleLegacyGeneration(rawBody);
}

// ---------------------------------------------------------------------------
// Template-based generation (new engine)
// ---------------------------------------------------------------------------

async function handleTemplateGeneration(rawBody: unknown): Promise<NextResponse> {
  const parsed = templateGenerateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  const { templateId, dateRange, filters, groupBy, interval, serviceLevelThreshold, format } = parsed.data;
  const startTime = Date.now();

  try {
    // Validate template exists
    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        {
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: `Report template "${templateId}" not found. Available templates: ${REPORT_TEMPLATES_LIST.map((t) => t.id).join(', ')}`,
          },
        },
        { status: 404 }
      );
    }

    const reportDateRange: DateRange = {
      from: new Date(dateRange.from),
      to: new Date(dateRange.to),
    };

    const reportFilters: ReportFilters = {
      groups: filters.groups,
      agents: filters.agents,
      trunks: filters.trunks,
      direction: filters.direction,
      minDuration: filters.minDuration,
      maxDuration: filters.maxDuration,
      dispositions: filters.dispositions,
      groupBy,
      interval,
      serviceLevelThreshold,
    };

    const result = await generateReport(templateId, reportDateRange, reportFilters);
    const executionMs = Date.now() - startTime;

    // If format is requested, return the exported file directly
    if (format) {
      const exportOptions = {
        reportName: template.name,
        dateFrom: reportDateRange.from,
        dateTo: reportDateRange.to,
        generatedAt: new Date(),
      };

      let exportResult;
      if (format === 'csv') {
        exportResult = exportCSV(result, exportOptions);
      } else if (format === 'xlsx') {
        exportResult = await exportXLSX(result, exportOptions);
      } else {
        exportResult = exportPDF(result, exportOptions);
      }

      return new NextResponse(exportResult.buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': exportResult.contentType,
          'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        },
      });
    }

    // Return JSON response
    return NextResponse.json({
      columns: result.columns.map((c) => ({
        key: c.key,
        label: c.label,
        format: c.format,
        align: c.align,
      })),
      rows: result.rows,
      summary: result.summary,
      metadata: {
        templateId,
        templateName: template.name,
        category: template.category,
        generatedAt: new Date().toISOString(),
        rowCount: result.rows.length,
        executionMs,
        dateRange: {
          from: reportDateRange.from.toISOString(),
          to: reportDateRange.to.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('POST /api/reports/generate (template) error:', error);
    return serverErrorResponse('Failed to generate report');
  }
}

// ---------------------------------------------------------------------------
// Legacy reportType-based generation
// ---------------------------------------------------------------------------

async function handleLegacyGeneration(rawBody: unknown): Promise<NextResponse> {
  const parsed = legacyGenerateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  const { reportType, filters, interval } = parsed.data;

  try {
    const fromDate = new Date(filters.from);
    const toDate = new Date(filters.to);

    if (reportType === 'agent') {
      const conditions: SQL[] = [
        gte(calls.startTime, fromDate),
        lte(calls.startTime, toDate),
      ];

      if (filters.agents && filters.agents.length > 0) {
        conditions.push(sql`${calls.agentId} = ANY(${filters.agents})`);
      }
      if (filters.direction && filters.direction.length > 0) {
        conditions.push(sql`${calls.direction} = ANY(${filters.direction})`);
      }

      const rows = await db
        .select({
          agentId: calls.agentId,
          agentName: calls.agentName,
          totalCalls: sql<number>`count(*)::int`,
          answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
          abandonedCalls: sql<number>`count(*) filter (where ${calls.isAbandoned} = true)::int`,
          totalDuration: sql<number>`coalesce(sum(${calls.duration}), 0)::int`,
          totalTalkTime: sql<number>`coalesce(sum(${calls.talkDuration}), 0)::int`,
          totalHoldTime: sql<number>`coalesce(sum(${calls.holdDuration}), 0)::int`,
          avgDuration: sql<number>`coalesce(avg(${calls.duration}), 0)::int`,
          answerRate: sql<number>`case when count(*) > 0 then round(count(*) filter (where ${calls.isAnswered} = true)::numeric / count(*)::numeric * 100) else 0 end::int`,
        })
        .from(calls)
        .where(and(...conditions))
        .groupBy(calls.agentId, calls.agentName);

      const summary = {
        totalCalls: rows.reduce((s, r) => s + r.totalCalls, 0),
        answeredCalls: rows.reduce((s, r) => s + r.answeredCalls, 0),
        abandonedCalls: rows.reduce((s, r) => s + r.abandonedCalls, 0),
        totalDuration: rows.reduce((s, r) => s + r.totalDuration, 0),
        totalTalkTime: rows.reduce((s, r) => s + r.totalTalkTime, 0),
        totalHoldTime: rows.reduce((s, r) => s + r.totalHoldTime, 0),
      };

      return NextResponse.json({ data: rows, summary });
    }

    if (reportType === 'call') {
      const sqlInterval = intervalToSql(interval);
      const conditions: SQL[] = [
        gte(calls.startTime, fromDate),
        lte(calls.startTime, toDate),
      ];

      if (filters.direction && filters.direction.length > 0) {
        conditions.push(sql`${calls.direction} = ANY(${filters.direction})`);
      }
      if (filters.minDuration) {
        conditions.push(gte(calls.duration, filters.minDuration));
      }
      if (filters.maxDuration) {
        conditions.push(lte(calls.duration, filters.maxDuration));
      }

      const rows = await db
        .select({
          timeBucket: sql<string>`date_trunc('hour', ${calls.startTime}) as time_bucket`,
          totalCalls: sql<number>`count(*)::int`,
          answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
          abandonedCalls: sql<number>`count(*) filter (where ${calls.isAbandoned} = true)::int`,
          avgDuration: sql<number>`coalesce(avg(${calls.duration}), 0)::int`,
          avgHoldTime: sql<number>`coalesce(avg(${calls.holdDuration}), 0)::int`,
          maxDuration: sql<number>`coalesce(max(${calls.duration}), 0)::int`,
        })
        .from(calls)
        .where(and(...conditions))
        .groupBy(sql`time_bucket`)
        .orderBy(sql`time_bucket`);

      const summary = {
        totalCalls: rows.reduce((s, r) => s + r.totalCalls, 0),
        answeredCalls: rows.reduce((s, r) => s + r.answeredCalls, 0),
        abandonedCalls: rows.reduce((s, r) => s + r.abandonedCalls, 0),
        avgDuration: rows.length > 0
          ? Math.round(rows.reduce((s, r) => s + r.avgDuration, 0) / rows.length)
          : 0,
      };

      return NextResponse.json({ data: rows, summary });
    }

    if (reportType === 'group') {
      const conditions: SQL[] = [
        gte(calls.startTime, fromDate),
        lte(calls.startTime, toDate),
        sql`${calls.queueName} is not null`,
      ];

      if (filters.groups && filters.groups.length > 0) {
        conditions.push(sql`${calls.queueName} = ANY(${filters.groups})`);
      }

      const rows = await db
        .select({
          queueName: calls.queueName,
          totalCalls: sql<number>`count(*)::int`,
          answeredCalls: sql<number>`count(*) filter (where ${calls.isAnswered} = true)::int`,
          abandonedCalls: sql<number>`count(*) filter (where ${calls.isAbandoned} = true)::int`,
          abandonRate: sql<number>`case when count(*) > 0 then round(count(*) filter (where ${calls.isAbandoned} = true)::numeric / count(*)::numeric * 100) else 0 end::int`,
          avgWaitTime: sql<number>`coalesce(avg(extract(epoch from (${calls.answerTime} - ${calls.queueEntryTime})))::int, 0)`,
          maxWaitTime: sql<number>`coalesce(max(extract(epoch from (${calls.answerTime} - ${calls.queueEntryTime})))::int, 0)`,
          avgDuration: sql<number>`coalesce(avg(${calls.duration}), 0)::int`,
          avgHoldTime: sql<number>`coalesce(avg(${calls.holdDuration}), 0)::int`,
        })
        .from(calls)
        .where(and(...conditions))
        .groupBy(calls.queueName);

      const summary = {
        totalCalls: rows.reduce((s, r) => s + r.totalCalls, 0),
        answeredCalls: rows.reduce((s, r) => s + r.answeredCalls, 0),
        abandonedCalls: rows.reduce((s, r) => s + r.abandonedCalls, 0),
        avgAbandonRate: rows.length > 0
          ? Math.round(rows.reduce((s, r) => s + r.abandonRate, 0) / rows.length)
          : 0,
      };

      return NextResponse.json({ data: rows, summary });
    }

    return NextResponse.json(
      { error: { code: 'INVALID_REPORT_TYPE', message: 'Unknown report type' } },
      { status: 400 }
    );
  } catch (error) {
    console.error('POST /api/reports/generate error:', error);
    return serverErrorResponse('Failed to generate report');
  }
}
