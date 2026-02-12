// ─── GET /api/transcriptions ─────────────────────────────────────────────────
// List transcriptions with pagination, filtering, and full-text search.
// Joins with recordings for call metadata.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { transcriptions, transcriptionSearch, recordings } from '@/lib/db/schema';
import { and, eq, gte, lte, like, desc, sql, SQL, inArray } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import {
  paginationSchema,
  dateRangeSchema,
  parseSearchParams,
  paginatedResponse,
  serverErrorResponse,
} from '@/lib/api/validation';

const transcriptionsQuerySchema = paginationSchema.merge(dateRangeSchema).extend({
  search: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  agentId: z.string().uuid().optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requirePermission('recordings:view');
  if (!auth.authorized) return auth.response;

  const parsed = parseSearchParams(request.url, transcriptionsQuerySchema);
  if (!parsed.success) return parsed.response;

  const { page, limit, from, to, search, status, agentId, minConfidence } = parsed.data;

  try {
    const conditions: SQL[] = [];

    if (status) conditions.push(eq(transcriptions.status, status));
    if (from) conditions.push(gte(transcriptions.createdAt, new Date(from)));
    if (to) conditions.push(lte(transcriptions.createdAt, new Date(to)));
    if (minConfidence !== undefined) conditions.push(gte(transcriptions.confidence, minConfidence));

    // If searching, find matching transcription IDs from the search table
    let searchMatchIds: string[] | null = null;
    if (search) {
      const searchTerm = search.toLowerCase();
      const searchMatches = await db
        .select({ transcriptionId: transcriptionSearch.transcriptionId })
        .from(transcriptionSearch)
        .where(like(transcriptionSearch.searchText, `%${searchTerm}%`));

      searchMatchIds = searchMatches.map((m) => m.transcriptionId);

      if (searchMatchIds.length === 0) {
        // No matches found; return empty result
        return paginatedResponse([], 0, page, limit);
      }

      conditions.push(inArray(transcriptions.id, searchMatchIds));
    }

    // If filtering by agent, get recording IDs for that agent first
    if (agentId) {
      const agentRecordings = await db
        .select({ id: recordings.id })
        .from(recordings)
        .where(eq(recordings.agentId, agentId));

      const agentRecordingIds = agentRecordings.map((r) => r.id);

      if (agentRecordingIds.length === 0) {
        return paginatedResponse([], 0, page, limit);
      }

      conditions.push(inArray(transcriptions.recordingId, agentRecordingIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matching records
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transcriptions)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Fetch paginated results joined with recording metadata
    const rows = await db
      .select({
        id: transcriptions.id,
        recordingId: transcriptions.recordingId,
        jobId: transcriptions.jobId,
        status: transcriptions.status,
        transcript: transcriptions.transcript,
        confidence: transcriptions.confidence,
        language: transcriptions.language,
        durationSeconds: transcriptions.durationSeconds,
        processingTimeSeconds: transcriptions.processingTimeSeconds,
        segmentsJson: transcriptions.segmentsJson,
        wordCount: transcriptions.wordCount,
        errorMessage: transcriptions.errorMessage,
        createdAt: transcriptions.createdAt,
        completedAt: transcriptions.completedAt,
        updatedAt: transcriptions.updatedAt,
        // Recording metadata via join
        agentName: recordings.agentName,
        callerNumber: recordings.callerNumber,
        calledNumber: recordings.calledNumber,
        direction: recordings.direction,
        recordingStartTime: recordings.startTime,
        recordingDuration: recordings.duration,
      })
      .from(transcriptions)
      .leftJoin(recordings, eq(transcriptions.recordingId, recordings.id))
      .where(whereClause)
      .orderBy(desc(transcriptions.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const data = rows.map((r) => ({
      id: r.id,
      recordingId: r.recordingId,
      jobId: r.jobId,
      status: r.status,
      transcript: r.transcript,
      confidence: r.confidence,
      language: r.language,
      durationSeconds: r.durationSeconds,
      processingTimeSeconds: r.processingTimeSeconds,
      segments: r.segmentsJson ?? [],
      wordCount: r.wordCount,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      updatedAt: r.updatedAt.toISOString(),
      // Joined recording metadata
      agentName: r.agentName ?? null,
      callerNumber: r.callerNumber ?? '',
      calledNumber: r.calledNumber ?? '',
      direction: r.direction ?? 'inbound',
      callDate: r.recordingStartTime?.toISOString() ?? '',
      recordingDuration: r.recordingDuration ?? 0,
    }));

    return paginatedResponse(data, total, page, limit);
  } catch (error) {
    console.error('GET /api/transcriptions error:', error);
    return serverErrorResponse('Failed to fetch transcriptions');
  }
}
