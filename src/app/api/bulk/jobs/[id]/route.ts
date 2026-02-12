// ---------------------------------------------------------------------------
// GET /api/bulk/jobs/[id] - Check bulk job status and download URL
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bulkJobs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole('supervisor');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid job ID format' } },
      { status: 400 }
    );
  }

  try {
    // Users can only see their own jobs
    const [job] = await db
      .select()
      .from(bulkJobs)
      .where(
        and(
          eq(bulkJobs.id, params.id),
          eq(bulkJobs.userId, auth.user.userId)
        )
      )
      .limit(1);

    if (!job) return notFoundResponse('Bulk job');

    return NextResponse.json({
      data: {
        id: job.id,
        jobType: job.jobType,
        status: job.status,
        totalItems: job.totalItems,
        processedItems: job.processedItems,
        resultUrl: job.resultUrl,
        resultMeta: job.resultMeta,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('GET /api/bulk/jobs/[id] error:', error);
    return serverErrorResponse('Failed to fetch job status');
  }
}
