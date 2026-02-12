// ─── GET /api/transcriptions/stats ───────────────────────────────────────────
// Returns aggregate statistics for the transcriptions overview page.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transcriptions } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { serverErrorResponse } from '@/lib/api/validation';

export async function GET(request: NextRequest) {
  const auth = await requirePermission('recordings:view');
  if (!auth.authorized) return auth.response;

  try {
    // Total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transcriptions);

    // Count by status
    const [completedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transcriptions)
      .where(eq(transcriptions.status, 'completed'));

    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transcriptions)
      .where(eq(transcriptions.status, 'pending'));

    const [processingResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transcriptions)
      .where(eq(transcriptions.status, 'processing'));

    const [failedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transcriptions)
      .where(eq(transcriptions.status, 'failed'));

    // Average confidence for completed transcriptions
    const [confidenceResult] = await db
      .select({
        avg: sql<number>`coalesce(avg(${transcriptions.confidence}), 0)::real`,
      })
      .from(transcriptions)
      .where(eq(transcriptions.status, 'completed'));

    // Total word count across completed transcriptions
    const [wordCountResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${transcriptions.wordCount}), 0)::int`,
      })
      .from(transcriptions)
      .where(eq(transcriptions.status, 'completed'));

    // Average processing time for completed transcriptions
    const [processingTimeResult] = await db
      .select({
        avg: sql<number>`coalesce(avg(${transcriptions.processingTimeSeconds}), 0)::real`,
      })
      .from(transcriptions)
      .where(eq(transcriptions.status, 'completed'));

    return NextResponse.json({
      data: {
        totalTranscriptions: totalResult?.count ?? 0,
        completed: completedResult?.count ?? 0,
        pending: pendingResult?.count ?? 0,
        processing: processingResult?.count ?? 0,
        failed: failedResult?.count ?? 0,
        averageConfidence: Math.round((confidenceResult?.avg ?? 0) * 1000) / 1000,
        totalWordCount: wordCountResult?.total ?? 0,
        averageProcessingTime: Math.round((processingTimeResult?.avg ?? 0) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('GET /api/transcriptions/stats error:', error);
    return serverErrorResponse('Failed to fetch transcription statistics');
  }
}
