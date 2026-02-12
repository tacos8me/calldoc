// ─── GET /api/reports/[id]/export ────────────────────────────────────────────
// Export a report as CSV, PDF, or Excel.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { reportDefinitions, calls } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, SQL } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, parseSearchParams, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']).default('csv'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('reports:export');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid report ID format' } },
      { status: 400 }
    );
  }

  const parsed = parseSearchParams(request.url, exportQuerySchema);
  if (!parsed.success) return parsed.response;

  const { format } = parsed.data;

  try {
    // Fetch report definition
    const [report] = await db
      .select()
      .from(reportDefinitions)
      .where(eq(reportDefinitions.id, params.id))
      .limit(1);

    if (!report) return notFoundResponse('Report');

    // Build query from report filters
    const conditions: SQL[] = [];
    const filters = report.filters as {
      dateRange?: { from: string; to: string };
      direction?: string[];
      minDuration?: number | null;
      maxDuration?: number | null;
    } | null;

    if (filters?.dateRange) {
      conditions.push(gte(calls.startTime, new Date(filters.dateRange.from)));
      conditions.push(lte(calls.startTime, new Date(filters.dateRange.to)));
    }
    if (filters?.direction && filters.direction.length > 0) {
      conditions.push(sql`${calls.direction} = ANY(${filters.direction})`);
    }
    if (filters?.minDuration) {
      conditions.push(gte(calls.duration, filters.minDuration));
    }
    if (filters?.maxDuration) {
      conditions.push(lte(calls.duration, filters.maxDuration));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: calls.id,
        direction: calls.direction,
        state: calls.state,
        callerNumber: calls.callerNumber,
        callerName: calls.callerName,
        calledNumber: calls.calledNumber,
        calledName: calls.calledName,
        agentName: calls.agentName,
        queueName: calls.queueName,
        startTime: calls.startTime,
        endTime: calls.endTime,
        duration: calls.duration,
        holdDuration: calls.holdDuration,
        isAnswered: calls.isAnswered,
        isAbandoned: calls.isAbandoned,
      })
      .from(calls)
      .where(whereClause)
      .limit(10000);

    if (format === 'csv') {
      const headers = [
        'ID', 'Direction', 'State', 'Caller Number', 'Caller Name',
        'Called Number', 'Called Name', 'Agent', 'Queue',
        'Start Time', 'End Time', 'Duration (s)', 'Hold (s)', 'Answered', 'Abandoned',
      ];

      const csvRows = rows.map((r) =>
        [
          r.id,
          r.direction,
          r.state,
          `"${r.callerNumber}"`,
          `"${r.callerName ?? ''}"`,
          `"${r.calledNumber}"`,
          `"${r.calledName ?? ''}"`,
          `"${r.agentName ?? ''}"`,
          `"${r.queueName ?? ''}"`,
          r.startTime.toISOString(),
          r.endTime?.toISOString() ?? '',
          r.duration,
          r.holdDuration,
          r.isAnswered,
          r.isAbandoned,
        ].join(',')
      );

      const csv = [headers.join(','), ...csvRows].join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${report.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      // Use exceljs to build workbook
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(report.name);

      sheet.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Direction', key: 'direction', width: 10 },
        { header: 'State', key: 'state', width: 12 },
        { header: 'Caller Number', key: 'callerNumber', width: 18 },
        { header: 'Caller Name', key: 'callerName', width: 20 },
        { header: 'Called Number', key: 'calledNumber', width: 18 },
        { header: 'Called Name', key: 'calledName', width: 20 },
        { header: 'Agent', key: 'agentName', width: 20 },
        { header: 'Queue', key: 'queueName', width: 20 },
        { header: 'Start Time', key: 'startTime', width: 24 },
        { header: 'End Time', key: 'endTime', width: 24 },
        { header: 'Duration (s)', key: 'duration', width: 12 },
        { header: 'Hold (s)', key: 'holdDuration', width: 10 },
        { header: 'Answered', key: 'isAnswered', width: 10 },
        { header: 'Abandoned', key: 'isAbandoned', width: 10 },
      ];

      for (const r of rows) {
        sheet.addRow({
          id: r.id,
          direction: r.direction,
          state: r.state,
          callerNumber: r.callerNumber,
          callerName: r.callerName ?? '',
          calledNumber: r.calledNumber,
          calledName: r.calledName ?? '',
          agentName: r.agentName ?? '',
          queueName: r.queueName ?? '',
          startTime: r.startTime.toISOString(),
          endTime: r.endTime?.toISOString() ?? '',
          duration: r.duration,
          holdDuration: r.holdDuration,
          isAnswered: r.isAnswered,
          isAbandoned: r.isAbandoned,
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer as ArrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${report.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`,
        },
      });
    }

    // PDF - return a simple text-based PDF placeholder (full PDF rendering would use @react-pdf/renderer)
    return NextResponse.json(
      {
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'PDF export is not yet implemented. Use CSV or XLSX format.',
        },
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('GET /api/reports/[id]/export error:', error);
    return serverErrorResponse('Failed to export report');
  }
}
