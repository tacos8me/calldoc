// ─── GET /api/recordings/[id] ────────────────────────────────────────────────
// Single recording with metadata, notes, and scorecard summary.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  recordings,
  recordingNotes,
  scorecardResponses,
  scorecardTemplates,
  users,
} from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('recordings:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' } },
      { status: 400 }
    );
  }

  try {
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording || recording.isDeleted) return notFoundResponse('Recording');

    // Fetch notes
    const notes = await db
      .select({
        id: recordingNotes.id,
        recordingId: recordingNotes.recordingId,
        userId: recordingNotes.userId,
        userName: users.name,
        timestampMs: recordingNotes.timestampMs,
        noteText: recordingNotes.noteText,
        createdAt: recordingNotes.createdAt,
      })
      .from(recordingNotes)
      .leftJoin(users, eq(recordingNotes.userId, users.id))
      .where(eq(recordingNotes.recordingId, params.id))
      .orderBy(asc(recordingNotes.timestampMs));

    // Fetch scorecard responses
    const scorecards = await db
      .select({
        id: scorecardResponses.id,
        templateId: scorecardResponses.templateId,
        templateName: scorecardTemplates.name,
        evaluatorId: scorecardResponses.evaluatorId,
        evaluatorName: users.name,
        overallScore: scorecardResponses.overallScore,
        maxPossibleScore: scorecardResponses.maxPossibleScore,
        scorePercentage: scorecardResponses.scorePercentage,
        comments: scorecardResponses.comments,
        completedAt: scorecardResponses.completedAt,
        createdAt: scorecardResponses.createdAt,
      })
      .from(scorecardResponses)
      .leftJoin(scorecardTemplates, eq(scorecardResponses.templateId, scorecardTemplates.id))
      .leftJoin(users, eq(scorecardResponses.evaluatorId, users.id))
      .where(eq(scorecardResponses.recordingId, params.id));

    return NextResponse.json({
      data: {
        id: recording.id,
        callId: recording.callId,
        agentId: recording.agentId,
        agentName: recording.agentName,
        callerNumber: recording.callerNumber,
        calledNumber: recording.calledNumber,
        direction: recording.direction,
        startTime: recording.startTime?.toISOString() ?? null,
        endTime: recording.endTime?.toISOString() ?? null,
        duration: recording.duration,
        durationMs: recording.durationMs,
        fileSize: recording.fileSize,
        originalFormat: recording.originalFormat,
        storedFormat: recording.storedFormat,
        codec: recording.codec,
        sampleRate: recording.sampleRate,
        channels: recording.channels,
        storagePoolId: recording.storagePoolId,
        storagePath: recording.storagePath,
        fileName: recording.fileName,
        sourceType: recording.sourceType,
        hasScorecard: recording.hasScorecard,
        overallScore: recording.overallScore,
        tags: recording.tags ?? [],
        retainUntil: recording.retainUntil,
        pciPausedSegments: recording.pciPausedSegmentsJson ?? [],
        createdAt: recording.createdAt.toISOString(),
        notes: notes.map((n) => ({
          id: n.id,
          recordingId: n.recordingId,
          userId: n.userId,
          userName: n.userName ?? 'Unknown',
          timestampMs: n.timestampMs,
          text: n.noteText,
          createdAt: n.createdAt.toISOString(),
        })),
        scorecards: scorecards.map((s) => ({
          id: s.id,
          templateId: s.templateId,
          templateName: s.templateName ?? 'Unknown',
          evaluatorId: s.evaluatorId,
          evaluatorName: s.evaluatorName ?? 'Unknown',
          overallScore: s.overallScore,
          maxPossibleScore: s.maxPossibleScore,
          scorePercentage: s.scorePercentage,
          comments: s.comments,
          completedAt: s.completedAt?.toISOString() ?? null,
          createdAt: s.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/recordings/[id] error:', error);
    return serverErrorResponse('Failed to fetch recording');
  }
}
