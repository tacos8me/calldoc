// ─── GET /api/calls/[id] ─────────────────────────────────────────────────────
// Single call with full details including events, notes, and recording info.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calls, callEvents, callNotes, recordings, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('calls:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid call ID format' } },
      { status: 400 }
    );
  }

  try {
    // Fetch call
    const [call] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, params.id))
      .limit(1);

    if (!call) return notFoundResponse('Call');

    // Fetch events ordered by timestamp
    const events = await db
      .select()
      .from(callEvents)
      .where(eq(callEvents.callId, params.id))
      .orderBy(asc(callEvents.timestamp));

    // Fetch notes with user names
    const notes = await db
      .select({
        id: callNotes.id,
        callId: callNotes.callId,
        userId: callNotes.userId,
        userName: users.name,
        noteText: callNotes.noteText,
        createdAt: callNotes.createdAt,
      })
      .from(callNotes)
      .leftJoin(users, eq(callNotes.userId, users.id))
      .where(eq(callNotes.callId, params.id))
      .orderBy(asc(callNotes.createdAt));

    // Fetch recording if exists
    const [recording] = await db
      .select({
        id: recordings.id,
        duration: recordings.duration,
        fileSize: recordings.fileSize,
        storedFormat: recordings.storedFormat,
        hasScorecard: recordings.hasScorecard,
        overallScore: recordings.overallScore,
      })
      .from(recordings)
      .where(eq(recordings.callId, params.id))
      .limit(1);

    return NextResponse.json({
      data: {
        id: call.id,
        direction: call.direction,
        state: call.state,
        callerNumber: call.callerNumber,
        callerName: call.callerName,
        calledNumber: call.calledNumber,
        calledName: call.calledName,
        queueName: call.queueName,
        queueEntryTime: call.queueEntryTime?.toISOString() ?? null,
        agentExtension: call.agentExtension,
        agentName: call.agentName,
        trunkId: call.trunkId,
        trunkName: call.trunkName,
        startTime: call.startTime.toISOString(),
        answerTime: call.answerTime?.toISOString() ?? null,
        endTime: call.endTime?.toISOString() ?? null,
        duration: call.duration,
        talkDuration: call.talkDuration,
        holdCount: call.holdCount,
        holdDuration: call.holdDuration,
        transferCount: call.transferCount,
        isAnswered: call.isAnswered,
        isAbandoned: call.isAbandoned,
        isRecorded: call.isRecorded,
        accountCode: call.accountCode,
        tags: call.tags ?? [],
        metadata: call.metadata,
        events: events.map((e) => ({
          id: e.id,
          callId: e.callId,
          type: e.eventType,
          timestamp: e.timestamp.toISOString(),
          duration: e.duration,
          party: e.party,
          details: e.details ?? {},
        })),
        notes: notes.map((n) => ({
          id: n.id,
          callId: n.callId,
          userId: n.userId,
          userName: n.userName ?? 'Unknown',
          text: n.noteText,
          createdAt: n.createdAt.toISOString(),
        })),
        recording: recording
          ? {
              id: recording.id,
              duration: recording.duration,
              fileSize: recording.fileSize,
              format: recording.storedFormat,
              hasScorecard: recording.hasScorecard,
              overallScore: recording.overallScore,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('GET /api/calls/[id] error:', error);
    return serverErrorResponse('Failed to fetch call details');
  }
}
