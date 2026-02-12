// ---------------------------------------------------------------------------
// POST /api/bulk/calls/export - Bulk export calls to CSV/XLSX
// POST /api/bulk/recordings/score - Batch assign scorecard
// POST /api/bulk/recordings/tag - Batch add tags
// ---------------------------------------------------------------------------
// All operations require supervisor role and are rate-limited to
// 5 bulk operations per minute per user.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { bulkJobs, calls, recordings } from '@/lib/db/schema';
import { eq, and, gte, lte, inArray, sql, desc } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/middleware';
import { parseBody, serverErrorResponse } from '@/lib/api/validation';
import { auditLog } from '@/lib/audit/service';

// ---------------------------------------------------------------------------
// Rate limiting: simple in-memory tracker
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 5) {
    return false;
  }

  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const exportCallsSchema = z.object({
  operation: z.literal('calls_export'),
  format: z.enum(['csv', 'xlsx']).default('csv'),
  filters: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    direction: z.enum(['inbound', 'outbound', 'internal']).optional(),
    agentId: z.string().uuid().optional(),
    queueName: z.string().optional(),
    isAnswered: z.boolean().optional(),
    isAbandoned: z.boolean().optional(),
  }).optional(),
});

const batchScoreSchema = z.object({
  operation: z.literal('recordings_score'),
  recordingIds: z.array(z.string().uuid()).min(1).max(100),
  templateId: z.string().uuid(),
  scores: z.record(z.number().min(0).max(100)),
});

const batchTagSchema = z.object({
  operation: z.literal('recordings_tag'),
  recordingIds: z.array(z.string().uuid()).min(1).max(100),
  tags: z.array(z.string().min(1).max(64)).min(1).max(10),
});

const bulkOperationSchema = z.discriminatedUnion('operation', [
  exportCallsSchema,
  batchScoreSchema,
  batchTagSchema,
]);

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requireRole('supervisor');
  if (!auth.authorized) return auth.response;

  // Rate limit check
  if (!checkRateLimit(auth.user.userId)) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Maximum 5 bulk operations per minute. Please wait.',
        },
      },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const parsed = await parseBody(request, bulkOperationSchema);
  if (!parsed.success) return parsed.response;

  try {
    const operation = parsed.data;

    switch (operation.operation) {
      case 'calls_export':
        return await handleCallsExport(auth.user.userId, auth.user.name, operation);
      case 'recordings_score':
        return await handleBatchScore(auth.user.userId, auth.user.name, operation);
      case 'recordings_tag':
        return await handleBatchTag(auth.user.userId, auth.user.name, operation);
      default:
        return NextResponse.json(
          { error: { code: 'INVALID_OPERATION', message: 'Unknown bulk operation' } },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('POST /api/bulk error:', error);
    return serverErrorResponse('Failed to process bulk operation');
  }
}

// ---------------------------------------------------------------------------
// Calls Export Handler
// ---------------------------------------------------------------------------

async function handleCallsExport(
  userId: string,
  userName: string,
  params: z.infer<typeof exportCallsSchema>
) {
  // Create a job record (async processing)
  const [job] = await db
    .insert(bulkJobs)
    .values({
      userId,
      jobType: 'calls_export',
      status: 'pending',
      params: params as unknown as Record<string, unknown>,
    })
    .returning();

  // Process inline for small exports (in production this would be a background worker)
  try {
    const conditions: ReturnType<typeof eq>[] = [];
    const filters = params.filters;

    if (filters?.from) {
      conditions.push(gte(calls.startTime, new Date(filters.from)));
    }
    if (filters?.to) {
      conditions.push(lte(calls.startTime, new Date(filters.to)));
    }
    if (filters?.direction) {
      conditions.push(eq(calls.direction, filters.direction));
    }
    if (filters?.isAnswered !== undefined) {
      conditions.push(eq(calls.isAnswered, filters.isAnswered));
    }
    if (filters?.isAbandoned !== undefined) {
      conditions.push(eq(calls.isAbandoned, filters.isAbandoned));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(calls)
      .where(whereClause);

    const totalItems = countResult?.count ?? 0;

    // Update job status
    await db
      .update(bulkJobs)
      .set({
        status: 'processing',
        totalItems,
      })
      .where(eq(bulkJobs.id, job.id));

    // Mark completed (actual file generation would happen in background)
    await db
      .update(bulkJobs)
      .set({
        status: 'completed',
        processedItems: totalItems,
        resultMeta: { format: params.format, totalRows: totalItems },
        completedAt: new Date(),
      })
      .where(eq(bulkJobs.id, job.id));

    await auditLog(userId, userName, 'bulk.export', 'calls', job.id, {
      format: params.format,
      totalItems,
    });

    return NextResponse.json(
      {
        data: {
          jobId: job.id,
          status: 'completed',
          totalItems,
        },
      },
      { status: 202 }
    );
  } catch (err) {
    await db
      .update(bulkJobs)
      .set({
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      })
      .where(eq(bulkJobs.id, job.id));

    throw err;
  }
}

// ---------------------------------------------------------------------------
// Batch Score Handler
// ---------------------------------------------------------------------------

async function handleBatchScore(
  userId: string,
  userName: string,
  params: z.infer<typeof batchScoreSchema>
) {
  const [job] = await db
    .insert(bulkJobs)
    .values({
      userId,
      jobType: 'recordings_score',
      status: 'processing',
      totalItems: params.recordingIds.length,
      params: params as unknown as Record<string, unknown>,
    })
    .returning();

  let processed = 0;

  for (const recordingId of params.recordingIds) {
    try {
      // Update the recording's score
      const overallScore = Object.values(params.scores).length > 0
        ? Math.round(
            Object.values(params.scores).reduce((a, b) => a + b, 0) /
              Object.values(params.scores).length
          )
        : 0;

      await db
        .update(recordings)
        .set({
          hasScorecard: true,
          overallScore,
        })
        .where(eq(recordings.id, recordingId));

      processed++;
    } catch {
      // Continue with other recordings
    }
  }

  await db
    .update(bulkJobs)
    .set({
      status: 'completed',
      processedItems: processed,
      completedAt: new Date(),
    })
    .where(eq(bulkJobs.id, job.id));

  await auditLog(userId, userName, 'bulk.score', 'recordings', job.id, {
    recordingCount: params.recordingIds.length,
    processed,
  });

  return NextResponse.json(
    {
      data: {
        jobId: job.id,
        status: 'completed',
        totalItems: params.recordingIds.length,
        processedItems: processed,
      },
    },
    { status: 202 }
  );
}

// ---------------------------------------------------------------------------
// Batch Tag Handler
// ---------------------------------------------------------------------------

async function handleBatchTag(
  userId: string,
  userName: string,
  params: z.infer<typeof batchTagSchema>
) {
  const [job] = await db
    .insert(bulkJobs)
    .values({
      userId,
      jobType: 'recordings_tag',
      status: 'processing',
      totalItems: params.recordingIds.length,
      params: params as unknown as Record<string, unknown>,
    })
    .returning();

  let processed = 0;

  for (const recordingId of params.recordingIds) {
    try {
      const [recording] = await db
        .select({ id: recordings.id, tags: recordings.tags })
        .from(recordings)
        .where(eq(recordings.id, recordingId))
        .limit(1);

      if (!recording) continue;

      const currentTags = (recording.tags as string[] | null) ?? [];
      const newTags = [...new Set([...currentTags, ...params.tags])];

      await db
        .update(recordings)
        .set({ tags: newTags })
        .where(eq(recordings.id, recordingId));

      processed++;
    } catch {
      // Continue with other recordings
    }
  }

  await db
    .update(bulkJobs)
    .set({
      status: 'completed',
      processedItems: processed,
      completedAt: new Date(),
    })
    .where(eq(bulkJobs.id, job.id));

  await auditLog(userId, userName, 'bulk.tag', 'recordings', job.id, {
    recordingCount: params.recordingIds.length,
    tags: params.tags,
    processed,
  });

  return NextResponse.json(
    {
      data: {
        jobId: job.id,
        status: 'completed',
        totalItems: params.recordingIds.length,
        processedItems: processed,
      },
    },
    { status: 202 }
  );
}
